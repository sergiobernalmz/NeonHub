const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200]
      }
    },
    slug: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    short_description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    category_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    supplier_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    cost_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    compare_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      defaultValue: 'EUR'
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    min_stock_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    max_stock_level: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    track_inventory: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    allow_backorder: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    weight: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: true,
      validate: {
        min: 0
      }
    },
    dimensions: {
      type: DataTypes.JSON,
      allowNull: true
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    carbon_footprint: {
      type: DataTypes.DECIMAL(8, 3),
      allowNull: true,
      comment: 'Huella de carbono en kg CO2'
    },
    sustainability_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
    },
    eco_friendly: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    recyclable: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'products',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['sku']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['stock_quantity']
      },
      {
        unique: true,
        fields: ['sku', 'store_id']
      },
      {
        unique: true,
        fields: ['slug', 'store_id']
      }
    ]
  });

  Product.prototype.isLowStock = function () {
    return this.stock_quantity <= this.min_stock_level;
  };

  Product.prototype.isOutOfStock = function () {
    return this.stock_quantity === 0;
  };

  Product.prototype.getMargin = function () {
    if (!this.cost_price) return null;
    return ((this.price - this.cost_price) / this.price * 100).toFixed(2);
  };

  Product.prototype.updateStock = async function (quantity, operation = 'subtract') {
    const newQuantity = operation === 'add'
      ? this.stock_quantity + quantity
      : this.stock_quantity - quantity;

    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }

    return this.update({ stock_quantity: newQuantity });
  };

  Product.prototype.addImage = function (imageUrl) {
    const images = this.images || [];
    images.push(imageUrl);
    this.images = images;
    this.changed('images', true);
  };

  Product.prototype.removeImage = function (imageUrl) {
    const images = this.images || [];
    this.images = images.filter(img => img !== imageUrl);
    this.changed('images', true);
  };

  Product.prototype.addTag = function (tag) {
    const tags = this.tags || [];
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.tags = tags;
      this.changed('tags', true);
    }
  };

  Product.prototype.removeTag = function (tag) {
    const tags = this.tags || [];
    this.tags = tags.filter(t => t !== tag);
    this.changed('tags', true);
  };

  return Product;
};
