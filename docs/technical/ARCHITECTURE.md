# NeonHub — Arquitectura del Sistema

## Diagrama de contexto (C4 — Nivel 1)

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
│                                                                   │
│  ┌──────────┐    ┌─────────────────────────────────────────┐    │
│  │ Cliente  │───▶│              neonhub.es                  │    │
│  │ (browser)│    │  Landing Page (Astro SSR)                │    │
│  └──────────┘    │  • Registro / Login                      │    │
│                  │  • Selección de planes                   │    │
│  ┌──────────┐    │  • Dashboard de usuario                  │    │
│  │Propietario│──▶│  • Checkout Stripe                       │    │
│  │ tienda   │    └──────────────┬──────────────────────────┘    │
│  └──────────┘                   │                                │
│                                 ▼                                │
│  ┌──────────┐    ┌─────────────────────────────────────────┐    │
│  │Empleados │───▶│     {subdominio}.neonhub.es             │    │
│  │clientes  │    │  Frontend SaaS (React SPA)              │    │
│  └──────────┘    │  • Panel de gestión completo            │    │
│                  │  • Tienda pública                        │    │
│  ┌──────────┐    │  • Checkout de productos                │    │
│  │App Móvil │    └──────────────┬──────────────────────────┘    │
│  │(Expo RN) │                   │                                │
│  └────┬─────┘                   │                                │
│       │                         ▼                                │
│       │         ┌─────────────────────────────────────────┐     │
│       └────────▶│        Backend API (Node.js)            │     │
│                 │        neonhub.es/api → :4000           │     │
│                 │  • 23 módulos de rutas                   │     │
│                 │  • JWT + RBAC                           │     │
│                 │  • Multi-tenant por subdominio           │     │
│                 └────────┬────────────────────────────────┘     │
│                          │                                       │
│              ┌───────────┼───────────┐                          │
│              ▼           ▼           ▼                          │
│        ┌──────────┐ ┌─────────┐ ┌────────┐                     │
│        │PostgreSQL│ │ Stripe  │ │  n8n   │                     │
│        │neonhub_db│ │(pagos)  │ │(autom.)│                     │
│        └──────────┘ └─────────┘ └────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagrama de contenedores (C4 — Nivel 2)

```
┌─── VPS Propio ──────────────────────────────────────────────────┐
│                                                                   │
│  Nginx (proxy inverso + SSL)                                     │
│  ├── neonhub.es           → :5000 (Astro Landing)               │
│  ├── neonhub.es/api       → :4000 (Express Backend)             │
│  ├── *.neonhub.es         → :3000 (React SPA)                   │
│  └── *.neonhub.es/api     → :4000 (Express Backend)             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PM2 Process Manager                                      │    │
│  │                                                          │    │
│  │  [neonhub-backend]  :4000  cluster mode                 │    │
│  │  [neonhub-frontend] :3000  fork (serve estático)        │    │
│  │  [neonhub-landing]  :5000  fork (Astro SSR)             │    │
│  │  [neonhub-vps]      :5001  fork (panel admin interno)   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Docker Compose — Bases de datos                          │    │
│  │                                                          │    │
│  │  [neonhub-postgres]  :5433  neonhub_db  (principal)     │    │
│  │  [postgres-landing]  :5434  landing_db  (landing)       │    │
│  │  [postgres-vps]      :5435  vps_db      (panel vps)     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

┌─── Servidor n8n separado ──────────────────────────────────────┐
│  neonhub.n8nservidor.es                                         │
│  9 workflows activos + 1 demo reset                             │
│  → Llama al backend via webhooks y HTTP requests                │
└────────────────────────────────────────────────────────────────┘
```

---

## Flujo de datos principal

### Alta de nuevo cliente (provisioning)

```
1. [Landing] Usuario completa registro en neonhub.es
2. [Landing] Selecciona plan → POST /api/billing/checkout-session
3. [Stripe] Usuario paga en página hosted de Stripe
4. [n8n WF1] Stripe webhook → checkout.session.completed
5. [n8n WF1] POST /api/admin/provision-store (con x-admin-secret)
6. [Backend] saasProvisioningService:
   a. Crea Store en BD (subdomain, plan, settings)
   b. Crea usuario CEO con contraseña temporal
   c. Asigna rol ceo + entrada en user_stores
   d. Dispara N8N_STORE_CREATED_WEBHOOK_URL
7. [n8n WF7] Email de bienvenida con URL del panel
8. [CEO] Accede a {subdominio}.neonhub.es/admin
```

### Login SSO (cross-subdomain)

```
1. [Landing] CEO en neonhub.es/dashboard, pulsa "Panel de Control"
2. [Landing JS] POST /api/sso-redirect (Astro API route)
3. [Astro SSR] Valida sesión landing, llama backend POST /api/auth/sso-token
4. [Backend] Genera UUID con TTL 30s en tabla sso_tokens
5. [Astro SSR] Devuelve redirect_url al cliente
6. [Browser] Navega a https://{subdominio}.neonhub.es/admin?sso={token}
7. [React AuthContext] Al montar detecta ?sso=, llama POST /api/auth/sso-exchange
8. [Backend] Valida token (no usado, no expirado), marca used=true en transacción
9. [React] Recibe accessToken + user, guarda en localStorage → usuario autenticado
```

### Request autenticado (por tenant)

```
1. Request llega a https://{sub}.neonhub.es/api/products
2. Nginx → backend :4000
3. storeMiddleware: resuelve Store por subdomain del host header
4. authenticateToken: verifica JWT, carga User + UserStore + Roles de BD
5. Middleware comprueba req.user.storeIds.includes(req.tenant.id)
6. productController: filtra productos WHERE store_id = req.tenant.id
```

