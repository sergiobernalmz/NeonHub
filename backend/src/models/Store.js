const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const Store = sequelize.define('Store', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        subdomain: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                isAlphanumeric: true,
                len: [3, 50]
            }
        },
        api_key_public: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true
        },
        api_key_secret: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        settings: {
            type: DataTypes.JSON,
            defaultValue: {
                currency: 'EUR',
                language: 'es',
                theme: {
                    primaryColor: '#0ea5e9',
                    darkMode: true
                },
                contact: {
                    email: '',
                    phone: ''
                }
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        // --- Campos de facturación / suscripción ---
        plan_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: null,
            comment: 'Plan contratado: starter, process, installation, enterprise'
        },
        plan_price_cents: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Precio mensual en céntimos (49900 = 499€)'
        },
        billing_start_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: null,
            comment: 'Fecha de inicio de facturación'
        },
        next_payment_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: null,
            comment: 'Fecha del próximo pago'
        },
        payment_status: {
            type: DataTypes.ENUM('paid', 'pending', 'overdue', 'cancelled', 'trial'),
            allowNull: true,
            defaultValue: null,
            comment: 'Estado actual del pago'
        },
        stripe_customer_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: null
        },
        stripe_subscription_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: null
        },
        paused_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            comment: 'Fecha en que se pausó el servicio (null = no pausado)'
        },
        paused_reason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: null,
            comment: 'Razón de la pausa'
        },
        trial_ends_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            comment: 'Fin del período de prueba (null = no es trial)'
        },
        url_mapping: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            comment: 'Custom URL paths per store. JSON: {"shop": "/tienda", "dashboard": "/panel"}'
        },
        trial_plan: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: 'installation',
            comment: 'Plan activo durante el trial'
        },
        // --- Custom Domain ---
        custom_domain: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true,
            validate: {
                isUrl: true
            }
        },
        custom_domain_ssl_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        custom_domain_verification_token: {
            type: DataTypes.STRING(64),
            allowNull: true
        }
    }, {
        tableName: 'stores',
        timestamps: true,
        paranoid: true,
        hooks: {
            beforeCreate: (store) => {
                if (!store.api_key_public) {
                    store.api_key_public = 'pk_' + uuidv4().replace(/-/g, '');
                }
                if (!store.api_key_secret) {
                    store.api_key_secret = 'sk_' + uuidv4().replace(/-/g, '');
                }
            }
        }
    });

    return Store;
};
