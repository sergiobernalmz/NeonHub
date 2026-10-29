# NeonHub — Sistema SaaS de E-commerce Sostenible
## Trabajo Final de Curso DAM

> **Proyecto**: Sistema SaaS Multi-Tenant para Gestión de E-commerce
> **Enfoque**: Sostenibilidad y Métricas Ecológicas
> **Estado**: MVP funcional desplegado en mi propio servidor (Dell R610)

🌐 **Web:** [neonhub.es](https://neonhub.es) · 🛒 **Demo:** [demo.neonhub.es](https://demo.neonhub.es)

Lo programé y lo desplegué yo mismo en mi servidor: API REST multi-tenant (Node.js + PostgreSQL), panel y tienda (React), landing (Astro), app móvil (Expo), pagos con Stripe y monitorización con Sentry y BetterStack.

| Landing | Panel de administración |
|---|---|
| ![Landing de NeonHub](docs/screenshots/landing.png) | ![Panel de administración](docs/screenshots/panel.png) |

---

## Descripción

**NeonHub** (anteriormente EcoCommerce) es una plataforma SaaS de gestión para comercio electrónico con enfoque en sostenibilidad. El sistema incluye:

- **Dashboard Administrativo** — Panel de control multi-tenant
- **Tienda Pública** — E-commerce completo con checkout y Stripe
- **Landing Page** — Página de marketing del servicio SaaS
- **App Móvil** — Expo/React Native (pantallas: auth, productos, carrito, checkout, perfil, reportes, sostenibilidad)

- **Backend API** — REST API con 26 modelos de datos

---

## Inicio Rápido

### Desarrollo local (todos los servicios)
```bash
npm run dev
```

### Script de gestión
```bash
./neonhub.sh
```
Ofrece un menú para arrancar/parar servicios en desarrollo y producción.

### PM2 (producción)
```bash
pm2 start ecosystem.neonhub.config.js
```

---

## URLs del Sistema

### Panel Administrativo (Frontend)
- Dashboard: http://localhost:5174
- Productos: http://localhost:5174/products
- Pedidos: http://localhost:5174/orders
- Analytics: http://localhost:5174/analytics

### Tienda Pública
- Catálogo: http://localhost:5174/shop
- Checkout: http://localhost:5174/checkout

### Backend API
- API Base: http://localhost:3011/api
- Health Check: http://localhost:3011/health
- Productos públicos: http://localhost:3011/api/public/products

### Landing Page
- http://localhost:4321

---

## Arquitectura del Sistema

```
NeonHub/
├── backend/              # API REST (Node.js + Express + PostgreSQL)
│   ├── src/
│   │   ├── models/      # 26 modelos de base de datos
│   │   ├── controllers/ # Lógica de negocio (19 controllers)
│   │   ├── routes/      # Endpoints API (21 rutas)
│   │   ├── middleware/  # Auth JWT, multi-tenancy, seguridad
│   │   └── services/    # Stripe, email, sockets, certificaciones…
│   └── package.json
│
├── frontend/            # Dashboard + Tienda (React + Vite)
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Páginas de la aplicación
│   │   ├── context/     # Estado global
│   │   └── services/    # Clientes API
│   └── package.json
│
├── landing-page/        # Marketing SaaS (Astro SSR + Astro DB)
│
├── mobile/              # App móvil (Expo / React Native)
│   └── src/
│       ├── screens/     # auth, products, cart, checkout,
│       │                #  profile, reports, sustainability
│       ├── services/    # API, auth, orders, products…
│       └── context/     # AuthContext, CartContext
│
├── docs/                # Documentación técnica (~20 documentos)
├── ROADMAP/             # Roadmap SaaS (branding, dominios, etc.)
├── ecosystem.neonhub.config.js  # Configuración PM2
├── docker-compose.yml
└── neonhub.sh           # Script de gestión
```

---

## Tecnologías

### Backend
- **Node.js** + **Express** — Servidor web
- **Sequelize ORM** — PostgreSQL (prod) / MySQL (tests) / SQLite (fallback tests)
- **JWT** + refresh token (cookie httpOnly) — Autenticación
- **Stripe** — Pagos, intents, webhooks, reembolsos
- **Socket.IO** — Tiempo real (tickets de soporte)
- **Nodemailer** — Envío de emails
- **PDFKit** — Generación de facturas PDF
- **Multer** + **Sharp** — Subida y procesamiento de imágenes
- **Helmet** + CORS + rate limiting — Seguridad HTTP
- **BetterStack (@logtail/node)** — Logging centralizado
- **Sentry (@sentry/node)** — Monitorización de errores
- **node-cron** — Tareas programadas (certificaciones, sostenibilidad)
- **bcryptjs** — Encriptación de contraseñas

### Frontend
- **React 18** + **Vite** — SPA
- **TailwindCSS** — Estilos
- **React Router** — Navegación
- **Axios** — Cliente HTTP
- **Recharts** — Gráficos y analytics
- **Stripe Elements** — Checkout con Stripe

### Landing Page
- **Astro** (adaptador Node, SSR)
- **Astro DB** (SQLite local)

### App Móvil
- **Expo** + **React Native**
- **React Navigation**
- **AsyncStorage**
- **Axios**

---

## Estado del Proyecto

### Implementado

#### Backend
- 26 modelos de base de datos
- Autenticación JWT con refresh token (cookie httpOnly)
- Multi-tenancy SaaS (Store, API keys, subdominio)
- Sistema de roles y permisos (RBAC)
- Pagos con Stripe (intents, webhook, reembolsos, registro de transacciones)
- Sistema de certificaciones ecológicas
- Métricas de sostenibilidad
- Facturación e invoices
- Reportes y tickets de soporte
- Logging con BetterStack y monitorización con Sentry
- Tests: 69/69 pasando

#### Frontend
- Dashboard administrativo completo
- Tienda pública con checkout Stripe
- Carrito de compras
- Registro y gestión de usuarios
- Gráficos y analytics
- Tema oscuro "Neon"

#### App Móvil
- Pantallas: login, registro, productos, carrito, checkout, perfil, pedidos, reportes, sostenibilidad
- Servicios API: auth, products, orders, sustainability

#### Infraestructura
- Desplegado en servidor propio (Dell R610 + VMware ESXi) con PM2, Nginx Proxy Manager y Cloudflare Tunnels
- Configuración Docker disponible

### Pendiente

- Recuperación de contraseña (forgot password flow)
- Frontend: corrección de errores de lint (hooks rules, unused vars)
- Aislamiento multi-tenant completo en todos los módulos (rutas menos críticas: reportes, tickets, notificaciones)
- CSRF global con cookies
- Auditoría de dependencias (`npm audit`)
- CI/CD (GitHub Actions)
- Redis / caché
- Reviews y calificaciones de productos
- Cupones y descuentos
- 2FA

---

## Instalación y Desarrollo

### Requisitos
- Node.js 18+
- PostgreSQL (producción) / MySQL (tests)
- Variables de entorno configuradas (ver `.env.example`)

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/sergiobernalmz/NeonHub.git
cd NeonHub

# Instalar todas las dependencias
npm run install:all

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con los valores reales

# Migrar base de datos
cd backend && npm run migrate
```

### Scripts disponibles (raíz)
```bash
npm run dev              # Backend + Frontend en paralelo
npm run dev:frontend     # Solo frontend
npm run dev:backend      # Solo backend
npm run install:all      # Instalar todas las dependencias
```

### Scripts por proyecto
```bash
# Backend
cd backend && npm run dev        # Desarrollo
cd backend && npm run migrate    # Migraciones
cd backend && npm run seed       # Datos de prueba
cd backend && npm test           # Tests (69/69)

# Frontend
cd frontend && npm run dev       # Desarrollo
cd frontend && npm run build     # Build producción
cd frontend && npm run lint      # Lint

# Landing
cd landing-page && npm run dev
cd landing-page && npm run build

# App Móvil
cd mobile && npm start           # Expo
```

---

## Seguridad

### APIs Públicas (sin autenticación)
- Productos y categorías (solo lectura)
- Registro de usuarios
- Checkout público

### APIs Protegidas (JWT requerido)
- Panel administrativo completo
- Gestión CRUD de recursos
- Analytics

### Medidas implementadas
- JWT con refresh token en cookie httpOnly
- Helmet (CSP estricto en producción)
- CORS con allowlist en producción
- Rate limiting
- Sanitización de inputs (XSS, SQL injection)
- Multi-tenancy con scoping por store_id en BD
- Logs de auditoría (AuditLog model)
- BetterStack + Sentry para observabilidad

---

## Características de Sostenibilidad

- Catálogo de productos con métricas ecológicas por producto
- Sistema de certificaciones ecológicas
- Puntuación eco-friendly (SustainabilityMetric)
- Analytics de sostenibilidad en el dashboard

---

## Documentación

- [docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md) — Diagramas C4 y arquitectura del sistema
- [docs/MODELO_DATOS.md](./docs/MODELO_DATOS.md) — Modelo de datos (ER diagram)
- [docs/ESTADO_ACTUAL.md](./docs/ESTADO_ACTUAL.md) — Estado real del proyecto (qué está y qué falta)
- [docs/TFG_RESUMEN_PROYECTO.md](./docs/TFG_RESUMEN_PROYECTO.md) — Resumen técnico para TFG
- [docs/REVISION_COMPLETA_SAAS_2026-03-02.md](./docs/REVISION_COMPLETA_SAAS_2026-03-02.md) — Revisión completa Mar 2026
- [docs/TFG_PENDIENTES_Y_SEGURIDAD.md](./docs/TFG_PENDIENTES_Y_SEGURIDAD.md) — Checklist de seguridad y pendientes
- [docs/SEGURIDAD.md](./docs/SEGURIDAD.md) — Documentación de seguridad
- [docs/api_integration_docs.md](./docs/api_integration_docs.md) — API de integración (ingest)
- [docs/SISTEMA_REPORTES.md](./docs/SISTEMA_REPORTES.md) — Sistema de reportes
- [docs/SISTEMA_CERTIFICACIONES_DOCUMENTACION.md](./docs/SISTEMA_CERTIFICACIONES_DOCUMENTACION.md) — Sistema de certificaciones

---

## Para el TFG

### Requisitos cumplidos
- Backend con arquitectura SaaS multi-tenant
- Frontend completo y funcional
- App móvil con pantallas principales implementadas
- Sistema de pagos (Stripe)
- Documentación técnica
- Sistema de seguridad implementado
- Desplegado en servidor propio (producción real)
- Tests automatizados (69/69 backend)

---

## Despliegue

El proyecto está desplegado en mi propio servidor, un **Dell PowerEdge R610 con VMware ESXi**:

```
Internet ──► Cloudflare (Tunnel) ──► VM de entrada: Nginx Proxy Manager ──► VM NeonHub: PM2
                                     (enruta cada dominio a su VM)            (backend, frontend, landing SSR)
```

- **Cloudflare Tunnels**: el tráfico entra sin abrir puertos en el router de casa.
- **Nginx Proxy Manager** en una VM aparte: según el dominio, envía cada petición a la máquina virtual que corresponde. La misma VM da servicio a mis otros proyectos.
- **PM2** en la VM de NeonHub, para gestionar los procesos (backend, frontend build, landing SSR).
- Configuración en `ecosystem.neonhub.config.js` y `docs/nginx-nonhub.conf`

---

**Desarrollado por Sergio Bernal Martínez** · Proyecto final de DAM (FEMPA, 2026)
[LinkedIn](https://www.linkedin.com/in/sergiobernalmz/) · sergio.bernal.mz@gmail.com
