# NeonHub — Referencia de API

**Base URL**: `https://neonhub.es/api` (producción) | `http://localhost:4000/api` (desarrollo)

**Autenticación**: La mayoría de endpoints requieren `Authorization: Bearer {accessToken}` en el header.

**Formato de respuesta estándar**:
```json
{
  "success": true|false,
  "message": "Descripción del resultado",
  "data": { ... }
}
```

---

## Módulo: Auth (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | JWT + permiso | Registra nuevo usuario (admin only) |
| POST | `/auth/login` | — | Login con email/usuario y contraseña |
| POST | `/auth/demo` | — | Login automático como usuario demo |
| POST | `/auth/refresh` | Cookie | Renueva el accessToken |
| POST | `/auth/logout` | — | Invalida la sesión (borra cookie) |
| GET | `/auth/profile` | JWT | Obtiene perfil del usuario autenticado |
| PUT | `/auth/profile` | JWT | Actualiza nombre, email, teléfono |
| PUT | `/auth/change-password` | JWT | Cambia contraseña (requiere contraseña actual) |
| POST | `/auth/verify-email` | — | Verifica email con token del enlace |
| POST | `/auth/forgot-password` | — | Solicita email de recuperación |
| POST | `/auth/reset-password` | — | Establece nueva contraseña con token |
| GET | `/auth/verify` | JWT | Verifica validez del token actual |
| GET | `/auth/unverified-users` | x-service-api-key | Lista usuarios sin verificar > 24h (para n8n) |
| GET | `/auth/my-stores` | JWT | Lista todas las tiendas del usuario autenticado |
| PATCH | `/auth/active-store` | JWT | Cambia la tienda activa del usuario |
| POST | `/auth/sso-token` | x-admin-secret | Genera token SSO de uso único (server-to-server) |
| POST | `/auth/sso-exchange` | — | Intercambia token SSO por sesión completa |

### POST `/auth/login`
```json
// Body
{ "login": "email@ejemplo.com", "password": "contraseña" }

// Respuesta
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "user": { "id", "username", "email", "firstName", "lastName", "roles": [] }
  }
}
```

### POST `/auth/sso-token`
```json
// Headers: x-admin-secret: {ADMIN_API_SECRET}
// Body
{ "email": "ceo@empresa.com", "subdomain": "mitienda" }

// Respuesta
{ "success": true, "sso_token": "uuid-de-uso-unico" }
```

### POST `/auth/sso-exchange`
```json
// Body
{ "sso_token": "uuid-de-uso-unico" }

// Respuesta
{
  "success": true,
  "data": { "accessToken": "eyJ...", "user": { ... } }
}
// Cookie: refreshToken (httpOnly, sameSite: strict)
```

### GET `/auth/my-stores`
```json
// Respuesta
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mi Tienda",
      "subdomain": "mitienda",
      "is_active": true,
      "plan_id": "pro",
      "payment_status": "active",
      "is_primary": true,
      "is_current": true,
      "url": "https://mitienda.neonhub.es"
    }
  ]
}
```

---

## Módulo: Productos (`/api/products`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/products` | JWT | Lista productos de la tienda (con filtros) |
| GET | `/products/:id` | JWT | Obtiene producto por ID |
| POST | `/products` | JWT + permiso | Crea producto nuevo |
| PUT | `/products/:id` | JWT + permiso | Actualiza producto |
| DELETE | `/products/:id` | JWT + permiso | Elimina producto |
| POST | `/products/:id/images` | JWT + permiso | Sube imágenes al producto |
| DELETE | `/products/:id/images/:imageId` | JWT + permiso | Elimina imagen |
| GET | `/products/search` | JWT | Búsqueda por texto/filtros |

**Query params comunes**: `page`, `limit`, `category_id`, `search`, `active`, `sort`

---

## Módulo: Categorías (`/api/categories`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/categories` | JWT | Lista categorías de la tienda |
| GET | `/categories/:id` | JWT | Obtiene categoría por ID |
| POST | `/categories` | JWT + permiso | Crea categoría |
| PUT | `/categories/:id` | JWT + permiso | Actualiza categoría |
| DELETE | `/categories/:id` | JWT + permiso | Elimina categoría |

