# NeonHub — Arquitectura del Sistema

**Versión**: 1.0
**Fecha**: 10 de abril de 2026

---

## 1. Visión general

NeonHub es una plataforma SaaS multi-tenant para gestión de e-commerce con enfoque en sostenibilidad. Está compuesta por cinco aplicaciones independientes que comparten la misma API backend.

---

## 2. Diagrama C4 — Nivel 1: Contexto

```mermaid
C4Context
    title NeonHub — Diagrama de Contexto

    Person(admin, "Administrador", "Gestiona productos, pedidos, clientes y métricas desde el dashboard")
    Person(cliente, "Cliente Final", "Navega el catálogo y realiza compras desde la tienda o la app móvil")
    Person(dev, "Desarrollador SaaS", "Integra su tienda externa con NeonHub via API")

    System(neonhub, "NeonHub", "Plataforma SaaS de e-commerce sostenible multi-tenant")

    System_Ext(stripe, "Stripe", "Procesamiento de pagos")
    System_Ext(betterstack, "BetterStack", "Logging y monitorización centralizada")
    System_Ext(sentry, "Sentry", "Monitorización de errores en producción")
    System_Ext(smtp, "SMTP (Nodemailer)", "Envío de emails transaccionales")
    System_Ext(n8n, "n8n", "Automatización de workflows SaaS")

    Rel(admin, neonhub, "Usa", "HTTPS")
    Rel(cliente, neonhub, "Compra / navega", "HTTPS / App móvil")
    Rel(dev, neonhub, "Integra via Ingest API", "HTTPS + API Key")

    Rel(neonhub, stripe, "Procesa pagos", "HTTPS / Webhooks")
    Rel(neonhub, betterstack, "Envía logs", "HTTPS")
    Rel(neonhub, sentry, "Reporta errores", "HTTPS")
    Rel(neonhub, smtp, "Envía emails", "SMTP")
    Rel(neonhub, n8n, "Dispara webhooks", "HTTPS")
```

---

## 3. Diagrama C4 — Nivel 2: Contenedores

```mermaid
C4Container
    title NeonHub — Diagrama de Contenedores

    Person(admin, "Administrador")
    Person(cliente, "Cliente Final")

    System_Boundary(neonhub, "NeonHub") {
        Container(frontend, "Frontend Web", "React 18 + Vite + TailwindCSS", "Dashboard admin + tienda pública SPA. Puerto 5174.")
        Container(landing, "Landing Page", "Astro SSR + Astro DB", "Página de marketing del SaaS. Puerto 4321.")
        Container(mobile, "App Móvil", "Expo / React Native", "App para clientes. Pantallas: auth, productos, carrito, checkout, perfil, reportes, sostenibilidad.")
        Container(vps_svc, "VPS Service", "Astro", "Marketplace de planes de infraestructura.")
        Container(backend, "Backend API", "Node.js + Express", "REST API. Puerto 3011. Autenticación, multi-tenancy, lógica de negocio.")
        ContainerDb(db, "Base de datos", "PostgreSQL (prod) / MySQL (tests)", "26 modelos. Datos de tiendas, productos, pedidos, usuarios, etc.")
    }

    System_Ext(stripe, "Stripe")
    System_Ext(betterstack, "BetterStack")
    System_Ext(sentry, "Sentry")

    Rel(admin, frontend, "Usa", "HTTPS")
    Rel(cliente, frontend, "Compra", "HTTPS")
    Rel(cliente, mobile, "Usa app", "HTTPS")
    Rel(cliente, landing, "Descubre el SaaS", "HTTPS")

    Rel(frontend, backend, "Llamadas API", "HTTPS / JSON")
    Rel(mobile, backend, "Llamadas API", "HTTPS / JSON")
    Rel(landing, backend, "Provisioning SaaS", "HTTPS / JSON")
    Rel(vps_svc, backend, "Gestión VPS", "HTTPS / JSON")
    Rel(backend, db, "Lee/escribe", "Sequelize ORM")
    Rel(backend, stripe, "Pagos", "HTTPS")
    Rel(backend, betterstack, "Logs", "HTTPS")
    Rel(backend, sentry, "Errores", "HTTPS")
```

---

## 4. Diagrama C4 — Nivel 3: Componentes del Backend

```mermaid
C4Component
    title NeonHub Backend — Componentes principales

    Container_Boundary(backend, "Backend API (Node.js + Express)") {
        Component(auth_mid, "Auth Middleware", "JWT + refresh token (cookie httpOnly)", "Valida tokens, resuelve roles y permisos RBAC")
        Component(store_mid, "Store Middleware", "X-NeonHub-Api-Key / X-Store-ID", "Resuelve el contexto tenant (Store) en cada request")
        Component(sec_mid, "Security Middleware", "Helmet, CORS, rate limiting, sanitización", "Protección HTTP, CSP, validación de inputs")

        Component(auth_ctrl, "Auth Controller", "JWT, bcryptjs", "Login, registro, refresh token, cambio de contraseña")
        Component(product_ctrl, "Product Controller", "Sequelize, Sharp", "CRUD productos con scoping por tenant y sanitización XSS")
        Component(order_ctrl, "Order Controller", "Sequelize", "Gestión de pedidos, estados, historial")
        Component(payment_ctrl, "Payment Controller", "Stripe SDK", "Intents, confirmación, reembolsos")
        Component(billing_ctrl, "Billing Controller", "Stripe SDK, PDFKit", "Suscripciones, invoices, facturas PDF")
        Component(sustainability_ctrl, "Sustainability Controller", "node-cron", "Métricas ecológicas, certificaciones")
        Component(report_ctrl, "Report Controller", "Socket.IO", "Reportes con comentarios en tiempo real")

        Component(stripe_svc, "Stripe Service", "Stripe SDK", "Lógica de pagos centralizada")
        Component(email_svc, "Email Service", "Nodemailer", "Envío de emails transaccionales")
        Component(socket_svc, "Socket Service", "Socket.IO", "Gestión de conexiones en tiempo real")
        Component(cert_svc, "Certification Scheduler", "node-cron", "Tareas programadas de certificaciones")
        Component(prov_svc, "SaaS Provisioning Service", "", "Alta de nuevos tenants")
    }

    ContainerDb(db, "PostgreSQL", "", "")

    Rel(auth_mid, auth_ctrl, "Aplica a rutas protegidas")
    Rel(store_mid, product_ctrl, "Inyecta store_id")
    Rel(payment_ctrl, stripe_svc, "Usa")
    Rel(billing_ctrl, stripe_svc, "Usa")
    Rel(auth_ctrl, email_svc, "Notificaciones")
    Rel(report_ctrl, socket_svc, "Emite eventos")
    Rel(cert_svc, sustainability_ctrl, "Actualiza métricas")
    Rel(product_ctrl, db, "CRUD")
    Rel(order_ctrl, db, "CRUD")
    Rel(payment_ctrl, db, "Registra transacciones")
```

