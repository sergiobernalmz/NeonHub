# NeonHub — Esquema de Base de Datos

**Motor**: PostgreSQL (puerto 5433)
**ORM**: Sequelize 6.35.2
**Base de datos principal**: `neonhub_db`
**Total de modelos**: 27

---

## Diagrama de relaciones (ERD simplificado)

```
stores ──────────────────────────────────────────────┐
  │                                                   │
  ├── users (store_id) ──── user_roles               │
  │     │                         │                   │
  │     └── user_stores ──────────┘                  │
  │     │                                             │
  │     └── audit_logs                               │
  │                                                   │
  ├── products (store_id)                            │
  │     ├── categories (store_id)                    │
  │     ├── suppliers                                │
  │     ├── product_certifications ── certifications │
  │     ├── order_items                              │
  │     ├── invoice_items                            │
  │     └── cart_items                              │
  │                                                   │
  ├── orders (store_id)                              │
  │     ├── order_items                              │
  │     ├── transactions                             │
  │     └── invoices ── invoice_items               │
  │                                                   │
  ├── customers (store_id)                           │
  │     ├── orders                                   │
  │     └── invoices                                │
  │                                                   │
  ├── carts ── cart_items                           │
  ├── provisioning_jobs ── stripe_events            │
  ├── payment_records                               │
  └── audit_logs                                    │
                                                     │
roles ───────────────────────────────── user_roles  │
                                                     │
sso_tokens ─── users                               │
```

---

## Entidades principales

### `stores` — Tiendas/Tenants SaaS

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `name` | STRING | Nombre de la tienda |
| `subdomain` | STRING UNIQUE | Subdominio (`nombre.neonhub.es`) |
| `is_active` | BOOLEAN | Estado activo/inactivo |
| `settings` | JSONB | Configuración personalizada (branding, etc.) |
| `plan_id` | STRING | Identificador del plan contratado |
| `plan_price_cents` | INTEGER | Precio del plan en céntimos |
| `billing_start_date` | DATE | Fecha de inicio de facturación |
| `next_payment_date` | DATE | Próxima fecha de cobro |
| `payment_status` | STRING | Estado: `active`, `past_due`, `cancelled` |
| `stripe_customer_id` | STRING | ID de cliente en Stripe |
| `stripe_subscription_id` | STRING | ID de suscripción en Stripe |
| `paused_at` | DATE | Fecha de pausa (si aplica) |
| `paused_reason` | STRING | Motivo de pausa |
| `created_at` | DATE | Timestamp de creación |

---

### `users` — Usuarios del sistema

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `username` | STRING UNIQUE | Nombre de usuario |
| `email` | STRING UNIQUE | Email |
| `password_hash` | STRING | Hash bcrypt (12 rounds) — excluido de queries normales |
| `first_name` | STRING | Nombre |
| `last_name` | STRING | Apellido |
| `phone` | STRING | Teléfono |
| `store_id` | UUID FK → stores | Tienda activa actual |
| `is_active` | BOOLEAN | Cuenta activa |
| `email_verified` | BOOLEAN | Email verificado |
| `email_verified_at` | DATE | Fecha de verificación |
| `verification_token` | STRING | Token de verificación de email |
| `verification_token_expires` | DATE | ✅ **Bug corregido**: añadido en migración 018. Antes no existía y los tokens no expiraban. |
| `password_reset_token` | STRING | Token de recuperación de contraseña |
| `password_reset_expires` | DATE | Expiración del token de reset |
| `login_attempts` | INTEGER | Intentos fallidos de login |
| `locked_until` | DATE | Bloqueo temporal de cuenta |
| `last_login_at` | DATE | Último login |
| `avatar_url` | STRING | URL del avatar |
| `preferences` | JSONB | Preferencias: `{ theme, language, pending_plan, onboarding_status }` |
| `address` | JSONB | Dirección postal |

**Scope especial**: `User.scope('withPassword')` incluye `password_hash` para login.

---