---

## Módulo: Pedidos (`/api/orders`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/orders` | JWT | Lista pedidos de la tienda |
| GET | `/orders/:id` | JWT | Obtiene pedido con ítems y factura |
| POST | `/orders` | JWT | Crea pedido manual |
| PUT | `/orders/:id` | JWT + permiso | Actualiza estado/datos del pedido |
| DELETE | `/orders/:id` | JWT + permiso | Cancela/elimina pedido |
| GET | `/orders/:id/invoice` | JWT | Descarga factura PDF |

---

## Módulo: Clientes (`/api/customers`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/customers` | JWT | Lista clientes de la tienda |
| GET | `/customers/:id` | JWT | Perfil de cliente con historial |
| POST | `/customers` | JWT + permiso | Crea cliente |
| PUT | `/customers/:id` | JWT + permiso | Actualiza cliente |
| DELETE | `/customers/:id` | JWT + permiso | Elimina cliente |

---

## Módulo: Dashboard y Analytics (`/api/dashboard`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/dashboard/stats` | JWT | KPIs generales: ventas, pedidos, clientes |
| GET | `/dashboard/revenue` | JWT | Ingresos por período |
| GET | `/dashboard/products/top` | JWT | Productos más vendidos |
| GET | `/dashboard/orders/recent` | JWT | Pedidos recientes |

---

## Módulo: Sostenibilidad (`/api/sustainability`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/sustainability/metrics` | JWT | Métricas CO₂ e impacto medioambiental |
| POST | `/sustainability/metrics` | JWT + permiso | Registra nueva métrica |
| GET | `/sustainability/report` | JWT | Reporte de sostenibilidad del período |
| GET | `/sustainability/realtime` | JWT | Datos en tiempo real (CO₂Signal, etc.) |

---

## Módulo: Certificaciones (`/api/certifications`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/certifications` | JWT | Lista certificaciones disponibles |
| GET | `/certifications/active` | JWT | Certificaciones activas del tenant |
| POST | `/certifications/request` | JWT | Solicita verificación de certificación |
| GET | `/certifications/:id` | JWT | Detalle de certificación |

---

## Módulo: Carrito (`/api/cart`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/cart` | JWT | Obtiene carrito del usuario |
| POST | `/cart/items` | JWT | Añade ítem al carrito |
| PUT | `/cart/items/:id` | JWT | Actualiza cantidad |
| DELETE | `/cart/items/:id` | JWT | Elimina ítem del carrito |
| DELETE | `/cart` | JWT | Vacía el carrito |

---

## Módulo: Usuarios (`/api/users`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/users` | JWT + permiso | Lista usuarios de la tienda |
| GET | `/users/:id` | JWT + permiso | Obtiene usuario por ID |
| PUT | `/users/:id` | JWT + permiso | Actualiza usuario |
| DELETE | `/users/:id` | JWT + permiso | Elimina usuario |
| POST | `/users/:id/roles` | JWT + permiso | Asigna rol a usuario |
| DELETE | `/users/:id/roles/:roleId` | JWT + permiso | Revoca rol |

---

## Módulo: Soporte — Tickets (`/api/tickets`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/tickets` | JWT | Lista tickets de la tienda |
| POST | `/tickets` | JWT | Crea nuevo ticket |
| GET | `/tickets/:id` | JWT | Obtiene ticket con mensajes |
| PUT | `/tickets/:id` | JWT + permiso | Actualiza estado/prioridad |
| POST | `/tickets/:id/messages` | JWT | Añade mensaje al ticket (Socket.IO) |

---

## Módulo: Notificaciones (`/api/notifications`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/notifications` | JWT | Lista notificaciones del usuario |
| PUT | `/notifications/:id/read` | JWT | Marca como leída |
| PUT | `/notifications/read-all` | JWT | Marca todas como leídas |
| DELETE | `/notifications/:id` | JWT | Elimina notificación |

---

