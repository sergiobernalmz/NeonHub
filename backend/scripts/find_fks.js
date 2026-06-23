require('dotenv').config({ path: __dirname + '/../.env' });
const { sequelize } = require('../src/models');
async function run() {
  const [fks] = await sequelize.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND (ccu.table_name = 'users' OR ccu.table_name = 'stores')
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  fks.forEach(f => console.log(f.table_name + '.' + f.column_name + ' -> ' + f.foreign_table_name));
  process.exit(0);
}
run();
