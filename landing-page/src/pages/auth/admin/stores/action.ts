import type { APIRoute } from 'astro';
import { validateSession } from '../../../../lib/auth';
import { toggleStore, pauseStore, deleteStore, updatePaymentStatus, updatePlan, extendTrial, checkOverdue, getStoreDetail, getStoreCustomers, getPayments, registerPayment, deletePayment, getEnterpriseConfig, updateEnterpriseConfig, uploadEnterpriseImages, createStore } from '../../../../lib/adminApi';

export const POST: APIRoute = async ({ request, cookies }) => {
    // comprobamos que la sesión es de admin
    const sessionId = cookies.get('app_auth_token')?.value;
    if (!sessionId) {
        return new Response(JSON.stringify({ success: false, message: 'No autenticado' }), { status: 401 });
    }

    const session = await validateSession(sessionId);
    if (!session || session.user.role !== 'admin') {
        return new Response(JSON.stringify({ success: false, message: 'Acceso denegado' }), { status: 403 });
    }

    try {
        const contentType = request.headers.get('content-type') || '';
        let body: any = {};
        let action, storeId, reason, status;

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            action = formData.get('action') as string;
            storeId = formData.get('storeId') as string;
            body = { formData };
        } else {
            body = await request.json();
            action = body.action;
            storeId = body.storeId;
            reason = body.reason;
            status = body.status;
        }

        if (!action) {
            return new Response(JSON.stringify({ success: false, message: 'action es obligatorio' }), { status: 400 });
        }

        // check-overdue y create no necesitan storeId
        if (action !== 'check-overdue' && action !== 'create' && !storeId) {
            return new Response(JSON.stringify({ success: false, message: 'storeId es obligatorio para esta acción' }), { status: 400 });
        }

        let result;
        switch (action) {
            case 'detail':
                result = await getStoreDetail(storeId);
                break;
            case 'toggle':
                result = await toggleStore(storeId);
                break;
            case 'pause':
                result = await pauseStore(storeId, reason);
                break;
            case 'delete':
                result = await deleteStore(storeId);
                break;
            case 'payment-status':
                if (!status) {
                    return new Response(JSON.stringify({ success: false, message: 'status es obligatorio para payment-status' }), { status: 400 });
                }
                result = await updatePaymentStatus(storeId, status);
                break;
            case 'extend-trial':
                if (!body.days) {
                    return new Response(JSON.stringify({ success: false, message: 'days es obligatorio' }), { status: 400 });
                }
                result = await extendTrial(storeId, parseInt(body.days));
                break;
            case 'check-overdue':
                result = await checkOverdue();
                break;
            case 'update-plan':
                if (!body.plan_id) {
                    return new Response(JSON.stringify({ success: false, message: 'plan_id es obligatorio' }), { status: 400 });
                }
                result = await updatePlan(storeId, body.plan_id);
                break;
            case 'get-payments':
                result = await getPayments(storeId);
                break;
            case 'register-payment':
                if (!body.amount_cents || !body.concept) {
                    return new Response(JSON.stringify({ success: false, message: 'amount_cents y concept son obligatorios' }), { status: 400 });
                }
                result = await registerPayment(storeId, {
                    amount_cents: body.amount_cents,
                    concept: body.concept,
                    payment_method: body.payment_method,
                    notes: body.notes,
                    payment_date: body.payment_date
                });
                break;
            case 'delete-payment':
                if (!body.paymentId) {
                    return new Response(JSON.stringify({ success: false, message: 'paymentId es obligatorio' }), { status: 400 });
                }
                result = await deletePayment(body.paymentId);
                break;
            case 'get-enterprise-config':
                result = await getEnterpriseConfig(storeId);
                break;
            case 'update-enterprise-config':
                if (!body.config) {
                    return new Response(JSON.stringify({ success: false, message: 'config es obligatorio' }), { status: 400 });
                }
                result = await updateEnterpriseConfig(storeId, body.config);
                break;
            case 'upload-enterprise-images':
                const fd = new FormData();
                function processBase64Image(imgObj: any) {
                    if (!imgObj || !imgObj.data) return null;
                    const base64 = imgObj.data.split(',')[1];
                    const buffer = Buffer.from(base64, 'base64');
                    // Blob estándar no está bien soportado en todas las versiones de node para fetch formData,
                    // pero Undici sí lo soporta. Podemos usar File / Blob.
                    const blob = new Blob([buffer], { type: imgObj.type });
                    return blob;
                }

                if (body.logo) {
                    fd.append('images', processBase64Image(body.logo) as Blob, body.logo.name);
                }
                if (body.favicon) {
                    fd.append('images', processBase64Image(body.favicon) as Blob, body.favicon.name);
                }

                // llamamos al backend
                result = await uploadEnterpriseImages(storeId, fd);
                break;
            case 'get-customers':
                result = await getStoreCustomers(storeId);
                break;
            case 'create':
                if (!body.name || !body.subdomain || !body.owner_email) {
                    return new Response(JSON.stringify({ success: false, message: 'name, subdomain y owner_email obligatorios' }), { status: 400 });
                }
                result = await createStore({
                    name: body.name,
                    subdomain: body.subdomain,
                    plan_id: body.plan_id,
                    owner_email: body.owner_email,
                    owner_password: body.owner_password,
                    owner_first_name: body.owner_first_name,
                    owner_last_name: body.owner_last_name
                });
                break;
            default:
                return new Response(JSON.stringify({ success: false, message: `Acción desconocida: ${action}` }), { status: 400 });
        }

        return new Response(JSON.stringify(result), {
            status: result.success ? 200 : 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        console.error('Admin store action error:', error);
        return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
    }
};
