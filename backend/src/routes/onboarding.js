const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { getLandingPool } = require('../config/landingDb');

router.post('/create-trial', async (req, res) => {
  const token = req.cookies?.app_auth_token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No autenticado. Inicia sesión para continuar.' });
  }

  const pool = getLandingPool();
  if (!pool) {
    return res.status(503).json({ success: false, message: 'Servicio no disponible temporalmente.' });
  }

  try {
    const { rows: sessionRows } = await pool.query(
      'SELECT user_id FROM sessions WHERE id = $1 AND expires_at > EXTRACT(EPOCH FROM NOW())::bigint',
      [token]
    );

    if (sessionRows.length === 0) {
      return res.status(401).json({ success: false, message: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
    }

    const userId = sessionRows[0].user_id;

    const { rows: userRows } = await pool.query(
      'SELECT email, username FROM users WHERE id = $1 AND email_verified = true',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Debes verificar tu email antes de crear una tienda.' });
    }

    const { email, username } = userRows[0];
    const { store_name, subdomain, category, ownerPassword } = req.body;

    req.body = { email, username, store_name, subdomain, category, ownerPassword };
    return billingController.createTrial(req, res);
  } catch (err) {
    console.error('[onboarding/create-trial]', err);
    return res.status(500).json({ success: false, message: 'Error interno. Inténtalo de nuevo.' });
  }
});

module.exports = router;
