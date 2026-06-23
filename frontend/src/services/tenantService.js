import api from './api';

const tenantService = {
    
    getProvisioningRequests: async () => {
        try {
            const response = await api.get('/billing/admin/provisioning-requests');
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching provisioning requests:', error);
            throw error;
        }
    },

    
    approveProvisioningRequest: async (id) => {
        try {
            const response = await api.post(`/billing/admin/provisioning-requests/${id}/approve`);
            return response.data;
        } catch (error) {
            console.error('Error approving provisioning request:', error);
            throw error;
        }
    },

    
    getStores: async () => {
        try {
            const response = await api.get('/admin/stores');
            return response.data?.data || response.data || [];
        } catch (error) {
            console.error('Error fetching stores:', error);
            throw error;
        }
    },

    
    getStoreDetails: async (id) => {
        try {
            const response = await api.get(`/admin/stores/${id}`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('Error fetching store details:', error);
            throw error;
        }
    },

    
    toggleStoreActive: async (id) => {
        try {
            const response = await api.patch(`/admin/stores/${id}/toggle`);
            return response.data;
        } catch (error) {
            console.error('Error toggling store:', error);
            throw error;
        }
    },

    
    pauseStore: async (id, reason = '') => {
        try {
            const response = await api.patch(`/admin/stores/${id}/pause`, { reason });
            return response.data;
        } catch (error) {
            console.error('Error pausing store:', error);
            throw error;
        }
    },

    
    deleteStore: async (id) => {
        try {
            const response = await api.delete(`/admin/stores/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting store:', error);
            throw error;
        }
    },

    
    updatePaymentStatus: async (id, paymentStatus, nextPaymentDate = null) => {
        try {
            const body = { payment_status: paymentStatus };
            if (nextPaymentDate) body.next_payment_date = nextPaymentDate;
            const response = await api.patch(`/admin/stores/${id}/payment-status`, body);
            return response.data;
        } catch (error) {
            console.error('Error updating payment status:', error);
            throw error;
        }
    },

    
    updatePlan: async (id, planId) => {
        try {
            const response = await api.patch(`/admin/stores/${id}/plan`, { plan_id: planId });
            return response.data;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        }
    },

    
    getAllTickets: async () => {
        try {
            const response = await api.get('/tickets/admin');
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching tickets:', error);
            throw error;
        }
    },

    
    updateTicketStatus: async (id, status) => {
        try {
            const response = await api.patch(`/tickets/admin/${id}/status`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating ticket status:', error);
            throw error;
        }
    },

    
    replyToTicket: async (id, message) => {
        try {
            const response = await api.post(`/tickets/admin/${id}/reply`, { message });
            return response.data;
        } catch (error) {
            console.error('Error replying to ticket:', error);
            throw error;
        }
    },

    // ── Branding / Personalización ─────────────────────────────

    
    getStoreBranding: async (id) => {
        try {
            const response = await api.get(`/admin/stores/${id}/branding`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('Error fetching store branding:', error);
            throw error;
        }
    },

    
    updateStoreBranding: async (id, brandingData) => {
        try {
            const response = await api.patch(`/admin/stores/${id}/branding`, brandingData);
            return response.data;
        } catch (error) {
            console.error('Error updating store branding:', error);
            throw error;
        }
    },

    
    uploadStoreLogo: async (id, file) => {
        try {
            const formData = new FormData();
            formData.append('logo', file);
            const response = await api.post(`/admin/stores/${id}/logo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading store logo:', error);
            throw error;
        }
    },

    
    getPlanFeatures: async () => {
        try {
            const response = await api.get('/admin/plan-features');
            return response.data?.data || response.data;
        } catch (error) {
            console.error('Error fetching plan features:', error);
            throw error;
        }
    },
    
    getAllPayments: async () => {
        try {
            const response = await api.get('/billing/admin/payments');
            return response.data?.data || [];
        } catch (error) {
            console.error('Error fetching all payments:', error);
            throw error;
        }
    },

    
    getStorePayments: async (id) => {
        try {
            const response = await api.get(`/billing/admin/stores/${id}/payments`);
            return response.data?.data || { payments: [], summary: {} };
        } catch (error) {
            console.error('Error fetching store payments:', error);
            throw error;
        }
    },

    // ── Store Settings (Domain & URL Mapping) ────────────────────

    updateStoreSettings: async (id, settings) => {
        try {
            const response = await api.patch(`/admin/stores/${id}/settings`, settings);
            return response.data;
        } catch (error) {
            console.error('Error updating store settings:', error);
            throw error;
        }
    }
};

export default tenantService;
