import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { spacing, borderRadius, fontSize } from '../../utils/theme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login, loading } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Por favor completa todos los campos');
            return;
        }
        setError('');
        const result = await login(email, password);
        if (!result?.success) {
            setError(result?.message || 'Error al iniciar sesión');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Logo */}
                <View style={styles.logoBox}>
                    <Text style={styles.logoLetter}>N</Text>
                </View>
                <Text style={styles.appName}>NeonHub</Text>
                <Text style={styles.subtitle}>Inicia sesión en tu cuenta</Text>

                {/* Card */}
                <View style={styles.card}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#475569"
                        value={email}
                        onChangeText={(v) => { setEmail(v); setError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.passwordWrapper}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="••••••••"
                            placeholderTextColor="#475569"
                            value={password}
                            onChangeText={(v) => { setPassword(v); setError(''); }}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(v => !v)}
                            style={styles.eyeBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading || !email || !password}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.buttonText}>Iniciar Sesión</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        shadowColor: '#6366f1',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    logoLetter: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    appName: {
        fontSize: fontSize.xl,
        fontWeight: 'bold',
        color: '#f1f5f9',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: '#64748b',
        marginBottom: spacing.xl,
    },
    card: {
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    errorBox: {
        backgroundColor: 'rgba(239,68,68,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        marginBottom: spacing.md,
    },
    errorText: {
        color: '#ef4444',
        fontSize: fontSize.sm,
    },
    label: {
        fontSize: fontSize.sm,
        color: '#94a3b8',
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        color: '#f1f5f9',
        fontSize: fontSize.md,
    },
    passwordWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: borderRadius.md,
        marginBottom: spacing.lg,
    },
    passwordInput: {
        flex: 1,
        padding: spacing.md,
        color: '#f1f5f9',
        fontSize: fontSize.md,
    },
    eyeBtn: {
        paddingHorizontal: spacing.md,
    },
    eyeIcon: {
        fontSize: 16,
    },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: fontSize.md,
        fontWeight: '600',
    },
});
