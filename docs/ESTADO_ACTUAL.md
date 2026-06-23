# NeonHub — Estado Actual del Proyecto

**Fecha de revisión**: 10 de abril de 2026
**Revisado contra**: código real del repositorio

> Este documento reemplaza al antiguo `FUNCIONALIDADES_PENDIENTES.md` (Oct 2025), que contenía información críticamente incorrecta sobre el estado de Stripe, refresh tokens, app móvil y tests.

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Backend API | Funcional, en producción |
| Frontend (dashboard + tienda) | Funcional, lint pendiente |
| App móvil | Pantallas principales implementadas |
| Landing page | Funcional, en producción |
| VPS Service | Implementado, sin docs detalladas |
| Tests backend | 69/69 pasando |
| Tests frontend | Configurados, errores de lint pendientes |
| Despliegue | VPS activo con PM2 + Nginx |

---

## Lo que SÍ está implementado

### Backend

| Funcionalidad | Archivo(s) clave | Notas |
|---------------|-----------------|-------|
| Autenticación JWT | `authController.js`, `auth.js` (middleware) | Access token + refresh token en cookie httpOnly |
| Multi-tenancy SaaS | `Store.js`, `storeMiddleware`, `ingestRoutes.js` | Resolución por API key y X-Store-ID |
| Sistema de roles RBAC | `Role.js`, `UserRole.js`, `auth.js` | Permisos en JSON, generación tipo `recurso.accion` |
| Pagos con Stripe | `stripeService.js`, `paymentController.js`, `billingController.js` | Intents, webhooks, reembolsos, registro de transacciones |
| Facturas PDF | `billingController.js` | PDFKit integrado |
| Email | `emailService.js` | Nodemailer configurado |
| Subida de imágenes | `uploadController.js` | Multer + Sharp (thumbnails) |
| Sistema de certificaciones | `certificationController.js`, `certificationScheduler.js` | Con cron jobs |
| Métricas de sostenibilidad | `sustainabilityController.js`, `sustainabilityScheduler.js` | Con cron jobs |
| Reportes con comentarios | `reportController.js`, `socketService.js` | Tiempo real con Socket.IO |
| Tickets de soporte | `ticketController.js` | |
| Notificaciones | `notificationController.js` | |
| Dashboard analytics | `dashboardController.js` | |
| Ingest API | `ingestRoutes.js`, `ingestController.js` | Para integraciones externas (Shopify, WooCommerce, etc.) |
| Aprovisionamiento SaaS | `saasProvisioningService.js` | Alta de nuevos tenants |
| Logging centralizado | `@logtail/node` | BetterStack |
| Monitorización de errores | `@sentry/node`, `instrument.js` | Sentry |
| Log de auditoría | `AuditLog.js` | Modelo en BD |
| Seguridad HTTP | `security.js` (middleware) | Helmet, CORS allowlist, CSP estricto en producción, rate limiting, sanitización XSS |
| Tests | `backend/src/**/*.test.js` | 69/69 pasando con `npm test -- --runInBand` |

### Frontend (dashboard + tienda)

| Funcionalidad | Notas |
|---------------|-------|
| Dashboard administrativo | Completo |
| Gestión de productos (CRUD) | Con imágenes |
| Gestión de pedidos | |
| Gestión de clientes | |
| Analytics con gráficos | Recharts |
| Checkout con Stripe Elements | |
| Carrito de compras | |
| Registro y login de usuarios | |
| Tema oscuro "Neon" | TailwindCSS |

### App móvil (Expo / React Native)

| Pantalla / Módulo | Archivo |
|-------------------|---------|
| Login | `screens/auth/LoginScreen.js` |
| Registro | `screens/auth/RegisterScreen.js` |
| Listado de productos | `screens/products/ProductsScreen.js` |
| Detalle de producto | `screens/products/ProductDetailScreen.js` |
| Carrito | `screens/cart/CartScreen.js` |
| Checkout | `screens/checkout/CheckoutScreen.js` |
| Confirmación de pedido | `screens/checkout/OrderConfirmationScreen.js` |
| Perfil de usuario | `screens/profile/ProfileScreen.js` |
| Mis pedidos | `screens/profile/MyOrdersScreen.js` |
| Detalle de pedido | `screens/profile/OrderDetailScreen.js` |
| Reportes | `screens/reports/ReportsScreen.js` |
| Crear reporte | `screens/reports/CreateReportScreen.js` |
| Detalle de reporte | `screens/reports/ReportDetailScreen.js` |
| Sostenibilidad | `screens/sustainability/SustainabilityScreen.js` |

Servicios: `api.js`, `authService.js`, `productService.js`, `orderService.js`, `sustainabilityService.js`, `issueReportService.js`
Contextos: `AuthContext.js`, `CartContext.js`

### VPS Service

Aplicación Astro independiente con páginas:
- Landing / marketing de planes
- Precios
- Dashboard de VPS
- Mis VPS (listado del cliente)
- Login / Registro

---

## Lo que NO está implementado

| Funcionalidad | Notas |
|---------------|-------|
| Recuperación de contraseña (forgot password) | No existe flujo completo: token de reset por email + expiración + consumo único |
| CSRF global | Existe helper pero no está integrado como política global con cookies |
| Redis / caché | No instalado ni implementado |
| CI/CD (GitHub Actions) | No configurado |
| Reviews y calificaciones de productos | No existe modelo ni controller |
| Cupones y descuentos | No existe modelo ni controller |
| 2FA | No implementado |
| TypeScript | Proyecto en JavaScript puro |
| Suscripciones SaaS completas | Stripe para e-commerce sí; planes SaaS por tenant (ciclo de cobro, límites, reconciliación) incompleto |
| Auditoría completa multi-tenant | Hecho en productos/categorías; pendiente en módulos menos críticos (reportes, tickets, notificaciones, billing) |

---

## Deuda técnica pendiente

| Ítem | Prioridad | Notas |
|------|-----------|-------|
| Lint frontend | Alta | Muchos errores: unused vars, reglas de hooks. `npm run lint` en `frontend/` |
| Auditoría de dependencias | Media | Ejecutar `npm audit` en raíz, backend y frontend. Documentar resultado para memoria TFG |
| Cobertura de tests | Media | 69/69 pasan, pero se puede ampliar por módulo para adjuntar evidencias en memoria |
| Scoping tenant en módulos secundarios | Media | Reportes, tickets, notificaciones, billing: verificar filtrado por `store_id` |
| URLs firmadas para imágenes | Baja | Actualmente `?token=` en URL; más seguro con URLs de un solo uso o proxy autenticado |

---

## Estado de tests

### Backend
```bash
cd backend && npm test -- --runInBand
```
Resultado: **69/69 passing**

### Frontend
```bash
cd frontend && npm run lint
```
Resultado: múltiples errores de ESLint (hooks rules, unused vars). Tests con Vitest configurados pero inestables por el estado del lint.

---

## Despliegue real

El proyecto está desplegado en un VPS real con:
- PM2 gestionando los procesos (backend, frontend build, landing SSR)
- Nginx como reverse proxy
- PostgreSQL como base de datos de producción
- BetterStack recibiendo logs del backend
- Sentry recibiendo errores del backend

Archivos: `ecosystem.neonhub.config.js`, `docs/nginx-nonhub.conf`
