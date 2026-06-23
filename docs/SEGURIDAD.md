# Informe de Seguridad - NeonHub

## Resumen Ejecutivo

Este documento detalla las medidas de seguridad implementadas en NeonHub para proteger contra vulnerabilidades comunes y garantizar un acceso seguro a los recursos.

**Fecha de última actualización:** 1 de junio de 2026

---

## Checklist de Estado de Seguridad

### ✅ IMPLEMENTADO

#### Correcciones Críticas Aplicadas (Junio 2026)
- [x] CSRF: middleware `validateCSRF` ahora activo globalmente en `app.js` (antes: disponible pero nunca activado)
- [x] Hashing de contraseñas en landing: migrado de SHA-256 → **bcrypt** (cost factor 12, bcryptjs)
- [x] `owner_password_hash` eliminado de los metadatos de Stripe en sesiones de checkout
- [x] Endpoint `/health` ya no expone `process.memoryUsage()` públicamente
- [x] `unhandledRejection` ya no hace `process.exit(1)` incondicionalmente — degradación elegante
- [x] Scheduler de sostenibilidad re-habilitado con NULL guards y manejo de errores robusto
- [x] Ficheros `.env.example` creados para todos los subproyectos (backend, frontend, landing)
- [x] `.gitignore` actualizado para excluir `**/*.db`
- [x] Ruta hardcodeada en `ecosystem.neonhub.config.js` → ahora usa `__dirname`
- [x] Workflows CI/CD creados para backend, frontend y landing (GitHub Actions)

#### Autenticación y Autorización
- [x] JWT con verificación de firma y expiración
- [x] Middleware authenticateToken en todas las rutas protegidas
- [x] AdminRoute component para protección frontend
- [x] requireRoleLevel(80) en rutas de administrador
- [x] requireAdmin middleware para operaciones críticas
- [x] Verificación de usuario activo en cada request

#### Validación de Datos
- [x] Middleware de validación en endpoints críticos
- [x] Sanitización de inputs en formularios
- [x] Validación de tipos de archivo en uploads
- [x] Límites de tamaño en uploads (5MB para imágenes)

#### Protección contra Ataques
- [x] Rate limiting básico en rutas de autenticación
- [x] CORS configurado correctamente
- [x] Headers de seguridad (helmet.js)
- [x] Protección contra SQL injection (Sequelize ORM)

### 🔄 EN PROGRESO

#### Multi-tenancy Security
- [ ] Aislamiento completo de datos por tenant
- [ ] Validación de permisos cross-tenant
- [ ] Auditoría de accesos inter-tenant

#### Monitorización
- [ ] Logging de eventos de seguridad
- [ ] Alertas automáticas por intentos de acceso maliciosos
- [ ] Dashboard de métricas de seguridad

### ❌ PENDIENTE

#### Auditoría y Compliance
- [ ] Auditoría de código por terceros
- [ ] Certificación SOC 2 Type II
- [ ] Compliance GDPR completo
- [ ] Penetration testing

#### Seguridad Avanzada
- [ ] 2FA para usuarios administradores
- [ ] Encriptación de datos sensibles en BD
- [ ] Backup seguro y encrypted
- [ ] Disaster recovery plan

---

## 1. Control de Acceso Basado en Roles (RBAC)

### 1.1 Frontend - Protección de Rutas

Se han implementado tres componentes de protección de rutas:

#### ProtectedRoute
- **Propósito:** Verifica que el usuario esté autenticado
- **Ubicación:** `frontend/src/components/ProtectedRoute.jsx`
- **Uso:** Protege todas las rutas que requieren autenticación
- **Acción:** Redirige a `/shop` si no hay sesión válida

#### AdminRoute
- **Propósito:** Verifica que el usuario tenga privilegios de administrador
- **Ubicación:** `frontend/src/components/AdminRoute.jsx`
- **Requisitos:** Usuario con rol de nivel ≥ 80 o roles "admin"/"superadmin"
- **Acción:** Muestra página de "Acceso Denegado" si el nivel es insuficiente

#### RoleProtectedRoute
- **Propósito:** Protección flexible basada en nivel de rol específico
- **Ubicación:** `frontend/src/components/RoleProtectedRoute.jsx`
- **Uso:** Para rutas con requisitos de nivel personalizados

