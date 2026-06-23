import React, { createContext, useContext, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authService } from '../services/authService'

const TenantContext = createContext(null)

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [tenants, setTenants] = useState([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadTenants = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authService.getMyTenants()
      setTenants(data.tenants || [])
      setIsSuperAdmin(data.isSuperAdmin || false)
      return data
    } catch (e) {
      setError('No se pudieron cargar tus espacios')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const selectTenant = async (selectedTenant) => {
    if (selectedTenant?.id) {
      await AsyncStorage.setItem('tenantId', String(selectedTenant.id))
    }
    setTenant(selectedTenant)
  }

  const clearTenant = async () => {
    await AsyncStorage.removeItem('tenantId')
    setTenant(null)
    setTenants([])
    setIsSuperAdmin(false)
  }

  return (
    <TenantContext.Provider value={{
      tenant, tenants, isSuperAdmin,
      loading, error,
      loadTenants, selectTenant, clearTenant,
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export const useTenant = () => useContext(TenantContext)
