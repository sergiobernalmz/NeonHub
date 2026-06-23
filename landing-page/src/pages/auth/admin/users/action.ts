import type { APIRoute } from 'astro';
import { validateSession } from '../../../../lib/auth';
import { getUsers, createAdminUser, updateUser, deleteUser, getRoles, resendVerification, resetPasswordUser, deleteLead, resetPasswordLead, createLead, getNotes, saveNote, getUserStores, removeUserFromStore, unlockUser } from '../../../../lib/adminApi';

export const POST: APIRoute = async ({ request, cookies }) => {
    const sessionId = cookies.get('app_auth_token')?.value;
    if (!sessionId) {
        return new Response(JSON.stringify({ success: false, message: 'No autenticado' }), { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session || session.user.role !== 'admin') {
        return new Response(JSON.stringify({ success: false, message: 'Acceso denegado' }), { status: 403 });
    }

    const adminEmail = session.user.email;

    try {
        const body = await request.json();
        const { action } = body;

        let result;
        switch (action) {
            case 'list':
                result = await getUsers(body.storeId);
                break;
            case 'create':
                result = await createAdminUser({
                    username: body.username,
                    email: body.email,
                    password: body.password,
                    first_name: body.first_name,
                    last_name: body.last_name,
                    store_id: body.store_id,
                    role: body.role
                });
                break;
            case 'update':
                if (!body.userId) {
                    return new Response(JSON.stringify({ success: false, message: 'userId es obligatorio' }), { status: 400 });
                }
                result = await updateUser(body.userId, body.data || {});
                break;
            case 'delete':
                if (!body.userId) {
                    return new Response(JSON.stringify({ success: false, message: 'userId es obligatorio' }), { status: 400 });
                }
                result = await deleteUser(body.userId, body.confirm);
                break;
            case 'roles':
                result = await getRoles();
                break;
            case 'resend-verification':
                if (!body.email) {
                    return new Response(JSON.stringify({ success: false, message: 'email es obligatorio' }), { status: 400 });
                }
                result = await resendVerification(body.email);
                break;
            case 'reset-password':
                if (!body.email) {
                    return new Response(JSON.stringify({ success: false, message: 'email es obligatorio' }), { status: 400 });
                }
                if (body.email === adminEmail) {
                    return new Response(JSON.stringify({ success: false, message: 'No puedes realizar esta acción sobre tu propia cuenta' }), { status: 403 });
                }
                result = await resetPasswordUser(body.email);
                break;
            case 'delete-lead':
                if (!body.leadId) {
                    return new Response(JSON.stringify({ success: false, message: 'leadId es obligatorio' }), { status: 400 });
                }
                if (body.email === adminEmail) {
                    return new Response(JSON.stringify({ success: false, message: 'No puedes realizar esta acción sobre tu propia cuenta' }), { status: 403 });
                }
                result = await deleteLead(body.leadId, adminEmail);
                break;
            case 'reset-password-lead':
                if (!body.email) {
                    return new Response(JSON.stringify({ success: false, message: 'email es obligatorio' }), { status: 400 });
                }
                if (body.email === adminEmail) {
                    return new Response(JSON.stringify({ success: false, message: 'No puedes realizar esta acción sobre tu propia cuenta' }), { status: 403 });
                }
                result = await resetPasswordLead(body.email, adminEmail);
                break;
            case 'create-lead':
                if (!body.username || !body.email || !body.password) {
                    return new Response(JSON.stringify({ success: false, message: 'username, email y password son obligatorios' }), { status: 400 });
                }
                result = await createLead({ username: body.username, email: body.email, password: body.password, role: body.role });
                break;
            case 'get-notes':
                result = await getNotes();
                break;
            case 'save-note':
                if (!body.email) {
                    return new Response(JSON.stringify({ success: false, message: 'email es obligatorio' }), { status: 400 });
                }
                result = await saveNote(body.email, body.note || '');
                break;
            case 'get-stores':
                if (!body.userId) {
                    return new Response(JSON.stringify({ success: false, message: 'userId es obligatorio' }), { status: 400 });
                }
                result = await getUserStores(body.userId);
                break;
            case 'remove-from-store':
                if (!body.userId || !body.storeId) {
                    return new Response(JSON.stringify({ success: false, message: 'userId y storeId son obligatorios' }), { status: 400 });
                }
                result = await removeUserFromStore(body.userId, body.storeId);
                break;
            case 'unlock':
                if (!body.userId) {
                    return new Response(JSON.stringify({ success: false, message: 'userId es obligatorio' }), { status: 400 });
                }
                result = await unlockUser(body.userId);
                break;
            default:
                return new Response(JSON.stringify({ success: false, message: `Acción desconocida: ${action}` }), { status: 400 });
        }

        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : (result as any).status || 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Admin user action error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
};
