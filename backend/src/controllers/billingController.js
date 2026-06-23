const { StripeEvent } = require('../models');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const stripeService = require('../services/stripeService');
const saasProvisioningService = require('../services/saasProvisioningService');
const { sequelize } = require('../models');
const { isLandingEmailUnverified } = require('../config/landingDb');

const normalizeSubdomain = (value = '') => {
  const rawValue = String(value || '').trim().toLowerCase();
  if (!rawValue) return '';

  const baseDomain = String(process.env.TENANT_BASE_DOMAIN || 'neonhub.es').toLowerCase();
  const hostValue = rawValue.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

  let candidate = hostValue;

  if (candidate === baseDomain) {
    candidate = 'main';
  } else if (candidate.endsWith(`.${baseDomain}`)) {
    candidate = candidate.slice(0, -(`.${baseDomain}`).length);
  } else if (candidate.includes('.')) {
    candidate = candidate.split('.')[0];
  }

  return candidate.replace(/[^a-z0-9]/g, '');
};

const tryRecoverProvisioningFromSession = async (sessionId, expectedSubdomain) => {
  if (!sessionId) return false;

  const session = await stripeService.retrieveCheckoutSession(sessionId);
  const sessionSubdomain = normalizeSubdomain(session?.metadata?.subdomain);
  const normalizedExpected = normalizeSubdomain(expectedSubdomain);

  if (!sessionSubdomain || sessionSubdomain !== normalizedExpected) {
    return false;
  }

  const isPaid = session.payment_status === 'paid' || session.status === 'complete';
  if (!isPaid) {
    return false;
  }

  const recoveryEventId = `manual_recovery_${session.id}`.slice(0, 255);

  const [storedEvent] = await StripeEvent.findOrCreate({
    where: { id: recoveryEventId },
    defaults: {
      id: recoveryEventId,
      type: 'checkout.session.completed',
      status: 'received',
      payload: session,
      received_at: new Date()
    }
  });

  await saasProvisioningService.enqueueProvisioningFromStripeSession(session, storedEvent.id);
  await storedEvent.update({ status: 'processing' });
  await saasProvisioningService.processQueuedJobs();

  return true;
};

