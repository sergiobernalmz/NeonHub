import api from './api';

export const issueReportService = {
    async getReports(params = {}) {
        try {
            // solo traemos los reportes creados por el usuario actual
            const response = await api.get('/reports', { params: { ...params, created_by_me: true } });
            return response.data;
        } catch (error) {
            console.error('Error al cargar los reportes:', error);
            throw new Error('Error al cargar reportes');
        }
    },

    async getReportById(id) {
        try {
            const response = await api.get(`/reports/${id}`);
            return response.data;
        } catch (error) {
            throw new Error('Error al cargar reporte');
        }
    },

    async createReport(reportData) {
        try {
            // por ahora enviamos JSON; si hace falta imágenes se puede cambiar a FormData
            const response = await api.post('/reports', reportData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al crear reporte');
        }
    }
};
