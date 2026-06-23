const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        // añadimos las columnas de Stripe a la tabla de pedidos
        await queryInterface.addColumn('orders', 'stripe_payment_intent_id', {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true,
            comment: 'Stripe Payment Intent ID'
        });

        await queryInterface.addColumn('orders', 'stripe_charge_id', {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Stripe Charge ID after successful payment'
        });

        await queryInterface.addColumn('orders', 'stripe_client_secret', {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'Client secret for confirming payment on frontend'
        });

        // creamos la tabla de transacciones
        await queryInterface.createTable('transactions', {
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
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
                allowNull: true
            },
            card_brand: {
                type: DataTypes.STRING(20),
                allowNull: true
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
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            deletedAt: {
                type: DataTypes.DATE,
                allowNull: true
            }
        });

        // añadimos índices a la tabla de transacciones
        await queryInterface.addIndex('transactions', ['order_id'], {
            name: 'transactions_order_id_idx'
        });

        await queryInterface.addIndex('transactions', ['stripe_payment_intent_id'], {
            name: 'transactions_stripe_payment_intent_id_idx'
        });

        await queryInterface.addIndex('transactions', ['status'], {
            name: 'transactions_status_idx'
        });

        await queryInterface.addIndex('transactions', ['transaction_type'], {
            name: 'transactions_transaction_type_idx'
        });

        await queryInterface.addIndex('transactions', ['processed_at'], {
            name: 'transactions_processed_at_idx'
        });
    },

    down: async (queryInterface) => {
        // borramos los índices
        await queryInterface.removeIndex('transactions', 'transactions_order_id_idx');
        await queryInterface.removeIndex('transactions', 'transactions_stripe_payment_intent_id_idx');
        await queryInterface.removeIndex('transactions', 'transactions_status_idx');
        await queryInterface.removeIndex('transactions', 'transactions_transaction_type_idx');
        await queryInterface.removeIndex('transactions', 'transactions_processed_at_idx');

        // eliminamos la tabla de transacciones
        await queryInterface.dropTable('transactions');

        // quitamos las columnas de Stripe de la tabla de pedidos
        await queryInterface.removeColumn('orders', 'stripe_payment_intent_id');
        await queryInterface.removeColumn('orders', 'stripe_charge_id');
        await queryInterface.removeColumn('orders', 'stripe_client_secret');
    }
};
