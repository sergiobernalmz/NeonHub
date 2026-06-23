// Utilidad para disparar un webhook de n8n para verificación de email
export async function sendVerificationEmail({ email, username, token }: { email: string, username: string, token: string }) {
  const N8N_WEBHOOK_URL = import.meta.env.N8N_VERIFY_EMAIL_WEBHOOK || 'https://neonhub.n8nservidor.es/webhook/verify-email-landing';
  try {
    console.log(`Enviando evento a n8n: ${N8N_WEBHOOK_URL}`);
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, token })
    });
    console.log(`Respuesta de n8n: ${res.status} ${res.statusText}`);
  } catch (err) {
    // No bloquear registro si falla el webhook, solo loguear
    console.error('Error enviando webhook de verificación a n8n:', err);
  }
}
