const { SustainabilityMetric, Product, Category, Order, OrderItem, Customer, Supplier, User } = require('../models');
const { Op, Sequelize } = require('sequelize');
const RealTimeDataService = require('../services/realTimeDataService');
const { getSustainabilityScheduler } = require('../services/sustainabilityScheduler');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const getRecorderInclude = (storeId) => (storeId
  ? [{ model: User, as: 'recorder', attributes: [], where: { store_id: storeId }, required: true }]
  : []);

// Instancias de servicios
const realTimeDataService = new RealTimeDataService();
const scheduler = getSustainabilityScheduler();

const sustainabilityController = {
  // estadísticas del dashboard de sostenibilidad
  getDashboardStats: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const currentDate = new Date();
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const currentYear = new Date(currentDate.getFullYear(), 0, 1);

      // 1. Total CO2 footprint for current year
      const totalCO2Result = await SustainabilityMetric.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('value')), 'total']
        ],
        include: getRecorderInclude(storeId),
        where: {
          metric_type: 'carbon_footprint',
          period_start: { [Op.gte]: currentYear }
        }
      });
      const totalCO2 = parseFloat(totalCO2Result[0]?.dataValues?.total || 0);

      // 2. CO2 ahorrado este mes respecto a productos convencionales
      const co2SavedThisMonth = await SustainabilityMetric.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('value')), 'saved']
        ],
        include: getRecorderInclude(storeId),
        where: {
          metric_type: 'carbon_footprint',
          period_start: { [Op.gte]: currentMonth },
          notes: { [Op.like]: '%saved%' }
        }
      });
      const co2Saved = parseFloat(co2SavedThisMonth[0]?.dataValues?.saved || 0);

      // 3. Sustainable products percentage
      const totalProducts = await Product.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });
      const sustainableProducts = await Product.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {}),
          [Op.or]: [
            { description: { [Op.like]: '%ecológico%' } },
            { description: { [Op.like]: '%sostenible%' } },
            { description: { [Op.like]: '%bio%' } },
            { description: { [Op.like]: '%organic%' } }
          ]
        }
      });
      const sustainablePercentage = totalProducts > 0 ? Math.round((sustainableProducts / totalProducts) * 100) : 0;

      // 4. porcentaje de pedidos verdes
      const totalOrders = await Order.count({
        where: {
          created_at: { [Op.gte]: currentMonth },
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      const greenOrders = await Order.count({
        where: {
          created_at: { [Op.gte]: currentMonth },
          ...(storeId ? { store_id: storeId } : {})
        },
        include: [{
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product',
            where: {
              ...(storeId ? { store_id: storeId } : {}),
              [Op.or]: [
                { description: { [Op.like]: '%ecológico%' } },
                { description: { [Op.like]: '%sostenible%' } },
                { description: { [Op.like]: '%bio%' } }
              ]
            }
          }]
        }]
      });
      const greenOrdersPercentage = totalOrders > 0 ? Math.round((greenOrders / totalOrders) * 100) : 0;

      // 5. tendencia de impacto ambiental (últimos 6 meses)
      const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
      const monthlyMetrics = await SustainabilityMetric.findAll({
        attributes: [
          [Sequelize.fn('TO_CHAR', Sequelize.col('period_start'), 'YYYY-MM'), 'month'],
          [Sequelize.fn('SUM', Sequelize.col('value')), 'total'],
          'metric_type'
        ],
        include: getRecorderInclude(storeId),
        where: {
          period_start: { [Op.gte]: sixMonthsAgo },
          metric_type: ['carbon_footprint', 'energy_consumption', 'waste_generated']
        },
        group: ['month', 'metric_type'],
        order: [[Sequelize.fn('TO_CHAR', Sequelize.col('period_start'), 'YYYY-MM'), 'ASC']]
      });

      res.json({
        success: true,
        data: {
          totalCO2: totalCO2.toFixed(2),
          co2SavedThisMonth: co2Saved.toFixed(2),
          sustainableProductsPercentage: sustainablePercentage,
          greenOrdersPercentage: greenOrdersPercentage,
          monthlyTrends: monthlyMetrics.map(metric => ({
            month: metric.dataValues.month,
            value: parseFloat(metric.dataValues.total).toFixed(2),
            type: metric.dataValues.metric_type
          }))
        }
      });

    } catch (error) {
      console.error('Error getting sustainability dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de sostenibilidad',
        error: error.message
      });
    }
  },

  // huella de carbono por producto
  getCarbonFootprintByProduct: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const products = await Product.findAll({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        },
        attributes: ['id', 'name', 'price', 'carbon_footprint', 'eco_friendly'],
        limit: 20,
        order: [['created_at', 'DESC']]
      });

      // mapeamos los datos reales de la base de datos
      const carbonData = products.map(product => {
        // calculamos el ahorro respecto a un producto convencional de referencia (aprox 10kg CO2)
        const referenceCO2 = 10.0;
        const actualCO2 = parseFloat(product.carbon_footprint || 0);
        const savings = Math.max(0, referenceCO2 - actualCO2);

        return {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          carbonFootprint: actualCO2.toFixed(2),
          category: product.eco_friendly ? 'Ecológico' : 'Convencional',
          savings: savings.toFixed(2)
        };
      });

      res.json({
        success: true,
        data: carbonData
      });

    } catch (error) {
      console.error('Error getting carbon footprint by product:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener huella de carbono por producto',
        error: error.message
      });
    }
  },

  // métricas de sostenibilidad por proveedor
  getSupplierMetrics: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      // obtenemos los proveedores reales de la base de datos
      const suppliersList = await Supplier.findAll({
        where: { is_active: true },
        include: [{
          model: Product,
          as: 'products',
          attributes: ['id'],
          ...(storeId ? { where: { store_id: storeId }, required: false } : {})
        }]
      });

      const suppliers = suppliersList.map(s => ({
        id: s.id,
        name: s.name,
        certification: s.certification,
        score: s.sustainability_score,
        products: s.products ? s.products.length : 0
      }));

      const sustainableSuppliers = suppliers.filter(s => s.score >= 70).length;
      const totalSuppliers = suppliers.length;
      const averageScore = totalSuppliers > 0
        ? suppliers.reduce((sum, s) => sum + s.score, 0) / totalSuppliers
        : 0;

      res.json({
        success: true,
        data: {
          suppliers,
          stats: {
            total: totalSuppliers,
            sustainable: sustainableSuppliers,
            sustainablePercentage: totalSuppliers > 0 ? Math.round((sustainableSuppliers / totalSuppliers) * 100) : 0,
            averageScore: Math.round(averageScore)
          }
        }
      });

    } catch (error) {
      console.error('Error getting supplier metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de proveedores',
        error: error.message
      });
    }
  },

  // datos de comparación mensual
  getMonthlyComparison: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const currentDate = new Date();
      const months = [];

      // obtenemos los últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);

        // emisiones de CO2 del mes
        const co2Result = await SustainabilityMetric.findAll({
          attributes: [
            [Sequelize.fn('SUM', Sequelize.col('value')), 'total']
          ],
          include: getRecorderInclude(storeId),
          where: {
            metric_type: 'carbon_footprint',
            period_start: { [Op.gte]: monthDate, [Op.lt]: nextMonth }
          }
        });

        // número de pedidos del mes
        const ordersCount = await Order.count({
          where: {
            created_at: { [Op.gte]: monthDate, [Op.lt]: nextMonth },
            ...(storeId ? { store_id: storeId } : {})
          }
        });

        // ingresos del mes
        const revenueResult = await Order.findAll({
          attributes: [
            [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'total']
          ],
          where: {
            created_at: { [Op.gte]: monthDate, [Op.lt]: nextMonth },
            status: ['completed', 'delivered'],
            ...(storeId ? { store_id: storeId } : {})
          }
        });

        months.push({
          month: monthDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
          co2Emissions: parseFloat(co2Result[0]?.dataValues?.total || 0).toFixed(2),
          orders: ordersCount,
          revenue: parseFloat(revenueResult[0]?.dataValues?.total || 0).toFixed(2),
          co2PerOrder: ordersCount > 0 ?
            (parseFloat(co2Result[0]?.dataValues?.total || 0) / ordersCount).toFixed(2) : '0.00'
        });
      }

      res.json({
        success: true,
        data: months
      });

    } catch (error) {
      console.error('Error getting monthly comparison:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener comparativa mensual',
        error: error.message
      });
    }
  },

  // registrar nueva métrica de sostenibilidad
  recordMetric: async (req, res) => {
    try {
      const { metric_type, value, unit, period_start, period_end, source, notes, metadata } = req.body;

      const metric = await SustainabilityMetric.create({
        metric_type,
        value: parseFloat(value),
        unit,
        period_start: new Date(period_start),
        period_end: new Date(period_end),
        recorded_by: req.user.id,
        source,
        notes,
        metadata: metadata || {}
      });

      res.status(201).json({
        success: true,
        message: 'Métrica de sostenibilidad registrada exitosamente',
        data: metric
      });

    } catch (error) {
      console.error('Error recording sustainability metric:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar métrica de sostenibilidad',
        error: error.message
      });
    }
  },

  
  forceRealTimeUpdate: async (req, res) => {
    try {
      console.log('🔄 Forzando actualización de datos reales de sostenibilidad...');

      // usamos el ID del usuario o un fallback (la ruta está protegida, así que siempre hay usuario)
      const userId = req.user?.id;
      const result = await realTimeDataService.updateSustainabilityMetrics(userId);

      res.json({
        success: true,
        message: 'Métricas actualizadas con datos reales',
        data: result.summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error forzando actualización:', error);
      res.status(500).json({
        success: false,
        message: 'Error actualizando métricas reales',
        error: error.message
      });
    }
  },

  
  getSystemStatus: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const status = scheduler.getStatus();

      // Obtener estadísticas de la base de datos
      const totalMetrics = await SustainabilityMetric.count({
        include: getRecorderInclude(storeId)
      });
      const lastMetric = await SustainabilityMetric.findOne({
        include: getRecorderInclude(storeId),
        order: [['created_at', 'DESC']]
      });

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const todayUpdates = await SustainabilityMetric.count({
        include: getRecorderInclude(storeId),
        where: {
          created_at: {
            [Op.gte]: startOfDay
          }
        }
      });

      res.json({
        scheduler: status,
        database: {
          totalMetrics,
          todayUpdates,
          lastUpdate: lastMetric?.created_at,
          isRealTime: lastMetric?.source?.includes('Real') || false
        },
        system: {
          environment: process.env.NODE_ENV,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error obteniendo estado del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estado del sistema',
        error: error.message
      });
    }
  },

  
  toggleScheduler: async (req, res) => {
    try {
      const { action } = req.body; // 'start' o 'stop'

      if (action === 'start') {
        scheduler.start();
        res.json({
          success: true,
          message: 'Scheduler de actualizaciones iniciado',
          status: 'running'
        });
      } else if (action === 'stop') {
        scheduler.stop();
        res.json({
          success: true,
          message: 'Scheduler de actualizaciones detenido',
          status: 'stopped'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Acción no válida. Use "start" o "stop"'
        });
      }
    } catch (error) {
      console.error('Error controlando scheduler:', error);
      res.status(500).json({
        success: false,
        message: 'Error controlando scheduler',
        error: error.message
      });
    }
  },

  
  getApiConfiguration: async (req, res) => {
    try {
      const config = {
        apis: {
          co2Signal: {
            enabled: !!process.env.CO2_SIGNAL_API_KEY,
            url: 'https://api.co2signal.com/v1/latest'
          },
          openWeather: {
            enabled: !!process.env.OPENWEATHER_API_KEY,
            url: 'https://api.openweathermap.org/data/2.5/weather'
          },
          airQuality: {
            enabled: !!process.env.AIR_QUALITY_API_KEY,
            url: 'https://api.waqi.info/feed'
          },
          electricityMap: {
            enabled: !!process.env.ELECTRICITY_MAP_API_KEY,
            url: 'https://api.electricitymap.org/v3/power-breakdown/latest'
          }
        },
        location: {
          country: 'ES',
          city: 'Madrid',
          coordinates: { lat: 40.4168, lon: -3.7038 }
        },
        updateInterval: process.env.SUSTAINABILITY_UPDATE_INTERVAL || '*/30',
        // OpenMeteo no requiere key, por lo que siempre tenemos datos reales de clima
        fallbackMode: false // !process.env.CO2_SIGNAL_API_KEY
      };

      res.json(config);
    } catch (error) {
      console.error('Error obteniendo configuración de APIs:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo configuración',
        error: error.message
      });
    }
  },

  // registrar nueva métrica de sostenibilidad
  recordMetric: async (req, res) => {
    try {
      const { metric_type, value, unit, period_start, period_end, source, notes, metadata } = req.body;

      const metric = await SustainabilityMetric.create({
        metric_type,
        value: parseFloat(value),
        unit,
        period_start: new Date(period_start),
        period_end: new Date(period_end),
        recorded_by: req.user.id,
        source,
        notes,
        metadata: metadata || {}
      });

      res.status(201).json({
        success: true,
        message: 'Métrica de sostenibilidad registrada exitosamente',
        data: metric
      });

    } catch (error) {
      console.error('Error recording sustainability metric:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar métrica de sostenibilidad',
        error: error.message
      });
    }
  }
};

module.exports = { sustainabilityController };