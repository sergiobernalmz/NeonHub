const { Cart, CartItem, Product, Order, OrderItem, Customer, User, Store, DiscountCode, sequelize } = require('../models');
const { Op } = require('sequelize');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

// obtenemos el carrito del usuario actual (lo creamos si no existe)
const getCart = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let cart = await Cart.findOne({ where: { user_id: userId, status: 'active' }, include: [{ model: CartItem, as: 'items', include: [{ model: Product, as: 'product' }] }] });
    if (!cart) {
      cart = await Cart.create({ user_id: userId });
    }

    return res.json(cart);
  } catch (err) {
    next(err);
  }
};

// añadir un producto al carrito (o aumentar la cantidad si ya existe)
const addItem = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const storeId = resolveStoreId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!storeId) return res.status(403).json({ error: 'Store context required' });

    const { product_id, quantity = 1, metadata = {} } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id required' });

    let cart = await Cart.findOne({ where: { user_id: userId, status: 'active' } });
    if (!cart) cart = await Cart.create({ user_id: userId });

    const existing = await CartItem.findOne({ where: { cart_id: cart.id, product_id } });
    const product = await Product.findOne({
      where: {
        id: product_id,
        store_id: storeId
      }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (existing) {
      existing.quantity = existing.quantity + quantity;
      await existing.save();
      await existing.reload({ include: [{ model: Product, as: 'product' }] });
      return res.json(existing);
    }

    const unit_price = product.price;
    const item = await CartItem.create({ cart_id: cart.id, product_id, quantity, unit_price, metadata });
    await item.reload({ include: [{ model: Product, as: 'product' }] });
    return res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// actualizar la cantidad de un item del carrito
const updateItem = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'quantity must be >= 1' });

    const item = await CartItem.findByPk(id, { include: [{ model: Cart, as: 'cart' }] });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.cart.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    item.quantity = quantity;
    await item.save();
    await item.reload({ include: [{ model: Product, as: 'product' }] });
    return res.json(item);
  } catch (err) {
    next(err);
  }
};

// eliminar un item del carrito
const removeItem = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const item = await CartItem.findByPk(id, { include: [{ model: Cart, as: 'cart' }] });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.cart.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    await item.destroy();
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// checkout del carrito: crea el pedido con sus items y vacía el carrito
const checkout = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user && req.user.id;
    const storeId = resolveStoreId(req);
    const shippingAddress = req.body?.shipping_address || null;
    const discount_id = req.body?.discount_id || null;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!storeId) {
      await t.rollback();
      return res.status(403).json({ error: 'Store context required' });
    }

    const cart = await Cart.findOne({ where: { user_id: userId, status: 'active' }, include: [{ model: CartItem, as: 'items' }], transaction: t });
    if (!cart || !cart.items || cart.items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // buscamos o creamos el customer a partir del usuario
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    let customer = await Customer.findOne({ where: { email: user.email, store_id: storeId }, transaction: t });
    if (!customer) {
      customer = await Customer.create({
        store_id: storeId,
        first_name: user.first_name || 'Customer',
        last_name: user.last_name || 'User',
        email: user.email,
        phone: user.phone || null,
        user_id: userId,
        customer_code: 'CUST-' + Date.now().toString(36).toUpperCase().slice(-6) + '-' + Math.random().toString(36).toUpperCase().slice(-3)
      }, { transaction: t });
    }

    // generamos el número de pedido con formato de fecha y lock para evitar condiciones de carrera
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const lastOrder = await Order.findOne({
      where: { store_id: storeId, order_number: { [Op.like]: `${prefix}%` } },
      order: [['order_number', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    let seq = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.order_number.split('-').pop());
      seq = lastSeq + 1;
    }
    const orderNumber = `${prefix}-${String(seq).padStart(4, '0')}`;

    // creamos el pedido
    const order = await Order.create({
      order_number: orderNumber,
      store_id: storeId,
      user_id: userId,
      customer_id: customer.id,
      total_amount: 0,
      status: 'pending',
      shipping_address: shippingAddress
    }, { transaction: t });

    let total = 0;
    for (const item of cart.items) {
      const product = await Product.findOne({
        where: {
          id: item.product_id,
          store_id: storeId
        },
        transaction: t
      });
      if (!product) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid cart item for this store' });
      }
      const unitPrice = product ? product.price : item.unit_price;
      const subtotal = parseFloat(unitPrice) * item.quantity;
      total += subtotal;

      await OrderItem.create({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        line_total: subtotal
      }, { transaction: t });
    }

    // coste de envío sacado de la configuración de la tienda
    const store = await Store.findByPk(storeId, { attributes: ['settings'], transaction: t });
    const storeFeatures = store?.settings?.enterprise_config?.features || {};
    const shippingCostConfig = storeFeatures.shipping_cost != null ? parseFloat(storeFeatures.shipping_cost) : 4.99;
    const freeThreshold = storeFeatures.free_shipping_threshold != null ? parseFloat(storeFeatures.free_shipping_threshold) : 50;
    const shippingAmount = storeFeatures.free_shipping_disabled
      ? shippingCostConfig
      : (total >= freeThreshold ? 0 : shippingCostConfig);

    // aplicamos el descuento si se ha proporcionado uno
    let discountAmount = 0;
    let appliedDiscountCode = null;
    if (discount_id) {
      const discountRecord = await DiscountCode.findOne({
        where: { id: discount_id, store_id: storeId, is_active: true },
        transaction: t
      });
      if (discountRecord
        && !(discountRecord.expires_at && new Date(discountRecord.expires_at) < new Date())
        && !(discountRecord.max_uses && discountRecord.used_count >= discountRecord.max_uses)) {
        discountAmount = discountRecord.type === 'percentage'
          ? parseFloat(((total * parseFloat(discountRecord.value)) / 100).toFixed(2))
          : Math.min(parseFloat(discountRecord.value), total);
        appliedDiscountCode = discountRecord.code;
        await discountRecord.increment('used_count', { transaction: t });
      }
    }

    const totalAmount = parseFloat((total + shippingAmount - discountAmount).toFixed(2));

    order.subtotal = parseFloat(total.toFixed(2));
    order.shipping_amount = shippingAmount;
    order.discount_amount = discountAmount;
    order.discount_code = appliedDiscountCode;
    order.total_amount = totalAmount;
    await order.save({ transaction: t });

    await t.commit();
    
    // cargamos el pedido completo con todos sus items
    const completeOrder = await Order.findOne({
      where: {
        id: order.id,
        store_id: storeId
      },
      include: [
        { model: Customer, as: 'customer' },
        { 
          model: OrderItem, 
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    return res.json({ 
      success: true,
      message: 'Order placed successfully',
      data: {
        order: completeOrder
      }
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const cart = await Cart.findOne({ where: { user_id: userId, status: 'active' } });
    if (cart) {
      await CartItem.destroy({ where: { cart_id: cart.id } });
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  checkout
};
