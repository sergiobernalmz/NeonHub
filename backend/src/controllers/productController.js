const { Product, Category, Store } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const validator = require('validator');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

// cosas para las fotos
const parseImagesField = (imagesField) => {
  if (!imagesField) return [];

  // si ya es un array pos ya esta
  if (Array.isArray(imagesField)) return imagesField;

  // si es un objeto ya estara listo
  if (typeof imagesField === 'object') return imagesField || [];

  // por si viene como un string raro
  if (typeof imagesField === 'string') {
    let str = imagesField.trim();

    // fuera comillas
    if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
      str = str.slice(1, -1);
    }

    // por si trae barras raras
    if (str.includes('\\"')) {
      try {
        const unescaped = str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        return JSON.parse(unescaped);
      } catch (e) {
        // seguimos
      }
    }

    try {
      return JSON.parse(str);
    } catch (e) {
      // por si hay un array por ahi
      const match = str.match(/\[.*\]/s);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (ee) {
          return [];
        }
      }
    }
  }

  return [];
};

const normalizeImagesForStorage = (images) => {
  const arr = parseImagesField(images);
  if (!Array.isArray(arr)) return [];
  return arr.map(img => ({
    filename: img.filename || '',
    url: img.url || (img.filename ? `/api/uploads/images/${img.filename}` : ''),
    thumbnailUrl: img.thumbnailUrl || (img.filename ? `/api/uploads/images/thumbnails/thumb_${(img.filename || '').replace(/\.[^/.]+$/, '')}.webp` : ''),
    originalName: img.originalName || img.filename || ''
  }));
};

const sanitizeText = (value) => {
  if (typeof value !== 'string') return value;
  let sanitized = validator.escape(value);
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on[a-z]+\s*=\s*/gi, '');
  return sanitized;
};

