import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from './constants/routes'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Login from './pages/Login'
import ShopLogin from './pages/shop/ShopLogin'
import ShopRegister from './pages/shop/ShopRegister'
import ShopVerify from './pages/shop/ShopVerify'
import Activate from './pages/Activate'
import Profile from './pages/Profile'
import UserManagement from './pages/UserManagement'
import Modules from './pages/Modules'
import Certifications from './pages/Certifications'
import ImageGalleryPage from './pages/ImageGalleryPage'
import Shop from './pages/Shop'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import VerifyEmail from './pages/VerifyEmail'
import ShopForgotPassword from './pages/ShopForgotPassword'
import ShopResetPassword from './pages/ShopResetPassword'
import ShopProfile from './pages/ShopProfile'
import ShopSettings from './pages/ShopSettings'
import ShopOrders from './pages/ShopOrders'
import { AuthProvider, useAuth } from './context/AuthContext'
import Customers from './pages/Customers'
import Tickets from './pages/Tickets'
import ShopSupport from './pages/ShopSupport'
import ShopTickets from './pages/ShopTickets'
import Invoices from './pages/Invoices'
import Reports from './pages/Reports'
import ReportDetail from './pages/ReportDetail'
import Returns from './pages/Returns'
import DiscountCodes from './pages/DiscountCodes'
import Sustainability from './pages/Sustainability'
import { SettingsProvider } from './context/SettingsContext'
import { LanguageProvider } from './context/LanguageContext'
import { ToastProvider } from './context/ToastContext'
import { CartProvider } from './context/CartContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import FeatureRoute from './components/FeatureRoute'
import { useState, useEffect } from 'react'
import { useLanguage } from './context/LanguageContext'
import { useConfig, useGetRoute } from './context/ConfigContext'
import TenantGuard from './components/TenantGuard'
import DemoAuthGuard from './components/DemoAuthGuard'
import ElectronTenantGate from './electron/ElectronTenantGate'
import UpdateNotification from './electron/UpdateNotification'

const SuperAdminProxyBanner = () => {
  const { user } = useAuth()
  if (!user?.isSuperAdminProxy) return null
  return (
    <div className="bg-yellow-500 text-black text-sm font-semibold px-4 py-2 flex items-center gap-2 z-50">
      <span>⚠️</span>
      <span>MODO PROXY SUPERADMIN — Estás accediendo como administrador de plataforma a esta tienda. Todas las acciones quedan registradas en el log de auditoría.</span>
    </div>
  )
}

/**
 * Resolves a route path using the store's url_mapping from ConfigContext.
 * If the store has a custom mapping (e.g. { "shop": "/tienda" }) that value is returned,
 * otherwise the default path is used as fallback.
 *
 * NOTE: This must be called inside a React component (uses useGetRoute hook).
 */
const useResolvedRoute = (standardKey, defaultPath) => {
  const getRoute = useGetRoute();
  // getRoute returns the custom path if mapped, or the default; our getRoute already handles defaults internally
  // but we also pass defaultPath for cases where standardKey has no DEFAULT_ROUTES entry
  return getRoute(standardKey) || defaultPath || `/${standardKey}`;
};

/**
 * DashboardRouter — resolves the dashboard base path from url_mapping and
 * renders the full dashboard shell with nested routes.
 *
 * Supports custom dashboard paths via store url_mapping:
 *   { "dashboard": "/panel" } → renders dashboard at /panel/* with nested routes
 *   { "products": "/catalogo" } → nested routes become /panel/catalogo, etc.
 */
const DashboardRouter = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const getRoute = useGetRoute();
  const location = useLocation();

  // Resolve custom dashboard base, e.g. "/panel" (or "/dashboard" if not mapped)
  const dashboardBase = getRoute('dashboard');

  return (
    <ProtectedRoute>
      <AdminRoute>
        <div className="flex h-screen overflow-hidden">
          <DashboardFavicon />
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

          <div className="flex-1 flex flex-col overflow-hidden">
            <Navbar setSidebarOpen={setSidebarOpen} />
            <SuperAdminProxyBanner />

            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-6">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="max-w-7xl mx-auto"
              >
                <Routes>
                  {/*
                    All dashboard sub-routes are mounted under the wildcard /dashboard/*.
                    Path resolution:
                      - products → getRoute('products')  || '/dashboard/products'
                      - orders  → getRoute('orders')    || '/dashboard/orders'
                      - etc.
                    The custom dashboard base itself is handled by the Route pattern
                    /dashboard/* which matches any prefix; navigation to the resolved
                    base (e.g. /panel) is done via Link/Navigate using getRoute('dashboard').
                  */}
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={
                    <FeatureRoute featureKey="products">
                      <Products />
                    </FeatureRoute>
                  } />
                  <Route path="gallery" element={
                    <FeatureRoute featureKey="gallery">
                      <ImageGalleryPage />
                    </FeatureRoute>
                  } />
                  <Route path="orders" element={
                    <FeatureRoute featureKey="orders">
                      <Orders />
                    </FeatureRoute>
                  } />
                  <Route path="analytics" element={
                    <FeatureRoute featureKey="analytics">
                      <Analytics />
                    </FeatureRoute>
                  } />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="users" element={
                    <RoleProtectedRoute requiredRoles={['ceo', 'superadmin']} requiredLevel={100}>
                      <UserManagement />
                    </RoleProtectedRoute>
                  } />
                  <Route path="modules" element={<Navigate to={getRoute('dashboard') + '/settings?tab=modules'} replace />} />
                  <Route path="customers" element={
                    <FeatureRoute featureKey="customers" minLevel={60}>
                      <Customers />
                    </FeatureRoute>
                  } />
                  <Route path="tickets" element={
                    <FeatureRoute featureKey="tickets" minLevel={60}>
                      <Tickets />
                    </FeatureRoute>
                  } />
                  <Route path="invoices" element={
                    <FeatureRoute featureKey="invoices" minLevel={60}>
                      <Invoices />
                    </FeatureRoute>
                  } />
                  <Route path="reports" element={
                    <FeatureRoute featureKey="reports">
                      <Reports />
                    </FeatureRoute>
                  } />
                  <Route path="reports/:id" element={
                    <FeatureRoute featureKey="reports">
                      <ReportDetail />
                    </FeatureRoute>
                  } />
                  <Route path="sustainability" element={
                    <FeatureRoute featureKey="sustainability" minLevel={60}>
                      <Sustainability />
                    </FeatureRoute>
                  } />
                  <Route path="certifications" element={
                    <FeatureRoute featureKey="certifications" minLevel={80}>
                      <Certifications />
                    </FeatureRoute>
                  } />
                  <Route path="returns" element={
                    <RoleProtectedRoute requiredLevel={60}>
                      <Returns />
                    </RoleProtectedRoute>
                  } />
                  <Route path="discounts" element={
                    <FeatureRoute featureKey="discounts" minLevel={60}>
                      <DiscountCodes />
                    </FeatureRoute>
                  } />
                  <Route path="*" element={<Navigate to={getRoute('dashboard')} replace />} />
                </Routes>
              </motion.div>
            </main>
          </div>
        </div>
      </AdminRoute>
    </ProtectedRoute>
  );
};

