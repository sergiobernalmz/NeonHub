import type { APIRoute } from 'astro';

const BACKEND = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const ADMIN_SECRET = import.meta.env.ADMIN_API_SECRET || '';

export const POST: APIRoute = async ({ request }) => {
  const json = { 'Content-Type': 'application/json' };

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), { status: 400, headers: json });
  }

  const { name, email, subject, message } = body as Record<string, string>;

  if (!name?.trim() || !email?.trim() || !subject || !message?.trim()) {
    return new Response(JSON.stringify({ error: 'Todos los campos son requeridos' }), { status: 400, headers: json });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Email no válido' }), { status: 400, headers: json });
  }

  try {
    const res = await fetch(`${BACKEND}/admin/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), subject, message: message.trim() }),
    });

    if (!res.ok) throw new Error(`Backend ${res.status}`);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: json });
  } catch (err) {
    console.error('[/api/contact]', err);
    return new Response(JSON.stringify({ error: 'Error al enviar el mensaje. Inténtalo de nuevo.' }), { status: 500, headers: json });
  }
};
