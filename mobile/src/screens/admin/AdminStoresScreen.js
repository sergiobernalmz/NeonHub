import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native'
import api from '../../services/api'

export default function AdminStoresScreen({ navigation }) {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/admin/stores')
      const data = res.data.data || res.data
      setStores(Array.isArray(data) ? data : data.stores || [])
    } catch {}
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  )

  return (
    <FlatList
      style={styles.container}
      data={stores}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
        />
      }
      ListHeaderComponent={
        <Text style={styles.title}>Tiendas</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('AdminStoreDetail', { store: item })}
        >
          <View style={styles.row}>
            <Text style={styles.storeName}>{item.name}</Text>
            <View style={[
              styles.badge,
              { backgroundColor: item.isActive ? '#10b98122' : '#ef444422' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: item.isActive ? '#10b981' : '#ef4444' }
              ]}>
                {item.isActive ? 'Activa' : 'Pausada'}
              </Text>
            </View>
          </View>
          <Text style={styles.subdomain}>
            {item.subdomain}.neonhub.es
          </Text>
          <Text style={styles.plan}>Plan: {item.plan || '—'}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No hay tiendas.</Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  center: {
    flex: 1, backgroundColor: '#0f0f0f',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    color: '#fff', fontSize: 22, fontWeight: '700',
    marginBottom: 16, marginTop: 8,
  },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: { color: '#fff', fontWeight: '600', fontSize: 15 },
  subdomain: { color: '#888', fontSize: 12, marginTop: 2 },
  plan: { color: '#6366f1', fontSize: 12, marginTop: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { color: '#666', textAlign: 'center', marginTop: 60 },
})