// componentes de relleno temporales
const CustomersPlaceholder = () => {
  const { t } = useLanguage()
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl text-gray-300">{t('customersTitle')} - En desarrollo</h2>
      <p className="text-gray-400 mt-2">{t('customersDescription')}</p>
    </div>
  )
}

const ReportsPlaceholder = () => {
  const { t } = useLanguage()
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl text-gray-300">{t('reports')} - En desarrollo</h2>
      <p className="text-gray-400 mt-2">Página de reportes en construcción</p>
    </div>
  )
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-400" />
  </div>
)

const DashboardFavicon = () => {
  const config = useConfig()
  useEffect(() => {
    const faviconUrl = config?.dashboard_favicon || config?.favicon || null
    if (!faviconUrl) return
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [config?.dashboard_favicon, config?.favicon])
  return null
}

const RootRedirect = () => {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  if (!user) {
    return <Navigate to={window.electron?.isElectron ? '/electron-login' : ROUTES.SHOP} replace />
  }

  const ROLE_LEVEL_FALLBACK = { superadmin: 200, ceo: 100, admin: 80, manager: 60, employee: 40, customer: 10 }
  const userLevel = user.roles?.reduce((max, r) => Math.max(max, r.level || ROLE_LEVEL_FALLBACK[r.name] || 0), 0) ?? 0

  if (userLevel >= 40) return <Navigate to={ROUTES.DASHBOARD} replace />

  return <Navigate to={ROUTES.SHOP} replace />
}

const AppRoutes = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <AnimatePresence>
        <Routes>
          {/* redirección raíz */}
          <Route path="/" element={<RootRedirect />} />

          {/* rutas públicas */}
          <Route path={ROUTES.SHOP} element={<Shop />} />
          <Route path="/shop/:storeId" element={<Shop />} />
          <Route path={ROUTES.LOGIN} element={<ShopLogin />} />
          <Route path="/electron-login" element={<Login />} />
          <Route path="/shop/login" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<ShopRegister />} />
          <Route path="/shop/register" element={<Navigate to="/register" replace />} />
          <Route path={ROUTES.SHOP_VERIFY} element={<ShopVerify />} />
          <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmail />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ShopForgotPassword />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ShopResetPassword />} />
          <Route path={ROUTES.CHECKOUT} element={<Checkout />} />
          <Route path={ROUTES.ORDER_CONFIRMATION} element={<OrderConfirmation />} />
          <Route path={ROUTES.ACTIVATE} element={<Activate />} />
          <Route path={ROUTES.SHOP_SUPPORT} element={<ShopSupport />} />
          <Route path={ROUTES.SHOP_TICKETS} element={
            <ProtectedRoute><ShopTickets /></ProtectedRoute>
          } />

          {/* rutas de clientes de la tienda */}
          <Route path={ROUTES.SHOP_PROFILE} element={
            <ProtectedRoute><ShopProfile /></ProtectedRoute>
          } />
          <Route path={ROUTES.SHOP_SETTINGS} element={
            <ProtectedRoute><ShopSettings /></ProtectedRoute>
          } />
          <Route path={ROUTES.SHOP_ORDERS} element={
            <ProtectedRoute><ShopOrders /></ProtectedRoute>
          } />

          {/* rutas del panel — ruta comodín que captura el path base del dashboard */}
          <Route path="/dashboard/*" element={<DashboardRouter />} />

          {/* catch-all — rutas desconocidas */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

const isElectron = !!window.electron?.isElectron
const RouterComponent = isElectron ? HashRouter : BrowserRouter

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
            <ElectronTenantGate>
              <CartProvider>
                <RouterComponent>
                  <TenantGuard>
                    <DemoAuthGuard>
                      <AppRoutes />
                    </DemoAuthGuard>
                  </TenantGuard>
                </RouterComponent>
              </CartProvider>
            </ElectronTenantGate>
            {isElectron && <UpdateNotification />}
          </AuthProvider>
        </SettingsProvider>
      </LanguageProvider>
    </ToastProvider>
  )
}

export default App
