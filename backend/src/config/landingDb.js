
const { Pool } = require('pg');

let pool = null;

function getLandingPool() {
  if (pool) return pool;

  const host = process.env.LANDING_DB_HOST;
  const port = parseInt(process.env.LANDING_DB_PORT || '5434', 10);
  const database = process.env.LANDING_DB_NAME;
  const user = process.env.LANDING_DB_USER;
  const password = process.env.LANDING_DB_PASSWORD;

  if (!host || !database || !user || !password) return null;

  pool = new Pool({ host, port, database, user, password, max: 3, idleTimeoutMillis: 30000 });
  return pool;
}

async function isLandingEmailUnverified(email) {
  const p = getLandingPool();
  if (!p) throw new Error('landing_db no configurada');
  const { rows } = await p.query(
    'SELECT email_verified FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  if (rows.length === 0) return true; // unknown email — must register first
  return rows[0].email_verified === false;
}

async function getLandingUsers() {
  const p = getLandingPool();
  if (!p) throw new Error('landing_db no configurada');
  const { rows } = await p.query(
    'SELECT id, email, username, email_verified, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

async function getLandingPasswordHash(email) {
  const p = getLandingPool();
  if (!p) return null;
  const { rows } = await p.query(
    'SELECT password FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows.length > 0 ? rows[0].password : null;
}

module.exports = { isLandingEmailUnverified, getLandingUsers, getLandingPool, getLandingPasswordHash };
