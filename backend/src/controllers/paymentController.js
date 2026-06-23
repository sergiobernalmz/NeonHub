const axios = require('axios');
const stripeService = require('../services/stripeService');
const { Order, Transaction, Customer, Product, OrderItem, Store, Cart, CartItem, sequelize } = require('../models');
const { emitOrderEvent } = require('../services/socketService');
const { generateInvoiceFromOrder } = require('../services/invoiceService');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const paymentController = {
    
    createPaymentIntent: async (req, res) => {
        try {
            const { orderId, amount, currency } = req.body;
            const storeId = resolveStoreId(req);

            if (!orderId || !amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID and amount are required'
                });
            }

            const requestedAmount = Number(amount);
            if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid amount'
                });
            }

            if (!storeId) {
                return res.status(403).json({
                    success: false,
                    message: 'Store context required'
                });
            }

            // Verify order exists
            const order = await Order.findOne({
                where: {
                    id: orderId,
                    store_id: storeId
                }
            });
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const orderTotal = Number(order.total_amount || 0);
            if (Math.abs(orderTotal - requestedAmount) > 0.01) {
                return res.status(400).json({
                    success: false,
                    message: 'Amount does not match order total'
                });
            }

            // creamos el Payment Intent en Stripe
            const paymentIntent = await stripeService.createPaymentIntent(
                requestedAmount,
                currency || process.env.STRIPE_CURRENCY || 'eur',
                {
                    orderId: order.id,
                    orderNumber: order.order_number,
                    customerId: order.customer_id
                }
            );

            // actualizamos el pedido con el Payment Intent ID y el client secret
            await order.update({
                stripe_payment_intent_id: paymentIntent.id,
                stripe_client_secret: paymentIntent.client_secret,
                payment_status: 'processing'
            });

            // creamos el registro de transacción
            await Transaction.create({
                order_id: order.id,
                transaction_type: 'payment',
                amount: requestedAmount,
                currency: currency || 'EUR',
                stripe_payment_intent_id: paymentIntent.id,
                status: 'pending',
                metadata: {
                    payment_intent_status: paymentIntent.status
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Payment Intent created',
                data: {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id
                }
            });

        } catch (error) {
            console.error('Error creating payment intent:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment intent',
                error: error.message
            });
        }
    },

    
    handleWebhook: async (req, res) => {
        const signature = req.headers['stripe-signature'];
        const rawBody = req.rawBody; // hay que configurar rawBody en app.js

        try {
            // Verify webhook signature
            const event = stripeService.constructWebhookEvent(rawBody, signature, process.env.STRIPE_PAYMENTS_WEBHOOK_SECRET);

            console.log(`📥 Webhook received: ${event.type}`);

            // gestionamos los distintos tipos de evento del webhook
            switch (event.type) {
                case 'payment_intent.succeeded':
                    await handlePaymentSuccess(event.data.object);
                    break;

                case 'payment_intent.payment_failed':
                    await handlePaymentFailed(event.data.object);
                    break;

                case 'payment_intent.canceled':
                    await handlePaymentCanceled(event.data.object);
                    break;

                case 'charge.refunded':
                    await handleRefund(event.data.object);
                    break;

                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }

            // devolvemos 200 para confirmar que lo hemos recibido
            return res.status(200).json({ received: true });

        } catch (error) {
            console.error('Webhook error:', error);
            return res.status(400).json({
                success: false,
                message: 'Webhook signature verification failed',
                error: error.message
            });
        }
    },

    
    refundOrder: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { orderId } = req.params;
            const { amount, reason } = req.body;
            const storeId = resolveStoreId(req);

            if (!storeId) {
                await transaction.rollback();
                return res.status(403).json({
                    success: false,
                    message: 'Store context required'
                });
            }

            // buscamos el pedido
            const order = await Order.findOne({
                where: {
                    id: orderId,
                    store_id: storeId
                },
                transaction
            });
            if (!order) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // comprobamos si el pedido tiene un payment intent
            if (!order.stripe_payment_intent_id) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Order has no associated payment'
                });
            }

            // comprobamos si ya fue reembolsado
            if (order.payment_status === 'refunded') {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Order already refunded'
                });
            }

            // Process refund in Stripe
            const refund = await stripeService.refundPayment(
                order.stripe_payment_intent_id,
                amount,
                reason || 'requested_by_customer'
            );

            // actualizamos el estado del pedido
            await order.update({
                payment_status: 'refunded',
                status: 'refunded'
            }, { transaction });

            // creamos el registro de la transacción de reembolso
            await Transaction.create({
                order_id: order.id,
                transaction_type: amount ? 'partial_refund' : 'refund',
                amount: refund.amount / 100, // convertimos de centavos a euros
                currency: refund.currency.toUpperCase(),
                stripe_payment_intent_id: order.stripe_payment_intent_id,
                stripe_refund_id: refund.id,
                status: 'succeeded',
                metadata: {
                    reason: reason,
                    refund_status: refund.status
                },
                processed_at: new Date()
            }, { transaction });

            await transaction.commit();

            return res.status(200).json({
                success: true,
                message: 'Refund processed successfully',
                data: {
                    refundId: refund.id,
                    amount: refund.amount / 100,
                    status: refund.status
                }
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Error processing refund:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to process refund',
                error: error.message
            });
        }
    }
};