## Módulo: Reportes internos (`/api/reports`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/reports` | JWT | Lista reportes |
| POST | `/reports` | JWT | Crea reporte |
| GET | `/reports/:id` | JWT | Obtiene reporte con comentarios |
| PUT | `/reports/:id` | JWT + permiso | Actualiza reporte |
| POST | `/reports/:id/comments` | JWT | Añade comentario |

---

## Módulo: Uploads (`/api/uploads`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/uploads/image` | JWT | Sube imagen (max 10MB, genera thumbnail) |
| DELETE | `/uploads/:id` | JWT + permiso | Elimina archivo |

---

## Módulo: Pagos (`/api/payments`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/payments` | JWT | Historial de pagos |
| POST | `/payments/intent` | JWT | Crea Payment Intent de Stripe |
| POST | `/payments/refund` | JWT + permiso | Solicita reembolso |

---

## Módulo: Facturación SaaS (`/api/billing`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/billing/checkout-session` | — | Crea Stripe Checkout Session para compra de plan |
| POST | `/billing/stripe/webhook` | Stripe signature | Recibe webhooks de Stripe |
| GET | `/billing/provisioning-status` | — | Estado del provisioning por session_id |
| GET | `/billing/session-info` | — | Info de sesión Stripe |
| GET | `/billing/user-stores` | — | Tiendas de un usuario por email (para landing) |
| GET | `/billing/user-tenants` | — | Alias de user-stores (legado) |
| GET | `/billing/admin/provisioning-requests` | x-admin-secret | Lista solicitudes de provisioning pendientes |
| POST | `/billing/admin/provisioning-requests/:id/approve` | x-admin-secret | Aprueba solicitud de provisioning |
| DELETE | `/billing/admin/provisioning-requests/completed` | x-admin-secret | Limpia jobs completados |
| GET | `/billing/admin/stores` | x-admin-secret | Lista todas las tiendas con métricas |
| PATCH | `/billing/admin/stores/:id/toggle` | x-admin-secret | Activa/desactiva tienda |
| DELETE | `/billing/admin/stores/:id` | x-admin-secret | Elimina tienda y datos asociados |
| POST | `/billing/admin/demo/reset` | X-Reset-Token | Resetea datos de la tienda Demo |

---

## Módulo: Admin SaaS (`/api/admin`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/admin/audit-logs` | JWT (super admin) | ⚠️ **Pendiente** — Logs de auditoría del sistema |
| GET | `/admin/metrics/daily` | JWT (super admin) | ⚠️ **Pendiente** — KPIs diarios para WF4 |
| GET | `/admin/stores` | JWT (super admin) | Gestión de tiendas del sistema |

---

## Módulo: Público (`/api/public`)

Endpoints sin autenticación para la tienda pública (escaparate):

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/public/store` | — | Info pública de la tienda |
| GET | `/public/products` | — | Catálogo de productos publicados |
| GET | `/public/products/:slug` | — | Detalle de producto por slug |
| GET | `/public/categories` | — | Categorías públicas |
| POST | `/public/orders` | — | Crea pedido de cliente externo |
| POST | `/public/auth/register` | — | Registro público de cliente |

---

## Módulo: Ingest API (`/api/ingest`)

API para integración con sistemas externos. Documentación completa en [api_integration_docs.md](api_integration_docs.md).

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/ingest/orders` | API Key | Ingesta de pedidos externos |
| POST | `/ingest/products` | API Key | Sincronización de catálogo externo |
| POST | `/ingest/customers` | API Key | Importación de clientes |

---

## Endpoints de sistema

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Health check — estado del servidor |
| GET | `/info` | Info de la API (versión, módulos disponibles) |

---

## Códigos de error comunes

| Código HTTP | Significado |
|---|---|
| 400 | Datos de validación incorrectos |
| 401 | Token inválido o no proporcionado |
| 403 | Sin permisos para este recurso |
| 404 | Recurso no encontrado |
| 409 | Conflicto (usuario/email duplicado) |
| 423 | Cuenta bloqueada temporalmente |
| 429 | Rate limit excedido (100 req/15min en auth) |
| 500 | Error interno del servidor |
