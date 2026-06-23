

const { Op } = require('sequelize');
const { Store } = require('../models');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas
let checkInterval = null;

const checkOverduePayments = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Encontrar tiendas con pago vencido (no main, no ya cancelled)
    const overdueStores = await Store.findAll({
      where: {
        subdomain: { [Op.ne]: 'main' },
        next_payment_date: { [Op.lte]: today },
        payment_status: { [Op.in]: ['paid', 'pending'] },
        is_active: true
      }
    });

    // También buscar las que ya están marcadas como overdue
    const alreadyOverdue = await Store.findAll({
      where: {
        subdomain: { [Op.ne]: 'main' },
        payment_status: 'overdue'
      }
    });

    const newOverdue = [];
    const suspended = [];

    if (overdueStores.length > 0) {
      console.log(`⚠️ Billing Check: ${overdueStores.length} tiendas con pago vencido encontradas`);

      for (const store of overdueStores) {
        const daysPastDue = Math.floor(
          (new Date(today) - new Date(store.next_payment_date)) / (1000 * 60 * 60 * 24)
        );

        await store.update({ payment_status: 'overdue' });

        const storeInfo = {
          id: store.id,
          name: store.name,
          subdomain: store.subdomain,
          plan_id: store.plan_id,
          amount: ((store.plan_price_cents || 0) / 100).toFixed(2),
          next_payment_date: store.next_payment_date,
          days_past_due: daysPastDue
        };

        console.log(
          `  ⚠️ ${store.name} (${store.subdomain}) - Pago vencido hace ${daysPastDue} días ` +
          `(fecha: ${store.next_payment_date}, plan: ${store.plan_id}, monto: ${storeInfo.amount}€)`
        );

        // Si llevan más de 15 días sin pagar, desactivar automáticamente
        if (daysPastDue > 15) {
          await store.update({
            is_active: false,
            paused_at: new Date(),
            paused_reason: `Servicio suspendido por impago (${daysPastDue} días vencido)`
          });
          storeInfo.suspended = true;
          suspended.push(storeInfo);
          console.log(`  🛑 ${store.name} DESACTIVADA por impago prolongado (${daysPastDue} días)`);
        } else {
          newOverdue.push(storeInfo);
        }
      }
    }

    // Construir lista de todas las tiendas con impago (las nuevas + las que ya estaban)
    const existingOverdue = alreadyOverdue
      .filter(s => !overdueStores.find(os => os.id === s.id))
      .map(s => {
        const daysPastDue = s.next_payment_date
          ? Math.floor((new Date(today) - new Date(s.next_payment_date)) / (1000 * 60 * 60 * 24))
          : 0;
        return {
          id: s.id,
          name: s.name,
          subdomain: s.subdomain,
          plan_id: s.plan_id,
          amount: ((s.plan_price_cents || 0) / 100).toFixed(2),
          next_payment_date: s.next_payment_date,
          days_past_due: daysPastDue,
          is_active: s.is_active
        };
      });

    const totalOverdue = newOverdue.length + existingOverdue.length + suspended.length;

    return {
      checked: true,
      overdueCount: totalOverdue,
      newOverdue,
      existingOverdue,
      suspended,
      summary: totalOverdue === 0
        ? 'No hay tiendas con impagos'
        : `${totalOverdue} tienda${totalOverdue > 1 ? 's' : ''} con impago${totalOverdue > 1 ? 's' : ''}`
    };
  } catch (error) {
    console.error('❌ Error en verificación de pagos:', error.message);
    return { checked: false, error: error.message };
  }
};

const getBillingSummary = async () => {
  try {
    const stores = await Store.findAll({
      where: { subdomain: { [Op.ne]: 'main' } },
      attributes: ['id', 'name', 'subdomain', 'plan_id', 'plan_price_cents', 
                   'billing_start_date', 'next_payment_date', 'payment_status', 
                   'is_active', 'paused_at', 'paused_reason'],
      order: [['next_payment_date', 'ASC']]
    });

    const activeStores = stores.filter(s => s.is_active && s.plan_id);

    const summary = {
      total: stores.length,
      paid: stores.filter(s => s.payment_status === 'paid').length,
      pending: stores.filter(s => s.payment_status === 'pending').length,
      overdue: stores.filter(s => s.payment_status === 'overdue').length,
      overdueCount: stores.filter(s => s.payment_status === 'overdue').length,
      cancelled: stores.filter(s => s.payment_status === 'cancelled').length,
      activeSubscriptions: activeStores.length,
      monthlyRevenue: stores
        .filter(s => s.payment_status === 'paid' && s.plan_price_cents)
        .reduce((acc, s) => acc + (s.plan_price_cents || 0), 0),
      totalMonthlyRevenue: stores
        .filter(s => s.is_active && s.plan_price_cents)
        .reduce((acc, s) => acc + (s.plan_price_cents || 0), 0),
      stores
    };

    return summary;
  } catch (error) {
    console.error('Error getting billing summary:', error);
    throw error;
  }
};

const startBillingChecker = () => {
  if (checkInterval) return;

  // Primera verificación 10 segundos después del arranque
  setTimeout(() => {
    checkOverduePayments().then(result => {
      if (result.checked) {
        console.log(`✅ Billing check inicial: ${result.overdueCount} vencidas`);
      }
    });
  }, 10000);

  checkInterval = setInterval(() => {
    checkOverduePayments().catch(err => {
      console.error('Billing checker cycle error:', err.message);
    });
  }, CHECK_INTERVAL_MS);

  console.log('✅ Billing checker started (24h interval)');
};

const stopBillingChecker = () => {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('🛑 Billing checker stopped');
  }
};

module.exports = {
  checkOverduePayments,
  getBillingSummary,
  startBillingChecker,
  stopBillingChecker
};
