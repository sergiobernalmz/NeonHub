# NeonHub — Stack Tecnológico

## Resumen ejecutivo

| Capa | Tecnología | Versión |
|---|---|---|
| Backend | Node.js + Express | Node ≥18, Express 4.18 |
| Frontend SaaS | React + Vite | React 19.1, Vite 7.1 |
| Landing Page | Astro (SSR) | Astro 5.16 |
| App Móvil | Expo / React Native | Expo 52, RN 0.76 |
| Base de datos | PostgreSQL + Sequelize | PG 8.x, Sequelize 6.35 |
| Autenticación | JWT + SSO | jsonwebtoken 9.0 |
| Pagos | Stripe | stripe SDK 20.1 |
| Email | SMTP (buzondecorreo.com) | Nodemailer 6.9 |
| Automatización | n8n | Servidor dedicado |
| Tiempo real | Socket.IO | 4.7 |
| Hosting | VPS propio + Docker + PM2 | — |
| Error tracking | Sentry | @sentry/node 10.47 |
| Logging | BetterStack (Logtail) | @logtail/node 0.5 |
| Estilos | Tailwind CSS | 3.4 (frontend), 4.1 (landing) |

---

## Backend

**Lenguaje**: JavaScript (Node.js ≥ 18.0.0)
**Framework**: Express 4.18.2
**Punto de entrada**: `backend/src/server.js`
**Modo de despliegue**: PM2 cluster mode, puerto 4000

### Dependencias principales

| Paquete | Versión | Propósito |
|---|---|---|
| `express` | 4.18.2 | Framework web |
| `sequelize` | 6.35.2 | ORM multi-BD |
| `pg` | 8.17.2 | Driver PostgreSQL |
| `jsonwebtoken` | 9.0.2 | JWT access + refresh tokens |
| `bcryptjs` | 2.4.3 | Hash de contraseñas (12 rounds) |
| `stripe` | 20.1.2 | Procesamiento de pagos |
| `socket.io` | 4.7.4 | WebSockets tiempo real |
| `nodemailer` | 6.9.7 | Email transaccional |
| `pdfkit` | 0.14.0 | Generación de facturas PDF |
| `multer` | 1.4.5-lts.1 | Upload de archivos |
| `sharp` | 0.34.4 | Procesamiento de imágenes |
| `helmet` | 7.1.0 | Cabeceras de seguridad HTTP |
| `cors` | 2.8.5 | CORS cross-origin |
| `express-rate-limit` | 7.1.5 | Rate limiting por IP |
| `express-validator` | 7.0.1 | Validación de inputs |
| `node-cron` | 3.0.3 | Tareas programadas (cron jobs) |
| `uuid` | 13.0.0 | Generación de UUIDs v4 |
| `axios` | 1.13.2 | Cliente HTTP (server-side) |
| `compression` | 1.7.4 | Compresión gzip de respuestas |
| `cookie-parser` | 1.4.7 | Parsing de cookies HTTP |
| `dotenv` | 16.3.1 | Variables de entorno |
| `validator` | 13.15.15 | Sanitización y validación |
| `@sentry/node` | 10.47.0 | Error tracking en producción |
| `@logtail/node` | 0.5.8 | Logging centralizado BetterStack |

### Testing backend
- **jest** 29.7.0 + **supertest** 6.3.4
- Estado: **69/69 tests pasando**
- Cobertura: controladores y rutas principales

---

## Frontend SaaS

**Framework**: React 19.1.1 con Vite 7.1.2
**Tipo**: SPA (Single Page Application)
**Despliegue**: `serve` estático, puerto 3000, PM2 fork mode
**Ruta**: `frontend/`

### Dependencias principales

