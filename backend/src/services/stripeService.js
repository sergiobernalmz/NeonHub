const Stripe = require('stripe');

let stripeClient = null;

const getStripeClient = () => {
    if (stripeClient) return stripeClient;

    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY no configurada');
    }

    stripeClient = Stripe(process.env.STRIPE_SECRET_KEY);
    return stripeClient;
};

const stripeService = {
    
    async createPaymentIntent(amount, currency = 'eur', metadata = {}) {
        try {
            const stripe = getStripeClient();
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: currency.toLowerCase(),
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return paymentIntent;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw new Error(`Failed to create payment intent: ${error.message}`);
        }
    },

    
    async retrievePaymentIntent(paymentIntentId) {
        try {
            const stripe = getStripeClient();
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Error retrieving payment intent:', error);
            throw new Error(`Failed to retrieve payment intent: ${error.message}`);
        }
    },

    
    async confirmPayment(paymentIntentId) {
        try {
            const stripe = getStripeClient();
            const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Error confirming payment:', error);
            throw new Error(`Failed to confirm payment: ${error.message}`);
        }
    },

    
    async refundPayment(paymentIntentId, amount = null, reason = null) {
        try {
            const stripe = getStripeClient();
            const refundData = {
                payment_intent: paymentIntentId,
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100);
            }

            if (reason) {
                refundData.reason = reason; 
            }

            const refund = await stripe.refunds.create(refundData);
            return refund;
        } catch (error) {
            console.error('Error creating refund:', error);
            throw new Error(`Failed to create refund: ${error.message}`);
        }
    },

    
    constructWebhookEvent(payload, signature, secretOverride) {
        try {
            const stripe = getStripeClient();
            const webhookSecret = secretOverride || process.env.STRIPE_WEBHOOK_SECRET;

            if (!webhookSecret) {
                throw new Error('Webhook secret not configured');
            }

            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret
            );

            return event;
        } catch (error) {
            console.error('Error verifying webhook signature:', error);
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }
    },

    
    getPaymentMethodDetails(paymentIntent) {
        const paymentMethod = paymentIntent.charges?.data[0]?.payment_method_details;

        if (!paymentMethod) {
            return null;
        }

        return {
            type: paymentMethod.type, 
            card: paymentMethod.card ? {
                brand: paymentMethod.card.brand, 
                last4: paymentMethod.card.last4,
                exp_month: paymentMethod.card.exp_month,
                exp_year: paymentMethod.card.exp_year,
            } : null,
        };
    },

    
    async cancelPayment(paymentIntentId) {
        try {
            const stripe = getStripeClient();
            const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Error cancelling payment:', error);
            throw new Error(`Failed to cancel payment: ${error.message}`);
        }
    },

    
    async createCheckoutSession({
        planId,
        tenantName,
        subdomain,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName,
        customizationNotes,
        successUrl,
        cancelUrl
    }) {
        try {
            const stripe = getStripeClient();
            const normalizedPlanId = String(planId || '').toLowerCase();
            const priceIdEnvKey = `STRIPE_PRICE_${String(planId).toUpperCase()}`;
            const priceId = process.env[priceIdEnvKey];
            const billingMode = (process.env.STRIPE_BILLING_MODE || 'payment').toLowerCase();

            const planCatalog = {
                starter: {
                    amountCents: 49900,
                    monthlyCents: 2900,
                    name: 'NeonHub Starter',
                    description: 'Configuración inicial + Mantenimiento mensual'
                },
                process: {
                    amountCents: 49900,
                    monthlyCents: 2900,
                    name: 'NeonHub Starter',
                    description: 'Configuración inicial + Mantenimiento mensual'
                },
                installation: {
                    amountCents: 99900,
                    monthlyCents: 4900,
                    name: 'NeonHub Pro',
                    description: 'Instalación completa + Mantenimiento mensual'
                },
                enterprise: {
                    amountCents: 149900,
                    monthlyCents: 7900,
                    name: 'NeonHub Enterprise',
                    description: 'Personalización total + Mantenimiento mensual'
                }
            };

            const selectedPlan = planCatalog[normalizedPlanId];
            if (!selectedPlan) {
                throw new Error(`Plan no soportado: ${planId}`);
            }

            const sessionMode = 'subscription';
            const currency = (process.env.STRIPE_CURRENCY || 'eur').toLowerCase();

            const lineItems = [

                {
                    price_data: {
                        currency,
                        unit_amount: selectedPlan.monthlyCents,
                        recurring: { interval: 'month' },
                        product_data: {
                            name: `${selectedPlan.name} - Mantenimiento`,
                            description: 'Soporte, hosting y actualizaciones mensuales'
                        }
                    },
                    quantity: 1
                },

                {
                    price_data: {
                        currency,
                        unit_amount: selectedPlan.amountCents,
                        product_data: {
                            name: `${selectedPlan.name} - Configuración`,
                            description: 'Pago único por despliegue e inicialización de la tienda'
                        }
                    },
                    quantity: 1
                }
            ];

            const sessionPayload = {
                mode: sessionMode,
                customer_email: ownerEmail,
                line_items: lineItems,
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: {
                    plan_id: planId,
                    tenant_name: tenantName,
                    subdomain,
                    owner_email: ownerEmail,
                    owner_first_name: ownerFirstName || 'Owner',
                    owner_last_name: ownerLastName || 'Admin',
                    customization_notes: (customizationNotes || '').slice(0, 500),
                    setup_fee_cents: selectedPlan.amountCents,
                    monthly_fee_cents: selectedPlan.monthlyCents
                }
            };

            if (sessionPayload.mode === 'subscription') {
                sessionPayload.subscription_data = {
                    metadata: {
                        plan_id: planId,
                        tenant_name: tenantName,
                        subdomain,
                        owner_email: ownerEmail
                    }
                };
            }

            const session = await stripe.checkout.sessions.create(sessionPayload);

            return session;
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw new Error(`Failed to create checkout session: ${error.message}`);
        }
    },

    
    async retrieveCheckoutSession(sessionId) {
        try {
            const stripe = getStripeClient();
            return await stripe.checkout.sessions.retrieve(sessionId);
        } catch (error) {
            console.error('Error retrieving checkout session:', error);
            throw new Error(`Failed to retrieve checkout session: ${error.message}`);
        }
    }
};

module.exports = stripeService;
