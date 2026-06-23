

const BACKEND_API_URL = (import.meta.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/$/, '');
const ADMIN_SECRET = import.meta.env.ADMIN_API_SECRET;

export interface AdminApiResult {
  success: boolean;
  data?: any;
  message?: string;
}

export async function adminFetch(path: string, options: RequestInit = {}): Promise<AdminApiResult> {
  if (!ADMIN_SECRET) {
    return { success: false, message: 'ADMIN_API_SECRET no configurado' };
  }
  const url = `${BACKEND_API_URL}/billing/admin${path}`;
  const headers: Record<string, string> = {
    'x-admin-secret': ADMIN_SECRET,
    ...(options.headers as Record<string, string> || {})
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error(`Admin API error (${path}):`, error.message);
    return { success: false, message: error.message };
  }
}

export async function getStores(): Promise<AdminApiResult> {
  return adminFetch('/stores');
}

export async function getStoreDetail(id: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/detail`);
}

export async function getStoreCustomers(id: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/customers`);
}

export async function getProvisioningRequests(): Promise<AdminApiResult> {
  return adminFetch('/provisioning-requests');
}

export async function getBillingSummary(): Promise<AdminApiResult> {
  return adminFetch('/billing-summary');
}

export async function toggleStore(id: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/toggle`, { method: 'PATCH' });
}

export async function pauseStore(id: string, reason?: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/pause`, {
    method: 'PATCH',
    body: JSON.stringify({ reason })
  });
}

export async function deleteStore(id: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}`, { method: 'DELETE' });
}

export async function createStore(data: { name: string; subdomain: string; plan_id?: string; owner_email: string; owner_password?: string; owner_first_name?: string; owner_last_name?: string }): Promise<AdminApiResult> {
  return adminFetch('/stores/create', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePaymentStatus(id: string, status: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/payment-status`, {
    method: 'PATCH',
    body: JSON.stringify({ payment_status: status })
  });
}

export async function approveProvisioning(id: string): Promise<AdminApiResult> {
  return adminFetch(`/provisioning-requests/${id}/approve`, { method: 'POST' });
}

export async function deleteCompletedProvisioning(): Promise<AdminApiResult> {
  return adminFetch('/provisioning-requests/completed', { method: 'DELETE' });
}

export async function checkOverdue(): Promise<AdminApiResult> {
  return adminFetch('/check-overdue', { method: 'POST' });
}

export async function updatePlan(id: string, planId: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ plan_id: planId })
  });
}

export async function extendTrial(id: string, days: number): Promise<AdminApiResult> {
  return adminFetch(`/stores/${id}/extend-trial`, {
    method: 'PATCH',
    body: JSON.stringify({ days })
  });
}

export async function getUserStores(userId: string): Promise<AdminApiResult> {
  return adminFetch(`/users/${userId}/stores`);
}

export async function removeUserFromStore(userId: string, storeId: string): Promise<AdminApiResult> {
  return adminFetch(`/users/${userId}/stores/${storeId}`, { method: 'DELETE' });
}

export async function unlockUser(userId: string): Promise<AdminApiResult> {
  return adminFetch(`/users/${userId}/unlock`, { method: 'POST' });
}

// registros de pagos
export async function getPayments(storeId: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${storeId}/payments`);
}

export async function registerPayment(storeId: string, data: { amount_cents: number; concept: string; payment_method?: string; notes?: string; payment_date?: string }): Promise<AdminApiResult> {
  return adminFetch(`/stores/${storeId}/payments`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deletePayment(paymentId: string): Promise<AdminApiResult> {
  return adminFetch(`/payments/${paymentId}`, { method: 'DELETE' });
}

// configuración del plan Enterprise
export async function getEnterpriseConfig(storeId: string): Promise<AdminApiResult> {
  return adminFetch(`/stores/${storeId}/enterprise-config`);
}

export async function uploadEnterpriseImages(storeId: string, formData: FormData): Promise<AdminApiResult> {
  return adminFetch(`/stores/${storeId}/upload`, {
    method: 'POST',
    body: formData
  });
}

export async function updateEnterpriseConfig(storeId: string, config: Record<string, any>): Promise<AdminApiResult> {
  return adminFetch(`/stores/${storeId}/enterprise-config`, {
    method: 'PATCH',
    body: JSON.stringify({ config })
  });
}

// ═══════════════════════════════════════════════
// gestión de usuarios
// ═══════════════════════════════════════════════

export async function getUsers(storeId?: string): Promise<AdminApiResult> {
  const qs = storeId ? `?store_id=${storeId}` : '';
  return adminFetch(`/users${qs}`);
}

export async function createAdminUser(data: { username: string; email: string; password: string; first_name?: string; last_name?: string; store_id?: string; role?: string }): Promise<AdminApiResult> {
  return adminFetch('/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateUser(id: string, data: Record<string, any>): Promise<AdminApiResult> {
  return adminFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteUser(id: string, confirm?: string): Promise<AdminApiResult> {
  const qs = confirm ? `?confirm=${confirm}` : '';
  return adminFetch(`/users/${id}${qs}`, { method: 'DELETE' });
}

export async function getRoles(): Promise<AdminApiResult> {
  return adminFetch('/roles');
}

export async function getLeads(): Promise<AdminApiResult> {
  return adminFetch('/leads');
}

export async function resendVerification(email: string): Promise<AdminApiResult> {
  return adminFetch('/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPasswordUser(email: string): Promise<AdminApiResult> {
  return adminFetch('/reset-password-user', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function createLead(data: { username: string; email: string; password: string; role?: string }): Promise<AdminApiResult> {
  return adminFetch('/leads/create', { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteLead(id: string, requesterEmail?: string): Promise<AdminApiResult> {
  const headers: Record<string, string> = {};
  if (requesterEmail) headers['x-requester-email'] = requesterEmail;
  return adminFetch(`/leads/${id}`, { method: 'DELETE', headers });
}

export async function resetPasswordLead(email: string, requesterEmail?: string): Promise<AdminApiResult> {
  const headers: Record<string, string> = {};
  if (requesterEmail) headers['x-requester-email'] = requesterEmail;
  return adminFetch('/reset-password-lead', { method: 'POST', body: JSON.stringify({ email }), headers });
}

export async function getNotes(): Promise<AdminApiResult> {
  return adminFetch('/notes');
}

export async function saveNote(email: string, note: string): Promise<AdminApiResult> {
  return adminFetch(`/notes/${encodeURIComponent(email)}`, { method: 'PATCH', body: JSON.stringify({ note }) });
}

// ═══════════════════════════════════════════════
// gestión de tickets
// ═══════════════════════════════════════════════

export async function getTickets(status?: string): Promise<AdminApiResult> {
  const qs = status ? `?status=${status}` : '';
  return adminFetch(`/tickets${qs}`);
}

export async function getTicketDetails(id: string): Promise<AdminApiResult> {
  return adminFetch(`/tickets/${id}`);
}

export async function updateTicketStatus(id: string, status: string): Promise<AdminApiResult> {
  return adminFetch(`/tickets/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function replyToTicket(id: string, message: string): Promise<AdminApiResult> {
  return adminFetch(`/tickets/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

export async function deleteTicket(id: string): Promise<AdminApiResult> {
  return adminFetch(`/tickets/${id}`, { method: 'DELETE' });
}

export async function deleteResolvedTickets(): Promise<AdminApiResult> {
  return adminFetch('/tickets/resolved', { method: 'DELETE' });
}
