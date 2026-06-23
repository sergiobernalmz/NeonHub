# NeonHub — Análisis de Pendientes, Mejoras y Trabajo Remaining

**Fecha de análisis**: 4 de mayo de 2026  
**Proyecto**: NeonHub — Sistema SaaS Multi-Tenant de E-commerce Sostenible  
**Autor**: Sergio — 2º DAM (Trabajo Final de Curso)

---

## 1. Resumen Ejecutivo

El proyecto NeonHub se encuentra en un **estado avanzado de desarrollo**, con un MVP funcional desplegado en producción (VPS con PM2 + Nginx). El sistema incluye un backend robusto con arquitectura multi-tenant, un frontend completo (dashboard + tienda pública), una aplicación móvil (Expo/React Native) y una landing page de marketing.

Sin embargo, existen varias áreas que requieren trabajo adicional antes de considerar el proyecto como "terminado" o "entregable" para el TFG. Este documento categoriza y prioriza las tareas pendientes.

**Estado general**:

- Backend: Funcional y en producción
- Frontend: Funcional, con errores de lint pendientes
- App Móvil: Pantallas principales implementadas
- Landing Page: Funcional y en producción

- Tests: 69/69 pasando en backend
- Despliegue: VPS activo con PM2 + Nginx

---

## 2. Funcionalidades Ya Implementadas

### 2.1 Backend

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| **Autenticación** | JWT con refresh token (cookie httpOnly) | ✅ Completado |
| **Multi-tenancy SaaS** | Store, API keys, subdominios, middleware de aislamiento | ✅ Completado |
| **Sistema de roles (RBAC)** | Roles con permisos en JSON, generación tipo recurso.acción | ✅ Completado |
| **Pagos con Stripe** | Payment intents, webhooks, reembolsos, transacciones | ✅ Completado |
| **Facturación PDF** | Generación de facturas con PDFKit | ✅ Completado |
| **Email** | Nodemailer configurado | ✅ Completado |
| **Subida de imágenes** | Multer + Sharp (thumbnails) | ✅ Completado |
| **Certificaciones** | Sistema de certificaciones ecológicas con cron jobs | ✅ Completado |
| **Métricas sostenibilidad** | SustainabilityController con scheduler | ✅ Completado |
| **Reportes en tiempo real** | Reportes con comentarios + Socket.IO | ✅ Completado |
| **Tickets de soporte** | Sistema de tickets completo | ✅ Completado |
| **Notificaciones** | Sistema de notificaciones | ✅ Completado |
| **Dashboard analytics** | Controlador de analytics con gráficos | ✅ Completado |
| **Ingest API** | Integraciones externas (Shopify, WooCommerce) | ✅ Completado |
| **Aprovisionamiento SaaS** | Alta de nuevos tenants | ✅ Completado |
| **Logging** | BetterStack (@logtail/node) | ✅ Completado |
| **Monitorización** | Sentry (@sentry/node) | ✅ Completado |
| **Log de auditoría** | AuditLog model en BD | ✅ Completado |
| **Seguridad HTTP** | Helmet, CORS, CSP, rate limiting, sanitización XSS | ✅ Completado |
| **Tests** | 69/69 pasando | ✅ Completado |

### 2.2 Frontend (Dashboard + Tienda)

- Dashboard administrativo completo
- Gestión de productos (CRUD) con imágenes
- Gestión de pedidos
- Gestión de clientes
- Analytics con gráficos (Recharts)
- Checkout con Stripe Elements
- Carrito de compras
- Registro y login de usuarios
- Tema oscuro "Neon" (TailwindCSS)

### 2.3 App Móvil (Expo / React Native)

| Pantalla | Estado |
|----------|--------|
| Login | ✅ Implementada |
| Registro | ✅ Implementada |
| Listado de productos | ✅ Implementada |
| Detalle de producto | ✅ Implementada |
| Carrito | ✅ Implementada |
| Checkout | ✅ Implementada |
| Confirmación de pedido | ✅ Implementada |
| Perfil de usuario | ✅ Implementada |
| Mis pedidos | ✅ Implementada |
| Detalle de pedido | ✅ Implementada |
| Reportes | ✅ Implementada |
| Crear reporte | ✅ Implementada |
| Detalle de reporte | ✅ Implementada |
| Sostenibilidad | ✅ Implementada |

### 2.4 Landing Page

- Landing page funcional (Astro SSR)


---

## 3. Funcionalidades Pendientes (Por Implementar)

### 3.1 Alta Prioridad

