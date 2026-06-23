import api from './api';

export const productService = {
    async getAll(params = {}) {
        try {
            const response = await api.get('/public/products', { params });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al cargar productos');
        }
    },

    async getById(id) {
        try {
            const response = await api.get(`/public/products/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al cargar producto');
        }
    },

    async search(query) {
        try {
            const response = await api.get('/public/products', {
                params: { search: query },
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error en la búsqueda');
        }
    },

    async getByCategory(categoryId) {
        try {
            const response = await api.get('/public/products', {
                params: { categoryId },
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al cargar productos');
        }
    },
};
