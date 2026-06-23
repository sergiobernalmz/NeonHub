# Plan Técnico SaaS (Seguridad Máxima) - NeonHub

Fecha: 02/03/2026

## 1. Objetivo
Implementar NeonHub como SaaS multi-tenant con:
- Una sola base de datos PostgreSQL.
- Aislamiento fuerte por tenant.
- Acceso por subdominio (`tenant.tudominio.com`).
- Aprovisionamiento automático tras pago confirmado por Stripe.
- Seguridad máxima desde el MVP.

---

## 2. Decisiones de arquitectura (cerradas)

1) **Base de datos única + schema por tenant**
- Schema `public`: identidad global, billing, control y auditoría.
- Schema por tienda: `t_<tenant_uuid_sin_guiones>` con tablas de negocio (`products`, `customers`, `orders`, etc.).

2) **Contexto tenant por subdominio**
- El tenant se resuelve por `Host`/subdominio en backend.
- No se acepta `tenant_id` desde frontend como fuente de verdad.

3) **Provisioning automático Stripe**
- Evento `checkout.session.completed` confirmado y verificado.
- Job asíncrono idempotente que crea tenant, schema, admin, roles, api keys y suscripción.

4) **Seguridad máxima inicial**
- MFA admins, API keys rotables, rate limit estricto, auditoría inmutable, RLS en tablas globales, firma de webhook Stripe obligatoria.

---

## 3. Modelo de datos (single DB)

## 3.1 Schema global (`public`)
Tablas mínimas:
- `public.tenants`
- `public.users`
- `public.user_tenants`
- `public.roles`
- `public.user_roles`
- `public.plans`
- `public.subscriptions`
- `public.api_keys`
- `public.stripe_events` (idempotencia)
- `public.audit_logs`
- `public.provisioning_jobs`