### 1.2 Backend - Middleware de Autenticación

Ubicación: `backend/src/middleware/auth.js`

#### Middlewares Disponibles:

1. **authenticateToken**
   - Verifica la validez del token JWT
   - Carga información del usuario y roles
   - Verifica que el usuario esté activo

2. **requireRoleLevel(minLevel)**
   - Requiere nivel mínimo de rol
   - Ejemplo: `requireRoleLevel(80)` para administradores

3. **requireAdmin**
   - Específicamente para privilegios de administrador
   - Verifica nivel ≥ 80 o rol admin/superadmin

4. **requirePermission(permission)**
   - Verifica permisos específicos
   - Soporta múltiples permisos con lógica OR

5. **requireOwnershipOrAdmin**
   - Permite acceso al propietario del recurso o administrador

### 1.3 Protección de Rutas Implementada

#### Dashboard (Admin only - Nivel 80+)
```javascript
// backend/src/routes/dashboard.js
router.use(authenticateToken);
router.use(requireRoleLevel(80));
```

Todas las rutas de dashboard requieren:
- Autenticación válida
- Nivel de rol ≥ 80

#### Órdenes (Admin only - Nivel 80+)
```javascript
// backend/src/routes/orders.js
router.get('/', authenticateToken, requireRoleLevel(80), ...);
router.patch('/:id/status', authenticateToken, requireRoleLevel(80), ...);
router.put('/:id', authenticateToken, requireRoleLevel(80), ...);
router.delete('/:id', authenticateToken, requireRoleLevel(80), ...);
```

#### Usuarios (Admin/Variable)
- GET /users/profile - Cualquier usuario autenticado
- GET /users - Nivel 60+
- POST /users - Requiere permiso de creación de usuarios
- PUT/PATCH/DELETE - Administrador

#### Productos
- Lectura: Requiere permiso `products.read`
- Creación: Requiere permiso `products.create`
- Actualización: Requiere permiso `products.update`
- Eliminación: Requiere permiso `products.delete`

---

## 2. Sanitización de Inputs y Prevención de Inyecciones

### 2.1 Frontend - Utilidades de Seguridad

Ubicación: `frontend/src/utils/security.js`

#### Funciones de Sanitización:

1. **sanitizeHTML(html)**
   - Elimina código HTML peligroso
   - Previene ataques XSS

2. **escapeHTML(str)**
   - Escapa caracteres especiales HTML
   - Convierte `<`, `>`, `&`, `"`, `'`, `/` a entidades HTML

3. **sanitizeInput(input)**
   - Elimina palabras clave SQL peligrosas
   - Elimina scripts inline y eventos JavaScript

4. **sanitizeFilename(filename)**
   - Previene ataques de directory traversal
   - Elimina caracteres especiales peligrosos

5. **sanitizeObject(obj)**
   - Sanitiza recursivamente objetos
   - Previene prototype pollution

#### Funciones de Validación:

- **isValidEmail(email)** - Valida formato de email
- **validatePassword(password)** - Verifica fortaleza de contraseña
- **isValidURL(url)** - Valida URLs con protocolos seguros
- **isValidJWT(token)** - Verifica formato básico de JWT

#### Utilidades Adicionales:

- **rateLimit(func, delay)** - Rate limiting del lado del cliente
- **debounce(func, wait)** - Debouncing para validación de inputs
- **hasRequiredLevel/Role(user, level/role)** - Verificación de permisos

### 2.2 Backend - Middleware de Seguridad

Ubicación: `backend/src/middleware/security.js`

#### Sanitización de Inputs:

1. **sanitizeInput**
   - Middleware que sanitiza automáticamente:
     - req.body
     - req.query
     - req.params
   - Escapa caracteres HTML peligrosos
   - Previene prototype pollution

2. **validateSQLParams**
   - Detecta patrones SQL peligrosos:
     - SELECT, INSERT, UPDATE, DELETE, DROP, etc.
     - Comentarios SQL: `--`, `/*`, `*/`
     - Comandos del sistema: `xp_`, `sp_`
   - Rechaza requests con código 400 si detecta amenazas

#### Validación de Archivos:

