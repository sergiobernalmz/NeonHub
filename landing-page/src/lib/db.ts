export async function findUserByResetToken(token: string) {
  await initDB();
  const result = await pool.query(
    'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > $2',
    [token, Date.now()]
  );
  return result.rows[0] || null;
}

export async function setUserResetToken(userId: string, token: string, expiresMs: number) {
  await initDB();
  await pool.query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
    [token, expiresMs, userId]
  );
}

export async function clearUserResetToken(userId: string) {
  await initDB();
  await pool.query(
    'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
    [userId]
  );
}

export async function updateUserPassword(userId: string, hashedPassword: string) {
  await initDB();
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
}

export async function findUserByVerificationToken(token: string) {
  await initDB();
  const result = await pool.query(
    `SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > $2`,
    [token, Math.floor(Date.now() / 1000)]
  );
  return result.rows[0] || null;
}

export async function verifyUserEmail(userId: string) {
  await initDB();
  await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
}
import pg from 'pg';

// Utilidad para obtener variables de entorno desde import.meta.env o process.env
function getEnv(key: string, fallback?: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  return fallback;
}

if (!getEnv('LANDING_DB_PASSWORD')) {
  throw new Error('LANDING_DB_PASSWORD no configurado');
}

const pool = new pg.Pool({
  host: getEnv('LANDING_DB_HOST', 'localhost'),
  port: parseInt(getEnv('LANDING_DB_PORT', '5434')!),
  database: getEnv('LANDING_DB_NAME', 'landing_db'),
  user: getEnv('LANDING_DB_USER', 'landing'),
  password: getEnv('LANDING_DB_PASSWORD'),
  max: 10,
  idleTimeoutMillis: 30000,
});

// inicializamos las tablas la primera vez que se importa el módulo
let initialized = false;

export async function initDB() {
  if (initialized) return;
  
  const client = await pool.connect();
  try {
    // Añadir columna email_verified si no existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        email_verified BOOLEAN DEFAULT false
      );
    `);
    const col = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified'`);
    if (col.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false`);
    }
    const vtCol = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='verification_token'`);
    if (vtCol.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN verification_token VARCHAR(64) UNIQUE`);
    }
    const vtExp = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='verification_token_expires'`);
    if (vtExp.rowCount === 0) {
      await client.query(`ALTER TABLE users ADD COLUMN verification_token_expires BIGINT`);
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL
      );
    `);
    initialized = true;
  } finally {
    client.release();
  }
}

// operaciones de usuario
export async function findUserByEmail(email: string) {
  await initDB();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

export async function findUserById(id: string) {
  await initDB();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createUser(user: { id: string; username: string; email: string; password: string; role?: string; verification_token?: string; verification_token_expires?: number }) {
  await initDB();
  const result = await pool.query(
    'INSERT INTO users (id, username, email, password, role, created_at, email_verified, verification_token, verification_token_expires) VALUES ($1, $2, $3, $4, $5, NOW(), false, $6, $7) RETURNING *',
    [user.id, user.username, user.email, user.password, user.role || 'user', user.verification_token ?? null, user.verification_token_expires ?? null]
  );
  return result.rows[0];
}

// operaciones de sesión
export async function createSessionRecord(id: string, userId: string, expiresAt: number) {
  await initDB();
  await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
    [id, userId, expiresAt]
  );
}

export async function findSession(sessionId: string) {
  await initDB();
  const result = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  return result.rows[0] || null;
}

export async function deleteSession(sessionId: string) {
  await initDB();
  await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

export { pool };
