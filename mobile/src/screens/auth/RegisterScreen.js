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
    Alert,
    ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius, fontSize } from '../../utils/theme';

export default function RegisterScreen({ navigation }) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    });
    const { register, loading } = useAuth();

    const handleChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleRegister = async () => {
        if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        try {
            await register(formData);
            Alert.alert(
                'Éxito',
                'Cuenta creada correctamente. Por favor inicia sesión.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (error) {
            Alert.alert('Error', error.message || 'Error al registrarse');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.logo}>NeonHub</Text>
                <Text style={styles.subtitle}>Únete a la revolución sostenible</Text>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre"
                        placeholderTextColor={colors.textSecondary}
                        value={formData.first_name}
                        onChangeText={(t) => handleChange('first_name', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Apellidos"
                        placeholderTextColor={colors.textSecondary}
                        value={formData.last_name}
                        onChangeText={(t) => handleChange('last_name', t)}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={colors.textSecondary}
                        value={formData.email}
                        onChangeText={(t) => handleChange('email', t)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textSecondary}
                        value={formData.password}
                        onChangeText={(t) => handleChange('password', t)}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.darkBg} />
                        ) : (
                            <Text style={styles.buttonText}>Registrarse</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.linkText}>
                            ¿Ya tienes cuenta? <Text style={styles.linkTextBold}>Inicia Sesión</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.darkBg,
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    logo: {
        fontSize: fontSize.xxxl,
        fontWeight: 'bold',
        color: colors.neonGreen,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl * 2,
    },
    form: {
        width: '100%',
    },
    input: {
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
        color: colors.textPrimary,
        fontSize: fontSize.md,
    },
    button: {
        backgroundColor: colors.neonGreen,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: colors.darkBg,
        fontSize: fontSize.lg,
        fontWeight: 'bold',
    },
    linkButton: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    linkText: {
        color: colors.textSecondary,
        fontSize: fontSize.sm,
    },
    linkTextBold: {
        color: colors.neonGreen,
        fontWeight: 'bold',
    },
});
