const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Transaction = sequelize.define('Transaction', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        order_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            }
        },
        transaction_type: {
            type: DataTypes.ENUM('payment', 'refund', 'partial_refund'),
            allowNull: false,
            defaultValue: 'payment'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'EUR'
        },
        stripe_payment_intent_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true
        },
        stripe_charge_id: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        stripe_refund_id: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'),
            allowNull: false,
            defaultValue: 'pending'
        },
        payment_method_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'card, paypal, bank_transfer, etc.'
        },
        card_brand: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: 'visa, mastercard, amex, etc.'
        },
        card_last4: {
            type: DataTypes.STRING(4),
            allowNull: true
        },
        card_exp_month: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        card_exp_year: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        },
        error_code: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        processed_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'transactions',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                fields: ['order_id']
            },
            {
                fields: ['stripe_payment_intent_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['transaction_type']
            },
            {
                fields: ['processed_at']
            }
        ]
    });

    return Transaction;
};