const productController = {
  // pilla todos los productos
  getAll: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        minPrice,
        maxPrice,
        isActive,
        isFeatured,
        ecoFriendly,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {};
      const storeId = resolveStoreId(req);
      const likeOperator = Product.sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;

      if (storeId) {
        whereClause.store_id = storeId;
      }
      const include = [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name', 'slug']
      }];

      // ponemos los filtros
      if (search) {
        whereClause[Op.or] = [
          { name: { [likeOperator]: `%${search}%` } },
          { description: { [likeOperator]: `%${search}%` } },
          { sku: { [likeOperator]: `%${search}%` } }
        ];
      }

      if (category) {
        whereClause.category_id = category;
      }

      if (minPrice) {
        whereClause.price = { ...whereClause.price, [Op.gte]: parseFloat(minPrice) };
      }

      if (maxPrice) {
        whereClause.price = { ...whereClause.price, [Op.lte]: parseFloat(maxPrice) };
      }

      if (isActive !== undefined) {
        whereClause.is_active = isActive === 'true';
      }

      if (isFeatured !== undefined) {
        whereClause.is_featured = isFeatured === 'true';
      }

      if (ecoFriendly !== undefined) {
        whereClause.eco_friendly = ecoFriendly === 'true';
      }

      const { count, rows: rawProducts } = await Product.findAndCountAll({
        where: whereClause,
        include,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        distinct: true,
        attributes: { include: ['images'] } // que traiga las fotos
      });

      // arreglamos las fotos
      const products = rawProducts.map(product => {
        const plainProduct = product.get({ plain: true });
        plainProduct.images = normalizeImagesForStorage(plainProduct.images);
        return plainProduct;
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          products,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos'
      });
    }
  },

  // busca uno por su id
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const rawProduct = await Product.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        }],
        attributes: { include: ['images'] } // que traiga las fotos
      });

      if (!rawProduct) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // arreglamos las fotos
      const plainProduct = rawProduct.get({ plain: true });
      plainProduct.images = normalizeImagesForStorage(plainProduct.images);

      res.json({
        success: true,
        data: { product: plainProduct }
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto'
      });
    }
  },

  // busca por el sku
  getBySku: async (req, res) => {
    try {
      const { sku } = req.params;
      const storeId = resolveStoreId(req);

      const product = await Product.findOne({
        where: {
          sku,
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug', 'description']
        }]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      const productPlain = product.get ? product.get({ plain: true }) : product;
      productPlain.images = normalizeImagesForStorage(productPlain.images);

      res.json({
        success: true,
        data: { product: productPlain }
      });
    } catch (error) {
      console.error('Get product by SKU error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto'
      });
    }
  },

  // mete un producto nuevo
  create: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const productData = req.body;
      const storeId = resolveStoreId(req);
      const nameForSlug = productData.name;

      if (!storeId) {
        return res.status(400).json({
          success: false,
          message: 'Contexto de tienda requerido'
        });
      }

      // mira si no nos pasamos de productos
      const store = await Store.findByPk(storeId);
      if (store && store.settings && store.settings.limits) {
        const { max_products } = store.settings.limits;
        if (max_products && max_products !== -1) {
          const count = await Product.count({ where: { store_id: storeId } });
          if (count >= max_products) {
            return res.status(403).json({
              success: false,
              message: `Límite de productos excedido (${max_products}). Actualiza tu plan para añadir más.`
            });
          }
        }
      }

      productData.store_id = storeId;
      if (productData.name) productData.name = validator.escape(productData.name);
      if (productData.description) productData.description = sanitizeText(productData.description);
      if (productData.short_description) productData.short_description = sanitizeText(productData.short_description);
      
      // dejamos las fotos bien para guardar
      if (productData.images) {
        productData.images = normalizeImagesForStorage(productData.images);
      } else {
        productData.images = [];
      }

      // mira si el sku esta repe
      const existingProduct = await Product.findOne({
        where: {
          sku: productData.sku,
          store_id: storeId
        }
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: 'El SKU ya existe'
        });
      }

      // hacemos el slug con el nombre
      if (!productData.slug) {
        productData.slug = nameForSlug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      const product = await Product.create(productData);

      // pilla el producto que acabamos de crear
      const rawProduct = await Product.findByPk(product.id, {
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }]
      });
      
      // lo pasamos a objeto normal
      const createdProduct = rawProduct.get({ plain: true });

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: { product: createdProduct }
      });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear producto'
      });
    }
  },

  // para cambiar cosas del producto
  update: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Datos de validación incorrectos',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const updateData = req.body;
      const storeId = resolveStoreId(req);

      if (updateData.name) updateData.name = validator.escape(updateData.name);
      if (updateData.description) updateData.description = sanitizeText(updateData.description);
      if (updateData.short_description) updateData.short_description = sanitizeText(updateData.short_description);
      
      // arreglamos las fotos
      if (updateData.images) {
        updateData.images = normalizeImagesForStorage(updateData.images);
      }

      const product = await Product.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // que el sku no este en otro
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await Product.findOne({
          where: {
            sku: updateData.sku,
            id: { [Op.ne]: id },
            ...(storeId ? { store_id: storeId } : {})
          }
        });

        if (existingProduct) {
          return res.status(409).json({
            success: false,
            message: 'El SKU ya existe'
          });
        }
      }

      await product.update(updateData);

      // pilla el producto ya cambiado
      const rawProduct = await Product.findByPk(id, {
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }],
        attributes: { include: ['images'] } // Explicitly include images field
      });
      
      // Normalizar el formato de imágenes para evitar problemas de serialización
      const updatedProduct = rawProduct.get({ plain: true });
      
      // arreglamos las fotos
      if (updatedProduct.images) {
        try {
          let normalizedImages;
          
          if (typeof updatedProduct.images === 'string') {
            try {
              // por si es un string raro
              if (updatedProduct.images.includes('\\"')) {
                // es un string de esos raros
                const cleanString = updatedProduct.images.replace(/\\/g, '');
                normalizedImages = JSON.parse(cleanString);
              } else {
                // es un json de toda la vida
                normalizedImages = JSON.parse(updatedProduct.images);
              }
            } catch (e) {
              console.warn(`Error parsing images for ${updatedProduct.name}:`, e);
              normalizedImages = [];
            }
          } else if (Array.isArray(updatedProduct.images)) {
            normalizedImages = updatedProduct.images;
          } else {
            normalizedImages = [];
          }
          
          // que sea un array si o si
          updatedProduct.images = Array.isArray(normalizedImages) ? normalizedImages : [];
          
        } catch (e) {
          console.warn(`Error normalizing images for ${updatedProduct.name}:`, e);
          updatedProduct.images = [];
        }
      } else {
        updatedProduct.images = [];
      }

      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: { product: updatedProduct }
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto'
      });
    }
  },

  // para borrar el producto
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const storeId = resolveStoreId(req);

      const product = await Product.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      await product.destroy();

      res.json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto'
      });
    }
  },

  // para cambiar el stock
  updateStock: async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity, operation = 'set' } = req.body; // para poner sumar o restar
      const storeId = resolveStoreId(req);

      const product = await Product.findOne({
        where: {
          id,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      let newQuantity;
      switch (operation) {
        case 'add':
          newQuantity = product.stock_quantity + parseInt(quantity);
          break;
        case 'subtract':
          newQuantity = product.stock_quantity - parseInt(quantity);
          break;
        default:
          newQuantity = parseInt(quantity);
      }

      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'El stock no puede ser negativo'
        });
      }

      await product.update({ stock_quantity: newQuantity });

      res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: {
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
            stock_quantity: newQuantity
          }
        }
      });
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar stock'
      });
    }
  },

  // pilla los que se estan acabando
  getLowStock: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const products = await Product.findAll({
        where: {
          [Op.and]: [
            ...(storeId ? [{ store_id: storeId }] : []),
            { track_inventory: true },
            { is_active: true },
            {
              [Op.or]: [
                {
                  stock_quantity: {
                    [Op.lte]: Product.sequelize.col('min_stock_level')
                  }
                },
                {
                  stock_quantity: {
                    [Op.lte]: 10 // aviso de poco stock
                  }
                }
              ]
            }
          ]
        },
        include: [{
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }],
        order: [['stock_quantity', 'ASC']]
      });

      res.json({
        success: true,
        data: { products }
      });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos con stock bajo'
      });
    }
  }
};

module.exports = productController;
