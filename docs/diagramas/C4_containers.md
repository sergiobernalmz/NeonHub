# C4 — Nivel 2: Diagrama de Contenedores

**Proyecto:** NeonHub  
**Nivel C4:** Container (Nivel 2)  
**Fecha:** 2026-04-10  

---

## Descripción

Este diagrama detalla los contenedores (procesos/aplicaciones desplegables) que componen NeonHub, las tecnologías de cada uno y cómo se comunican entre sí y con los sistemas externos.

---

```mermaid
C4Container
  title Diagrama de Contenedores — NeonHub SaaS

  Person(cliente, "Cliente Final", "Accede desde navegador web o app móvil")
  Person(admin, "Administrador", "Gestiona el negocio desde navegador")
  Person(integrador, "Integrador", "Conecta sistemas externos via API")
  Person_Ext(operador, "Operador SaaS", "Contrata y configura su tenant")

  System_Ext(stripe, "Stripe", "Pagos y suscripciones")
  System_Ext(n8n, "n8n", "Automatización de workflows")
  System_Ext(betterstack, "BetterStack", "Logging centralizado")
  System_Ext(sentry, "Sentry", "Error tracking")
  System_Ext(smtp, "SMTP", "Email transaccional")

  System_Boundary(neonhub, "NeonHub Platform") {

    Container(landing, "Landing Page", "Astro SSR + Astro DB (SQLite)", "Web pública de marketing. Checkout SaaS para contratar planes. Panel de provisioning de tenants. Integración con n8n.")

    Container(frontend, "Dashboard + Tienda Pública", "React 18 + Vite + TailwindCSS + Recharts", "SPA que combina el dashboard de administración (gestión de productos, pedidos, clientes, reportes, certificaciones, métricas) y la tienda pública para clientes finales.")

    Container(mobile, "Mobile App", "Expo + React Native + React Navigation", "App nativa (iOS/Android). Pantallas: auth, catálogo de productos, carrito, checkout, perfil, reportes y métricas de sostenibilidad.")

    Container(vps_service, "VPS Service", "Astro SSR", "Marketplace de servicios VPS adicionales. Páginas: landing, precios, dashboard de gestión, mis-VPS, login/registro.")

    Container(backend, "Backend API", "Node.js + Express + Sequelize + Socket.IO", "API REST central. Gestiona: autenticación JWT + refresh token (cookie httpOnly), multitenancy, catálogo, pedidos, pagos Stripe, certificaciones, reportes, uploads de imágenes (Sharp/Multer), tareas programadas (node-cron), tiempo real (Socket.IO).")

    ContainerDb(postgres, "PostgreSQL", "Base de datos relacional (producción)", "23 modelos Sequelize: Store (tenant), User, Product, Order, OrderItem, Cart, CartItem, Certification, ProductCertification, Report, Subscription, Payment, Invoice, ApiKey, Notification, SustainabilityMetric, Upload...")

    ContainerDb(astro_db, "Astro DB", "SQLite embebido en la landing page", "Persistencia local de la landing page: datos de checkout SaaS, registros de provisioning y configuración de tenants antes de migrar a la BD principal.")

  }

  Rel(cliente, frontend, "Navega la tienda pública", "HTTPS")
  Rel(cliente, mobile, "Compra y consulta desde la app", "App nativa")
  Rel(admin, frontend, "Gestiona el negocio desde el dashboard", "HTTPS")
  Rel(integrador, backend, "Sincroniza productos y pedidos", "HTTPS / REST + X-NeonHub-Api-Key")
  Rel(operador, landing, "Contrata plan y aprovisiona tenant", "HTTPS")

  Rel(landing, backend, "Provisiona tenant tras pago confirmado", "HTTPS / REST")
  Rel(landing, astro_db, "Persiste datos del checkout SaaS", "Astro DB / SQLite")
  Rel(landing, stripe, "Crea sesión de checkout SaaS", "HTTPS / Stripe SDK")

  Rel(frontend, backend, "Consume API REST (autenticada con JWT)", "HTTPS / Axios")
  Rel(mobile, backend, "Consume API REST (autenticada con JWT)", "HTTPS / Axios")
  Rel(vps_service, backend, "Consulta estado y servicios VPS", "HTTPS / REST")

  Rel(backend, postgres, "Lee y escribe datos del negocio", "TCP / Sequelize ORM")
  Rel(backend, stripe, "Payment intents, webhooks, reembolsos, suscripciones", "HTTPS / Stripe SDK")
  Rel(backend, n8n, "Publica eventos (onboarding, pagos, alertas)", "HTTPS / Webhook")
  Rel(backend, betterstack, "Envía logs estructurados", "HTTPS / @logtail/node")
  Rel(backend, sentry, "Reporta errores y trazas", "HTTPS / @sentry/node")
  Rel(backend, smtp, "Envía emails transaccionales", "SMTP / Nodemailer")
```

---

## Contenedores

| Contenedor | Tecnología | Puerto (dev) | Descripción |
|------------|-----------|--------------|-------------|
| **Landing Page** | Astro SSR + Astro DB | 4321 | Marketing + checkout SaaS + provisioning |
| **Dashboard + Tienda** | React 18 + Vite | 5173 | SPA: admin dashboard y tienda pública |
| **Mobile App** | Expo + React Native | — | App nativa iOS/Android |
| **VPS Service** | Astro SSR | 4322 | Marketplace de servicios VPS |
| **Backend API** | Node.js + Express | 3000 | API REST + Socket.IO + cron jobs |
| **PostgreSQL** | Base de datos relacional | 5432 | Persistencia principal (23 modelos) |
| **Astro DB** | SQLite embebido | — | Datos locales de la landing page |

## Flujos principales

| Flujo | Ruta |
|-------|------|
| **Checkout SaaS (nuevo operador)** | Operador → Landing → Stripe → Backend (webhook) → PostgreSQL → n8n (onboarding) |
| **Compra en tienda** | Cliente → Frontend/Mobile → Backend → Stripe → PostgreSQL → SMTP (confirmación) |
| **Ingest API** | Integrador → Backend (API Key) → PostgreSQL |
| **Login / Sesión** | Usuario → Frontend/Mobile → Backend → JWT cookie httpOnly → PostgreSQL |
| **Observabilidad** | Backend → BetterStack (logs) + Sentry (errores) |
