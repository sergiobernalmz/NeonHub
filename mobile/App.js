import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { TenantProvider, useTenant } from './src/context/TenantContext'
import {
  LayoutDashboard, ShoppingCart, Package,
  Users, User, Store, Shield,
} from 'lucide-react-native'

// pantallas de autenticación
import LoginScreen from './src/screens/auth/LoginScreen'
import TenantSelectorScreen from './src/screens/auth/TenantSelectorScreen'

// pantallas del dashboard del CEO
import DashboardHomeScreen from './src/screens/dashboard/DashboardHomeScreen'
import OrdersScreen from './src/screens/dashboard/OrdersScreen'
import ProductsScreen from './src/screens/dashboard/ProductsScreen'
import CustomersScreen from './src/screens/dashboard/CustomersScreen'
import ProfileScreen from './src/screens/profile/ProfileScreen'

// pantallas de administración
import AdminStoresScreen from './src/screens/admin/AdminStoresScreen'
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen'

// pantallas de detalle del perfil
import OrderDetailScreen from './src/screens/profile/OrderDetailScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const screenOptions = {
  headerStyle: { backgroundColor: '#0f0f0f' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
  tabBarStyle: {
    backgroundColor: '#0f0f0f',
    borderTopColor: '#1a1a1a',
  },
  tabBarActiveTintColor: '#6366f1',
  tabBarInactiveTintColor: '#666',
}

function CEOTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Inicio"
        component={DashboardHomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Pedidos"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <ShoppingCart color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Productos"
        component={ProductsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Package color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Clientes"
        component={CustomersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Tiendas"
        component={AdminStoresScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Store color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Usuarios"
        component={AdminUsersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

function RootNavigator() {
  const { isAuthenticated } = useAuth()
  const { tenant } = useTenant()

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    )
  }

  if (!tenant) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TenantSelector" component={TenantSelectorScreen} />
      </Stack.Navigator>
    )
  }

  if (tenant.role === 'superadmin') {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="AdminTabs"
          component={AdminTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    )
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CEOTabs"
        component={CEOTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Detalle pedido' }}
      />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </TenantProvider>
    </AuthProvider>
  )
}
