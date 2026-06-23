import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
    async login(login, password) {
        try {
            const response = await api.post('/auth/login', { login, password });
            const { accessToken, user } = response.data.data;

            const userObject = {
                id: user.id,
                name: [user.firstName, user.lastName].filter(Boolean).join(' '),
                email: user.email,
                username: user.username,
                roles: user.roles,
            };

            await AsyncStorage.setItem('token', accessToken);
            await AsyncStorage.setItem('user', JSON.stringify(userObject));

            return { accessToken, user: userObject };
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
        }
    },

    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.message || 'Error al registrarse');
        }
    },

    async logout() {
        try {
            await AsyncStorage.multiRemove(['token', 'user', 'tenantId']);
        } catch (error) {
            console.error('Error during logout:', error);
        }
    },

    async getCurrentUser() {
        try {
            const userStr = await AsyncStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    async isAuthenticated() {
        try {
            const token = await AsyncStorage.getItem('token');
            return !!token;
        } catch (error) {
            return false;
        }
    },

    async setTenantId(tenantId) {
        await AsyncStorage.setItem('tenantId', String(tenantId));
    },

    async getTenantId() {
        return AsyncStorage.getItem('tenantId');
    },

    async getMyTenants() {
        const response = await api.get('/auth/my-tenants')
        return response.data.data || response.data
    },
};
