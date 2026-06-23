const cron = require('node-cron');
const { Op } = require('sequelize');
const { Order } = require('../models');

const cancelExpiredOrders = async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [count] = await Order.update(
      { status: 'cancelled', payment_status: 'cancelled' },
      {
        where: {
          payment_status: 'pending_payment',
          createdAt: { [Op.lt]: oneHourAgo }
        }
      }
    );

    if (count > 0) {
      console.log(`🧹 [OrderCleanup] ${count} pedido(s) expirado(s) cancelado(s)`);
    }
  } catch (error) {
    console.error('❌ [OrderCleanup] Error cancelando pedidos expirados:', error.message);
  }
};

const start = () => {

  cron.schedule('0 * * * *', cancelExpiredOrders);
  console.log('🧹 [OrderCleanup] Scheduler de pedidos expirados iniciado (cada hora)');
};

module.exports = { start, cancelExpiredOrders };
