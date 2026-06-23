const { User, Role, Product, Order, OrderItem, Category, Customer, DiscountCode } = require('../models');
const { sequelize } = require('../config/database');
const { Op, Sequelize } = require('sequelize');

const resolveStoreId = (req) => req.tenant?.id || req.user?.storeId || req.user?.store_id || null;

const clampChange = (raw) => {
  const n = parseFloat(raw);
  if (isNaN(n) || !isFinite(n)) return 0;
  return Math.max(-999, Math.min(999, n));
};

const dashboardController = {
  // obtener las estadísticas del dashboard
  getDashboardStats: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const totalUsers = await User.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      const totalProducts = await Product.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      const totalOrders = await Order.count({
        where: {
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      // Contar clientes de la tienda (tabla customers)
      const totalCustomers = await Customer.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      // Calcular ventas totales
      const totalSalesResult = await Order.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'totalSales']
        ],
        where: {
          status: ['completed', 'delivered'],
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      const totalSales = totalSalesResult[0]?.dataValues?.totalSales || 0;

      // Estadísticas del mes actual
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const daysElapsed = today.getDate();

      // Mismo período proporcional del mes anterior
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthSamePeriodEnd = new Date(today.getFullYear(), today.getMonth() - 1, daysElapsed, 23, 59, 59);

      const ACTIVE_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered', 'completed'];

      const currentMonthOrders = await Order.count({
        where: {
          ...(storeId ? { store_id: storeId } : {}),
          status: ACTIVE_STATUSES,
          created_at: { [Op.gte]: firstDayOfMonth }
        }
      });

      // Ventas del mes actual
      const currentMonthSales = await Order.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'monthSales']
        ],
        where: {
          status: ['completed', 'delivered'],
          ...(storeId ? { store_id: storeId } : {}),
          created_at: { [Op.gte]: firstDayOfMonth }
        }
      });

      const monthSales = parseFloat(currentMonthSales[0]?.dataValues?.monthSales) || 0;

      // Mismo período del mes anterior (proporcional a días transcurridos)
      const lastMonthOrders = await Order.count({
        where: {
          ...(storeId ? { store_id: storeId } : {}),
          status: ACTIVE_STATUSES,
          created_at: { [Op.between]: [lastMonthStart, lastMonthSamePeriodEnd] }
        }
      });

      const lastMonthSalesResult = await Order.findAll({
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'lastMonthSales']
        ],
        where: {
          ...(storeId ? { store_id: storeId } : {}),
          status: ['completed', 'delivered'],
          created_at: { [Op.between]: [lastMonthStart, lastMonthSamePeriodEnd] }
        }
      });

      const lastMonthSalesValue = parseFloat(lastMonthSalesResult[0]?.dataValues?.lastMonthSales) || 0;

      // Calcular porcentajes de cambio con tope ±999%
      const salesChange = clampChange(
        lastMonthSalesValue > 0
          ? (monthSales - lastMonthSalesValue) / lastMonthSalesValue * 100
          : monthSales > 0 ? 100 : 0
      );

      const ordersChange = clampChange(
        lastMonthOrders > 0
          ? (currentMonthOrders - lastMonthOrders) / lastMonthOrders * 100
          : currentMonthOrders > 0 ? 100 : 0
      );

      // Descuentos del mes (solo si el módulo está activo)
      const storeFeatures = req.tenant?.store?.settings?.enterprise_config?.features || {};
      let discountStats = null;
      if (storeFeatures.discounts && storeId) {
        const [discountOrders, totalDiscounted] = await Promise.all([
          Order.count({
            where: {
              store_id: storeId,
              discount_amount: { [Op.gt]: 0 },
              created_at: { [Op.gte]: firstDayOfMonth }
            }
          }),
          Order.sum('discount_amount', {
            where: {
              store_id: storeId,
              discount_amount: { [Op.gt]: 0 },
              created_at: { [Op.gte]: firstDayOfMonth }
            }
          })
        ]);
        discountStats = {
          orders_with_discount: discountOrders || 0,
          total_discounted: parseFloat(totalDiscounted || 0).toFixed(2)
        };
      }

      res.json({
        success: true,
        data: {
          stats: {
            totalSales: {
              value: totalSales,
              change: salesChange,
              trend: salesChange >= 0 ? 'up' : 'down'
            },
            totalOrders: {
              value: totalOrders,
              change: ordersChange,
              trend: ordersChange >= 0 ? 'up' : 'down'
            },
            totalProducts: {
              value: totalProducts,
              change: 0,
              trend: 'up'
            },
            totalCustomers: {
              value: totalCustomers,
              change: 0,
              trend: 'up'
            },
            totalUsers: {
              value: totalUsers,
              change: 0,
              trend: 'up'
            },
            ...(discountStats ? { discounts: discountStats } : {})
          }
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // obtener los datos de ventas para las gráficas
  getSalesData: async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      const storeId = resolveStoreId(req);

      let dateFormat, groupBy;
      const currentDate = new Date();

      if (period === 'year') {
        // agrupamos por mes del último año (PostgreSQL usa TO_CHAR)
        dateFormat = 'YYYY-MM';
        groupBy = Sequelize.fn('TO_CHAR', Sequelize.col('created_at'), 'YYYY-MM');
      } else {
        // agrupamos por día del último mes (PostgreSQL usa TO_CHAR)
        dateFormat = 'YYYY-MM-DD';
        groupBy = Sequelize.fn('TO_CHAR', Sequelize.col('created_at'), 'YYYY-MM-DD');
      }

      const salesData = await Order.findAll({
        attributes: [
          [groupBy, 'period'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders'],
          [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'sales']
        ],
        where: {
          ...(storeId ? { store_id: storeId } : {}),
          created_at: {
            [Op.gte]: period === 'year'
              ? new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1)
              : new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1)
          }
        },
        group: [groupBy],
        order: [[groupBy, 'ASC']]
      });

      const formattedData = salesData.map(item => ({
        name: item.dataValues.period,
        ventas: parseFloat(item.dataValues.sales) || 0,
        pedidos: parseInt(item.dataValues.orders) || 0
      }));

      res.json({
        success: true,
        data: formattedData
      });
    } catch (error) {
      console.error('Sales data error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // obtener la distribución por categorías
  getCategoryData: async (req, res) => {
    try {
      const storeId = resolveStoreId(req);
      const categoryData = await Category.findAll({
        attributes: [
          'name',
          [Sequelize.fn('COUNT', Sequelize.col('products.id')), 'productCount']
        ],
        include: [{
          model: Product,
          as: 'products',
          attributes: [],
          where: {
            is_active: true,
            ...(storeId ? { store_id: storeId } : {})
          },
          required: false
        }],
        where: {
          ...(storeId ? { store_id: storeId } : {})
        },
        group: ['Category.id', 'Category.name'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('products.id')), 'DESC']]
      });

      const totalProducts = await Product.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      const formattedData = categoryData.map((category, index) => {
        const count = parseInt(category.dataValues.productCount) || 0;
        const percentage = totalProducts > 0 ? (count / totalProducts * 100).toFixed(1) : 0;

        // Colores predefinidos para las categorías
        const colors = ['#00ff88', '#00d4ff', '#b347d9', '#ff0080', '#ffaa00', '#ff4444'];

        return {
          name: category.name,
          value: parseFloat(percentage),
          count: count,
          color: colors[index % colors.length]
        };
      });

      res.json({
        success: true,
        data: formattedData
      });
    } catch (error) {
      console.error('Category data error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // obtener los pedidos recientes
  getRecentOrders: async (req, res) => {
    try {
      const { Customer } = require('../models');
      const storeId = resolveStoreId(req);

      const recentOrders = await Order.findAll({
        attributes: [
          'id', 'order_number', 'user_id', 'customer_id', 'status',
          'order_date', 'total_amount', 'payment_status', 'created_at'
        ],
        where: {
          ...(storeId ? { store_id: storeId } : {})
        },
        limit: 10,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['first_name', 'last_name', 'username', 'email'],
            required: false // LEFT JOIN para incluir pedidos sin usuario registrado
          },
          {
            model: Customer,
            as: 'customer',
            attributes: ['first_name', 'last_name', 'email', 'company_name'],
            required: false // LEFT JOIN para incluir pedidos sin customer asociado
          },
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              as: 'product',
              attributes: ['name']
            }],
            limit: 1,
            required: false
          }
        ]
      });

      const formattedOrders = recentOrders.map((order, index) => {
        // Crear un número de orden corto y legible
        const shortId = order.id ? order.id.toString().split('-')[0] : String(index + 1).padStart(4, '0');
        const orderNumber = order.order_number || `ORD-${shortId}`;

        // Obtener nombre del cliente (prioridad: usuario autenticado, luego customer, luego genérico)
        let customerName = 'Cliente no especificado';

        if (order.user) {
          const firstName = order.user.first_name || order.user.username || '';
          const lastName = order.user.last_name || '';
          customerName = `${firstName} ${lastName}`.trim() || order.user.email || 'Sin nombre';
        } else if (order.customer) {
          const firstName = order.customer.first_name || '';
          const lastName = order.customer.last_name || '';
          customerName = `${firstName} ${lastName}`.trim() ||
            order.customer.company_name ||
            order.customer.email ||
            'Cliente invitado';
        }

        // Obtener nombre del producto
        const productName = order.items?.[0]?.product?.name || 'Múltiples productos';

        // Asegurar que total_amount sea un número válido
        const totalAmount = parseFloat(order.total_amount) || 0;

        return {
          id: orderNumber,
          originalId: order.id,
          customerName: customerName,
          productName: productName,
          totalAmount: totalAmount.toFixed(2),
          status: order.status || 'pending',
          date: order.created_at,
          hasUser: !!order.user_id,
          hasCustomer: !!order.customer_id
        };
      });

      res.json({
        success: true,
        data: formattedOrders
      });
    } catch (error) {
      console.error('Recent orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  // obtener las métricas de sostenibilidad
  getSustainabilityMetrics: async (req, res) => {
    try {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const storeId = resolveStoreId(req);

      // Contar pedidos completados este mes
      const completedOrders = await Order.count({
        where: {
          ...(storeId ? { store_id: storeId } : {}),
          status: ['completed', 'delivered'],
          created_at: {
            [Op.gte]: firstDayOfMonth
          }
        }
      });

      // Obtener productos activos con datos de sostenibilidad
      const totalProducts = await Product.count({
        where: {
          is_active: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      // Contar productos eco-friendly basado en el campo real
      const ecoProductsCount = await Product.count({
        where: {
          is_active: true,
          eco_friendly: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      // Contar productos reciclables
      const recyclableProductsCount = await Product.count({
        where: {
          is_active: true,
          recyclable: true,
          ...(storeId ? { store_id: storeId } : {})
        }
      });

      // Calcular CO2 total de productos vendidos este mes
      const orderItemsWithProducts = await OrderItem.findAll({
        attributes: ['quantity', 'product_id'],
        include: [
          {
            model: Order,
            as: 'order',
            where: {
              status: ['completed', 'delivered'],
              ...(storeId ? { store_id: storeId } : {}),
              created_at: {
                [Op.gte]: firstDayOfMonth
              }
            },
            attributes: []
          },
          {
            model: Product,
            as: 'product',
            attributes: ['carbon_footprint', 'eco_friendly'],
            where: {
              is_active: true,
              ...(storeId ? { store_id: storeId } : {})
            },
            required: true
          }
        ]
      });

      // Calcular CO2 total reducido (suma de carbon_footprint * quantity de productos vendidos)
      let totalCO2Kg = 0;
      let totalItemsSold = 0;
      let ecoItemsSold = 0;

      orderItemsWithProducts.forEach(item => {
        const quantity = parseInt(item.quantity) || 0;
        const carbonFootprint = parseFloat(item.product.carbon_footprint) || 0;

        totalItemsSold += quantity;
        totalCO2Kg += carbonFootprint * quantity;

        if (item.product.eco_friendly) {
          ecoItemsSold += quantity;
        }
      });

      // Convertir a toneladas si es mayor a 1000kg
      const co2Display = totalCO2Kg >= 1000
        ? `${(totalCO2Kg / 1000).toFixed(1)} ton`
        : `${Math.round(totalCO2Kg)} kg`;

      // Calcular energía ahorrada: productos eco ahorran ~25 kWh cada uno
      const energySavedKwh = Math.round(ecoItemsSold * 25);

      // Calcular agua conservada: productos eco conservan ~17 litros cada uno
      const waterConservedL = Math.round(ecoItemsSold * 17);

      // Porcentaje de material reciclable
      const recyclingPercentage = totalProducts > 0
        ? Math.round((recyclableProductsCount / totalProducts) * 100)
        : 0;

      const metrics = {
        co2Reduced: co2Display,
        energySaved: `${energySavedKwh.toLocaleString()} kWh`,
        waterConserved: `${waterConservedL.toLocaleString()} L`,
        materialRecycled: `${recyclingPercentage}%`,
        // Datos adicionales para debug
        ecoProducts: ecoProductsCount,
        recyclableProducts: recyclableProductsCount,
        totalOrders: completedOrders,
        itemsSold: totalItemsSold,
        ecoItemsSold: ecoItemsSold,
        totalCO2Kg: Math.round(totalCO2Kg)
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Sustainability metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  },

  getDailyMetrics: async (req, res) => {
    try {
      const now = new Date();
      const todayUTCStr = now.toISOString().slice(0, 10);
      const defaultStartObj = new Date(todayUTCStr + 'T00:00:00.000Z');
      defaultStartObj.setUTCDate(defaultStartObj.getUTCDate() - 29);
      const defaultStartStr = defaultStartObj.toISOString().slice(0, 10);

      let startDate = req.query.startDate ? req.query.startDate : defaultStartStr;
      let endDate   = req.query.endDate   ? req.query.endDate   : todayUTCStr;

      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRe.test(startDate) || !dateRe.test(endDate)) {
        return res.status(400).json({ success: false, message: 'Las fechas deben tener formato YYYY-MM-DD' });
      }

      const start = new Date(startDate + 'T00:00:00.000Z');
      const end   = new Date(endDate   + 'T23:59:59.999Z');

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Fechas inválidas' });
      }
      if (start >= end) {
        return res.status(400).json({ success: false, message: 'startDate debe ser anterior a endDate' });
      }
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        return res.status(400).json({ success: false, message: 'El rango no puede superar 365 días' });
      }

      const storeId = resolveStoreId(req);
      const storeClause = storeId ? 'AND store_id = :storeId' : '';
      const params = { startDate: start, endDate: end, ...(storeId ? { storeId } : {}) };

      const [ordersRaw, usersRaw, productsRaw] = await Promise.all([
        sequelize.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
                  COUNT(*) AS new_orders,
                  COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS revenue
           FROM orders
           WHERE created_at >= :startDate AND created_at <= :endDate ${storeClause}
           GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')`,
          { replacements: params, type: sequelize.QueryTypes.SELECT }
        ),
        sequelize.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
                  COUNT(*) AS new_users
           FROM users
           WHERE created_at >= :startDate AND created_at <= :endDate ${storeClause}
           GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')`,
          { replacements: params, type: sequelize.QueryTypes.SELECT }
        ),
        sequelize.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
                  COUNT(*) AS new_products
           FROM products
           WHERE created_at >= :startDate AND created_at <= :endDate ${storeClause}
           GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')`,
          { replacements: params, type: sequelize.QueryTypes.SELECT }
        )
      ]);

      const ordersMap   = Object.fromEntries(ordersRaw.map(r   => [r.date, r]));
      const usersMap    = Object.fromEntries(usersRaw.map(r    => [r.date, r]));
      const productsMap = Object.fromEntries(productsRaw.map(r => [r.date, r]));

      const metrics = [];
      const cursor = new Date(startDate + 'T00:00:00.000Z');
      const endDay = new Date(endDate   + 'T00:00:00.000Z');
      let totalRevenue = 0, totalOrders = 0, totalUsers = 0, totalProducts = 0;

      while (cursor <= endDay) {
        const d = cursor.toISOString().slice(0, 10);
        const o = ordersMap[d]   || {};
        const u = usersMap[d]    || {};
        const p = productsMap[d] || {};
        const rev    = parseFloat(o.revenue)       || 0;
        const orders = parseInt(o.new_orders)      || 0;
        const users  = parseInt(u.new_users)       || 0;
        const prods  = parseInt(p.new_products)    || 0;
        metrics.push({ date: d, revenue: rev, new_orders: orders, new_users: users, new_products: prods });
        totalRevenue  += rev;
        totalOrders   += orders;
        totalUsers    += users;
        totalProducts += prods;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      res.json({
        success: true,
        data: {
          period: { startDate, endDate, days: metrics.length },
          metrics,
          totals: { revenue: parseFloat(totalRevenue.toFixed(2)), new_orders: totalOrders, new_users: totalUsers, new_products: totalProducts }
        }
      });
    } catch (error) {
      console.error('getDailyMetrics error:', error);
      res.status(500).json({ success: false, message: 'Error al obtener métricas diarias', error: error.message });
    }
  },

  // generar un informe completo con datos reales del tenant
  generateReport: async (req, res) => {
    try {
      const { type = 'general', dateRange = 'month' } = req.query;
      const storeId = resolveStoreId(req);

      // ── rango de fechas ──────────────────────────────────────────
      const now = new Date();
      let startDate;
      switch (dateRange) {
        case 'week':    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); break;
        case 'month':   startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'quarter': startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
        case 'year':    startDate = new Date(now.getFullYear(), 0, 1); break;
        default:        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const storeFilter = storeId ? { store_id: storeId } : {};

      // ── contadores resumen ───────────────────────────────────────
      const [totalOrders, totalRevenue] = await Promise.all([
        Order.count({ where: { ...storeFilter, created_at: { [Op.gte]: startDate } } }),
        Order.sum('total_amount', { where: { ...storeFilter, created_at: { [Op.gte]: startDate }, status: { [Op.in]: ['confirmed','processing','shipped','delivered','completed'] } } })
      ]);

      // clientes nuevos (de la tabla customers, creados en el período)
      const newCustomers = await Customer.count({
        where: {
          ...storeFilter,
          created_at: { [Op.gte]: startDate }
        }
      });

      // ── tendencia de ventas (agrupada por día) ──────────────────────────
      const salesTrendRaw = await Order.findAll({
        attributes: [
          [Sequelize.fn('TO_CHAR', Sequelize.col('created_at'), 'YYYY-MM-DD'), 'date'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'orders'],
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('total_amount')), 0), 'revenue']
        ],
        where: { ...storeFilter, created_at: { [Op.gte]: startDate } },
        group: [Sequelize.fn('TO_CHAR', Sequelize.col('created_at'), 'YYYY-MM-DD')],
        order:  [[Sequelize.fn('TO_CHAR', Sequelize.col('created_at'), 'YYYY-MM-DD'), 'ASC']],
        raw: true
      });

      const salesTrend = salesTrendRaw.map(r => ({
        date:    r.date,
        orders:  parseInt(r.orders) || 0,
        revenue: parseFloat(r.revenue) || 0
      }));

      // ── productos más vendidos por cantidad ────────────────────────
      const topProductsRaw = await OrderItem.findAll({
        attributes: [
          'product_id',
          [Sequelize.fn('SUM', Sequelize.col('OrderItem.quantity')), 'totalQty'],
          [Sequelize.fn('SUM', Sequelize.col('OrderItem.line_total')),  'totalRevenue']
        ],
        include: [
          {
            model: Order,
            as: 'order',
            attributes: [],
            where: { ...storeFilter, created_at: { [Op.gte]: startDate } },
            required: true
          },
          {
            model: Product,
            as: 'product',
            attributes: ['name'],
            required: true
          }
        ],
        group: ['OrderItem.product_id', 'product.id', 'product.name'],
        order: [[Sequelize.fn('SUM', Sequelize.col('OrderItem.quantity')), 'DESC']],
        limit: 5,
        subQuery: false
      });

      const topProducts = topProductsRaw.map(r => ({
        name:     r.product?.name || 'Producto desconocido',
        quantity: parseInt(r.dataValues.totalQty) || 0,
        revenue:  parseFloat(r.dataValues.totalRevenue) || 0
      }));

      // ── resumen de sostenibilidad ───────────────────────────────
      const ecoProductsCount     = await Product.count({ where: { ...storeFilter, is_active: true, eco_friendly: true } });
      const recyclableCount      = await Product.count({ where: { ...storeFilter, is_active: true, recyclable: true } });
      const totalProductsCount   = await Product.count({ where: { ...storeFilter, is_active: true } });
      const recyclingRate = totalProductsCount > 0 ? Math.round((recyclableCount / totalProductsCount) * 100) : 0;

      // ── resumen de descuentos (solo si el módulo está activo en esta tienda) ─
      const storeFeatures = req.tenant?.store?.settings?.enterprise_config?.features || {};
      let discountSummary = null;
      if (storeFeatures.discounts && storeId) {
        const discountFilter = { store_id: storeId, created_at: { [Op.gte]: startDate }, discount_amount: { [Op.gt]: 0 } };
        const [ordersWithDiscount, totalDiscounted, topCode] = await Promise.all([
          Order.count({ where: discountFilter }),
          Order.sum('discount_amount', { where: discountFilter }),
          DiscountCode.findOne({
            where: { store_id: storeId },
            order: [['used_count', 'DESC']],
            attributes: ['code', 'used_count']
          })
        ]);
        discountSummary = {
          ordersWithDiscount: ordersWithDiscount || 0,
          totalDiscounted:    parseFloat((totalDiscounted || 0).toFixed(2)),
          topCode:            topCode?.code || null
        };
      }

      const reportData = {
        meta: {
          generatedAt: now.toISOString(),
          dateRange: { start: startDate.toISOString(), end: now.toISOString(), type: dateRange },
          reportType: type,
          storeId: storeId || null
        },
        summary: {
          totalOrders:       totalOrders  || 0,
          totalRevenue:      totalRevenue || 0,
          newCustomers:      newCustomers || 0,
          averageOrderValue: (totalOrders || 0) > 0
            ? Math.round(((totalRevenue || 0) / totalOrders) * 100) / 100
            : 0
        },
        charts:  { salesTrend, topProducts },
        sustainability: {
          ecoProducts:    ecoProductsCount,
          recyclingRate:  `${recyclingRate}%`,
          recyclable:     recyclableCount,
          totalProducts:  totalProductsCount
        },
        discounts: discountSummary
      };

      res.json({ success: true, data: reportData });

    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ success: false, message: 'Error al generar el reporte', error: error.message });
    }
  }
};

module.exports = { dashboardController };