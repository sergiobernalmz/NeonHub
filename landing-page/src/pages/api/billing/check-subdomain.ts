import type { APIRoute } from 'astro';

const BACKEND = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');

export const GET: APIRoute = async ({ url }) => {
  const subdomain = url.searchParams.get('subdomain') || '';
  const json = { 'Content-Type': 'application/json' };

  if (!subdomain) {
    return new Response(JSON.stringify({ available: false, reason: 'empty' }), { status: 400, headers: json });
  }

  try {
    const res = await fetch(`${BACKEND}/billing/check-subdomain?sub=${encodeURIComponent(subdomain)}`);
    const data = await res.text();
    return new Response(data, { status: res.status, headers: json });
  } catch {
    return new Response(JSON.stringify({ available: false, reason: 'error' }), { status: 503, headers: json });
  }
};