---

## Arquitectura multi-tenant

### Aislamiento por subdominio

Cada tienda tiene:
- **Subdominio único**: `{nombre}.neonhub.es`
- **Store ID**: UUID referenciado en todos los recursos (productos, pedidos, clientes, etc.)
- **Usuarios propios**: staff asignados a esa tienda via `user_stores`

### Resolución de tenant

```javascript
// storeMiddleware.js
const host = req.headers.host.split(':')[0];
const baseDomain = process.env.TENANT_BASE_DOMAIN; // 'neonhub.es'
if (host.endsWith(baseDomain) && host !== baseDomain) {
  const subdomain = host.replace(`.${baseDomain}`, '');
  req.tenant = await Store.findOne({ where: { subdomain } });
}
```

### Multi-tienda (un usuario, múltiples tiendas)

Implementado via tabla pivote `user_stores (user_id, store_id, is_primary)`:
- `req.user.storeIds[]` — array de todos los store_id del usuario
- Check: `req.user.storeIds.includes(req.tenant.id)` (antes era `===`)
- API `GET /api/auth/my-stores` — lista todas las tiendas del usuario
- API `PATCH /api/auth/active-store` — cambia el store activo
- SSO redirect automático al hacer click en "Panel de Control" desde el dashboard

---

## Módulos principales del sistema

| Módulo | Ruta API | Descripción |
|---|---|---|
| Autenticación | `/api/auth` | Login, registro, JWT, SSO, RBAC |
| Usuarios | `/api/users` | CRUD usuarios por tienda |
| Productos | `/api/products` | Catálogo, imágenes, stock, certificaciones |
| Categorías | `/api/categories` | Árbol de categorías por tienda |
| Pedidos | `/api/orders` | Gestión de pedidos, estados, timeline |
| Clientes | `/api/customers` | CRM básico |
| Facturación | `/api/billing` | Stripe checkout, webhooks, provisioning |
| Pagos | `/api/payments` | Intents, historial, reembolsos |
| Dashboard | `/api/dashboard` | KPIs, métricas, analytics |
| Sostenibilidad | `/api/sustainability` | Métricas CO₂, reportes ecológicos |
| Certificaciones | `/api/certifications` | EPEAT, FSC, EU Ecolabel, etc. |
| Soporte | `/api/tickets` | Tickets de soporte con Socket.IO |
| Reportes | `/api/reports` | Reportes internos con comentarios |
| Notificaciones | `/api/notifications` | Centro de notificaciones |
| Carrito | `/api/cart` | Carrito persistente (DB) |
| Uploads | `/api/uploads` | Subida y procesamiento de imágenes |
| Audit Logs | `/api/admin/audit-logs` | Historial de acciones auditadas |
| Admin SaaS | `/api/admin` | Gestión de tenants (super admin) |
| Ingest | `/api/ingest` | API de integración externa |

---

## Endpoints pendientes de implementar

Los siguientes endpoints están referenciados en workflows n8n pero aún no implementados completamente:

| Endpoint | Workflow | Estado |
|---|---|---|
| `GET /api/admin/metrics/daily` | WF4 Reporte Ejecutivo | Pendiente — WF4 apunta a este endpoint para obtener KPIs |
| `GET /api/admin/audit-logs` | WF5 Seguridad Operativa | Pendiente — WF5 consulta anomalías de seguridad |

---

## Relación entre servicios internos

```
saasProvisioningService
  └─ Crea: Store, User, UserRole, UserStore
  └─ Llama: n8n webhook (store-created)

billingCheckService
  └─ Cron diario: verifica suscripciones activas/vencidas
  └─ Actualiza: Store.payment_status

demoTenantService
  └─ Cron cada 30 min: resetea productos y datos de la tienda Demo
  └─ Endpoint: POST /api/billing/admin/demo/reset (via n8n o manual)

certificationScheduler
  └─ Cron diario: actualiza estado de certificaciones externas
  └─ APIs: EPEAT, FSC, EU Ecolabel, ENERGY STAR (configurables)

sustainabilityScheduler
  └─ Cron cada 30 min (configurable via SUSTAINABILITY_UPDATE_INTERVAL)
  └─ APIs externas: CO2Signal, OpenWeather, AirQuality, ElectricityMap

emailService
  └─ sendVerificationEmail — registro de usuarios
  └─ sendPasswordResetEmail — recuperación de contraseña

socketService
  └─ Tickets de soporte en tiempo real
  └─ Notificaciones push a clientes conectados
```

---

## Seguridad implementada

| Mecanismo | Descripción |
|---|---|
| JWT dual-token | accessToken (7d) + refreshToken httpOnly cookie (30d) |
| RBAC | Permisos granulares por rol (JSON en BD) |
| Rate limiting | 100 req/15min por IP en endpoints auth |
| Helmet | Cabeceras HTTP de seguridad |
| CORS estricto | Solo `*.neonhub.es` y `localhost` en desarrollo |
| Tenant isolation | Todos los queries filtran por `store_id` del token |
| Admin secret | Header `x-admin-secret` para comunicación server-to-server |
| SSO tokens | UUID de uso único con TTL 30s, atómico con `SELECT FOR UPDATE` |
| Input sanitization | express-validator + sanitización manual en campos críticos |
| bcrypt | 12 rounds para hash de contraseñas |
| Audit logs | Registro automático de acciones sensibles |
