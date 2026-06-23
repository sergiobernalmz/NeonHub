import type { APIRoute } from 'astro';
import { validateSession } from '../../../../lib/auth';
import { approveProvisioning } from '../../../../lib/adminApi';

export const POST: APIRoute = async ({ request, cookies }) => {
    const sessionId = cookies.get('app_auth_token')?.value;
    if (!sessionId) {
        return new Response(JSON.stringify({ success: false, message: 'No autenticado' }), { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session || session.user.role !== 'admin') {
        return new Response(JSON.stringify({ success: false, message: 'Acceso denegado' }), { status: 403 });
    }

    try {
        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
            return new Response(JSON.stringify({ success: false, message: 'jobId es obligatorio' }), { status: 400 });
        }

        const result = await approveProvisioning(jobId);
        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Admin approve provisioning error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
};
