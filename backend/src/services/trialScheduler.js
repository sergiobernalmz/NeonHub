'use strict';

const cron = require('node-cron');
const axios = require('axios');

let task = null;

async function pauseExpiredTrials() {
  try {
    const { Store } = require('../models');
    const { Op } = require('sequelize');

    const expired = await Store.findAll({
      where: {
        trial_ends_at:          { [Op.lt]: new Date() },
        payment_status:         'trial',
        stripe_subscription_id: null,
        is_active:              true,
      },
    });

    if (expired.length === 0) return;

    for (const store of expired) {
      await store.update({
        is_active:     false,
        payment_status: 'cancelled',
        paused_at:     new Date(),
        paused_reason: 'Trial expirado sin suscripción activa',
      });

      const webhookUrl = process.env.N8N_TRIAL_EXPIRED_WEBHOOK;
      if (webhookUrl) {
        axios.post(webhookUrl, {
          store_name: store.name,
          subdomain:  store.subdomain,
          trial_ends_at: store.trial_ends_at,
        }).catch(err => console.error('[trialScheduler] webhook error:', err.message));
      }
    }

    console.log(`[trialScheduler] ${expired.length} trial(s) expirado(s) pausado(s)`);
  } catch (err) {
    console.error('[trialScheduler] pauseExpiredTrials error:', err.message);
  }
}

async function notifyExpiringTrials() {
  try {
    const { Store } = require('../models');
    const { Op } = require('sequelize');
    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const expiring = await Store.findAll({
      where: {
        trial_ends_at:          { [Op.between]: [new Date(), in48h] },
        payment_status:         'trial',
        stripe_subscription_id: null,
        is_active:              true,
      },
    });

    const webhookUrl = process.env.N8N_TRIAL_EXPIRING_WEBHOOK;
    if (!webhookUrl || expiring.length === 0) return;

    for (const store of expiring) {
      axios.post(webhookUrl, {
        store_name:   store.name,
        subdomain:    store.subdomain,
        trial_ends_at: store.trial_ends_at,
      }).catch(err => console.error('[trialScheduler] expiring webhook error:', err.message));
    }

    console.log(`[trialScheduler] ${expiring.length} aviso(s) de trial próximo a expirar enviados`);
  } catch (err) {
    console.error('[trialScheduler] notifyExpiringTrials error:', err.message);
  }
}

function start() {
  // cada día a las 9:00
  task = cron.schedule('0 9 * * *', pauseExpiredTrials, { timezone: 'Europe/Madrid' });

  // aviso a las 10:00
  cron.schedule('0 10 * * *', notifyExpiringTrials, { timezone: 'Europe/Madrid' });

  console.log('[trialScheduler] iniciado (09:00 pausa expirados, 10:00 aviso próximos)');
}

function stop() {
  if (task) { task.stop(); task = null; }
}

module.exports = { start, stop, pauseExpiredTrials };
