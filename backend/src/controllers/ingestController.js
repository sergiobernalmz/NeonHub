const { Product, Order, Customer, Category, OrderItem } = require('../models');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const IngestController = {

    
    ingestProduct: async (req, res) => {
        // 1. validamos los datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const store = req.store; // inyectado por storeMiddleware
            const productData = req.body;

            // 2. comprobamos si ya existe el producto por SKU en esta tienda
            let product = await Product.findOne({
                where: {
                    sku: productData.sku,
                    store_id: store.id
                }
            });

            if (product) {
                // actualizamos el existente
                await product.update(productData);
                return res.status(200).json({
                    status: 'success',
                    action: 'updated',
                    id: product.id,
                    sku: product.sku
                });
            } else {
                // creamos el producto nuevo
                // la categoría se asigna por defecto si no existe

                product = await Product.create({
                    ...productData,
                    store_id: store.id
                });

                return res.status(201).json({
                    status: 'success',
                    action: 'created',
                    id: product.id,
                    sku: product.sku
                });
            }

        } catch (error) {
            console.error('Ingest Product Error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    },

    
    ingestOrder: async (req, res) => {
        try {
            const store = req.store;
            const orderData = req.body;

            // 1. buscamos al cliente por email y tienda, si no existe lo creamos
            let customer = await Customer.findOne({
                where: {
                    email: orderData.customer.email,
                    store_id: store.id
                }
            });

            if (!customer) {
                customer = await Customer.create({
                    ...orderData.customer, // nombre, apellido, email, etc.
                    store_id: store.id,
                    customer_code: 'CUST-' + uuidv4().substring(0, 8).toUpperCase()
                });
            }

            // 2. creamos el pedido
            const order = await Order.create({
                order_number: orderData.order_number,
                status: orderData.status || 'pending',
                total_amount: orderData.total_amount,
                shipping_amount: orderData.shipping_amount || 0,
                tax_amount: orderData.tax_amount || 0,
                payment_status: orderData.payment_status || 'paid',
                payment_method: orderData.payment_method,
                shipping_address: orderData.shipping_address,
                billing_address: orderData.billing_address || orderData.shipping_address,
                store_id: store.id,
                customer_id: customer.id,
                order_date: orderData.created_at || new Date()
            });

            // 3. procesamos las líneas del pedido y las enlazamos con los productos locales
            if (orderData.items && orderData.items.length > 0) {
                for (const item of orderData.items) {
                    // buscamos el producto local por SKU
                    const product = await Product.findOne({
                        where: {
                            sku: item.sku,
                            store_id: store.id
                        }
                    });

                    await OrderItem.create({
                        order_id: order.id,
                        product_id: product ? product.id : null, // si no se encuentra el producto lo dejamos sin enlazar
                        product_name: item.name, // guardamos siempre el nombre original
                        sku: item.sku,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.quantity * item.price
                    });

                    // descontamos stock si el producto está enlazado y tiene control de inventario
                    if (product && product.track_inventory) {
                        await product.updateStock(item.quantity, 'subtract');
                    }
                }
            }

            return res.status(201).json({
                status: 'success',
                id: order.id,
                order_number: order.order_number
            });

        } catch (error) {
            console.error('Ingest Order Error:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
};

module.exports = IngestController;