**validateFileUpload(file)**
- Extensiones permitidas: .jpg, .jpeg, .png, .gif, .webp
- MIME types permitidos: image/jpeg, image/png, image/gif, image/webp
- Tamaño máximo: 10MB
- Sanitiza nombres de archivo contra directory traversal

#### Validación de Datos:

- **validateEmail(email)** - Usando librería validator.js
- **validatePassword(password)** - Requisitos:
  - Mínimo 8 caracteres
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
- **isValidUUID(uuid)**
- **isValidInteger(value)**
- **isValidURL(url)** - Solo http/https con protocolo obligatorio

---

## 3. Rate Limiting

### 3.1 Backend - Rate Limiting por IP

Implementación en `backend/src/middleware/security.js`:

```javascript
rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000)
```

**Configuración:**
- **Desarrollo:** 2000 requests por 15 minutos
- **Producción:** 200 requests por 15 minutos
- **Excepción:** Health check endpoint `/api/health`

**Respuesta al exceder el límite:**
```json
{
  "error": "Demasiadas solicitudes. Por favor, intente más tarde.",
  "retryAfter": 900 // segundos hasta reset
}
```

### 3.2 Limpieza Automática

El sistema limpia automáticamente los contadores de IPs inactivos cada 60 segundos.

---

## 4. Headers de Seguridad

### 4.1 Middleware setSecurityHeaders

Ubicación: `backend/src/middleware/security.js`

Headers implementados:

1. **X-Frame-Options: DENY**
   - Previene clickjacking
   - No permite que la página se cargue en iframes

2. **X-Content-Type-Options: nosniff**
   - Previene MIME type sniffing
   - El navegador respeta el Content-Type del servidor

3. **X-XSS-Protection: 1; mode=block**
   - Activa protección XSS del navegador
   - Bloquea la página si detecta XSS

4. **Referrer-Policy: strict-origin-when-cross-origin**
   - Controla información de referrer
   - Solo envía origen en requests cross-origin

5. **Content-Security-Policy**
   - Controla recursos que puede cargar la página:
     - Scripts: self, unsafe-inline, unsafe-eval
     - Estilos: self, unsafe-inline
     - Imágenes: self, data:, https:
     - Fuentes: self, data:
     - Conexiones: self
     - Frames: none

6. **X-Powered-By: (removed)**
   - Elimina header que revela tecnología del servidor

### 4.2 Helmet.js

Configuración adicional en `backend/src/app.js`:

```javascript
app.use(helmet({
  contentSecurityPolicy: false, // CSP personalizado
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false // Permite imágenes cross-origin
}));
```

---

## 5. Protección CORS

### 5.1 Configuración CORS

Ubicación: `backend/src/app.js`

```javascript
const corsOptions = {
  origin: true, // Desarrollo: permite todos los orígenes
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};
```

**Recomendación para Producción:**
Cambiar `origin: true` por una lista específica de dominios permitidos:

```javascript
origin: ['https://tudominio.com', 'https://www.tudominio.com']
```

---

## 6. Validación de Tamaño de Payload

### 6.1 Límites Configurados

```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### 6.2 Middleware validatePayloadSize

Función personalizada que rechaza payloads que excedan el tamaño configurado:

```javascript
validatePayloadSize('10mb')
```

Respuesta al exceder:
```json
{
  "error": "Payload demasiado grande",
  "maxSize": "10mb"
}
```

---

## 7. Prevención de Ataques Comunes

### 7.1 SQL Injection

**Protección Implementada:**

1. **Sequelize ORM**
   - Todas las consultas usan Sequelize
   - Consultas parametrizadas automáticamente
   - No hay SQL raw sin escapar

2. **validateSQLParams Middleware**
   - Detecta patrones SQL peligrosos
   - Doble capa de protección

**Ejemplo de Consulta Segura:**
```javascript
// ✅ SEGURO - Sequelize escapa automáticamente
User.findOne({ where: { email: userInput } });

// ❌ PELIGROSO - Nunca usar (no implementado)
sequelize.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

### 7.2 XSS (Cross-Site Scripting)

**Protección Implementada:**

1. **Sanitización de Inputs (Frontend y Backend)**
   - Todos los inputs se escapan antes de guardar
   - Headers CSP restringen scripts inline