### `roles` — Roles del sistema (RBAC)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `name` | STRING UNIQUE | Identificador: `programmer`, `ceo_neonhub`, `ceo`, `admin`, `manager`, `employee`, `customer` |
| `display_name` | STRING | Nombre legible |
| `description` | STRING | Descripción del rol |
| `permissions` | JSONB | Array de permisos: `["products.read", "products.create", ...]` |
| `level` | INTEGER | Nivel jerárquico (200 = máximo, 10 = mínimo) |
| `is_active` | BOOLEAN | Rol activo |

---

### `user_roles` — Asignación usuarios ↔ roles (N:M)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `user_id` | UUID FK → users | — |
| `role_id` | UUID FK → roles | — |
| `store_id` | UUID FK → stores | Tienda para la que aplica el rol (nullable) |
| `is_active` | BOOLEAN | Asignación activa |
| `assigned_by` | UUID FK → users | Quién asignó el rol |
| `expires_at` | DATE | Expiración del rol (nullable) |

**Índices**: `UNIQUE(user_id, role_id, store_id)`

---

### `user_stores` — Multi-tienda usuario ↔ store (N:M)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `user_id` | UUID FK → users CASCADE | — |
| `store_id` | UUID FK → stores CASCADE | — |
| `is_primary` | BOOLEAN | Si esta es la tienda principal del usuario |
| `created_at` | DATE | Cuando se asoció |

**Índices**: `UNIQUE(user_id, store_id)`, `user_stores_user_id_idx`, `user_stores_store_id_idx`
**Propósito**: Permite a un usuario (ej. programador/CEO NeonHub) tener acceso a múltiples tiendas.

---

### `products` — Catálogo de productos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda propietaria |
| `category_id` | UUID FK → categories | Categoría |
| `supplier_id` | UUID FK → suppliers | Proveedor |
| `name` | STRING | Nombre del producto |
| `slug` | STRING UNIQUE scope store | URL amigable |
| `sku` | STRING UNIQUE scope store | Código de inventario |
| `description` | TEXT | Descripción larga |
| `short_description` | STRING | Descripción corta |
| `price` | DECIMAL | Precio de venta |
| `cost_price` | DECIMAL | Precio de costo |
| `compare_price` | DECIMAL | Precio tachado (oferta) |
| `currency` | STRING | Moneda (ej. `EUR`) |
| `stock_quantity` | INTEGER | Stock disponible |
| `min_stock_level` | INTEGER | Alerta de stock mínimo |
| `is_active` | BOOLEAN | Producto visible en tienda |
| `images` | JSONB | Array de URLs de imágenes |
| `attributes` | JSONB | Atributos adicionales (peso, color, etc.) |
| `tags` | JSONB | Etiquetas para búsqueda |
| `sustainability_score` | INTEGER | Puntuación de sostenibilidad (0-100) |
| `is_eco_certified` | BOOLEAN | Tiene certificación ecológica |

---

### `categories` — Categorías de productos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda propietaria |
| `name` | STRING | Nombre |
| `slug` | STRING | URL amigable |
| `description` | TEXT | Descripción |
| `parent_id` | UUID FK → categories | Categoría padre (árbol) |
| `image_url` | STRING | Imagen de portada |
| `is_active` | BOOLEAN | Visible |
| `sort_order` | INTEGER | Orden de visualización |

---

### `orders` — Pedidos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda |
| `customer_id` | UUID FK → customers | Cliente |
| `user_id` | UUID FK → users | Empleado que creó el pedido |
| `order_number` | STRING UNIQUE | Número legible (ej. `ORD-2024-001`) |
| `status` | ENUM | `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded` |
| `subtotal` | DECIMAL | Subtotal sin impuestos |
| `tax_amount` | DECIMAL | Impuestos |
| `discount_amount` | DECIMAL | Descuentos aplicados |
| `total_amount` | DECIMAL | Total final |
| `currency` | STRING | Moneda |
| `payment_status` | ENUM | `pending`, `paid`, `failed`, `refunded` |
| `shipping_address` | JSONB | Dirección de envío |
| `billing_address` | JSONB | Dirección de facturación |
| `notes` | TEXT | Notas internas |
| `metadata` | JSONB | Datos adicionales |

