# NeonHub — Pendientes y Checklist de Seguridad (para TFG)

Este documento resume lo que falta o conviene ajustar antes de entregar el TFG, con especial foco en **seguridad**, coherencia del proyecto y “cosas que suelen pedir” en una memoria de 2º DAM.

## 0. Estado tras esta revisión (17/03/2026)

### 0.1 Hecho (aplicado en el repo)

- [x] Eliminados ficheros con secretos y credenciales del árbol del proyecto: `backend/.env`, `frontend/.env`, logs y `CREDENCIALES_CLIENTES.md`.
- [x] Añadido ignore global para evitar volver a versionar secretos/logs/subidas: [.gitignore](file:///home/sergio/TrabajoFinalCursoDAM/.gitignore).
- [x] Sustituidas claves reales de Stripe en el ejemplo de entorno por placeholders: [backend/.env.example](file:///home/sergio/TrabajoFinalCursoDAM/backend/.env.example).
- [x] Añadido ejemplo de variables para frontend: [frontend/.env.example](file:///home/sergio/TrabajoFinalCursoDAM/frontend/.env.example).
- [x] Eliminados secretos hardcodeados en configuración de PM2 (ahora se leen de variables de entorno): [ecosystem.neonhub.config.js](file:///home/sergio/TrabajoFinalCursoDAM/ecosystem.neonhub.config.js).
- [x] Eliminado password por defecto “concreto” en config de BD (ya no hay un secreto embebido): [database.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/config/database.js).
- [x] JWT sin fallback: si falta `JWT_SECRET` se devuelve error de servidor y, en producción, se exige en el arranque: [auth.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/auth.js), [imageAuth.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/imageAuth.js), [server.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/server.js).
- [x] CORS endurecido en producción (allowlist + subdominios del dominio base), manteniendo dev permisivo: [app.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/app.js).
- [x] `/uploads` deja de responder con `Access-Control-Allow-Origin: *` y refleja origen solo si está permitido: [app.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/app.js).
- [x] Logging: el filtro SQL ya no imprime parte del payload bloqueado en logs: [security.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/security.js).
- [x] CSP más estricto en producción (quita `unsafe-eval`): [security.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/security.js).
- [x] Multi-tenancy reforzado en BD (constraints e índices por tenant):
  - Productos: `store_id` obligatorio + unicidad por tenant de `sku` y `slug`: [Product.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/models/Product.js).
  - Pedidos: `store_id` obligatorio + unicidad por tenant de `order_number`: [Order.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/models/Order.js).
  - Customers: `store_id` obligatorio + unicidades por tenant (email/código): [Customer.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/models/Customer.js).
  - Categorías: unicidad por tenant de `name` además de `slug`: [Category.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/models/Category.js).
- [x] Multi-tenancy en API (lecturas/filtrado y compatibilidad de búsqueda):
  - Categorías públicas sin fugas: si no hay tenant solo devuelve globales, si hay tenant devuelve (tenant + global): [categoryController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/categoryController.js).
  - Búsquedas compatibles con SQLite en tests (evita `ILIKE`): [productController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/productController.js), [categoryController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/categoryController.js).
- [x] Permisos de roles normalizados: soporta roles con permisos en objeto JSON y genera permisos tipo `recurso.accion`: [auth.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/auth.js).
- [x] Sanitización extra de textos en productos (XSS): elimina `javascript:` y handlers `on...=` además de escapar HTML: [productController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/productController.js).
- [x] Tests backend corregidos/actualizados: `npm test -- --runInBand` pasa (69/69).

### 0.2 Pendiente (no aplicado aún / requiere trabajo adicional)

- [ ] Sustituir `?token=` en URLs de imágenes por un mecanismo más seguro (URLs firmadas de un solo uso, o proxy autenticado) sin romper el render en `<img>`.
- [ ] Implementar CSRF de forma completa si se mantienen cookies (ahora existe helper, pero no está integrado como política global).
- [ ] Auditoría completa “end-to-end” de todas las rutas/módulos para confirmar filtrado por `store_id` en el 100% de queries (hecho en productos/categorías/constraints y tests de aislamiento, pendiente revisar módulos menos críticos como reportes/tickets/notificaciones/billing si aplican a tenant).
- [ ] Arreglar todos los errores de lint del frontend (actualmente son muchos y hay también reglas de hooks).
- [ ] Aumentar cobertura en backend para adjuntar evidencias en la memoria del TFG (los tests actuales pasan, pero se puede ampliar por módulo).
- [ ] Ejecutar y documentar auditorías de dependencias (`npm audit`) y plan de mitigación.

## 1. Hallazgos críticos (cambiar sí o sí)

### 1.1 Secretos/credenciales dentro del repo

Riesgo: fuga de credenciales (BD, JWT, Stripe, claves internas) por estar en ficheros versionados o logs.

Detectado:

- Ficheros `.env` dentro de `backend/` (y `frontend/`) presentes en el repo.
- Logs `.log` dentro del repo (carpetas `logs/` y similares).
- Configuración PM2 con secretos hardcodeados.

Qué hacer:

- Eliminar de control de versiones los `.env` reales y dejar solo `.env.example`.
- Añadir a `.gitignore` (si no está) `**/.env`, `**/*.log`, `logs/`, `backend/uploads/` (si no se quieren commitear recursos generados).
- Mover secretos hardcodeados de ficheros de configuración a variables de entorno (y documentarlas en `.env.example`).

Ubicaciones relevantes:

- [ecosystem.neonhub.config.js](file:///home/sergio/TrabajoFinalCursoDAM/ecosystem.neonhub.config.js)
- [database.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/config/database.js)
- `.env` en `backend/` y `frontend/`
- `logs/` en raíz y dentro de subproyectos

### 1.2 Valores “por defecto” inseguros en autenticación

Riesgo: si falta una variable de entorno, se aceptan tokens firmados con una clave débil/conocida.

Detectado:

- Fallback de `JWT_SECRET` en middleware de autenticación.
- Tokens en querystring (`?token=`) para imágenes (se filtra por logs, historial, Referer, etc.).

Qué hacer:

- Hacer obligatorio `JWT_SECRET` (sin fallback) y fallar al arrancar si falta.
- Evitar `?token=` y usar cabeceras (o URLs firmadas de un solo uso con expiración corta si es imprescindible).

Ubicaciones relevantes:

- [auth.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/auth.js)
- [imageAuth.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/imageAuth.js)

### 1.3 CORS demasiado permisivo

Riesgo: exposición innecesaria a llamadas cross-origin (especialmente si se usan cookies).

Detectado:

- CORS con `origin: true` (acepta cualquier origin) en el backend.
- `Access-Control-Allow-Origin: *` para `/uploads`.

Qué hacer:

- Restringir CORS en producción a una lista blanca (`FRONTEND_URL`, `LANDING_URL`, dominios tenant).
- Para `/uploads`, servir desde el mismo dominio o permitir solo orígenes esperados.

Ubicación relevante:

- [app.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/app.js)

## 2. Seguridad (pendientes recomendados para “nivel TFG”)

### 2.1 Multi-tenancy: garantías de aislamiento

Riesgo: fuga de datos entre empresas/tiendas.

Qué revisar/añadir:

- Comprobar que todas las rutas sensibles filtran por `store_id` (o el contexto tenant) y no permiten acceder a recursos de otra tienda.
- Auditar endpoints que aceptan `X-Store-ID` o API keys, y exigir autenticación/roles adecuados para acciones críticas.

Estado (resumen):

- Productos: OK (store obligatorio + filtros + unicidad por tenant + sanitización) — [Product.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/models/Product.js), [productController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/productController.js)
- Categorías: OK (solo global sin tenant; global+tenant con tenant) — [categoryController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/categoryController.js)
- Carrito: OK (tests de aislamiento pasan) — [cart-tenant-isolation.test.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/tests/integration/cart-tenant-isolation.test.js)
- Pagos: OK (test de aislamiento pasa) — [payment-tenant-isolation.test.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/tests/integration/payment-tenant-isolation.test.js)
- Público (tenant requerido): OK (tests pasan) — [public-tenant-context.test.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/tests/integration/public-tenant-context.test.js), [certifications-tenant-context.test.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/tests/integration/certifications-tenant-context.test.js)
- Middleware de aislamiento por subdominio: OK (tests pasan) — [tenant-isolation.test.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/tests/integration/tenant-isolation.test.js)

Ubicaciones relevantes:

- [tenantContext.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/tenantContext.js)
- [storeMiddleware.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/storeMiddleware.js)
- [auth.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/auth.js)

### 2.2 Cookies/CSRF

Contexto:

- Se usa cookie httpOnly para refresh token en el login.

Qué revisar/añadir:

- En producción, cookie `secure: true` y considerar `sameSite=lax` si se usa el flujo con subdominios y redirecciones.
- Si se usan cookies para sesión/refresh, añadir protección CSRF real (token por sesión y verificación) para endpoints de estado.

Ubicación relevante:

- [authController.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/controllers/authController.js)

### 2.3 Cabeceras de seguridad y CSP

Detectado:

- Helmet con CSP desactivado, pero se añade un CSP manual que permite `unsafe-inline`/`unsafe-eval`.

Qué revisar:

- Ajustar CSP para reducir `unsafe-inline` y `unsafe-eval` en producción.
- Validar que `connect-src` cubre los orígenes reales (API, websockets, etc.).

Ubicaciones relevantes:

- [app.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/app.js)
- [security.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/security.js)

### 2.4 Logging: no registrar datos sensibles

Riesgo: filtrado de tokens/datos personales por logs.

Qué revisar:

- Evitar logs que impriman valores de entradas bloqueadas o tokens (aunque sea “solo parte”).
- Evitar commitear logs al repo.

Ubicación relevante:

- [security.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/middleware/security.js)

### 2.5 Dependencias y auditoría

Qué hacer:

- Ejecutar auditorías (npm audit) y corregir vulnerabilidades críticas/altas si aparecen.
- Fijar versiones y actualizar dependencias de seguridad si es posible.

## 3. Calidad y verificación (lo que suele sumar en la memoria)

### 3.0 Estado actual de checks (17/03/2026)

- Backend: `npm test -- --runInBand` pasa (tests de seguridad + aislamiento tenant + integración auth + unit).
- Frontend: `npm run lint` sigue reportando muchos errores (unused vars, reglas de hooks, fast-refresh only-export-components, no-undef en tests, etc.).

### 3.1 Tests automatizados mínimos

Objetivo razonable para TFG:

- Backend: tests de login/refresh + 1 flujo de pedidos + 1 flujo de permisos.
- Frontend: tests de 2–3 componentes críticos (login, carrito, checkout) y 1 test de integración de navegación.

Pista:

- Backend ya tiene Jest configurado.
- Frontend ya tiene Vitest configurado.

### 3.2 Lint/estándares

Qué hacer:

- Dejar `npm run lint` en frontend y, si se desea, añadir ESLint también al backend (opcional si no existe).

## 4. Coherencia y “higiene” de proyecto (pendiente importante)

### 4.1 Documentación desalineada con el código

Detectado:

- Puertos/URLs descritos en documentación que no coinciden con configs actuales.
- Funcionalidades marcadas como “pendiente” en docs pero presentes en el código (ej.: refresh token).

Qué hacer:

- Actualizar la documentación que vas a usar en la memoria del TFG para que refleje el estado real del repo.

Ejemplos de referencias a revisar:

- [README.md](file:///home/sergio/TrabajoFinalCursoDAM/README.md)
- [FUNCIONALIDADES_PENDIENTES.md](file:///home/sergio/TrabajoFinalCursoDAM/docs/FUNCIONALIDADES_PENDIENTES.md)
- [server.js](file:///home/sergio/TrabajoFinalCursoDAM/backend/src/server.js)
- [vite.config.js](file:///home/sergio/TrabajoFinalCursoDAM/frontend/vite.config.js)

## 5. Checklist rápido (para entregar)

- Secretos fuera del repo (solo `.env.example` y sin logs en Git).
- `JWT_SECRET` y `JWT_REFRESH_SECRET` obligatorios y rotados.
- CORS restringido en producción.
- Explicar multi-tenancy y demostrar aislamiento con un caso de prueba (2 tenants).
- Ejecutar (y capturar en la memoria) lint + tests.
- Explicar despliegue (PM2 + Nginx) y diagrama simple de arquitectura.