---

## 5. Flujo de autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant F as Frontend/Mobile
    participant B as Backend API
    participant DB as Base de datos

    C->>F: Login (email + password)
    F->>B: POST /api/auth/login
    B->>DB: SELECT usuario + roles
    DB-->>B: Usuario encontrado
    B->>B: bcryptjs.compare(password)
    B-->>F: { accessToken } + cookie refreshToken (httpOnly)
    F->>F: Guarda accessToken en memoria

    Note over C,B: Sesión activa

    C->>F: Acción protegida
    F->>B: Request + Authorization: Bearer <accessToken>
    B->>B: Verifica JWT (expiración, firma)
    B-->>F: Respuesta con datos

    Note over C,B: Token expirado

    F->>B: POST /api/auth/refresh (cookie httpOnly automática)
    B->>B: Verifica refreshToken
    B-->>F: Nuevo accessToken
```

---

## 6. Flujo de multi-tenancy

```mermaid
sequenceDiagram
    participant Dev as Desarrollador SaaS
    participant B as Backend API
    participant DB as PostgreSQL

    Dev->>B: Request con X-NeonHub-Api-Key: sk_live_...
    B->>B: storeMiddleware: busca Store por api_key
    B->>DB: SELECT * FROM stores WHERE api_key = ?
    DB-->>B: Store { id, name, domain, ... }
    B->>B: req.store = store (inyecta contexto tenant)
    B->>DB: Query con WHERE store_id = req.store.id
    DB-->>B: Solo datos del tenant
    B-->>Dev: Respuesta filtrada por tenant
```

---

## 7. Flujo de pago

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant B as Backend
    participant S as Stripe

    U->>F: Checkout (carrito + datos pago)
    F->>B: POST /api/payments/create-intent
    B->>S: stripe.paymentIntents.create(amount, currency)
    S-->>B: { client_secret }
    B-->>F: { client_secret }
    F->>S: stripe.confirmPayment(client_secret, cardElement)
    S-->>F: { status: succeeded }
    S->>B: Webhook POST /api/payments/webhook
    B->>B: Verificar firma del webhook
    B->>DB: Actualizar estado pedido + crear PaymentRecord
    B-->>S: 200 OK
    F->>U: Pantalla de confirmación
```

---

## 8. Despliegue en producción

```mermaid
graph TD
    Internet[Internet] --> Nginx[Nginx Reverse Proxy]
    Nginx -->|puerto 3011| Backend[PM2: Backend Node.js]
    Nginx -->|puerto 5174 - build estático| Frontend[PM2: Frontend Vite Build]
    Nginx -->|puerto 4321| Landing[PM2: Landing Astro SSR]
    Backend --> PostgreSQL[(PostgreSQL)]
    Backend --> BetterStack[BetterStack Logs]
    Backend --> Sentry[Sentry Errors]
    Backend --> Stripe[Stripe API]
```

**Archivos de configuración:**
- PM2: `ecosystem.neonhub.config.js`
- Nginx: `docs/nginx-nonhub.conf`

---

## 9. Estructura de módulos del backend

| Ruta | Controller | Descripción |
|------|-----------|-------------|
| `/api/auth` | authController | Login, registro, refresh, cambio de password |
| `/api/users` | userController | CRUD usuarios |
| `/api/products` | productController | CRUD productos (con tenant scoping) |
| `/api/categories` | categoryController | CRUD categorías (globales + por tenant) |
| `/api/orders` | orderController | Gestión de pedidos |
| `/api/public/*` | publicOrderController | Endpoints sin auth (catálogo, checkout guest) |
| `/api/cart` | cartController | Carrito de compras |
| `/api/customers` | customerController | Gestión de clientes |
| `/api/payments` | paymentController | Stripe intents, webhook, reembolsos |
| `/api/billing` | billingController | Suscripciones SaaS, invoices |
| `/api/sustainability` | sustainabilityController | Métricas ecológicas |
| `/api/certifications` | certificationController | Sistema de certificaciones |
| `/api/reports` | reportController | Reportes con comentarios |
| `/api/tickets` | ticketController | Tickets de soporte |
| `/api/notifications` | notificationController | Notificaciones internas |
| `/api/dashboard` | dashboardController | Métricas del dashboard |
| `/api/ingest/*` | ingestController | Ingest API para integraciones externas |
| `/api/admin` | tenantController | Gestión de stores/tenants |
| `/api/uploads` | uploadController | Subida de imágenes (Multer + Sharp) |
