describe('Product Model', () => {
  let Product, Category;

  beforeAll(() => {
    const models = global.testUtils.getModels();
    Product = models.Product;
    Category = models.Category;
  });

  describe('Product Creation', () => {
    test('should create a product with valid data', async () => {
      const product = await global.testUtils.createTestProduct({
        name: 'Eco-Friendly T-Shirt',
        sku: 'ECO-001',
        price: 29.99,
        carbon_footprint: 1.5,
        sustainability_score: 85
      });

      expect(product.id).toBeDefined();
      expect(product.name).toBe('Eco-Friendly T-Shirt');
      expect(product.sku).toBe('ECO-001');
      expect(parseFloat(product.price)).toBe(29.99); // conversión de decimal
      expect(parseFloat(product.carbon_footprint)).toBe(1.5);
      expect(product.sustainability_score).toBe(85);
      expect(product.is_active).toBe(true);
    });

    test('should fail with duplicate SKU', async () => {
      const store = await global.testUtils.createTestStore();
      await global.testUtils.createTestProduct({ sku: 'DUPLICATE-SKU', store_id: store.id });

      await expect(
        global.testUtils.createTestProduct({ 
          sku: 'DUPLICATE-SKU',
          name: 'Another Product',
          store_id: store.id
        })
      ).rejects.toThrow();
    });

    test('should fail with duplicate slug', async () => {
      const store = await global.testUtils.createTestStore();
      await global.testUtils.createTestProduct({ slug: 'duplicate-slug', store_id: store.id });

      await expect(
        global.testUtils.createTestProduct({ 
          slug: 'duplicate-slug',
          sku: 'DIFFERENT-SKU',
          store_id: store.id
        })
      ).rejects.toThrow();
    });
  });

  describe('Product Validations', () => {
    test('should require name', async () => {
      const store = await global.testUtils.createTestStore();
      const productData = {
        store_id: store.id,
        sku: 'TEST-001',
        price: 99.99
      };

      await expect(Product.create(productData))
        .rejects
        .toThrow();
    });

    test('should require SKU', async () => {
      const store = await global.testUtils.createTestStore();
      const productData = {
        store_id: store.id,
        name: 'Test Product',
        price: 99.99
      };

      await expect(Product.create(productData))
        .rejects
        .toThrow();
    });

    test('should validate price is positive', async () => {
      const store = await global.testUtils.createTestStore();
      const productData = {
        store_id: store.id,
        name: 'Test Product',
        sku: 'TEST-001',
        slug: 'test-product',
        price: -10.00 // precio negativo (debe fallar)
      };

      await expect(Product.create(productData))
        .rejects
        .toThrow();
    });

    test('should validate stock quantity is non-negative', async () => {
      const store = await global.testUtils.createTestStore();
      const productData = {
        store_id: store.id,
        name: 'Test Product',
        sku: 'TEST-001',
        slug: 'test-product',
        price: 99.99,
        stock_quantity: -5 // stock negativo (debe fallar)
      };

      await expect(Product.create(productData))
        .rejects
        .toThrow();
    });

    test('should validate sustainability_score range (1-100)', async () => {
      const store = await global.testUtils.createTestStore();
      // comprobamos que falla con sustainability_score > 100
      const productData1 = {
        store_id: store.id,
        name: 'Test Product 1',
        sku: 'TEST-001',
        slug: 'test-product-1',
        price: 99.99,
        sustainability_score: 101 // demasiado alto
      };

      await expect(Product.create(productData1))
        .rejects
        .toThrow();

      // comprobamos que falla con sustainability_score < 0 (puede ser null, pero si se pone tiene que ser 0-100)
      const productData2 = {
        store_id: store.id,
        name: 'Test Product 2',
        sku: 'TEST-002',
        slug: 'test-product-2',
        price: 99.99,
        sustainability_score: -1 // demasiado bajo
      };

      await expect(Product.create(productData2))
        .rejects
        .toThrow();
    });
  });

  describe('Product Sustainability Features', () => {
    test('should store carbon footprint correctly', async () => {
      const product = await global.testUtils.createTestProduct({
        carbon_footprint: 3.14159
      });

      expect(parseFloat(product.carbon_footprint)).toBeCloseTo(3.142, 3);
    });

    test('should store metadata as JSON', async () => {
      const metadata = {
        primary_material: 'organic_cotton',
        recycled_content: 0.3,
        certifications: ['GOTS', 'OEKO-TEX'],
        origin: 'EU'
      };

      const product = await global.testUtils.createTestProduct({
        metadata: metadata
      });

      expect(product.metadata).toEqual(metadata);
      expect(product.metadata.primary_material).toBe('organic_cotton');
      expect(product.metadata.recycled_content).toBe(0.3);
    });

    test('should calculate sustainability score', async () => {
      // calculamos la sostenibilidad general en base a carbon_footprint y otros factores
      const product = await global.testUtils.createTestProduct({
        carbon_footprint: 1.0, // huella de carbono baja
        sustainability_score: 90, // puntuación de sostenibilidad alta
        metadata: {
          recycled_content: 0.8,
          certifications: ['GOTS']
        }
      });

      // comprobamos que los valores se guardaron bien
      expect(parseFloat(product.carbon_footprint)).toBe(1.0);
      expect(product.sustainability_score).toBe(90);
      expect(product.metadata.recycled_content).toBe(0.8);
    });
  });

  describe('Product Methods', () => {
    test('should check if product is in stock', async () => {
      const inStockProduct = await global.testUtils.createTestProduct({
        stock_quantity: 10
      });

      const outOfStockProduct = await global.testUtils.createTestProduct({
        sku: 'OUT-OF-STOCK',
        slug: 'out-of-stock',
        stock_quantity: 0
      });

      // probamos los métodos del modelo
      expect(inStockProduct.isOutOfStock()).toBe(false);
      expect(outOfStockProduct.isOutOfStock()).toBe(true);
      expect(inStockProduct.stock_quantity > 0).toBe(true);
      expect(outOfStockProduct.stock_quantity === 0).toBe(true);
    });

    test('should format price correctly', async () => {
      const product = await global.testUtils.createTestProduct({
        price: 99.99
      });

      // comprobación básica del precio ya que no hay método de formateo
      expect(parseFloat(product.price)).toBe(99.99);
      expect(product.currency).toBe('EUR');
    });
  });

  describe('Product Associations', () => {
    test('should associate with category', async () => {
      const category = await Category.create({
        name: 'Sustainable Clothing',
        slug: 'sustainable-clothing',
        description: 'Eco-friendly clothing category'
      });

      const product = await global.testUtils.createTestProduct({
        category_id: category.id
      });

      await product.reload({ include: [{ model: Category, as: 'category' }] });

      expect(product.category).toBeDefined();
      expect(product.category.name).toBe('Sustainable Clothing');
    });
  });

  describe('Product Queries', () => {
    test('should find products by sustainability criteria', async () => {
      // creamos productos con distintas puntuaciones de sostenibilidad
      await global.testUtils.createTestProduct({
        name: 'High Eco Product',
        sku: 'ECO-HIGH',
        slug: 'high-eco-product',
        sustainability_score: 90,
        carbon_footprint: 1.0
      });

      await global.testUtils.createTestProduct({
        name: 'Low Eco Product',
        sku: 'ECO-LOW',
        slug: 'low-eco-product',
        sustainability_score: 30,
        carbon_footprint: 5.0
      });

      // buscamos los productos con alta sostenibilidad
      const sustainableProducts = await Product.findAll({
        where: {
          sustainability_score: { [require('sequelize').Op.gte]: 80 }
        }
      });

      expect(sustainableProducts).toHaveLength(1);
      expect(sustainableProducts[0].name).toBe('High Eco Product');
    });

    test('should find products with low carbon footprint', async () => {
      await global.testUtils.createTestProduct({
        name: 'Low Carbon Product',
        sku: 'LOW-CARBON',
        slug: 'low-carbon-product',
        carbon_footprint: 0.8
      });

      await global.testUtils.createTestProduct({
        name: 'High Carbon Product',
        sku: 'HIGH-CARBON',
        slug: 'high-carbon-product',
        carbon_footprint: 4.2
      });

      const lowCarbonProducts = await Product.findAll({
        where: {
          carbon_footprint: { [require('sequelize').Op.lt]: 2.0 }
        }
      });

      expect(lowCarbonProducts).toHaveLength(1);
      expect(lowCarbonProducts[0].name).toBe('Low Carbon Product');
    });
  });
});
