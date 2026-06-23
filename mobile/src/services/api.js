import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.neonhub.es';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// lo asigna App.js cuando el navegador está listo, para poder redirigir al login en caso de 401
let _onUnauthorized = null;
export const setUnauthorizedCallback = (cb) => { _onUnauthorized = cb; };

// añadimos el JWT y el tenant id a cada petición
api.interceptors.request.use(
    async (config) => {
        try {
            const [token, tenantId] = await Promise.all([
                AsyncStorage.getItem('token'),
                AsyncStorage.getItem('tenantId'),
            ]);
            if (token) config.headers.Authorization = `Bearer ${token}`;
            if (tenantId) config.headers['x-tenant-id'] = tenantId;
        } catch (error) {
            console.error('Error al obtener el token:', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// si llega un 401 limpiamos la sesión y redirigimos al login
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.multiRemove(['token', 'user', 'tenantId']);
            if (_onUnauthorized) _onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export default api;