async function handlePaymentSuccess(paymentIntent) {
    const transaction = await sequelize.transaction();

    try {
        // buscamos el pedido por el payment intent ID
        const order = await Order.findOne({
            where: { stripe_payment_intent_id: paymentIntent.id },
            include: [
                { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
                { model: Customer, as: 'customer' },
                { model: Store, as: 'store' }
            ],
            transaction
        });

        if (!order) {
            console.error(`Order not found for payment intent: ${paymentIntent.id}`);
            await transaction.rollback();
            return;
        }

        // obtenemos los detalles del método de pago
        const paymentDetails = stripeService.getPaymentMethodDetails(paymentIntent);

        // actualizamos el estado del pedido
        await order.update({
            payment_status: 'succeeded',
            status: 'confirmed',
            stripe_charge_id: paymentIntent.latest_charge
        }, { transaction });

        // actualizamos el stock de cada producto
        for (const item of order.items) {
            const product = item.product;
            if (product && product.track_inventory) {
                await product.update({
                    stock_quantity: product.stock_quantity - item.quantity
                }, { transaction });
            }
        }

        // actualizamos el registro de la transacción
        await Transaction.update({
            status: 'succeeded',
            stripe_charge_id: paymentIntent.latest_charge,
            payment_method_type: paymentDetails?.type,
            card_brand: paymentDetails?.card?.brand,
            card_last4: paymentDetails?.card?.last4,
            card_exp_month: paymentDetails?.card?.exp_month,
            card_exp_year: paymentDetails?.card?.exp_year,
            processed_at: new Date()
        }, {
            where: { stripe_payment_intent_id: paymentIntent.id },
            transaction
        });

        // vaciamos el carrito del usuario después de confirmar el pago
        const cart = await Cart.findOne({
            where: { user_id: order.user_id, status: 'active' },
            transaction
        });
        if (cart) {
            await CartItem.destroy({ where: { cart_id: cart.id }, transaction });
            await cart.update({ status: 'completed' }, { transaction });
        }

        await transaction.commit();
        console.log(`✅ Payment succeeded for order ${order.order_number}`);

        // generamos la factura de forma asíncrona — si falla no afecta al pago
        generateInvoiceFromOrder(order).catch(err =>
            console.error(`⚠️ Invoice generation failed for order ${order.order_number}:`, err.message)
        );

        // Emit socket event to admin dashboard
        emitOrderEvent(order.store_id, 'order:new', {
            orderId: order.id,
            orderNumber: order.order_number,
            total: order.total_amount,
            customerName: order.customer
                ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
                : 'Cliente',
            status: 'confirmed'
        });

        // Notify n8n for order confirmation email
        const webhookUrl = process.env.N8N_ORDER_CONFIRMED_WEBHOOK;
        if (webhookUrl && order.customer?.email) {
            axios.post(webhookUrl, {
                order_id: order.id,
                order_number: order.order_number,
                customer_email: order.customer.email,
                customer_name: `${order.customer.first_name} ${order.customer.last_name}`.trim(),
                store_name: order.store?.name || '',
                store_subdomain: order.store?.subdomain || '',
                total: order.total_amount,
                items: order.items?.map(i => ({
                    name: i.product?.name || i.product_snapshot?.name,
                    quantity: i.quantity,
                    price: i.unit_price
                })) || [],
                shipping_address: order.shipping_address,
                type: 'order_confirmed'
            }).catch(err => console.error('n8n order confirmed webhook error:', err.message));
        }

    } catch (error) {
        await transaction.rollback();
        console.error('Error handling payment success:', error);
    }
}

async function handlePaymentFailed(paymentIntent) {
    try {
        const order = await Order.findOne({
            where: { stripe_payment_intent_id: paymentIntent.id }
        });

        if (order) {
            await order.update({
                payment_status: 'failed',
                status: 'cancelled'
            });

            await Transaction.update({
                status: 'failed',
                error_code: paymentIntent.last_payment_error?.code,
                error_message: paymentIntent.last_payment_error?.message,
                processed_at: new Date()
            }, {
                where: { stripe_payment_intent_id: paymentIntent.id }
            });

            console.log(`❌ Payment failed for order ${order.order_number}`);
        }
    } catch (error) {
        console.error('Error handling payment failure:', error);
    }
}

async function handlePaymentCanceled(paymentIntent) {
    try {
        const order = await Order.findOne({
            where: { stripe_payment_intent_id: paymentIntent.id }
        });

        if (order) {
            await order.update({
                payment_status: 'cancelled',
                status: 'cancelled'
            });

            await Transaction.update({
                status: 'cancelled',
                processed_at: new Date()
            }, {
                where: { stripe_payment_intent_id: paymentIntent.id }
            });

            console.log(`🚫 Payment canceled for order ${order.order_number}`);
        }
    } catch (error) {
        console.error('Error handling payment cancellation:', error);
    }
}

async function handleRefund(charge) {
    try {
        const order = await Order.findOne({
            where: { stripe_charge_id: charge.id }
        });

        if (order) {
            await order.update({
                payment_status: 'refunded',
                status: 'refunded'
            });

            console.log(`💰 Refund processed for order ${order.order_number}`);
        }
    } catch (error) {
        console.error('Error handling refund:', error);
    }
}

module.exports = paymentController;