---

### `order_items` — Líneas de pedido

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `order_id` | UUID FK → orders CASCADE | — |
| `product_id` | UUID FK → products | — |
| `product_name` | STRING | Nombre al momento del pedido (snapshot) |
| `product_sku` | STRING | SKU snapshot |
| `quantity` | INTEGER | Cantidad |
| `unit_price` | DECIMAL | Precio unitario |
| `total_price` | DECIMAL | Total línea |
| `tax_rate` | DECIMAL | IVA aplicado |

---

### `customers` — Clientes de la tienda

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda |
| `code` | STRING | Código interno (ej. `CLI-001`) |
| `name` | STRING | Nombre completo |
| `email` | STRING | Email |
| `phone` | STRING | Teléfono |
| `address` | JSONB | Dirección postal |
| `notes` | TEXT | Notas internas |
| `total_purchases` | DECIMAL | Total histórico de compras |
| `purchase_count` | INTEGER | Número de pedidos |
| `is_active` | BOOLEAN | Cliente activo |

---

### `invoices` + `invoice_items` — Facturas

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda |
| `order_id` | UUID FK → orders | Pedido asociado |
| `customer_id` | UUID FK → customers | Cliente |
| `invoice_number` | STRING UNIQUE | Número de factura |
| `status` | ENUM | `draft`, `sent`, `paid`, `cancelled` |
| `subtotal` | DECIMAL | Base imponible |
| `tax_amount` | DECIMAL | IVA |
| `total_amount` | DECIMAL | Total |
| `due_date` | DATE | Fecha de vencimiento |
| `pdf_url` | STRING | URL del PDF generado |

---

### `sso_tokens` — Tokens SSO cross-subdomain

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `token` | UUID UNIQUE | Token de uso único |
| `user_id` | UUID FK → users CASCADE | Usuario propietario |
| `store_id` | UUID FK → stores CASCADE | Tienda destino |
| `used` | BOOLEAN | Ya utilizado |
| `expires_at` | DATE | Expiración (30 segundos tras creación) |

**Índices**: `sso_tokens_token_idx`, `sso_tokens_expires_at_idx`, `sso_tokens_user_id_idx`
**Limpieza**: tokens expirados se eliminan automáticamente en cada llamada a `sso-exchange`.

---

### `provisioning_jobs` — Jobs de alta de tiendas

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `stripe_event_id` | UUID FK → stripe_events | Evento Stripe que lo originó |
| `store_id` | UUID FK → stores | Tienda creada |
| `status` | ENUM | `queued`, `processing`, `completed`, `failed` |
| `payload` | JSONB | Datos del evento Stripe |
| `error_message` | TEXT | Error si falló |
| `attempts` | INTEGER | Intentos realizados |

---

### `payment_records` — Historial de pagos Stripe

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores (NO ACTION) | Tienda |
| `stripe_payment_intent_id` | STRING | ID del intent en Stripe |
| `amount_cents` | INTEGER | Importe en céntimos |
| `currency` | STRING | Moneda |
| `status` | STRING | Estado del pago |
| `metadata` | JSONB | Datos adicionales |

**Nota importante**: FK con `ON DELETE NO ACTION` — debe eliminarse antes de eliminar la tienda.

---

### `sustainability_metrics` — Métricas ecológicas

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda |
| `recorded_by` | UUID FK → users | Usuario que registró |
| `metric_type` | STRING | Tipo: `co2`, `energy`, `water`, `waste` |
| `value` | DECIMAL | Valor de la métrica |
| `unit` | STRING | Unidad (kg, kWh, L, etc.) |
| `period` | DATE | Período de la métrica |
| `source` | STRING | Fuente de datos |
| `notes` | TEXT | Observaciones |

---

### `certifications` + `product_certifications`

| Tabla | Descripción |
|---|---|
| `certifications` | Catálogo de certificaciones ecológicas (EPEAT, FSC, EU Ecolabel, etc.) |
| `product_certifications` | N:M entre productos y certificaciones con fecha de validez |

