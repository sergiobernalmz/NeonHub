import type { APIRoute } from 'astro';
import { validateSession } from '../../../../lib/auth';
import { deleteCompletedProvisioning } from '../../../../lib/adminApi';

export const POST: APIRoute = async ({ cookies }) => {
    const sessionId = cookies.get('app_auth_token')?.value;
    if (!sessionId) {
        return new Response(JSON.stringify({ success: false, message: 'No autenticado' }), { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session || session.user.role !== 'admin') {
        return new Response(JSON.stringify({ success: false, message: 'Acceso denegado' }), { status: 403 });
    }

    try {
        const result = await deleteCompletedProvisioning();
        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Admin cleanup provisioning error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
};