### DDL base sugerido (resumen)
```sql
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending','provisioning','active','suspended','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  mfa_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_tenants (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, tenant_id)
);

CREATE TABLE public.roles (
  id bigserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  level int NOT NULL
);

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_id bigint NOT NULL REFERENCES public.roles(id),
  PRIMARY KEY (user_id, tenant_id, role_id)
);

CREATE TABLE public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_cents int NOT NULL,
  yearly_price_cents int,
  limits jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text,
  provider_subscription_id text,
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subscription_id)
);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  scopes text[] NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received',
  error text
);

CREATE TABLE public.provisioning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE,
  tenant_id uuid,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  retries int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  meta jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## 3.2 Schema por tenant (`t_<id>`)
Cada tenant tiene sus propias tablas de negocio. Ejemplo:
- `products`
- `categories`
- `customers`
- `orders`
- `order_items`
- `employees` (si separas perfil interno)
- `reports` (opcional)

### Ejemplo de creación de schema tenant
```sql
CREATE SCHEMA IF NOT EXISTS t_6f8d9a0b1c2d3e4f5a6b7c8d9e0f1a2b;
```

### Migraciones tenant
- Usa un runner de migraciones parametrizado por schema.
- Todas las tablas tenant deben crearse con `SET search_path TO <schema>, public;`.

---

## 4. Resolución de tenant por subdominio

## 4.1 Middleware de contexto tenant
1. Leer `Host` (`acme.neonhub.es`).
2. Extraer subdominio (`acme`).
3. Buscar en `public.tenants` (`status='active'`).
4. Inyectar en request:
- `req.tenant.id`
- `req.tenant.subdomain`
- `req.tenant.schema_name`

## 4.2 Conexión segura a datos tenant
- Antes de consultar datos de negocio:
  - `SET LOCAL search_path TO <schema_tenant>, public;`
- Nunca concatenar schema de forma insegura: validar con whitelist regex y mapping por `tenant_id`.

---

## 5. Stripe: compra y aprovisionamiento automático

## 5.1 Flujo end-to-end
1. Usuario compra plan en landing.
2. Backend crea `Checkout Session` con metadata:
- `tenant_name`
- `subdomain`
- `owner_email`
- `plan_id`
3. Stripe confirma pago (`checkout.session.completed`).
4. Webhook valida firma y guarda evento en `public.stripe_events`.
5. Se crea job en `public.provisioning_jobs`.
6. Worker procesa job:
- crea tenant (`status=provisioning`),
- crea schema,
- ejecuta migraciones,
- crea usuario admin + roles,
- crea api keys,
- crea subscription,
- marca tenant `active`.
7. Email de activación + enlace inicial seguro.

## 5.2 Idempotencia obligatoria
- `stripe_events.id` único (`event.id` de Stripe).
- Si evento ya procesado, responder 200 sin reprocesar.
- `provisioning_jobs.stripe_event_id` único para evitar doble alta.

## 5.3 Reintentos y rollback
- Worker con `retries` exponenciales.
- Si falla migración/schema: tenant queda `failed` y se registra `last_error`.
- Runbook para reprocesado manual seguro.

---

## 6. RBAC recomendado

Roles por tenant:
- `super_admin` (global plataforma)
- `tenant_admin` (dueño de tienda)
- `manager`
- `employee`
- `customer`

Reglas:
- `super_admin` solo en dominio principal (`main.neonhub.es` o panel central).
- Ningún usuario puede acceder a otro tenant aunque tenga mismo email en otro contexto.
- Permisos en backend siempre validados con `(user_id, tenant_id, role)`.

---

## 7. Seguridad máxima (checklist)

## 7.1 Autenticación y sesión
- JWT corto (`15m`) + refresh token en cookie `httpOnly`, `secure`, `sameSite=strict`.
- Rotación de refresh token.
- Invalidación por `session_id` en logout o compromiso.
- MFA obligatorio para `tenant_admin` y `super_admin`.

## 7.2 API Keys
- Guardar solo hash (`argon2id` o bcrypt de coste alto).
- Mostrar secret una sola vez al crear.
- Rotación y revocación inmediatas.
- Scopes por key (`ingest:products`, `ingest:orders`).
- Límite de tasa por tenant y por key.

## 7.3 Webhook Stripe
- Verificación de firma con `STRIPE_WEBHOOK_SECRET`.
- Endpoint aislado con raw body.
- No confiar en payload sin verificar.

## 7.4 Defensa aplicación
- Rate limit estricto en login, ingest y endpoints sensibles.
- CSP, HSTS, X-Frame-Options, CORS restrictivo por entorno.
- Logs estructurados y correlación por `request_id`.

## 7.5 Auditoría
- `audit_logs` inmutable para:
  - cambios de roles,
  - creación/revocación de api keys,
  - acciones de facturación,
  - operaciones de datos sensibles.

---

## 8. Estrategia de migración desde tu estado actual

Fase A (rápida, sin ruptura)
1. Unificar tablas globales en `public` (`tenants`, `subscriptions`, `stripe_events`, `provisioning_jobs`).
2. Middleware de subdominio obligatorio.
3. Forzar contexto tenant en backend.
4. Stripe webhook idempotente + job queue.

Fase B (aislamiento fuerte)
1. Crear schema por tenant nuevo.
2. Migrar datos tenant existentes de tablas compartidas al schema asignado.
3. Cambiar repositorios para operar por `search_path` tenant.
4. Tests de aislamiento cruzado.

Fase C (hardening final)
1. MFA obligatorio admins.
2. Rotación API keys + panel de seguridad.
3. Observabilidad + alertas + runbooks.
4. Pentest interno básico (OWASP ASVS nivel práctico).

---

## 9. Contratos de API (mínimos)

### 9.1 Landing/Checkout
- `POST /api/billing/checkout-session`
  - input: `planId`, `tenantName`, `subdomain`, `ownerEmail`
  - output: `checkoutUrl`

### 9.2 Stripe Webhook
- `POST /api/billing/stripe/webhook`
  - raw body + firma stripe
  - output: `200 OK`

### 9.3 Estado provisioning
- `GET /api/public/provisioning-status?subdomain=acme`
  - output: `pending | provisioning | active | failed`

---

## 10. Criterios de aceptación
Se considera listo cuando:
- [ ] Compra en landing crea tenant completo de forma automática tras pago confirmado.
- [ ] Cada usuario solo ve su tienda por subdominio/tenant.
- [ ] No existe fuga de datos entre tenants (tests automáticos).
- [ ] MFA y rotación de API keys activos.
- [ ] Logs/auditoría cubren eventos críticos.
- [ ] Reintentos de provisioning son idempotentes.

---

## 11. Qué implementar primero (orden exacto)
1. `public.stripe_events` + webhook idempotente.
2. `public.provisioning_jobs` + worker.
3. `public.tenants/subscriptions/plans`.
4. middleware tenant por subdominio.
5. creación schema tenant + migración template.
6. RBAC por tenant y MFA admin.
7. tests de aislamiento + tests e2e Stripe flow.

Con este orden minimizas riesgo y puedes liberar por hitos sin parar el negocio.
