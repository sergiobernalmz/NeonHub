import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import api from '../../services/api'

export default function ProductsScreen() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/products?limit=50')
      const data = res.data.data || res.data
      setProducts(Array.isArray(data) ? data : data.products || [])
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
      data={products}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.price}>
              {Number(item.price || 0).toFixed(2)}€
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.category}>
              {item.category || item.Category?.name || 'Sin categoría'}
            </Text>
            <Text style={[
              styles.stock,
              { color: (item.stock || 0) > 0 ? '#10b981' : '#ef4444' }
            ]}>
              Stock: {item.stock ?? '—'}
            </Text>
          </View>
          {!item.isActive && (
            <Text style={styles.inactive}>Inactivo</Text>
          )}
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No hay productos.</Text>
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
  name: { color: '#fff', fontWeight: '600', fontSize: 15, flex: 1 },
  price: { color: '#10b981', fontWeight: '700', fontSize: 15 },
  category: { color: '#888', fontSize: 12 },
  stock: { fontSize: 12, fontWeight: '600' },
  inactive: {
    color: '#ef4444', fontSize: 11,
    marginTop: 4, fontStyle: 'italic',
  },
  empty: { color: '#666', textAlign: 'center', marginTop: 60 },
})
