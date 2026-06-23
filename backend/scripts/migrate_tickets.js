require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../src/models');

async function migrate() {
  try {
    console.log('Adding missing columns to support_tickets...');
    
    await sequelize.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS read_by_customer BOOLEAN DEFAULT true;
    `);
    console.log('✅ read_by_customer added');

    await sequelize.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN DEFAULT false;
    `);
    console.log('✅ read_by_admin added');

    await sequelize.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS customer_last_seen TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ customer_last_seen added');

    await sequelize.query(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS admin_last_seen TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ admin_last_seen added');

    console.log('🎉 Migration complete!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }
  process.exit(0);
}
migrate();
