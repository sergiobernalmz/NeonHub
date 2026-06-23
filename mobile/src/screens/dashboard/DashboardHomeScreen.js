import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import api from '../../services/api'
import { useTenant } from '../../context/TenantContext'

const KPICard = ({ label, value, color = '#6366f1' }) => (
  <View style={[styles.kpiCard, { borderLeftColor: color }]}>
    <Text style={styles.kpiValue}>{value ?? '—'}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
)

export default function DashboardHomeScreen() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const { tenant } = useTenant()

  const load = async () => {
    try {
      const res = await api.get('/dashboard/stats')
      setStats(res.data.data || res.data)
    } catch {
      setError('No se pudieron cargar los datos')
    } finally {
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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
        />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      {tenant?.name ? (
        <Text style={styles.subtitle}>{tenant.name}</Text>
      ) : null}
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.grid}>
        <KPICard
          label="Ventas totales"
          value={stats?.totalRevenue
            ? `${Number(stats.totalRevenue).toFixed(2)}€`
            : '—'}
          color="#10b981"
        />
        <KPICard
          label="Pedidos"
          value={stats?.totalOrders}
          color="#6366f1"
        />
        <KPICard
          label="Clientes"
          value={stats?.totalCustomers}
          color="#f59e0b"
        />
        <KPICard
          label="Ticket medio"
          value={stats?.averageOrderValue
            ? `${Number(stats.averageOrderValue).toFixed(2)}€`
            : '—'}
          color="#ec4899"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  center: {
    flex: 1, backgroundColor: '#0f0f0f',
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    color: '#fff', fontSize: 24,
    fontWeight: '700', marginBottom: 4, marginTop: 8,
  },
  subtitle: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  kpiCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, width: '47%',
    borderLeftWidth: 4,
  },
  kpiValue: {
    color: '#fff', fontSize: 22,
    fontWeight: '700', marginBottom: 4,
  },
  kpiLabel: { color: '#888', fontSize: 12 },
  error: { color: '#ff4444', marginBottom: 12 },
})
