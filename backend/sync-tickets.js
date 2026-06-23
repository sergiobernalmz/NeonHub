require('dotenv').config();
const { sequelize } = require('./src/models');

async function syncDb() {
  try {
    console.log("Adding missing last_seen columns to support_tickets...");
    await sequelize.query('ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS customer_last_seen TIMESTAMP WITH TIME ZONE DEFAULT NULL;');
    await sequelize.query('ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_last_seen TIMESTAMP WITH TIME ZONE DEFAULT NULL;');
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncDb();