2. **escapeHTML en Renderizado**
   - React escapa automáticamente contenido en JSX
   - Para contenido HTML usar `sanitizeHTML()`

**Ejemplo de Uso Seguro:**
```javascript
// ✅ SEGURO
<div>{escapeHTML(userContent)}</div>

// ❌ PELIGROSO
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### 7.3 CSRF (Cross-Site Request Forgery)

**Protección Implementada:**

1. **SameSite Cookies**
   - Cookies con atributo SameSite

2. **Token CSRF (ACTIVO desde Junio 2026)**
   - Middleware `validateCSRF` activado **globalmente** en `app.js`
   - Aplica a todas las peticiones no-GET excepto webhooks y rutas con API key
   - El frontend debe enviar el header `x-csrf-token` en todas las peticiones de mutación

```javascript
// Backend (app.js) — middleware global
app.use(validateCSRF);

// Frontend — incluir en todas las peticiones mutantes
headers: { 'x-csrf-token': csrfToken }
```

### 7.4 Prototype Pollution

**Protección Implementada:**

```javascript
// sanitizeObject previene:
if (key === '__proto__' || 
    key === 'constructor' || 
    key === 'prototype') {
  continue; // Salta propiedades peligrosas
}
```

### 7.5 Directory Traversal

**Protección Implementada:**

```javascript
// sanitizeFilename elimina:
filename.replace(/\.\./g, '')  // Elimina ../
         .replace(/[/\\]/g, '') // Elimina separadores de ruta
```

---

## 8. Gestión de Sesiones y Tokens

### 8.1 JWT (JSON Web Tokens)

**Configuración:**
- **Secret:** Variable de entorno `JWT_SECRET` (sin fallback — falla en arranque si falta)
- **Access token:** Vida corta, enviado como Bearer en cabecera Authorization
- **Refresh token:** Vida larga, almacenado en **cookie httpOnly** (no accesible desde JS)
- **Algoritmo:** HS256

**Validación de Token:**
1. Verificación de firma
2. Verificación de expiración
3. Verificación de usuario activo
4. Carga de roles y permisos

### 8.2 Gestión de Sesión

**Access token:** Almacenado en memoria en el frontend (no en localStorage).

**Refresh token:** En cookie httpOnly, SameSite. No accesible desde JavaScript.

**Rotación:** El endpoint `/api/auth/refresh` valida la cookie httpOnly y emite un nuevo access token.

**Logout:** Invalida el refresh token en servidor y limpia la cookie.

---

## 9. Logging y Auditoría

### 9.1 Morgan HTTP Logger

**Desarrollo:**
```javascript
morgan('dev') // Logs cortos y coloridos
```

**Producción:**
```javascript
morgan('combined') // Logs completos en formato Apache
```

### 9.2 Modelo de Auditoría

Ubicación: `backend/src/models/AuditLog.js`

**Campos Registrados:**
- user_id
- action (CREATE, UPDATE, DELETE, etc.)
- resource_type
- resource_id
- ip_address
- user_agent
- details (JSON con cambios)
- created_at

---

## 10. Manejo de Errores

### 10.1 Error Handler Global

Ubicación: `backend/src/middleware/errorHandler.js`

**Características:**
- Captura todos los errores no manejados
- Oculta detalles de implementación en producción
- Devuelve mensajes de error consistentes
- Incluye timestamp y código de error

**Formato de Respuesta:**
```json
{
  "success": false,
  "message": "Mensaje de error amigable",
  "error": {
    "code": "ERROR_CODE",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 10.2 Validación de JSON

```javascript
verify: (req, res, buf) => {
  try {
    JSON.parse(buf);
  } catch (e) {
    res.status(400).json({
      success: false,
      message: 'JSON inválido',
      error: { code: 'INVALID_JSON' }
    });
  }
}
```

---

## 11. Recomendaciones para Producción

### 11.1 Variables de Entorno Críticas

```bash
# JWT
JWT_SECRET=<genera-clave-segura-larga-aqui>
JWT_EXPIRATION=24h

# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce
DB_USER=ecommerce_user
DB_PASSWORD=<contraseña-segura>

# Modo
NODE_ENV=production
```

### 11.2 CORS en Producción

CORS ya está endurecido en producción (`NODE_ENV=production`): utiliza una allowlist con los dominios del dominio base y subdominios de NeonHub. En desarrollo es permisivo para facilitar el trabajo local.

Ver `backend/src/app.js` para la configuración exacta.

### 11.3 Rate Limiting Estricto

Reducir límites en producción si se detecta abuso:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Reducir a 100 en producción
  // ...
});
```

### 11.4 HTTPS Obligatorio

1. **Obtener certificado SSL:**
   - Let's Encrypt (gratuito)
   - Cloudflare SSL

2. **Forzar HTTPS:**
```javascript
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