const billingController = {
  createCheckoutSession: async (req, res) => {
    try {
      const {
        planId,
        tenantName,
        subdomain,
        ownerEmail,
        ownerPassword,
        ownerFirstName,
        ownerLastName,
        customizationNotes,
        successUrl,
        cancelUrl
      } = req.body;

      if (!planId || !tenantName || !subdomain || !ownerEmail) {
        return res.status(400).json({
          success: false,
          message: 'planId, tenantName, subdomain y ownerEmail son obligatorios'
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        return res.status(400).json({ success: false, message: 'El email no tiene un formato válido' });
      }

      const normalizedSub = normalizeSubdomain(subdomain);
      if (!normalizedSub || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(normalizedSub)) {
        return res.status(400).json({ success: false, message: 'El subdominio no es válido (mínimo 3 caracteres, solo letras, números y guiones)' });
      }

      if (ownerPassword && ownerPassword !== 'USE_EXISTING_AUTH' && ownerPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
      }

      try {
        const blocked = await isLandingEmailUnverified(ownerEmail);
        if (blocked) {
          return res.status(403).json({
            success: false,
            error: 'email_not_verified',
            message: 'Debes registrarte y verificar tu email antes de contratar un servicio.'
          });
        }
      } catch {
        return res.status(503).json({
          success: false,
          error: 'service_unavailable',
          message: 'No se puede procesar el pago en este momento. Inténtalo de nuevo en unos minutos.'
        });
      }

      const frontendBase = process.env.FRONTEND_URL || 'https://neonhub.es';

      let ownerPasswordHash = null;
      if (ownerPassword && ownerPassword !== 'USE_EXISTING_AUTH') {
        ownerPasswordHash = await bcrypt.hash(ownerPassword, 12);
      } else if (ownerPassword === 'USE_EXISTING_AUTH') {
        const { User } = require('../models');
        const existingUser = await User.scope('withPassword').findOne({ where: { email: ownerEmail } });
        if (existingUser && existingUser.password_hash && existingUser.password_hash.startsWith('$2')) {
          ownerPasswordHash = existingUser.password_hash;
        }
      }

      const checkout = await stripeService.createCheckoutSession({
        planId,
        tenantName,
        subdomain,
        ownerEmail,
        ownerPassword: ownerPasswordHash,
        ownerFirstName,
        ownerLastName,
        customizationNotes,
        successUrl: successUrl || `${frontendBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}&subdomain=${encodeURIComponent(subdomain)}`,
        cancelUrl: cancelUrl || `${frontendBase}/checkout?plan=${encodeURIComponent(planId)}`
      });

      return res.status(200).json({
        success: true,
        message: 'Checkout session creada correctamente',
        data: {
          id: checkout.id,
          url: checkout.url
        }
      });
    } catch (error) {
      console.error('Create checkout session error:', error);
      return res.status(500).json({
        success: false,
        message: 'No se pudo crear la sesión de pago',
        error: error.message
      });
    }
  },

  handleStripeWebhook: async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const rawBody = req.rawBody;

      const event = stripeService.constructWebhookEvent(rawBody, signature);

      const [storedEvent, created] = await StripeEvent.findOrCreate({
        where: { id: event.id },
        defaults: {
          id: event.id,
          type: event.type,
          status: 'received',
          payload: event.data?.object || null,
          received_at: new Date()
        }
      });

      if (!created) {
        return res.status(200).json({
          received: true,
          deduplicated: true
        });
      }

      if (event.type === 'checkout.session.completed') {
        await saasProvisioningService.enqueueProvisioningFromStripeSession(event.data.object, event.id);
        await storedEvent.update({ status: 'processing' });

        try {
          const n8nUrl = process.env.N8N_ONBOARDING_WEBHOOK_URL || 'https://neonhub.n8nservidor.es/webhook/stripe-webhook-demo';
          await axios.post(n8nUrl, event.data.object);
          console.log(`✅ Webhook enviado a n8n: ${n8nUrl}`);
        } catch (err) {
          console.error(`❌ Error enviando webhook a n8n:`, err.message);
        }
      } else if (event.type === 'invoice.paid') {
        const { Store } = require('../models');
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const store = await Store.findOne({
            where: { stripe_subscription_id: subscriptionId }
          });
          
          if (store) {
            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + 1);
            
            await store.update({
              payment_status: 'paid',
              next_payment_date: nextDate.toISOString().split('T')[0]
            });
            console.log(`✅ Pago de suscripción recibido para ${store.name} (${store.subdomain})`);
            
            const { PaymentRecord } = require('../models');
            const amountCents = invoice.amount_paid || store.plan_price_cents || 0;
            
            await PaymentRecord.create({
              store_id: store.id,
              amount_cents: amountCents,
              concept: `Renovación Mantenimiento - ${new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`,
              payment_method: 'stripe',
              notes: `Cobro recurrente automático vía Stripe (Invoice: ${invoice.id})`,
              payment_date: new Date().toISOString().split('T')[0],
              recorded_by: 'system'
            });

            if (!store.is_active && store.paused_reason?.includes('impago')) {
              await store.update({ is_active: true, paused_at: null, paused_reason: null });
              console.log(`✅ ${store.name} reactivada tras recibir pago`);
            }
          }
        }
        await storedEvent.update({ status: 'processed', processed_at: new Date() });
        
      } else if (event.type === 'invoice.payment_failed') {
        const { Store } = require('../models');
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const store = await Store.findOne({
            where: { stripe_subscription_id: subscriptionId }
          });
          
          if (store) {
            await store.update({ payment_status: 'overdue' });
            console.log(`⚠️ Pago fallido para ${store.name} (${store.subdomain})`);
          }
        }
        await storedEvent.update({ status: 'processed', processed_at: new Date() });
        
      } else if (event.type === 'customer.subscription.deleted') {
        const { Store } = require('../models');
        const subscription = event.data.object;
        
        const store = await Store.findOne({
          where: { stripe_subscription_id: subscription.id }
        });
        
        if (store) {
          await store.update({
            payment_status: 'cancelled',
            is_active: false,
            paused_at: new Date(),
            paused_reason: 'Suscripción cancelada en Stripe'
          });
          console.log(`🛑 Suscripción cancelada para ${store.name} (${store.subdomain})`);
        }
        await storedEvent.update({ status: 'processed', processed_at: new Date() });
        
      } else {
        await storedEvent.update({ status: 'processed', processed_at: new Date() });
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Stripe webhook processing error:', error);
      return res.status(400).json({
        success: false,
        message: 'Webhook inválido o no procesable',
        error: error.message
      });
    }
  },

  getProvisioningStatus: async (req, res) => {
    try {
      const { subdomain, session_id: sessionId } = req.query;
      if (!subdomain) {
        return res.status(400).json({
          success: false,
          message: 'subdomain es obligatorio'
        });
      }

      const status = await saasProvisioningService.getProvisioningStatusBySubdomain(subdomain);

      if (!status && sessionId) {
        const recovered = await tryRecoverProvisioningFromSession(sessionId, subdomain);
        if (recovered) {
          console.log(`✅ Provisioning recuperado desde sesión Stripe ${sessionId} para ${normalizeSubdomain(subdomain)}`);
        }
      }

      const refreshedStatus = !status
        ? await saasProvisioningService.getProvisioningStatusBySubdomain(subdomain)
        : status;

      if (!refreshedStatus) {
        return res.status(404).json({
          success: false,
          message: 'Tenant no encontrado'
        });
      }

      return res.json({
        success: true,
        data: refreshedStatus
      });
    } catch (error) {
      console.error('Get provisioning status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error consultando estado de provisioning',
        error: error.message
      });
    }
  },

  getUserTenants: async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email es obligatorio' });
      }

      const { ProvisioningJob, Store, sequelize } = require('../models');
      const { Op } = require('sequelize');
      const sanitizedEmail = String(email).toLowerCase().trim();
      const jobs = await ProvisioningJob.findAll({
        where: sequelize.where(
          sequelize.fn('LOWER', sequelize.cast(sequelize.json("payload.owner_email"), 'text')),
          sanitizedEmail
        )
      });

      const storeIds = jobs.map(j => j.store_id).filter(Boolean);
      let activeStores = [];
      if (storeIds.length > 0) {
        activeStores = await Store.findAll({
          where: { id: storeIds },
          attributes: ['id', 'name', 'subdomain', 'is_active', 'settings']
        });
      }

      const tenantMap = new Map();
      for (const job of jobs) {
        const store = activeStores.find(s => s.id === job.store_id);
        const sub = job.payload.subdomain;
        const entry = {
          id: job.id,
          tenant_name: job.payload.tenant_name,
          subdomain: sub,
          status: store?.is_active ? 'active' : job.status,
          plan_id: job.payload.plan_id,
          store_id: job.store_id,
          created_at: job.created_at
        };
        const existing = tenantMap.get(sub);
        if (!existing || (entry.status === 'active' && existing.status !== 'active') || (entry.store_id && !existing.store_id)) {
          tenantMap.set(sub, entry);
        }
      }

      return res.json({ success: true, data: Array.from(tenantMap.values()) });
    } catch (error) {
      console.error('getUserTenants error:', error);
      return res.status(500).json({ success: false });
    }
  },

  getUserStores: async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email es obligatorio' });
      }

      const { User, UserStore, Store, sequelize: seq } = require('../models');
      const { Op } = require('sequelize');
      const sanitizedEmail = String(email).toLowerCase().trim();

      const user = await User.findOne({ where: { email: sanitizedEmail } });
      if (!user) {
        return res.json({ success: true, data: [] });
      }

      const ownerRows = await seq.query(
        `SELECT DISTINCT us.store_id
         FROM user_stores us
         INNER JOIN user_roles ur ON ur.user_id = us.user_id AND ur.store_id = us.store_id AND ur.is_active = true
         INNER JOIN roles r ON r.id = ur.role_id AND r.level >= 80
         WHERE us.user_id = :userId`,
        { replacements: { userId: user.id }, type: seq.QueryTypes.SELECT }
      );

      if (ownerRows.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const ownedStoreIds = ownerRows.map(r => r.store_id);

      const userStores = await UserStore.findAll({
        where: { user_id: user.id, store_id: { [Op.in]: ownedStoreIds } },
        include: [{
          model: Store,
          as: 'store',
          attributes: ['id', 'name', 'subdomain', 'is_active', 'plan_id', 'payment_status']
        }],
        order: [['is_primary', 'DESC'], ['created_at', 'ASC']]
      });

      return res.json({
        success: true,
        data: userStores.map(us => ({
          store_id: us.store.id,
          tenant_name: us.store.name,
          subdomain: us.store.subdomain,
          status: us.store.is_active ? 'active' : 'inactive',
          plan_id: us.store.plan_id,
          payment_status: us.store.payment_status,
          is_primary: us.is_primary
        }))
      });
    } catch (error) {
      console.error('getUserStores error:', error);
      return res.status(500).json({ success: false });
    }
  },

  getProvisioningRequests: async (req, res) => {
    try {
      const { ProvisioningJob } = require('../models');
      const jobs = await ProvisioningJob.findAll({
        order: [['created_at', 'DESC']]
      });

      const sanitizedJobs = jobs.map(job => {
        const j = job.toJSON();
        if (j.payload && j.payload.owner_password) {
          const { owner_password, ...safePayload } = j.payload;
          j.payload = safePayload;
        }
        return j;
      });

      const statusPriority = { completed: 3, queued: 2, processing: 2, pending: 2, failed: 1 };
      const jobMap = new Map();
      for (const j of sanitizedJobs) {
        const sub = j.payload?.subdomain || String(j.id);
        const existing = jobMap.get(sub);
        if (!existing) {
          jobMap.set(sub, j);
        } else {
          const newP = statusPriority[j.status] ?? 0;
          const oldP = statusPriority[existing.status] ?? 0;
          if (newP > oldP) {
            jobMap.set(sub, j);
          }
        }
      }

      return res.json({ success: true, data: Array.from(jobMap.values()) });
    } catch (error) {
      console.error('getProvisioningRequests error:', error);
      return res.status(500).json({ success: false });
    }
  },

  approveProvisioningRequest: async (req, res) => {
    try {
      const { id } = req.params;
      const { ProvisioningJob } = require('../models');

      const job = await ProvisioningJob.findByPk(id);
      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      if (job.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Job ya completado' });
      }

      try {
        const eventData = {
          event: "tenant_approved",
          job_id: job.id,
          subdomain: job.payload.subdomain,
          customer_email: job.payload.owner_email,
          tenant_name: job.payload.tenant_name
        };
        const n8nUrl = process.env.N8N_APPROVED_WEBHOOK_URL || 'https://neonhub.n8nservidor.es/webhook/stripe-webhook-demo-approved';
        await axios.post(n8nUrl, eventData);
        console.log(`✅ Webhook de aprobación enviado a n8n: ${n8nUrl}`);
      } catch (err) {
        console.error(`❌ Error enviando webhook de aprobación a n8n:`, err.message);
      }

      await job.update({ status: 'queued', retries: 0, last_error: null });

      try {
        await saasProvisioningService.processQueuedJobs();
      } catch (processingError) {
        console.error('Error during immediate provisioning processing:', processingError.message);
      }

      await job.reload();

      if (job.status === 'completed') {
        const { Store } = require('../models');
        if (job.store_id) {
          await Store.update({ is_active: true }, { where: { id: job.store_id } });
          console.log(`✅ Store ${job.store_id} activada tras aprobación`);
        }
        return res.json({ success: true, message: 'Tenant provisionado y activado correctamente' });
      } else if (job.status === 'failed') {
        return res.status(500).json({ success: false, message: 'Error durante el provisioning', error: job.last_error });
      } else {
        return res.json({ success: true, message: 'Provisioning en proceso, se completará en breve', status: job.status });
      }
    } catch (error) {
      console.error('approveProvisioningRequest error:', error);
      return res.status(500).json({ success: false, message: 'Error al aprobar el provisioning', error: error.message });
    }
  },

  getCheckoutSessionInfo: async (req, res) => {
    try {
      const { session_id } = req.query;
      if (!session_id) {
        return res.status(400).json({ success: false, message: 'session_id es obligatorio' });
      }

      if (typeof session_id !== 'string' || !session_id.startsWith('cs_') || session_id.length > 200) {
        return res.status(400).json({ success: false, message: 'session_id inválido' });
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (!session || !session.metadata) {
        return res.status(404).json({ success: false, message: 'Sesión no encontrada o sin metadatos' });
      }

      return res.json({
        success: true,
        data: {
          email: session.metadata.owner_email,
          firstName: session.metadata.owner_first_name,
          lastName: session.metadata.owner_last_name,
          subdomain: session.metadata.subdomain,
          tenantName: session.metadata.tenant_name
        }
      });
    } catch (error) {
      console.error('getCheckoutSessionInfo error:', error);
      return res.status(500).json({ success: false, message: 'Error recuperando la sesión' });
    }
  },

  // ── GET /api/billing/user-store-status ───────────────────────
  getUserStoreStatus: async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requerido' });
    }

    const { User, UserStore, Store, sequelize: seq } = require('../models');
    const { Op } = require('sequelize');
    const sanitizedEmail = String(email).toLowerCase().trim();

    try {
      const user = await User.findOne({ where: { email: sanitizedEmail } });
      if (!user) {
        return res.json({ success: true, status: 'no_store', can_trial: true });
      }

      // solo consideramos tiendas donde el usuario tiene rol de propietario (level >= 80, ceo/admin)
      // así evitamos que clientes registrados en un tenant vean esa tienda como "suya"
      const ownerRows = await seq.query(
        `SELECT DISTINCT us.store_id
         FROM user_stores us
         INNER JOIN user_roles ur ON ur.user_id = us.user_id AND ur.store_id = us.store_id AND ur.is_active = true
         INNER JOIN roles r ON r.id = ur.role_id AND r.level >= 80
         WHERE us.user_id = :userId`,
        { replacements: { userId: user.id }, type: seq.QueryTypes.SELECT }
      );

      if (ownerRows.length === 0) {
        return res.json({ success: true, status: 'no_store', can_trial: true });
      }

      const ownedStoreIds = ownerRows.map(r => r.store_id);

      const userStores = await UserStore.findAll({
        where: { user_id: user.id, store_id: { [Op.in]: ownedStoreIds } },
        include: [{
          model: Store, as: 'store', required: true, paranoid: false,
          attributes: ['id', 'name', 'subdomain', 'is_active', 'payment_status', 'trial_ends_at', 'created_at'],
        }],
        order: [['is_primary', 'DESC'], ['created_at', 'ASC']],
        paranoid: false,
      });

      if (userStores.length === 0) {
        return res.json({ success: true, status: 'no_store', can_trial: true });
      }

      const primaryUs = userStores.find(us => us.is_primary) || userStores[0];
      const store     = primaryUs.store;
      const now       = new Date();
      const trialEnd   = store.trial_ends_at ? new Date(store.trial_ends_at) : null;
      const trialLeft  = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / 86400000)) : 0;
      const trialTotal = (trialEnd && store.created_at)
        ? Math.ceil((trialEnd - new Date(store.created_at)) / 86400000)
        : null;

      const storeData = {
        id: store.id, name: store.name, subdomain: store.subdomain,
        trial_ends_at: store.trial_ends_at,
        trial_days_left: trialLeft,
        trial_days_total: trialTotal,
      };

      if (store.is_active && store.payment_status === 'trial' && trialEnd && trialEnd > now) {
        return res.json({ success: true, status: 'trialing', store: storeData });
      }
      if (store.is_active && store.payment_status !== 'trial') {
        return res.json({ success: true, status: 'active', store: storeData });
      }
      if (!store.is_active && trialEnd && trialEnd < now) {
        return res.json({ success: true, status: 'trial_expired', store: storeData });
      }
      if (!store.is_active) {
        return res.json({ success: true, status: 'suspended', store: storeData });
      }

      return res.json({ success: true, status: 'no_store', can_trial: false });
    } catch (err) {
      console.error('[getUserStoreStatus]', err);
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  },

  // ── POST /api/billing/create-trial ────────────────────────────
  createTrial: async (req, res) => {
    const { email, username, store_name, subdomain, category, ownerPassword } = req.body;

    if (!email || !username || !store_name || !subdomain) {
      return res.status(400).json({ success: false, message: 'Campos requeridos: email, username, store_name, subdomain' });
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanSubdomain.length < 3 || cleanSubdomain.length > 50) {
      return res.status(400).json({ success: false, message: 'Subdominio inválido (3-50 caracteres alfanuméricos)' });
    }

    const { User, Store, Role, UserStore, UserRole, sequelize: seq } = require('../models');
    const { Op } = require('sequelize');

    // ── Verificar límite de un trial/tienda por usuario ───────────
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      // ¿Es propietario (CEO, level = 100) de una tienda activa?
      // Empleados (40) y managers (60) en tiendas ajenas no están bloqueados.
      const ownedStores = await seq.query(
        `SELECT us.store_id, s.payment_status, s.trial_ends_at
         FROM user_stores us
         JOIN stores s ON s.id = us.store_id AND s.is_active = true AND s.deleted_at IS NULL
         WHERE us.user_id = :userId
           AND EXISTS (
             SELECT 1 FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = :userId
               AND (ur.store_id = us.store_id OR ur.store_id IS NULL)
               AND r.level >= 100
               AND ur.is_active = true
           )
         LIMIT 1`,
        { replacements: { userId: existingUser.id }, type: seq.QueryTypes.SELECT }
      );
      if (ownedStores.length > 0) {
        const s = ownedStores[0];
        const isTrialing = s.payment_status === 'trial' && s.trial_ends_at && new Date(s.trial_ends_at) > new Date();
        return res.status(409).json({
          success: false,
          code: 'STORE_EXISTS',
          message: isTrialing
            ? 'Ya tienes una tienda en período de prueba en NeonHub.'
            : 'Ya tienes una tienda activa en NeonHub.',
        });
      }

      // ¿Ha usado ya un trial como propietario (CEO)? (incluye tiendas soft-deleted)
      const usedTrial = await seq.query(
        `SELECT us.store_id
         FROM user_stores us
         JOIN stores s ON s.id = us.store_id AND s.trial_ends_at IS NOT NULL
         WHERE us.user_id = :userId
           AND EXISTS (
             SELECT 1 FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
             WHERE ur.user_id = :userId
               AND (ur.store_id = us.store_id OR ur.store_id IS NULL)
               AND r.level >= 100
               AND ur.is_active = true
           )
         LIMIT 1`,
        { replacements: { userId: existingUser.id }, type: seq.QueryTypes.SELECT }
      );
      if (usedTrial.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'TRIAL_USED',
          message: 'Ya has utilizado tu período de prueba gratuito.',
        });
      }
    }

    const transaction = await seq.transaction();

    try {
      // Verificar subdominio disponible
      const existing = await Store.findOne({ where: { subdomain: cleanSubdomain }, transaction });
      if (existing) {
        await transaction.rollback();
        return res.status(409).json({ success: false, message: 'Subdominio no disponible' });
      }

      // Crear o recuperar usuario en neonhub_db
      let user = await User.findOne({ where: { email }, transaction });
      if (!user) {
        const hasRealPassword = ownerPassword && ownerPassword.length >= 8;
        const passwordHash = hasRealPassword
          ? await bcrypt.hash(ownerPassword, 10)
          : await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
        user = await User.create({
          email,
          username,
          first_name: username,
          last_name: null,
          password_hash: passwordHash,
          is_active: true,
          email_verified: true,
          email_verified_at: new Date(),
          preferences: { must_set_password: !hasRealPassword },
        }, { transaction });
      }

      // Crear tienda en período de prueba (7 días)
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const store = await Store.create({
        name: store_name,
        subdomain: cleanSubdomain,
        is_active: true,
        plan_id: 'installation',
        payment_status: 'trial',
        trial_ends_at: trialEndsAt,
        trial_plan: 'installation',
        settings: {
          currency: 'EUR',
          language: 'es',
          category: category || 'other',
          enterprise_config: {
            features: {
              products: true, gallery: true, orders: true, customers: true,
              analytics: false, sustainability: false, reports: false,
              invoices: false, tickets: false, certifications: false,
            },
          },
        },
      }, { transaction });

      // MODELO B: solo fijamos store_id como tienda principal si el usuario aún
      // no tiene ninguna. Nunca sobrescribimos la principal de un usuario existente
      // (su identidad y contraseña son únicas; las tiendas se vinculan vía user_stores).
      if (!user.store_id) {
        await user.update({ store_id: store.id }, { transaction });
      }

      // Asignar rol CEO (MODELO B: por tienda, fila user_roles directa con store_id)
      const ceoRole = await Role.findOne({ where: { name: 'ceo' }, transaction });
      if (ceoRole) {
        await UserRole.findOrCreate({
          where: { user_id: user.id, role_id: ceoRole.id, store_id: store.id },
          defaults: { user_id: user.id, role_id: ceoRole.id, store_id: store.id, is_active: true, assigned_at: new Date() },
          transaction,
        });
      }

      // Vincular usuario a tienda
      await UserStore.findOrCreate({
        where: { user_id: user.id, store_id: store.id },
        defaults: { user_id: user.id, store_id: store.id, is_primary: true },
        transaction,
      });

      await transaction.commit();

      // generamos un token SSO de un solo uso para el auto-login al dashboard (TTL de 5 min)
      const { SsoToken } = require('../models');
      const ssoToken = uuidv4();
      await SsoToken.create({
        token: ssoToken,
        user_id: user.id,
        store_id: store.id,
        used: false,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      });

      // webhook a n8n (no bloquea la respuesta)
      const webhookUrl = process.env.N8N_TRIAL_WELCOME_WEBHOOK;
      if (webhookUrl) {
        axios.post(webhookUrl, {
          email,
          username,
          store_name,
          subdomain: cleanSubdomain,
          trial_ends_at: trialEndsAt.toISOString(),
          dashboard_url: `https://${cleanSubdomain}.neonhub.es/dashboard`,
        }).catch(err => console.error('[trial webhook]', err.message));
      }

      return res.json({
        success: true,
        data: { store_id: store.id, subdomain: cleanSubdomain, trial_ends_at: trialEndsAt, sso_token: ssoToken },
      });

    } catch (error) {
      await transaction.rollback();
      console.error('[createTrial]', error);
      return res.status(500).json({ success: false, message: 'Error creando la tienda de prueba' });
    }
  },
};

module.exports = billingController;
