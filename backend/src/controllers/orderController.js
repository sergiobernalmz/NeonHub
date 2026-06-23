const axios = require('axios');
const { Order, OrderItem, Product, Customer, User, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { emitOrderEvent } = require('../services/socketService');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const orderController = {
  // obtener todos los pedidos con paginación y filtros
  getAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        status,
        customerId,
        dateFrom,
        dateTo,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};
      const storeId = resolveStoreId(req);

      if (storeId) {
        whereClause.store_id = storeId;
      }
      const include = [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'customer_code', 'first_name', 'last_name', 'company_name', 'email']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'first_name', 'last_name']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'sku', 'price', 'images']
          }]
        }
      ];

      // aplicamos los filtros
      if (search) {
        whereClause[Op.or] = [
          { order_number: { [Op.iLike]: `%${search}%` } },
          { '$customer.first_name$': { [Op.iLike]: `%${search}%` } },
          { '$customer.last_name$': { [Op.iLike]: `%${search}%` } },
          { '$customer.company_name$': { [Op.iLike]: `%${search}%` } },
          { '$customer.email$': { [Op.iLike]: `%${search}%` } }
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      if (customerId) {
        whereClause.customer_id = customerId;
      }

      if (dateFrom) {
        whereClause.order_date = { ...whereClause.order_date, [Op.gte]: new Date(dateFrom) };
      }

      if (dateTo) {
        whereClause.order_date = { ...whereClause.order_date, [Op.lte]: new Date(dateTo) };
      }

      const { count, rows: orders } = await Order.findAndCountAll({
        where: whereClause,
        include,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true
      });

      // formateamos los pedidos para el frontend
      const formattedOrders = orders.map(order => {
        const customer = order.customer
        const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || customer.email : 'Cliente desconocido'
        
        return {
          id: order.order_number || `#ORD-${order.id.slice(-3)}`,
          originalId: order.id, // guardamos el UUID para operaciones internas
          customer: customerName,
          customerObject: customer, // guardamos el objeto completo del cliente para vistas detalladas
          date: order.order_date ? order.order_date.toISOString().split('T')[0] : order.createdAt?.toISOString().split('T')[0],
          total: `€${order.total_amount ? parseFloat(order.total_amount).toFixed(2) : '0.00'}`,
          status: order.status,
          items: order.items ? order.items.length : 0,
          orderItems: order.items || [],
          discount_amount: parseFloat(order.discount_amount || 0),
          discount_code: order.discount_code || null,
          shipping_amount: parseFloat(order.shipping_amount || 0),
          shipping_address: order.shipping_address || null,
          // guardamos los datos originales del pedido para operaciones detalladas
          _original: order
        }
      })

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          orders: formattedOrders,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener pedidos'
      });
    }
  },

  // obtener un pedido por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const order = await Order.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        attributes: { exclude: ['stripe_client_secret'] },
        include: [
          {
            model: Customer,
            as: 'customer'
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'first_name', 'last_name']
          },
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              as: 'product'
            }]
          }
        ]
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      res.json({
        success: true,
        data: { order }
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener pedido'
      });
    }
  },

  // crear un nuevo pedido
  create: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const { customerId, items, shippingAddress, billingAddress, notes } = req.body;
      const storeId = resolveStoreId(req);

      if (!storeId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Contexto de tienda requerido para crear pedidos'
        });
      }

      // comprobamos que el cliente existe
      const customer = await Customer.findOne({
        where: {
          id: customerId,
          store_id: storeId
        },
        transaction
      });
      if (!customer) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // generamos el número de pedido
      const orderNumber = await generateOrderNumber(storeId, transaction);

      // calculamos los totales
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findOne({
          where: {
            id: item.productId,
            store_id: storeId
          },
          transaction
        });
        if (!product) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `Producto con ID ${item.productId} no encontrado`
          });
        }

        // comprobamos si hay stock suficiente
        if (product.track_inventory && product.stock_quantity < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para el producto ${product.name}`
          });
        }

        const unitPrice = item.unitPrice || product.price;
        const discountAmount = (unitPrice * item.quantity * (item.discountRate || 0)) / 100;
        const taxAmount = ((unitPrice * item.quantity - discountAmount) * (item.taxRate || 0)) / 100;
        const lineTotal = (unitPrice * item.quantity) - discountAmount + taxAmount;

        orderItems.push({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: unitPrice,
          discount_rate: item.discountRate || 0,
          discount_amount: discountAmount,
          tax_rate: item.taxRate || 0,
          tax_amount: taxAmount,
          line_total: lineTotal,
          product_snapshot: {
            name: product.name,
            sku: product.sku,
            description: product.description
          }
        });

        subtotal += lineTotal;
      }

      const taxAmount = orderItems.reduce((sum, item) => sum + parseFloat(item.tax_amount), 0);
      const discountAmount = orderItems.reduce((sum, item) => sum + parseFloat(item.discount_amount), 0);
      const totalAmount = subtotal;

      // creamos el pedido
      const order = await Order.create({
        store_id: storeId,
        order_number: orderNumber,
        customer_id: customerId,
        user_id: req.user.id,
        status: 'draft',
        order_date: new Date(),
        subtotal: subtotal - discountAmount - taxAmount,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        notes
      }, { transaction });

      // creamos los items del pedido
      for (const itemData of orderItems) {
        await OrderItem.create({
          order_id: order.id,
          ...itemData
        }, { transaction });

        // actualizamos el stock del producto si lo tiene activado
        const product = await Product.findOne({
          where: {
            id: itemData.product_id,
            store_id: storeId
          },
          transaction
        });
        if (product.track_inventory) {
          await product.update({
            stock_quantity: product.stock_quantity - itemData.quantity
          }, { transaction });
        }
      }

      await transaction.commit();

      // cargamos el pedido recién creado con sus relaciones (sin stripe_client_secret)
      const createdOrder = await Order.findByPk(order.id, {
        attributes: { exclude: ['stripe_client_secret'] },
        include: [
          {
            model: Customer,
            as: 'customer'
          },
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              as: 'product'
            }]
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: { order: createdOrder }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear pedido'
      });
    }
  },

  // actualizar el estado de un pedido
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const storeId = resolveStoreId(req);

      const includeCustomer = [{ model: Customer, as: 'customer' }];

      // buscamos primero por UUID y si no por número de pedido
      let order = await Order.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        attributes: { exclude: ['stripe_client_secret'] },
        include: includeCustomer
      });

      if (!order) {
        order = await Order.findOne({
          where: {
            order_number: id,
            ...(storeId ? { store_id: storeId } : {})
          },
          attributes: { exclude: ['stripe_client_secret'] },
          include: includeCustomer
        });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      const updateData = { status };
      if (notes) updateData.internal_notes = notes;
      if (status === 'shipped') updateData.shipped_date = new Date();

      await order.update(updateData);

      // emitimos el evento al panel de admin via socket
      emitOrderEvent(order.store_id, 'order:status-changed', {
        orderId: order.id,
        orderNumber: order.order_number,
        status
      });

      // notificación por email via n8n para cambios de estado relevantes
      const webhookMap = {
        processing: process.env.N8N_ORDER_PROCESSING_WEBHOOK,
        shipped:    process.env.N8N_ORDER_SHIPPED_WEBHOOK,
        delivered:  process.env.N8N_ORDER_DELIVERED_WEBHOOK,
        completed:  process.env.N8N_ORDER_COMPLETED_WEBHOOK,
      };
      const webhookUrl = webhookMap[status];
      if (webhookUrl && order.customer?.email) {
        axios.post(webhookUrl, {
          order_id: order.id,
          order_number: order.order_number,
          customer_email: order.customer.email,
          customer_name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
          store_name: req.tenant?.name || '',
          store_subdomain: req.tenant?.subdomain || '',
          status,
          type: `order_${status}`
        }).catch(err => console.error(`n8n order ${status} webhook error:`, err.message));
      }

      res.json({
        success: true,
        message: 'Estado del pedido actualizado exitosamente',
        data: { order }
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar estado del pedido'
      });
    }
  },

  // cancelar un pedido
  cancel: async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const storeId = resolveStoreId(req);

      const order = await Order.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        attributes: { exclude: ['stripe_client_secret'] },
        include: [{
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No se puede cancelar un pedido en este estado'
        });
      }

      // restauramos el stock de los items cancelados
      for (const item of order.items) {
        if (item.product.track_inventory) {
          await item.product.update({
            stock_quantity: item.product.stock_quantity + item.quantity
          }, { transaction });
        }
      }

      // actualizamos el estado del pedido
      await order.update({
        status: 'cancelled',
        internal_notes: reason || 'Pedido cancelado'
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Pedido cancelado exitosamente'
      });
    } catch (error) {
      await transaction.rollback();
      console.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar pedido'
      });
    }
  },

  // obtener estadísticas de pedidos
  getStats: async (req, res) => {
    try {
      const { period = '30d' } = req.query;
      
      let dateFrom;
      const storeId = resolveStoreId(req);
      switch (period) {
        case '7d':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const stats = await Order.findAll({
        where: {
          created_at: { [Op.gte]: dateFrom },
          ...(storeId ? { store_id: storeId } : {})
        },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount']
        ],
        group: ['status'],
        raw: true
      });

      const totalOrders = await Order.count({
        where: {
          created_at: { [Op.gte]: dateFrom },
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      const totalRevenue = await Order.sum('total_amount', {
        where: {
          created_at: { [Op.gte]: dateFrom },
          ...(storeId ? { store_id: storeId } : {}),
          status: { [Op.in]: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      });

      res.json({
        success: true,
        data: {
          stats,
          summary: {
            totalOrders,
            totalRevenue: totalRevenue || 0,
            period
          }
        }
      });
    } catch (error) {
      console.error('Get order stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de pedidos'
      });
    }
  }
};

// función auxiliar para generar el número de pedido
async function generateOrderNumber(storeId = null, transaction = null) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const prefix = `ORD-${year}${month}${day}`;
  
  // buscamos el último número de pedido del día (con lock para evitar condiciones de carrera)
  const lastOrder = await Order.findOne({
    where: {
      ...(storeId ? { store_id: storeId } : {}),
      order_number: {
        [Op.like]: `${prefix}%`
      }
    },
    order: [['order_number', 'DESC']],
    ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {})
  });
  
  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.order_number.split('-').pop());
    sequence = lastSequence + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

// añadimos métodos adicionales al controlador
orderController.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const storeId = resolveStoreId(req);

    const order = await Order.findOne({
      where: {
        id,
        ...(storeId ? { store_id: storeId } : {})
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    // Campos permitidos para actualizar
    const allowedFields = ['status', 'total_amount', 'payment_status', 'order_date', 'shipping_address', 'notes'];
    const fieldsToUpdate = {};

    // Mapear campos del frontend al backend
    if (updateData.status) fieldsToUpdate.status = updateData.status;
    if (updateData.total) {
      // convertimos "€299.99" a 299.99
      const amount = updateData.total.toString().replace('€', '').replace(',', '.');
      fieldsToUpdate.total_amount = parseFloat(amount);
    }
    if (updateData.date) fieldsToUpdate.order_date = updateData.date;
    if (updateData.customer && updateData.customer !== order.Customer?.first_name + ' ' + order.Customer?.last_name) {
      // Si se cambió el nombre del cliente, actualizar notas
      fieldsToUpdate.notes = (order.notes || '') + `\nCliente actualizado a: ${updateData.customer}`;
    }

    await order.update(fieldsToUpdate);

    // Notificar al cliente si cambia el estado
    const newStatus = fieldsToUpdate.status;
    const webhookMap = {
      processing: process.env.N8N_ORDER_PROCESSING_WEBHOOK,
      shipped:    process.env.N8N_ORDER_SHIPPED_WEBHOOK,
      delivered:  process.env.N8N_ORDER_DELIVERED_WEBHOOK,
      completed:  process.env.N8N_ORDER_COMPLETED_WEBHOOK,
    };
    const webhookUrl = webhookMap[newStatus];
    if (webhookUrl && order.customer?.email) {
      axios.post(webhookUrl, {
        order_id: order.id,
        order_number: order.order_number,
        customer_email: order.customer.email,
        customer_name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
        store_name: req.tenant?.name,
        store_subdomain: req.tenant?.subdomain,
        total: order.total_amount,
        status: newStatus,
        type: `order_${newStatus}`
      }).catch(err => console.error('[n8n webhook error]', err.message));
    }
    if (newStatus) {
      emitOrderEvent(order.store_id, 'order:status-changed', {
        orderId: order.id,
        status: newStatus
      });
    }

    // Recargar con relaciones
    const updatedOrder = await Order.findOne({
      where: {
        id,
        ...(storeId ? { store_id: storeId } : {})
      },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'price']
          }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Orden actualizada correctamente',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la orden',
      error: error.message
    });
  }
};

orderController.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = resolveStoreId(req);

    const order = await Order.findOne({
      where: {
        id,
        ...(storeId ? { store_id: storeId } : {})
      },
      attributes: { exclude: ['stripe_client_secret'] },
      include: includeCustomer
    });

    if (!order) {
      order = await Order.findOne({
        where: {
          order_number: id,
          ...(storeId ? { store_id: storeId } : {})
        },
        attributes: { exclude: ['stripe_client_secret'] },
        include: includeCustomer
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    // borrado suave - actualizamos deleted_at
    await order.update({
      deleted_at: new Date(),
      status: 'cancelled' // también lo marcamos como cancelado
    });

    res.json({
      success: true,
      message: 'Orden eliminada correctamente'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la orden',
      error: error.message
    });
  }
};

module.exports = orderController;