| Paquete | Versión | Propósito |
|---|---|---|
| `react` + `react-dom` | 19.1.1 | Framework UI |
| `react-router-dom` | 7.9.0 | Routing cliente |
| `axios` | 1.12.1 | Cliente HTTP |
| `tailwindcss` | 3.4.17 | Estilos utility-first |
| `recharts` | 3.2.0 | Gráficos y charts (analytics) |
| `lucide-react` | 0.544.0 | Librería de iconos |
| `framer-motion` | 12.23.12 | Animaciones |
| `@stripe/react-stripe-js` | 5.4.1 | Componentes Stripe |
| `@stripe/stripe-js` | 8.6.1 | SDK Stripe cliente |
| `jspdf` | 3.0.2 | Exportar PDF desde frontend |
| `html2canvas` | 1.4.1 | Captura HTML para PDF |

---

## Landing Page

**Framework**: Astro 5.16.1 (SSR con adaptador Node)
**Modo**: Server-Side Rendering
**Despliegue**: PM2 fork mode, puerto 5000
**Ruta**: `landing-page/`

**Características especiales**:
- Integración React (`@astrojs/react`) para componentes interactivos
- Tailwind CSS 4.1 (nueva arquitectura v4)
- Rutas API server-side en `src/pages/api/`:
  - `POST /api/sso-redirect` — Genera token SSO para handoff a subdominio
  - `POST /api/verify-email` — Verificación de email via n8n
  - `/api/admin/` — Panel de administración interno
- Autenticación via `app_auth_token` cookie (sesión propia de landing)
- Conexión directa a `landing_db` (base de datos separada)

---

## App Móvil

**Framework**: Expo 52 / React Native 0.76.6
**Estado**: En desarrollo activo
**Ruta**: `mobile/`

| Paquete | Propósito |
|---|---|
| `@react-navigation/native` | Navegación |
| `@react-navigation/bottom-tabs` | Bottom tab navigator |
| `@react-native-async-storage/async-storage` | Persistencia local |
| `axios` | Cliente HTTP |

---

## Base de datos

**Motor**: PostgreSQL
**ORM**: Sequelize 6.35.2
**Bases de datos activas**:

| BD | Puerto | Propósito |
|---|---|---|
| `neonhub_db` | 5433 | Principal — tiendas, usuarios, productos, pedidos |
| `landing_db` | 5434 | Landing page — registro de usuarios preventa |
| `vps_db` | 5435 | Panel VPS interno |

**Contenedores Docker** (docker-compose.yml):
- `neonhub-postgres` → neonhub_db
- `postgres-landing` → landing_db
- `postgres-vps` → vps_db

**Migraciones**: 27 archivos en `backend/src/database/migrations/`

---

## Autenticación

**Tipo**: JWT dual-token (access + refresh)
**Librería**: jsonwebtoken 9.0.2

| Token | Almacenamiento | TTL | Propósito |
|---|---|---|---|
| `accessToken` | `localStorage` (login normal) / `sessionStorage` (demo) | 7 días | Autorización de requests |
| `refreshToken` | httpOnly cookie (`sameSite: strict`) | 30 días | Renovación silenciosa |
| `ssoToken` | Tabla `sso_tokens` en BD | 30 segundos | Handoff cross-subdomain |

**Roles disponibles** (RBAC con permisos JSON):

| Rol | Nivel | Descripción |
|---|---|---|
| `programmer` | 200 | Acceso total al sistema SaaS (panel VPS) |
| `ceo_neonhub` | 150 | Propietario de NeonHub como empresa |
| `ceo` | 100 | Propietario de una tienda tenant |
| `super_admin` | 90 | Admin avanzado de tienda |
| `admin` | 80 | Administrador de tienda |
| `manager` | 60 | Manager de tienda |
| `employee` | 40 | Empleado con acceso básico |
| `customer` | 10 | Cliente de la tienda |

---

## Email

**Proveedor**: Piensa Solutions / buzondecorreo.com
**Configuración**:
- `EMAIL_HOST=smtp.buzondecorreo.com`
- `EMAIL_PORT=465`
- `EMAIL_SECURE=true` (SSL/TLS)
- `EMAIL_FROM=soporte@neonhub.es`

**Casos de uso**:
- Verificación de email al registrarse
- Recuperación de contraseña
- Bienvenida tras provisioning
- Alertas de pagos fallidos (via n8n)
- Reporte ejecutivo diario (via n8n)
- Alertas de error Demo reset (via n8n)

