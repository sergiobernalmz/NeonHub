import type { APIRoute } from 'astro';
import { validateSession } from '../../../../lib/auth';
import { getTickets, getTicketDetails, updateTicketStatus, replyToTicket, deleteTicket, deleteResolvedTickets } from '../../../../lib/adminApi';

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
        const { action, ticketId, status, message, statusFilter } = body;

        if (!action) {
            return new Response(JSON.stringify({ success: false, message: 'action es obligatorio' }), { status: 400 });
        }

        let result;
        switch (action) {
            case 'list':
                result = await getTickets(statusFilter);
                break;
            case 'details':
                if (!ticketId) return new Response(JSON.stringify({ success: false, message: 'ticketId requerido' }), { status: 400 });
                result = await getTicketDetails(ticketId);
                break;
            case 'status':
                if (!ticketId || !status) return new Response(JSON.stringify({ success: false, message: 'ticketId y status requeridos' }), { status: 400 });
                result = await updateTicketStatus(ticketId, status);
                break;
            case 'reply':
                if (!ticketId || !message) return new Response(JSON.stringify({ success: false, message: 'ticketId y message requeridos' }), { status: 400 });
                result = await replyToTicket(ticketId, message);
                break;
            case 'delete':
                if (!ticketId) return new Response(JSON.stringify({ success: false, message: 'ticketId requerido' }), { status: 400 });
                result = await deleteTicket(ticketId);
                break;
            case 'delete-resolved':
                result = await deleteResolvedTickets();
                break;
            default:
                return new Response(JSON.stringify({ success: false, message: `Acción desconocida: ${action}` }), { status: 400 });
        }

        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Admin ticket action error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
};
