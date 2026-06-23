import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedCallback } from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUser();

        // si la API devuelve 401, limpiamos el estado local para que el navegador vuelva al login
        setUnauthorizedCallback(() => {
            setUser(null);
        });
    }, []);

    const loadUser = async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Error al cargar el usuario:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const { user: userData } = await authService.login(email, password);
            setUser(userData);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const register = async (userData) => {
        setLoading(true);
        try {
            return await authService.register(userData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                register,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};
