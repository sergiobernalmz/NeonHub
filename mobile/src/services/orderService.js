import api from './api';

export const orderService = {
    async createOrder(orderData) {
        try {
            const response = await api.post('/orders', orderData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al crear el pedido');
        }
    },

    async getMyOrders() {
        try {
            const response = await api.get('/orders/my-orders');
            return response.data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Error al cargar pedidos');
        }
    },

    async getOrderById(id) {
        try {
            const response = await api.get(`/orders/${id}`);
            return response.data;
        } catch (error) {
            throw new Error('Error al cargar detalle del pedido');
        }
    }
};
