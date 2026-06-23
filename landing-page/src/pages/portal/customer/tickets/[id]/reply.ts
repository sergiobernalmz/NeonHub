import type { APIRoute } from 'astro';
import { validateSession } from '../../../../../lib/auth';

const BACKEND = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const SECRET  = import.meta.env.ADMIN_API_SECRET || '';

export const POST: APIRoute = async ({ cookies, request, params }) => {
    const sessionId = cookies.get('app_auth_token')?.value;
    if (!sessionId) {
        return new Response(JSON.stringify({ success: false, message: 'No autenticado' }), { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session) {
        return new Response(JSON.stringify({ success: false, message: 'Sesión inválida' }), { status: 401 });
    }

    try {
        const body = await request.json();
        const r = await fetch(`${BACKEND}/tickets/${params.id}/reply-proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET },
            body: JSON.stringify({ ...body, email: session.user.email })
        });
        const data = await r.json();
        return new Response(JSON.stringify(data), {
            status: r.status,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
};
