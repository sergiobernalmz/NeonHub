const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize, Store, User, Role, UserStore, ProvisioningJob, StripeEvent } = require('../models');

const MAX_RETRIES = 5;
const WORKER_INTERVAL_MS = 7000;

let workerInterval = null;
let workerRunning = false;
let workerInitialized = false;

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

const makeSchemaNameFromStoreId = (storeId) => `t_${String(storeId).replace(/-/g, '').toLowerCase()}`;

const createTenantSchemaAndTables = async (schemaName, transaction) => {
  if (sequelize.getDialect() !== 'postgres') {
    throw new Error('Tenant schema provisioning currently supports only PostgreSQL');
  }

  const qi = sequelize.getQueryInterface();
  await qi.createSchema(schemaName, { transaction }).catch(() => { });

  const quotedSchema = qi.quoteIdentifier(schemaName);

  await sequelize.query(
    `
      CREATE TABLE IF NOT EXISTS ${quotedSchema}.products (
        id uuid PRIMARY KEY,
        name varchar(150) NOT NULL,
        sku varchar(80) UNIQUE,
        price numeric(12,2) NOT NULL DEFAULT 0,
        stock_quantity integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    { transaction }
  );

  await sequelize.query(
    `
      CREATE TABLE IF NOT EXISTS ${quotedSchema}.customers (
        id uuid PRIMARY KEY,
        email varchar(120) UNIQUE,
        first_name varchar(80),
        last_name varchar(80),
        phone varchar(30),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    { transaction }
  );

  await sequelize.query(
    `
      CREATE TABLE IF NOT EXISTS ${quotedSchema}.orders (
        id uuid PRIMARY KEY,
        order_number varchar(40) UNIQUE NOT NULL,
        customer_id uuid,
        status varchar(40) NOT NULL DEFAULT 'pending',
        total_amount numeric(12,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
          REFERENCES ${quotedSchema}.customers(id) ON DELETE SET NULL
      )
    `,
    { transaction }
  );

  await sequelize.query(
    `
      CREATE TABLE IF NOT EXISTS ${quotedSchema}.provisioning_meta (
        id bigserial PRIMARY KEY,
        store_id uuid NOT NULL,
        stripe_event_id varchar(255) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
    { transaction }
  );
};

const ensureRole = async (roleName, transaction) => {
  const found = await Role.findOne({ where: { name: roleName }, transaction });
  if (found) return found;

  const roleDefaults = {
    superadmin: { display_name: 'Super Administrator', level: 10 },
    ceo: { display_name: 'CEO', level: 9 },
    admin: { display_name: 'Administrator', level: 8 },
    manager: { display_name: 'Manager', level: 6 },
    employee: { display_name: 'Employee', level: 4 }
  };

  const config = roleDefaults[roleName] || { display_name: roleName, level: 1 };

  return Role.create({
    name: roleName,
    display_name: config.display_name,
    description: `Auto-created role: ${roleName}`,
    level: config.level,
    is_system: true,
    permissions: {
      users: { create: true, read: true, update: true, delete: false },
      products: { create: true, read: true, update: true, delete: true },
      orders: { create: true, read: true, update: true, delete: true },
      invoices: { create: true, read: true, update: true, delete: true },
      customers: { create: true, read: true, update: true, delete: true },
      dashboard: { view: true, analytics: true, reports: true },
      sustainability: { view: true, manage: true },
      system: { settings: true, backup: false, logs: true }
    }
  }, { transaction });
};

const buildProvisionPayloadFromSession = (session) => {
  const metadata = session.metadata || {};

  return {
    stripe_session_id: session.id,
    stripe_customer_id: session.customer || null,
    stripe_subscription_id: session.subscription || null,
    owner_email: metadata.owner_email || null,
    owner_password_hash: metadata.owner_password_hash || null,
    owner_first_name: metadata.owner_first_name || 'Owner',
    owner_last_name: metadata.owner_last_name || 'Admin',
    tenant_name: metadata.tenant_name || metadata.store_name || null,
    subdomain: normalizeSubdomain(metadata.subdomain || ''),
    plan_id: metadata.plan_id || null,
    customization_notes: metadata.customization_notes || null,
    setup_fee_cents: metadata.setup_fee_cents || null,
    monthly_fee_cents: metadata.monthly_fee_cents || null,
    event_type: 'checkout.session.completed'
  };
};

const enqueueProvisioningFromStripeSession = async (session, stripeEventId, transaction = null) => {
  const payload = buildProvisionPayloadFromSession(session);

  if (!payload.owner_email || !payload.tenant_name || !payload.subdomain) {
    throw new Error('Missing required metadata (owner_email, tenant_name, subdomain) for provisioning');
  }

  const [job] = await ProvisioningJob.findOrCreate({
    where: { stripe_event_id: stripeEventId },
    defaults: {
      stripe_event_id: stripeEventId,
      payload,
      status: 'queued'
    },
    transaction
  });

  return job;
};

const processSingleJob = async (job) => {
  const transaction = await sequelize.transaction();

  try {
    await job.update({ status: 'processing' }, { transaction });

    const payload = job.payload || {};
    const subdomain = normalizeSubdomain(payload.subdomain);

    let store = await Store.findOne({ where: { subdomain }, transaction });

    if (!store) {
      store = await Store.create({
        name: payload.tenant_name,
        subdomain,
        is_active: true,
        settings: {
          currency: 'EUR',
          language: 'es',
          plan_id: payload.plan_id || 'starter',
          stripe_customer_id: payload.stripe_customer_id || null,
          stripe_subscription_id: payload.stripe_subscription_id || null,
          saas_onboarding_status: 'provisioning'
        }
      }, { transaction });
    }

    const schemaName = makeSchemaNameFromStoreId(store.id);
    await createTenantSchemaAndTables(schemaName, transaction);

    const existingOwner = await User.findOne({ where: { email: payload.owner_email }, transaction });

    let ownerUser = existingOwner;
    if (!ownerUser) {

      let passwordHash;
      if (payload.owner_password_hash) {
        passwordHash = payload.owner_password_hash;
      } else {
        const rawPassword = crypto.randomBytes(18).toString('base64url');
        passwordHash = await bcrypt.hash(rawPassword, 12);
      }

      ownerUser = await User.create({
        store_id: store.id,
        username: `${subdomain}_admin`,
        email: payload.owner_email,
        password_hash: passwordHash,
        first_name: payload.owner_first_name || 'Owner',
        last_name: payload.owner_last_name || payload.tenant_name,
        is_active: true,
        email_verified: true,
        email_verified_at: new Date(),
        verification_token: null,
        verification_token_expires: null,
        preferences: {
          theme: 'dark',
          language: 'es',
          plan_id: payload.plan_id || 'starter',
          onboarding_status: 'provisioned',
          must_set_password: !payload.owner_password_hash
        }
      }, { transaction });

      if (ownerUser.store_id !== store.id) {
        console.error(`[PROVISIONING] store_id mismatch after create! Expected ${store.id}, got ${ownerUser.store_id}. Forcing update.`);
        await ownerUser.update({ store_id: store.id }, { transaction });
      }
    } else if (!ownerUser.store_id) {

      await ownerUser.update({ store_id: store.id }, { transaction });
    }

    if (!ownerUser.email_verified) {
      await ownerUser.update({
        email_verified: true,
        email_verified_at: new Date(),
        verification_token: null,
        verification_token_expires: null
      }, { transaction });
    }

    const ceoRole = await ensureRole('ceo', transaction);
    await ownerUser.addRole(ceoRole, {
      through: { is_active: true, assigned_at: new Date(), store_id: store.id },
      transaction
    }).catch(() => { });

    await UserStore.findOrCreate({
      where: { user_id: ownerUser.id, store_id: store.id },
      defaults: { user_id: ownerUser.id, store_id: store.id, is_primary: true },
      transaction
    });

    const planId = payload.plan_id || 'starter';
    const planPricing = {
      starter: 49900,
      process: 49900,
      installation: 99900,
      enterprise: 149900
    };
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await store.update({
      is_active: true,
      plan_id: planId,
      plan_price_cents: planPricing[planId] || 49900,
      billing_start_date: now.toISOString().split('T')[0],
      next_payment_date: nextMonth.toISOString().split('T')[0],
      payment_status: 'paid',
      stripe_customer_id: payload.stripe_customer_id || null,
      stripe_subscription_id: payload.stripe_subscription_id || null,
      settings: {
        ...(store.settings || {}),
        schema_name: schemaName,
        plan_id: planId,
        stripe_customer_id: payload.stripe_customer_id || null,
        stripe_subscription_id: payload.stripe_subscription_id || null,
        saas_onboarding_status: 'active',
        customization_notes: payload.customization_notes || null
      }
    }, { transaction });

    const { PaymentRecord } = require('../models');

    const setupFeeCents = parseInt(payload.setup_fee_cents) || planPricing[planId] || 49900;
    await PaymentRecord.create({
      store_id: store.id,
      amount_cents: setupFeeCents,
      concept: 'Configuración Inicial (Pago Único)',
      payment_method: 'stripe',
      notes: `Cobrado vía Stripe Checkout (${payload.stripe_session_id})`,
      payment_date: now.toISOString().split('T')[0],
      recorded_by: 'system'
    }, { transaction });

    const monthlyFeeCents = parseInt(payload.monthly_fee_cents) || (planId === 'starter' ? 2900 : planId === 'installation' ? 4900 : 7900);
    await PaymentRecord.create({
      store_id: store.id,
      amount_cents: monthlyFeeCents,
      concept: `Mantenimiento Mensual - ${now.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}`,
      payment_method: 'stripe',
      notes: `Primera cuota mensual cobrada vía Stripe`,
      payment_date: now.toISOString().split('T')[0],
      recorded_by: 'system'
    }, { transaction });

    await job.update({
      status: 'completed',
      store_id: store.id,
      processed_at: new Date(),
      last_error: null
    }, { transaction });

    await StripeEvent.update({
      status: 'processed',
      processed_at: new Date(),
      error: null
    }, {
      where: { id: job.stripe_event_id },
      transaction
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();

    const retries = (job.retries || 0) + 1;
    const hasRetriesLeft = retries < MAX_RETRIES;

    await job.update({
      status: hasRetriesLeft ? 'queued' : 'failed',
      retries,
      last_error: error.message
    });

    await StripeEvent.update({
      status: 'failed',
      error: error.message
    }, {
      where: { id: job.stripe_event_id }
    });

    throw error;
  }
};

const processQueuedJobs = async () => {
  if (workerRunning) return;
  workerRunning = true;

  try {
    const jobs = await ProvisioningJob.findAll({
      where: { status: 'queued' },
      order: [['created_at', 'ASC']],
      limit: 10
    });

    for (const job of jobs) {
      try {
        await processSingleJob(job);
      } catch (error) {
        console.error(`Provisioning job ${job.id} failed:`, error.message);
      }
    }
  } finally {
    workerRunning = false;
  }
};

const ensureWorkerInfrastructure = async () => {
  if (workerInitialized) return;
  await StripeEvent.sync();
  await ProvisioningJob.sync();
  workerInitialized = true;
};

const startWorker = async () => {
  if (workerInterval) return;

  await ensureWorkerInfrastructure();

  workerInterval = setInterval(() => {
    processQueuedJobs().catch((error) => {
      console.error('Provisioning worker cycle failed:', error.message);
    });
  }, WORKER_INTERVAL_MS);

  setTimeout(() => {
    processQueuedJobs().catch((error) => {
      console.error('Initial provisioning cycle failed:', error.message);
    });
  }, 500);

  console.log('✅ SaaS provisioning worker started');
};

const stopWorker = () => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('🛑 SaaS provisioning worker stopped');
  }
};

const getProvisioningStatusBySubdomain = async (subdomain) => {
  const store = await Store.findOne({ where: { subdomain: normalizeSubdomain(subdomain) } });
  if (!store) return null;

  const latestJob = await ProvisioningJob.findOne({
    where: { store_id: store.id },
    order: [['created_at', 'DESC']]
  });

  return {
    store: {
      id: store.id,
      name: store.name,
      subdomain: store.subdomain,
      is_active: store.is_active,
      settings: store.settings || {}
    },
    job: latestJob ? {
      id: latestJob.id,
      status: latestJob.status,
      retries: latestJob.retries,
      last_error: latestJob.last_error,
      processed_at: latestJob.processed_at
    } : null
  };
};

module.exports = {
  enqueueProvisioningFromStripeSession,
  processQueuedJobs,
  startWorker,
  stopWorker,
  getProvisioningStatusBySubdomain
};
