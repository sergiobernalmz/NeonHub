const { Customer, Product, Order, OrderItem, Invoice, Return, Transaction, DiscountCode, Store, sequelize } = require('../models')
const stripeService = require('../services/stripeService')

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

// controlador de pedidos públicos para el checkout como invitado
const publicOrderController = {
  getMyOrders: async (req, res) => {
    try {
      const storeId = req.tenant?.id
      if (!storeId) {
        return res.status(400).json({ success: false, message: 'Tenant context required' })
      }

      const customer = await Customer.findOne({
        where: { email: req.user.email, store_id: storeId }
      })

      if (!customer) {
        return res.json({ success: true, data: [] })
      }

      const orders = await Order.findAll({
        where: { customer_id: customer.id, store_id: storeId },
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              as: 'product',
              attributes: ['name', 'images']
            }]
          },
          {
            model: Invoice,
            as: 'invoice',
            attributes: ['id', 'invoice_number', 'status'],
            required: false
          },
          {
            model: Return,
            as: 'return',
            attributes: ['id', 'status', 'reason', 'created_at'],
            required: false
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      const formatted = orders.map(order => {
        const o = order.toJSON()
        return {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          payment_status: o.payment_status,
          total: o.total_amount,
          shipping_address: o.shipping_address,
          created_at: o.createdAt,
          items: (o.items || []).map(item => ({
            id: item.id,
            name: item.product_snapshot?.name || item.product?.name || 'Producto',
            quantity: item.quantity,
            price: item.unit_price,
            image: item.product?.images?.[0]?.url || null
          })),
          updated_at: o.updatedAt,
          invoice: o.invoice
            ? { id: o.invoice.id, invoice_number: o.invoice.invoice_number, status: o.invoice.status }
            : null,
          return: o.return
            ? { id: o.return.id, status: o.return.status, reason: o.return.reason, created_at: o.return.created_at }
            : null
        }
      })

      return res.json({ success: true, data: formatted })
    } catch (error) {
      console.error('Get my orders error:', error)
      return res.status(500).json({ success: false, message: 'Error fetching orders' })
    }
  },

  create: async (req, res) => {
    const transaction = await sequelize.transaction()
    try {
      console.log('📦 Public order request received:', JSON.stringify(req.body, null, 2))
      console.log('[ORDER DEBUG] body:', JSON.stringify({
        discount_id: req.body.discount_id,
        discount_code: req.body.discount_code,
        items: req.body.items?.length
      }))
      const storeId = resolveStoreId(req)
      const { customer, items, shippingAddress, billingAddress, paymentMethod, notes, discount_id } = req.body

      if (!storeId) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: 'Tenant context is required' })
      }

      // bloqueamos el checkout si el usuario está autenticado pero no ha verificado el email
      if (req.user && !req.user.isEmailVerified) {
        await transaction.rollback()
        return res.status(403).json({
          success: false,
          message: 'Debes verificar tu email antes de realizar un pedido',
          requiresVerification: true
        })
      }

      // aceptamos tanto camelCase como snake_case
      const firstName = customer?.firstName || customer?.first_name
      const lastName = customer?.lastName || customer?.last_name
      const email = customer?.email

      console.log('👤 Customer data:', { firstName, lastName, email })
      console.log('📦 Items:', items)

      if (!email || !firstName || !lastName) {
        await transaction.rollback()
        console.error('❌ Missing customer data')
        return res.status(400).json({ success: false, message: 'Customer data (firstName/first_name, lastName/last_name, email) required' })
      }

      if (!Array.isArray(items) || items.length === 0) {
        await transaction.rollback()
        return res.status(400).json({ success: false, message: 'Items are required' })
      }

      // buscamos el cliente por email o lo creamos si no existe
      let customerRecord = await Customer.findOne({ where: { email, store_id: storeId }, transaction })
      if (!customerRecord) {
        // generamos un código de cliente simple
        const code = `CUST-${Date.now().toString().slice(-6)}`
        customerRecord = await Customer.create({
          store_id: storeId,
          customer_code: code,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: customer.phone || null,
          shipping_address: shippingAddress || null,
          billing_address: billingAddress || null
        }, { transaction })
      }

      // construimos los items del pedido y calculamos totales
      const orderItems = []
      let subtotal = 0

      for (const it of items) {
        const productId = it.productId || it.product_id
        const product = await Product.findOne({
          where: {
            id: productId,
            store_id: storeId
          },
          transaction
        })
        if (!product) {
          await transaction.rollback()
          return res.status(404).json({ success: false, message: `Product ${productId} not found` })
        }

        if (product.track_inventory && product.stock_quantity < it.quantity) {
          await transaction.rollback()
          return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` })
        }

        const unitPrice = it.unitPrice || product.price
        const qty = parseInt(it.quantity || 1, 10)
        const lineTotal = unitPrice * qty
        subtotal += lineTotal

        orderItems.push({
          product_id: product.id,
          quantity: qty,
          unit_price: unitPrice,
          discount_rate: it.discountRate || 0,
          discount_amount: 0,
          tax_rate: it.taxRate || 0,
          tax_amount: 0,
          line_total: lineTotal,
          product_snapshot: {
            name: product.name,
            sku: product.sku,
            description: product.description
          }
        })
      }

      // Calcular coste de envío desde configuración de la tienda
      const storeRecord = await Store.findByPk(storeId, { attributes: ['settings'], transaction })
      const storeFeatures = storeRecord?.settings?.enterprise_config?.features || {}
      const configShippingCost = storeFeatures.shipping_cost != null ? parseFloat(storeFeatures.shipping_cost) : 4.99
      const freeThreshold = storeFeatures.free_shipping_threshold != null ? parseFloat(storeFeatures.free_shipping_threshold) : 50
      const freeDisabled = storeFeatures.free_shipping_disabled || false
      const shippingAmount = freeDisabled
        ? configShippingCost
        : subtotal >= freeThreshold ? 0 : configShippingCost

      // Aplicar descuento si hay discount_id
      let discountAmount = 0
      let appliedDiscountCode = null
      if (discount_id) {
        const discountRecord = await DiscountCode.findOne({
          where: { id: discount_id, store_id: storeId, is_active: true },
          transaction
        })
        if (discountRecord && !(discountRecord.expires_at && new Date(discountRecord.expires_at) < new Date())
          && !(discountRecord.max_uses && discountRecord.used_count >= discountRecord.max_uses)) {
          discountAmount = discountRecord.type === 'percentage'
            ? (subtotal * parseFloat(discountRecord.value)) / 100
            : Math.min(parseFloat(discountRecord.value), subtotal)
          appliedDiscountCode = discountRecord.code
          await discountRecord.increment('used_count', { transaction })
        }
      }

      const totalAmount = subtotal + shippingAmount - discountAmount

      // generamos un número de pedido único
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const orderNumber = `ORD-${timestamp}-${random}`

      // creamos el pedido en estado pending_payment (el pago todavía no se ha confirmado)
      const order = await Order.create({
        order_number: orderNumber,
        store_id: storeId,
        customer_id: customerRecord.id,
        user_id: null,
        status: 'pending', // se cambiará a 'confirmed' cuando se confirme el pago
        payment_status: 'pending_payment', // esperando el pago de Stripe
        order_date: new Date(),
        subtotal: subtotal,
        tax_amount: 0,
        discount_amount: discountAmount,
        discount_code: appliedDiscountCode,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        shipping_address: shippingAddress || customerRecord.shipping_address,
        billing_address: billingAddress || customerRecord.billing_address,
        payment_method: paymentMethod || 'card',
        notes: notes || null
      }, { transaction })

      // creamos los items del pedido (el stock no se actualiza hasta confirmar el pago)
      for (const it of orderItems) {
        await OrderItem.create({ order_id: order.id, ...it }, { transaction })
      }

      // creamos el Payment Intent en Stripe
      const paymentIntent = await stripeService.createPaymentIntent(
        totalAmount,
        process.env.STRIPE_CURRENCY || 'eur',
        {
          orderId: order.id,
          orderNumber: order.order_number,
          customerId: customerRecord.id,
          customerEmail: customerRecord.email
        }
      )

      // actualizamos el pedido con los datos del payment intent de Stripe
      await order.update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret
      }, { transaction })

      // creamos el registro de transacción
      await Transaction.create({
        order_id: order.id,
        transaction_type: 'payment',
        amount: totalAmount,
        currency: (process.env.STRIPE_CURRENCY || 'EUR').toUpperCase(),
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        metadata: {
          payment_intent_status: paymentIntent.status,
          customer_email: customerRecord.email
        }
      }, { transaction })

      await transaction.commit()

      // devolvemos el pedido con el client secret para que el frontend complete el pago
      const created = await Order.findOne({
        where: {
          id: order.id,
          store_id: storeId
        },
        include: [{ all: true, nested: true }]
      })

      return res.status(201).json({
        success: true,
        message: 'Order created, awaiting payment',
        data: {
          order: created,
          clientSecret: paymentIntent.client_secret, // el frontend necesita esto para confirmar el pago
          paymentIntentId: paymentIntent.id
        }
      })

    } catch (error) {
      await transaction.rollback()
      console.error('Public create order error:', error)
      return res.status(500).json({ success: false, message: 'Error creating order', error: error.message })
    }
  }
}

module.exports = publicOrderController
