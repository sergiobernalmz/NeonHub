const pg = require('pg');
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5434,
  database: 'landing_db',
  user: 'landing',
  password: 'Lnd_SecR3T_88bPqX91',
  max: 5
});

async function audit() {
  try {
    const users = await pool.query('SELECT id, username, email, role, email_verified, created_at FROM users ORDER BY created_at');
    console.log('\n═══ LANDING_DB USERS ═══');
    users.rows.forEach(u => console.log(`  ${u.username} | ${u.email} | role=${u.role} | verified=${u.email_verified} | ${u.created_at}`));

    const sessions = await pool.query('SELECT id, user_id, expires_at FROM sessions');
    console.log(`\n═══ LANDING_DB SESSIONS ═══`);
    console.log(`  Total: ${sessions.rows.length}`);
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
audit();
