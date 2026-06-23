import api from './api';

export const sustainabilityService = {
    async getMetrics() {
        try {
            const response = await api.get('/public/sustainability/metrics');
            return response.data;
        } catch (error) {
            console.error('Error al obtener las métricas de sostenibilidad:', error);
            // datos de prueba por si la API falla o no está disponible
            return {
                totalCO2Reduced: 125.5,
                treesSaved: 42,
                waterSaved: 3500,
                energySaved: 850
            };
        }
    },

    async getUserImpact() {
        try {
            const response = await api.get('/sustainability/user-impact');
            return response.data;
        } catch (error) {
            // devolvemos datos de prueba mientras el endpoint no exista
            return {
                ordersCount: 12,
                co2Saved: 24.5,
                ecoPoints: 150
            };
        }
    }
};