---

## Pagos — Stripe

**SDK**: stripe 20.1.2 (servidor) + @stripe/react-stripe-js 5.4.1 (cliente)
**Modo actual**: `sk_test_...` (modo test)
**Configuración**:
- `STRIPE_CURRENCY=eur`
- `STRIPE_BILLING_MODE=payment`

**Flujo implementado**:
1. `POST /api/billing/checkout-session` → crea Stripe Checkout Session
2. Usuario paga en página hosted de Stripe
3. `POST /api/billing/stripe/webhook` → recibe `checkout.session.completed`
4. n8n WF1 detecta el evento y llama a `POST /api/admin/provision-store`
5. `saasProvisioningService` crea la Store, usuario CEO, subdominio y envía email

---

## Automatización — n8n

**Servidor**: `https://neonhub.n8nservidor.es`
**Workflows activos**: 9 + 1 demo reset
**Versión**: pendiente de verificar en panel n8n

Ver [N8N_WORKFLOWS.md](N8N_WORKFLOWS.md) para documentación detallada.

---

## Infraestructura y despliegue

**Hosting**: VPS propio (Cosmos Cloud / Docker)
**Gestión de procesos**: PM2

| Proceso PM2 | Puerto | Modo | Ruta |
|---|---|---|---|
| `neonhub-backend` | 4000 | cluster | `backend/` |
| `neonhub-frontend` | 3000 | fork | `frontend/dist/` |
| `neonhub-landing` | 5000 | fork | `landing-page/` |
| `neonhub-vps` | 5001 | fork | Panel VPS interno |

**Proxy inverso**: Nginx (gestión de subdominios y SSL)
**Config PM2**: `ecosystem.neonhub.config.js` en la raíz del proyecto

---

## Observabilidad

| Herramienta | Propósito | Configuración |
|---|---|---|
| BetterStack (Logtail) | Logs centralizados en producción | `BETTER_STACK_SOURCE_TOKEN` |
| Sentry | Error tracking y alertas | `SENTRY_DSN` |
| PM2 logs | Logs locales en `/logs/` | `logs/backend-out.log`, etc. |
| n8n WF4 | Reporte ejecutivo diario por email | Cron 08:00 diario |
| n8n WF5 | Alertas de seguridad en tiempo real | Cron cada 10 min |

---

## Variables de entorno críticas

Las siguientes variables deben estar configuradas. **Nunca incluir valores en el repositorio.**

| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Secreto para firmar access tokens |
| `JWT_REFRESH_SECRET` | Secreto para firmar refresh tokens |
| `ADMIN_API_SECRET` | Secreto para comunicación server-to-server (landing → backend) |
| `DEMO_RESET_TOKEN` | Token para endpoint de reset de la tienda Demo |
| `STRIPE_SECRET_KEY` | API key de Stripe (servidor) |
| `STRIPE_WEBHOOK_SECRET` | Secreto de verificación de webhooks Stripe |
| `STRIPE_PUBLISHABLE_KEY` | API key pública de Stripe (cliente) |
| `DB_PASSWORD` | Contraseña de PostgreSQL neonhub_db |
| `LANDING_DB_PASSWORD` | Contraseña de PostgreSQL landing_db |
| `EMAIL_PASS` | Contraseña SMTP soporte@neonhub.es |
| `BETTER_STACK_SOURCE_TOKEN` | Token BetterStack para logging |
| `SENTRY_DSN` | DSN de Sentry para error tracking |
| `TENANT_BASE_DOMAIN` | Dominio base de tenants (`neonhub.es`) |
| `N8N_STORE_CREATED_WEBHOOK_URL` | URL webhook n8n para notificación store creada |

---

## Comunicación interna del equipo

| Herramienta | Uso |
|---|---|
| **Slack** — workspace NeonHub Team | Alertas automáticas de n8n (cobros fallidos, seguridad, onboarding) |
| **Trello** | Gestión de tareas y backlog |
