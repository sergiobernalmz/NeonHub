import type { APIRoute } from 'astro';
import { validateSession } from '../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // validamos la sesión de la landing, igual que en dashboard.astro
    const sessionId = cookies.get('app_auth_token')?.value;
    const session = sessionId ? await validateSession(sessionId) : null;

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, message: 'Sesión no válida' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const subdomain = body?.subdomain as string | undefined;

    if (!subdomain || typeof subdomain !== 'string' || !/^[a-z0-9-]+$/.test(subdomain)) {
      return new Response(
        JSON.stringify({ success: false, message: 'subdomain inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiBase = (import.meta.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '') || 'http://127.0.0.1:4000/api';
    const adminSecret = import.meta.env.ADMIN_API_SECRET;

    const backendRes = await fetch(`${apiBase}/auth/sso-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret
      },
      body: JSON.stringify({ email: session.user.email, subdomain })
    });

    const data = await backendRes.json() as { success: boolean; sso_token?: string; message?: string };

    if (!data.success || !data.sso_token) {
      return new Response(
        JSON.stringify({ success: false, message: data.message || 'No se pudo generar el token SSO' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const baseDomain = 'neonhub.es';
    const redirectUrl = `https://${subdomain}.${baseDomain}/admin?sso=${data.sso_token}`;

    return new Response(
      JSON.stringify({ success: true, redirect_url: redirectUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('sso-redirect API error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
