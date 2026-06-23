const { DataTypes, Model } = require('sequelize');

class SupportTicket extends Model {
    static init(sequelize) {
        return super.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true
                },
                customer_email: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                subject: {
                    type: DataTypes.STRING,
                    allowNull: false
                },
                message: {
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                status: {
                    type: DataTypes.ENUM('open', 'in_progress', 'resolved'),
                    defaultValue: 'open'
                },
                priority: {
                    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
                    defaultValue: 'normal'
                },
                responses: {
                    type: DataTypes.JSONB,
                    defaultValue: []
                },
                read_by_customer: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                read_by_admin: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                },
                customer_last_seen: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                admin_last_seen: {
                    type: DataTypes.DATE,
                    allowNull: true
                },
                store_id: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    defaultValue: null
                },
                ticket_type: {
                    type: DataTypes.ENUM('store_support', 'neonhub_support'),
                    allowNull: false,
                    defaultValue: 'store_support'
                }
            },
            {
                sequelize,
                modelName: 'SupportTicket',
                tableName: 'support_tickets',
                timestamps: true,
                underscored: true
            }
        );
    }

    static associate(models) {
        if (models.Store) {
            SupportTicket.belongsTo(models.Store, {
                foreignKey: 'store_id',
                as: 'store'
            });
        }
    }
}

module.exports = SupportTicket;
