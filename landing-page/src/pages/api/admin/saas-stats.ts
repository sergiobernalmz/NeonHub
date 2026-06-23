import type { APIRoute } from 'astro';

const BACKEND = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');

export const GET: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-admin-secret');
  if (!secret) {
    return new Response(JSON.stringify({ success: false, message: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const res = await fetch(`${BACKEND}/admin/saas-stats`, {
      headers: { 'x-admin-secret': secret }
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Error conectando al backend' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