---

### `audit_logs` — Registro de auditoría

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `user_id` | UUID FK → users | Usuario que realizó la acción |
| `store_id` | UUID FK → stores | Tienda donde ocurrió |
| `action` | STRING | Tipo de acción: `login`, `create`, `update`, `delete` |
| `resource` | STRING | Recurso afectado: `product`, `order`, etc. |
| `resource_id` | UUID | ID del recurso |
| `changes` | JSONB | Diff de cambios (antes/después) |
| `ip_address` | STRING | IP del cliente |
| `user_agent` | STRING | Navegador/cliente |
| `metadata` | JSONB | Datos adicionales |

---

### `support_tickets` — Tickets de soporte

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | — |
| `store_id` | UUID FK → stores | Tienda |
| `title` | STRING | Título del ticket |
| `description` | TEXT | Descripción del problema |
| `status` | ENUM | `open`, `in_progress`, `resolved`, `closed` |
| `priority` | ENUM | `low`, `medium`, `high`, `critical` |
| `messages` | JSONB | Array de mensajes del chat |
| `assigned_to` | UUID FK → users | Agente asignado |

---

### `carts` + `cart_items` — Carrito de compras

| Tabla | Campos clave |
|---|---|
| `carts` | `user_id` (1:1 con user), `store_id`, `total_amount` |
| `cart_items` | `cart_id`, `product_id`, `quantity`, `unit_price` |

---

## Tablas adicionales

| Tabla | Descripción |
|---|---|
| `notifications` | Notificaciones in-app por usuario |
| `reports` | Reportes internos con asignación y estados |
| `report_comments` | Comentarios en reportes |
| `suppliers` | Catálogo de proveedores |
| `transactions` | Historial de transacciones de pago por pedido |
| `stripe_events` | Eventos webhook de Stripe (idempotencia) |
| `discount_codes` | Códigos de descuento por tienda |

---

## Migraciones y orden de ejecución

Las migraciones están en `backend/src/database/migrations/` y se ejecutan en orden:

```
001 → users
002 → roles
003 → user_roles (N:M)
004 → categories
005 → products
006 → customers
007 → orders
008 → order_items
009 → invoices
010 → invoice_items
011 → sustainability_metrics
012 → notifications + stripe_payment_fields en orders
013 → audit_logs + suppliers
014 → reports + store_id en audit_logs
015 → carts
016 → cart_items
017 → verification_token en users
018 → verification_token_expires en users  ← Bug corregido
023 → store_id en support_tickets
024 → user_stores (nueva, multi-tienda)
025 → store_id en user_roles
026 → backfill user_stores desde users.store_id
027 → sso_tokens (nueva, SSO cross-subdomain)
+ add-address-to-users
+ add-report-roles
```

---

## Bug corregido documentado

### `users.verification_token_expires` — Migración 018

**Problema**: La columna `verification_token_expires` no existía inicialmente. Los tokens de verificación de email no tenían fecha de expiración, lo que significaba que un enlace de verificación podía usarse indefinidamente.

**Solución**: Migración `018-add-verification-token-expires-to-users.js` añadió la columna. La lógica en `authController.verifyEmail` ahora comprueba `user.verification_token_expires < new Date()` y rechaza tokens expirados con TTL de 24 horas.

**Estado**: ✅ Corregido y en producción.

---

## Índices críticos para rendimiento

| Tabla | Índice | Propósito |
|---|---|---|
| `stores` | `subdomain` UNIQUE | Resolución de tenant en cada request |
| `users` | `email` UNIQUE, `username` UNIQUE | Login y búsqueda |
| `products` | `store_id`, `sku`, `slug` | Filtrado por tenant, búsqueda |
| `orders` | `store_id`, `order_number` | Listado y búsqueda |
| `user_stores` | `UNIQUE(user_id, store_id)` | Multi-tienda |
| `sso_tokens` | `token`, `expires_at` | Intercambio SSO eficiente |
| `audit_logs` | `store_id`, `user_id`, `action` | Consultas de auditoría |
