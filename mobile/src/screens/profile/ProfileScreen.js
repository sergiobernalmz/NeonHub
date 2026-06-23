import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { useTenant } from '../../context/TenantContext'

export default function ProfileScreen() {
  const { user, logout } = useAuth()
  const { tenant, clearTenant } = useTenant()

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await clearTenant()
          await logout()
        },
      },
    ])
  }

  const handleChangeTenant = async () => {
    await clearTenant()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || '—'}</Text>
        <Text style={styles.email}>{user?.email || '—'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tienda activa</Text>
        <Text style={styles.tenantName}>
          {tenant?.name || 'SuperAdmin'}
        </Text>
        <Text style={styles.tenantRole}>
          {tenant?.role || 'Administrador global'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={handleChangeTenant}
        >
          <Text style={styles.btnSecondaryText}>Cambiar tienda</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnDanger}
          onPress={handleLogout}
        >
          <Text style={styles.btnDangerText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 20 },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { color: '#fff', fontSize: 20, fontWeight: '700' },
  email: { color: '#888', fontSize: 14, marginTop: 4 },
  section: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  sectionLabel: {
    color: '#666', fontSize: 11,
    textTransform: 'uppercase', marginBottom: 6,
  },
  tenantName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tenantRole: { color: '#888', fontSize: 13, marginTop: 2 },
  actions: { gap: 12 },
  btnSecondary: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  btnSecondaryText: { color: '#fff', fontWeight: '600' },
  btnDanger: {
    backgroundColor: '#ef444422', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#ef4444',
  },
  btnDangerText: { color: '#ef4444', fontWeight: '600' },
})
