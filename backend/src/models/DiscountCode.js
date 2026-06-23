const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DiscountCode = sequelize.define('DiscountCode', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            set(val) { this.setDataValue('code', val?.toUpperCase().trim()); }
        },
        type: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false,
            defaultValue: 'percentage'
        },
        value: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '20 = 20% de descuento o 20€ según el tipo'
        },
        description: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        min_order_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: 'Importe mínimo del carrito para aplicar el código'
        },
        max_uses: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'null = usos ilimitados'
        },
        used_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            comment: 'null = sin caducidad'
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'discount_codes',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['store_id', 'code'] }
        ]
    });

    return DiscountCode;
};
