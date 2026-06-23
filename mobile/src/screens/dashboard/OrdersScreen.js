import React, { useEffect, useState } from 'react'
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native'
import api from '../../services/api'

const STATUS_COLORS = {
  pending: '#f59e0b',
  processing: '#6366f1',
  shipped: '#3b82f6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  returned: '#8b5cf6',
}

const STATUS_LABELS = {
  pending: 'Pendiente',
  processing: 'En proceso',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  returned: 'Devuelto',
}

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/orders?limit=50')
      const data = res.data.data || res.data
      setOrders(Array.isArray(data) ? data : data.orders || [])
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
      data={orders}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
        />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('OrderDetail', { order: item })}
        >
          <View style={styles.row}>
            <Text style={styles.orderId}>#{item.orderNumber || item.id}</Text>
            <View style={[
              styles.badge,
              { backgroundColor: STATUS_COLORS[item.status] + '22' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: STATUS_COLORS[item.status] }
              ]}>
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
          </View>
          <Text style={styles.customer}>
            {item.customerName || item.Customer?.name || '—'}
          </Text>
          <View style={styles.row}>
            <Text style={styles.amount}>
              {Number(item.total || 0).toFixed(2)}€
            </Text>
            <Text style={styles.date}>
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('es-ES')
                : '—'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>No hay pedidos aún.</Text>
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
    marginBottom: 6,
  },
  orderId: { color: '#fff', fontWeight: '700', fontSize: 15 },
  customer: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  amount: { color: '#10b981', fontWeight: '600', fontSize: 15 },
  date: { color: '#666', fontSize: 12 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { color: '#666', textAlign: 'center', marginTop: 60, fontSize: 15 },
})
