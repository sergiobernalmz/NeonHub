import React, { useEffect } from 'react'
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native'
import { useTenant } from '../../context/TenantContext'

export default function TenantSelectorScreen({ navigation }) {
  const { tenants, isSuperAdmin, loading, error, loadTenants, selectTenant } = useTenant()

  useEffect(() => {
    loadTenants().then((data) => {
      // Auto-select si superAdmin
      if (data.isSuperAdmin) {
        selectTenant({ id: null, role: 'superadmin' })
        return
      }
      // Auto-select si solo 1 tienda
      if (data.tenants?.length === 1) {
        selectTenant(data.tenants[0])
      }
    }).catch(() => {})
  }, [])

  const handleSelect = async (item) => {
    await selectTenant(item)
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>Cargando tus espacios...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={loadTenants}>
        <Text style={styles.retryText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>¿A qué quieres acceder?</Text>
      {isSuperAdmin && (
        <TouchableOpacity
          style={[styles.card, styles.adminCard]}
          onPress={() => handleSelect({ id: null, role: 'superadmin' })}
        >
          <Text style={styles.cardIcon}>🛡️</Text>
          <Text style={styles.cardName}>Panel SuperAdmin</Text>
          <Text style={styles.cardRole}>Administrador global</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={tenants}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelect(item)}
          >
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardRole}>{item.role}</Text>
            <Text style={styles.cardSub}>{item.subdomain}.neonhub.es</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No tienes tiendas asignadas.
          </Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0f0f0f', padding: 20,
  },
  center: {
    flex: 1, backgroundColor: '#0f0f0f',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    color: '#fff', fontSize: 22, fontWeight: '700',
    marginBottom: 20, marginTop: 20,
  },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#333',
  },
  adminCard: { borderColor: '#6366f1' },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cardRole: { color: '#888', fontSize: 13, marginTop: 4 },
  cardSub: { color: '#555', fontSize: 12, marginTop: 2 },
  loadingText: { color: '#aaa', marginTop: 12 },
  errorText: { color: '#ff4444', fontSize: 15, marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#6366f1', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
})
