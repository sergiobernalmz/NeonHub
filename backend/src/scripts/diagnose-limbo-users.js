

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { sequelize, User, Store, ProvisioningJob } = require('../models');

async function main() {
  await sequelize.authenticate();
  console.log('Conectado a la base de datos.\n');

  // caso 1: usuarios con email_verified=false pero que ya tienen store_id asignado
  const unverifiedWithStore = await User.findAll({
    where: { email_verified: false },
    include: [{ model: Store, as: 'store', required: true }],
    attributes: ['id', 'email', 'username', 'created_at', 'store_id']
  });

  console.log(`=== Users with email_verified=false AND store_id assigned: ${unverifiedWithStore.length} ===`);
  for (const u of unverifiedWithStore) {
    console.log(`  - ${u.email} (${u.username}) | store: ${u.store?.name || u.store_id} | created: ${u.created_at?.toISOString().slice(0,10)}`);
  }

  // caso 2: usuarios con email_verified=false cuyo email aparece en un ProvisioningJob
  const unverifiedUsers = await User.findAll({
    where: { email_verified: false },
    attributes: ['id', 'email', 'username', 'created_at', 'store_id']
  });

  const limboCases = [];
  for (const u of unverifiedUsers) {
    const job = await ProvisioningJob.findOne({
      where: { status: 'completed' },
      order: [['created_at', 'DESC']]
    }).then(j => j?.payload?.owner_email === u.email ? j : null).catch(() => null);
    if (job) limboCases.push({ user: u, job });
  }

  console.log(`\n=== Users with email_verified=false whose email matches a completed ProvisioningJob: ${limboCases.length} ===`);
  for (const { user: u, job } of limboCases) {
    console.log(`  - ${u.email} (${u.username}) | job: ${job.id} | store_id: ${job.store_id} | provisioned: ${job.processed_at?.toISOString().slice(0,10)}`);
  }

  // caso 3: usuarios con email_verified=false de más de 24h (candidatos para recordatorio)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { Op } = require('sequelize');
  const staleUnverified = await User.count({
    where: { email_verified: false, created_at: { [Op.lt]: cutoff } }
  });

  console.log(`\n=== Total users with email_verified=false created more than 24h ago: ${staleUnverified} ===`);

  const total = await User.count({ where: { email_verified: false } });
  console.log(`\nTotal unverified users (all): ${total}`);
  console.log('\n--- Fin del informe de diagnóstico. No se modificó ningún dato. ---\n');

  await sequelize.close();
}

main().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