| Funcionalidad | Descripción | Estado | Notas |
|--------------|-------------|--------|-------|
| **Recuperación de contraseña** | Flujo completo: token de reset por email + expiración + consumo único | ⏳ Pendiente | No existe actualmente |
| **CSRF global** | Protección completa con cookies y tokens | ⏳ Pendiente | Existe helper pero no integrado globalmente |
| **Lint frontend** | Corrección de errores: unused vars, reglas de hooks | ⏳ Pendiente | `npm run lint` en frontend/ tiene muchos errores |

### 3.2 Media Prioridad

| Funcionalidad | Descripción | Estado | Notas |
|--------------|-------------|--------|-------|
| **Redis / Caché** | Sistema de caché para mejorar rendimiento | ⏳ Pendiente | No instalado ni implementado |
| **CI/CD** | GitHub Actions para integración y despliegue continuo | ⏳ Pendiente | No configurado |
| **Reviews y calificaciones** | Sistema de reviews para productos | ⏳ Pendiente | No existe modelo ni controller |
| **Cupones y descuentos** | Sistema de cupones y promociones | ⏳ Pendiente | No existe modelo ni controller |
| **2FA** | Autenticación de dos factores | ⏳ Pendiente | No implementado |
| **Auditoría multi-tenant** | Verificar filtrado por store_id en módulos secundarios | ⏳ Pendiente | Reportes, tickets, notificaciones, billing |

### 3.3 Baja Prioridad

| Funcionalidad | Descripción | Estado | Notas |
|--------------|-------------|--------|-------|
| **TypeScript** | Migración de JavaScript a TypeScript | ⏳ Pendiente | Proyecto en JS puro |
| **Suscripciones SaaS completas** | Planes SaaS por tenant con ciclo de cobro | ⏳ Incompleto | Stripe para e-commerce funciona; planes SaaS incompletos |
| **URLs firmadas para imágenes** | URLs de un solo uso o proxy autenticado | ⏳ Pendiente | Actualmente usa ?token= en URL |

---

## 4. Deuda Técnica Pendiente

### 4.1 Alta Prioridad

| Ítem | Descripción | Notas |
|------|-------------|-------|
| **Lint frontend** | Muchos errores de ESLint: unused vars, reglas de hooks, fast-refresh, no-undef en tests | Ejecutar `npm run lint` en frontend/ |
| **Audía de dependencias** | Ejecutar `npm audit` en raíz, backend y frontend | Documentar resultados para memoria TFG |
| **Scoping tenant secundario** | Verificar filtrado por store_id en reportes, tickets, notificaciones, billing | Módulos menos críticos |

### 4.2 Media Prioridad

| Ítem | Descripción | Notas |
|------|-------------|-------|
| **Cobertura de tests** | 69/69 pasan pero se puede ampliar por módulo | Para evidencias en memoria |
| **Documentación desalineada** | Actualizar docs que no coinciden con código real | Puertos, URLs, funcionalidades |

### 4.3 Baja Prioridad

| Ítem | Descripción | Notas |
|------|-------------|-------|
| **URLs firmadas imágenes** | Cambiar ?token= por URLs más seguras | Sin romper render en img |

---

## 5. Roadmap SaaS (Módulos Pendientes)

El archivo `ROADMAP/TODO.md` indica 4 módulos para profesionalizar la plataforma. El estado actual es:

### ✅ Módulo 1: Branding y Mensajes (Marketing)

- **Estado**: Completado
- **Objetivo**: Dejar de vender "código" y pasar a vender un "Servicio Gestionado"
- **Archivos**: Hero.jsx, Features.jsx, Pricing.jsx

### ⏳ Módulo 2: Dominios Personalizados (Custom Domains)

- **Estado**: Pendiente
- **Objetivo**: Permitir que `tienda-de-chef.com` apunte directamente a su tienda en NeonHub
- **Tareas**:
  1. Backend/Models/Store.js: Añadir campo custom_domain
  2. Backend/Middleware/tenantContext.js: Permitir búsqueda por req.headers.host
  3. Frontend/Components/TenantGuard.jsx: Soportar dominios externos

### ⏳ Módulo 3: Rutas Dinámicas (Custom Paths)

- **Estado**: Pendiente
- **Objetivo**: Cambiar /shop por /tienda o /dashboard por /admin-panel según el cliente
- **Archivos relacionados**: ROADMAP/03_rutas_personalizadas.md

### ⏳ Módulo 4: Panel de Control del Programador

- **Estado**: Pendiente
- **Objetivo**: Crear la interfaz para gestionar estas opciones manualmente
- **Archivos relacionados**: ROADMAP/04_panel_programador.md

