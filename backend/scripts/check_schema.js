require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../src/models');

async function check() {
  try {
    const [results] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'support_tickets'
      ORDER BY ordinal_position;
    `);
    console.log('Columns:', results.map(r => r.column_name));
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
}
check();
