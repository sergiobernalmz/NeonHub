const express = require('express');
const { sendContactEmail } = require('../services/emailService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name?.trim() || !email?.trim() || !subject || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email no válido' });
  }

  await sendContactEmail({ name: name.trim(), email: email.trim(), subject, message: message.trim() });
  return res.json({ success: true });
});

module.exports = router;