### 11.5 Actualizar Dependencias

```bash
# Auditar vulnerabilidades
npm audit

# Actualizar paquetes
npm update

# Actualizar a última versión (cuidado con breaking changes)
npm audit fix
```

### 11.6 Backup y Recuperación

1. **Backups Automáticos de BD:**
   - Ubicación: `backend/backups/`
   - Frecuencia recomendada: Diaria

2. **Logs:**
   - Ubicación: `backend/logs/`
   - Rotación de logs recomendada

### 11.7 Monitoreo (ya implementado)

- **PM2** — gestión de procesos Node.js en producción
- **Sentry (`@sentry/node`)** — tracking de errores en producción (`instrument.js`)
- **BetterStack (`@logtail/node`)** — logging centralizado en producción
- **Morgan** — logging HTTP (dev: `dev`, prod: `combined`)

---

## 12. Testing de Seguridad

### 12.1 Pruebas Recomendadas

1. **Autenticación:**
   - ✅ Usuario sin token no puede acceder a rutas protegidas
   - ✅ Token expirado rechazado
   - ✅ Token inválido rechazado
   - ✅ Cliente no puede acceder a /dashboard
   - ✅ Cliente no puede acceder a /api/dashboard/*

2. **Autorización:**
   - ✅ Cliente (nivel 1-20) no puede modificar productos
   - ✅ Cliente no puede ver lista de usuarios
   - ✅ Usuario solo puede ver/modificar sus propios datos
   - ✅ Admin puede acceder a todo

3. **Validación de Inputs:**
   - ✅ SQL injection bloqueado
   - ✅ XSS bloqueado
   - ✅ Directory traversal bloqueado
   - ✅ Prototype pollution bloqueado

4. **Rate Limiting:**
   - ✅ Exceder límite devuelve 429
   - ✅ Contador se resetea después del tiempo configurado

### 12.2 Scripts de Prueba

Ubicación: `backend/test-*.sh`

```bash
# Probar login
./test-login.sh

# Probar funciones de perfil
./test-profile-functions.sh
```

---

## 13. Vulnerabilidades Conocidas y Mitigadas

| Vulnerabilidad | Severidad | Mitigación |
|----------------|-----------|------------|
| Acceso no autorizado a dashboard | Alta | ✅ AdminRoute + requireRoleLevel(80) |
| SQL Injection | Alta | ✅ Sequelize ORM + validateSQLParams |
| XSS | Alta | ✅ sanitizeHTML + escapeHTML + CSP |
| CSRF | Media | ✅ Middleware global activo en app.js |
| Clickjacking | Media | ✅ X-Frame-Options: DENY |
| Directory Traversal | Media | ✅ sanitizeFilename |
| Prototype Pollution | Media | ✅ sanitizeObject |
| Rate Limiting Abuse | Media | ✅ express-rate-limit |
| MIME Sniffing | Baja | ✅ X-Content-Type-Options |

**Leyenda:**
- ✅ Totalmente mitigado
- ⚠️ Parcialmente mitigado
- ❌ No mitigado

---

## 14. Contacto y Reporte de Vulnerabilidades

Si encuentras una vulnerabilidad de seguridad, por favor:

1. **NO** la hagas pública
2. Envía un reporte detallado a: security@ecommerce.com
3. Incluye:
   - Descripción de la vulnerabilidad
   - Pasos para reproducirla
   - Impacto potencial
   - Sugerencias de mitigación (opcional)

---

## 15. Changelog de Seguridad

### Noviembre 2025 — Hardening inicial
- Añadido AdminRoute component
- Protegido /dashboard con requireRoleLevel(80)
- Creado utils/security.js con funciones de sanitización
- Creado middleware/security.js con validaciones backend
- Implementado validateSQLParams, setSecurityHeaders
- Añadido rate limiting por IP
- Instalada librería validator.js

### Marzo 2026 — Hardening avanzado (previo a TFG)
- Eliminados ficheros `.env` y logs del control de versiones
- Secrets sacados de PM2 config a variables de entorno
- JWT sin fallback: falla explícitamente si falta JWT_SECRET
- CORS endurecido en producción (allowlist + subdominios)
- CSP más estricto en producción (elimina `unsafe-eval`)
- Refresh token en cookie httpOnly (no en localStorage)
- Multi-tenancy reforzado en BD: constraints e índices por tenant (Product, Order, Customer, Category)
- Permisos RBAC normalizados: soporta permisos en JSON con generación tipo `recurso.accion`
- Sanitización extra de textos en productos (elimina `javascript:` y handlers `on...=`)
- Tests de aislamiento multi-tenant añadidos (69/69 pasando)

### Junio 2026 — Security hardening session
- CSRF: middleware `validateCSRF` activado globalmente en `app.js`
- Contraseñas landing: SHA-256 → bcrypt (bcryptjs, cost factor 12)
- Stripe checkout: eliminado `owner_password_hash` de los metadatos
- `/health`: eliminada exposición de `process.memoryUsage()`
- `unhandledRejection`: eliminado `process.exit(1)` incondicional → degradación elegante
- Scheduler sostenibilidad: re-habilitado con NULL guards y manejo de errores robusto
- `.env.example` creados para backend, frontend y landing
- `.gitignore` actualizado para excluir `**/*.db`
- `ecosystem.neonhub.config.js`: ruta hardcodeada reemplazada por `__dirname`
- GitHub Actions CI/CD: workflows creados para backend, frontend y landing

---

## Mejoras Aplicadas — Junio 2026

Resumen de todas las correcciones de seguridad aplicadas en la sesión de hardening de junio de 2026:

| # | Problema | Severidad | Solución Aplicada |
|---|----------|-----------|-------------------|
| 1 | `validateCSRF` existía pero nunca se activó | Alta | Activado como middleware global en `app.js` para todas las rutas no-GET (excepto webhooks y rutas con API key) |
| 2 | Contraseñas de landing hasheadas con SHA-256 (sin sal, rápido, vulnerable a fuerza bruta) | Alta | Migrado a **bcrypt** con `bcryptjs`, cost factor 12 (~250ms/hash) |
| 3 | `owner_password_hash` enviado en metadatos de Stripe | Alta | Eliminado completamente de los metadatos de sesión de checkout de Stripe |
| 4 | `/health` exponía `process.memoryUsage()` públicamente | Media | Eliminado del endpoint público; disponible solo en `/api/admin/health` |
| 5 | `unhandledRejection` hacía `process.exit(1)` incondicionalmente | Media | Cambiado a degradación elegante con logging sin terminar el proceso |
| 6 | Scheduler de sostenibilidad crasheaba con valores NULL y estaba deshabilitado | Media | Re-habilitado con NULL guards exhaustivos y manejo de errores robusto |
| 7 | Faltaban ficheros `.env.example` en todos los subproyectos | Media | Creados `.env.example` para backend, frontend y landing |
| 8 | `.gitignore` no excluía ficheros `.db` (SQLite/bases de datos locales) | Media | Añadida regla `**/*.db` al `.gitignore` raíz |
| 9 | Ruta hardcodeada en `ecosystem.neonhub.config.js` | Baja | Reemplazada por `__dirname` para portabilidad |
| 10 | Sin pipelines CI/CD para validación automática | Baja | Workflows de GitHub Actions creados para backend, frontend y landing |

---

## Conclusión

NeonHub cuenta con múltiples capas de seguridad que protegen contra las vulnerabilidades más comunes. Sin embargo, la seguridad es un proceso continuo que requiere:

1. **Actualizaciones regulares** de dependencias
2. **Monitoreo constante** de logs y actividad
3. **Auditorías periódicas** de código y configuración
4. **Testing** continuo de nuevas funcionalidades
5. **Capacitación** del equipo en buenas prácticas

**La seguridad es responsabilidad de todos.**
