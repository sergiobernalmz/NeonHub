import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import api from '../../services/api'

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/customers?limit=50')
      const data = res.data.data || res.data
      setCustomers(Array.isArray(data) ? data : data.customers || [])
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
      data={customers}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.spent}>
            Total gastado: {Number(item.totalSpent || 0).toFixed(2)}€
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No hay clientes aún.</Text>
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
  name: { color: '#fff', fontWeight: '600', fontSize: 15 },
  email: { color: '#888', fontSize: 13, marginTop: 2 },
  spent: { color: '#10b981', fontSize: 13, marginTop: 6, fontWeight: '600' },
  empty: { color: '#666', textAlign: 'center', marginTop: 60 },
})