---

## 6. Mejoras de Seguridad

### 6.1 Completadas (según docs)

- ✅ Secretos fuera del repo (solo .env.example)
- ✅ JWT sin fallback (obligatorio en producción)
- ✅ CORS restringido en producción (allowlist)
- ✅ /uploads no responde con Access-Control-Allow-Origin: *
- ✅ Logging no imprime datos sensibles
- ✅ CSP endurecido en producción
- ✅ Multi-tenancy reforzado con constraints e índices
- ✅ Tests de aislamiento multi-tenant pasando

### 6.2 Pendientes de Seguridad

| Ítem | Descripción | Prioridad |
|------|-------------|-----------|
| **CSRF completo** | Integrar helper CSRF como política global | Alta |
| **URLs de imágenes** | Cambiar ?token= por mecanismo más seguro | Alta |
| **Auditoría multi-tenant end-to-end** | Verificar 100% de rutas con filtrado por store_id | Media |
| **Cookie secure en producción** | sameSite=lax para subdominios | Media |
| **CSP más estricto** | Reducir unsafe-inline y unsafe-eval | Baja |
| **Actualizar docs de seguridad** | docs/SEGURIDAD.md con estado actual | Baja |

---

## 7. Checklist para Entrega del TFG

### 7.1 Requisitos Funcionales

- [x] Backend robusto con arquitectura SaaS multi-tenant
- [x] Frontend completo y funcional
- [x] App móvil con pantallas principales
- [x] Sistema de pagos (Stripe)
- [x] Documentación técnica
- [x] Sistema de seguridad implementado
- [x] Desplegado en VPS (producción real)
- [x] Tests automatizados (69/69 backend)

### 7.2 Pendiente para Entrega

- [ ] Corrección de lint en frontend
- [ ] Aumentar cobertura de tests (evidencias para memoria)
- [ ] Documentar auditoría de dependencias (npm audit)
- [ ] Explicar multi-tenancy con caso de prueba (2 tenants)
- [ ] Capturar y documentar: lint + tests + arquitectura

### 7.3 Documentación para Memoria

- [ ] Actualizar README.md con estado real
- [ ] Actualizar docs/ESTADO_ACTUAL.md si hay cambios
- [ ] Diagrama de arquitectura actualizado
- [ ] Capturas de pantalla del sistema en producción
- [ ] Documentar despliegue (PM2 + Nginx)
- [ ] Capturas de tests pasando
- [ ] Capturas de lint (antes y después de arreglar)

---

## 8. Recomendaciones de Priorización

### Para Terminar el MVP (Inmediato)

1. **Recuperación de contraseña**: Funcionalidad básica que falta
2. **Lint frontend**: Afecta la calidad del código y la presentación
3. **CSRF global**: Mejora la seguridad del sistema

### Para Mejorar el Proyecto

4. Auditoría multi-tenant en módulos secundarios
5. Aumentar cobertura de tests
6. Documentar auditoría de dependencias

### Para Profesionalizar (Post-TFG)

7. Redis/caché
8. CI/CD con GitHub Actions
9. Reviews y calificaciones de productos
10. Cupones y descuentos
11. 2FA
12. Dominios personalizados (Módulo 2 del Roadmap)
13. Rutas dinámicas (Módulo 3 del Roadmap)
14. Panel de control del programador (Módulo 4 del Roadmap)

---

## 9. Estructura del Proyecto (Referencia)

```
TrabajoFinalCursoDAM/
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
├── mobile/              # App móvil (Expo / React Native)

├── docs/                # Documentación técnica (~20 documentos)
├── ROADMAP/             # Roadmap SaaS
└── scripts/             # Scripts de gestión
```

---

## 10. Conclusión

El proyecto NeonHub se encuentra en un **estado avanzado**, con la mayoría de las funcionalidades principales implementadas y funcionando en producción. Para considerarlo "terminado" como Trabajo Final de Curso, las tareas principales pendientes son:

1. **Funcionalidad**: Implementar recuperación de contraseña
2. **Calidad**: Arreglar errores de lint en el frontend
3. **Seguridad**: Completar integración CSRF global
4. **Documentación**: Actualizar docs para reflejar el estado real

Los módulos del Roadmap (dominios personalizados, rutas dinámicas, panel de programador) son mejoras opcionales que pueden realizarse después de la entrega del TFG para continuar evolucionando la plataforma.

---

*Documento generado el 4 de mayo de 2026*
*Proyecto: NeonHub — Trabajo Final de Curso DAM*