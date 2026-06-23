# Deployment — NeonHub (producción)

Documentación del despliegue real del proyecto en el VPS con PM2.

> **Nota de seguridad:** Tras el commit `314ff295` las credenciales que estaban hardcodeadas en `docker-compose.yml` y `ecosystem.neonhub.config.js` han sido eliminadas. Si has clonado el repo antes de esa fecha, **rota las contraseñas de las bases de datos y el JWT_SECRET** en el VPS antes del próximo arranque.

---

## Infraestructura actual

| Componente | Solución | Notas |
|------------|---------|-------|
| Servidor | VPS Linux | `/home/sergio/TrabajoFinalCursoDAM` |
| Gestor de procesos | **PM2** | `ecosystem.neonhub.config.js` |
| Base de datos principal | PostgreSQL | puerto 5433 (mapeado desde Docker) |
| Base de datos landing | PostgreSQL | puerto 5434 |

| Contenedores DB | Docker / docker-compose | solo las BDs usan Docker |
| Frontend en prod | `npx serve dist` | build estático servido por `serve` |
| Landing | Astro SSR | `node dist/server/entry.mjs` |

### Puertos en producción

| Proceso PM2 | Puerto | Descripción |
|-------------|--------|-------------|
| `neonhub-backend` | **4000** | API REST (Express) |
| `neonhub-frontend` | **3000** | SPA estática (serve) |
| `neonhub-landing` | **5000** | Landing Astro SSR |

---

## Variables de entorno de producción

Estas variables deben estar definidas en el entorno del sistema (o en un archivo `.env` cargado antes de PM2) **antes** de ejecutar `pm2 start`.

### Backend (`neonhub-backend`)

```env
NODE_ENV=production
PORT=4000

# Base de datos
DB_DIALECT=postgres
DB_HOST=
DB_PORT=5433
DB_NAME=neonhub_db
DB_USER=neonhub
DB_PASSWORD=          # → POSTGRES_PASSWORD_NEONHUB

# JWT
JWT_SECRET=           # mínimo 64 caracteres aleatorios
JWT_REFRESH_SECRET=   # distinto del anterior

# CORS y URLs
FRONTEND_URL=
LANDING_URL=
CORS_ORIGINS=
TENANT_BASE_DOMAIN=
PUBLIC_SITE_URL=

# Stripe (claves live)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BILLING_MODE=subscription
STRIPE_CURRENCY=eur

# Email
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=

# Observabilidad
SENTRY_DSN=
BETTER_STACK_SOURCE_TOKEN=

# n8n webhooks
N8N_ONBOARDING_WEBHOOK_URL=
N8N_STORE_CREATED_WEBHOOK_URL=
N8N_APPROVED_WEBHOOK_URL=

# Features
ENABLE_CERTIFICATION_SCHEDULER=true
ENABLE_REAL_TIME_SUSTAINABILITY=false
```

### Landing page (`neonhub-landing`)

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=5000
PUBLIC_SITE_URL=
PUBLIC_API_BASE_URL=
ADMIN_API_SECRET=
LANDING_DB_HOST=
LANDING_DB_PORT=5434
LANDING_DB_NAME=landing_db
LANDING_DB_USER=landing
LANDING_DB_PASSWORD=    # → POSTGRES_PASSWORD_LANDING
```

### Docker Compose (bases de datos)

```env
POSTGRES_PASSWORD_NEONHUB=
POSTGRES_PASSWORD_LANDING=

JWT_SECRET=
```

---

## Proceso de despliegue paso a paso

### Primera vez (setup inicial)

```bash
# 1. Clonar el repo
git clone <url> /home/sergio/TrabajoFinalCursoDAM
cd /home/sergio/TrabajoFinalCursoDAM

# 2. Instalar dependencias de todos los servicios
cd backend && npm install --omit=dev && cd ..
cd frontend && npm install && cd ..
cd landing-page && npm install && cd ..

# 3. Levantar las bases de datos con Docker
docker-compose up -d postgres postgres-landing

# Esperar a que pasen los healthchecks (~15s)
docker-compose ps

# 4. Ejecutar migraciones y seed del backend
cd backend
npm run migrate
npm run seed
cd ..

# 5. Builds de producción
cd frontend && npm run build && cd ..
cd landing-page && npm run build && cd ..

# 6. Arrancar todos los procesos con PM2
pm2 start ecosystem.neonhub.config.js --env production
pm2 save          # persiste la lista de procesos entre reinicios
pm2 startup       # configura el arranque automático con el sistema
```

### Actualización (deploy de nueva versión)

```bash
cd /home/sergio/TrabajoFinalCursoDAM

# 1. Obtener cambios
git pull origin main

# 2. Actualizar dependencias si cambiaron los package.json
cd backend && npm install --omit=dev && cd ..
cd frontend && npm install && cd ..

# 3. Re-builds necesarios (solo los servicios que cambiaron)
cd frontend && npm run build && cd ..
cd landing-page && npm run build && cd ..

# 4. Recargar procesos PM2 (zero-downtime para cluster)
pm2 reload neonhub-backend
pm2 restart neonhub-frontend neonhub-landing
```

---

## Gestión de PM2

```bash
# Ver estado de todos los procesos
pm2 status

# Ver logs en tiempo real
pm2 logs
pm2 logs neonhub-backend    # solo un proceso

# Reiniciar un proceso
pm2 restart neonhub-backend

# Parar todos
pm2 stop all

# Recargar config del ecosistema (sin downtime en cluster)
pm2 reload ecosystem.neonhub.config.js --env production
```

Los logs se escriben en:

| Proceso | stdout | stderr |
|---------|--------|--------|
| backend | `logs/backend-out.log` | `logs/backend-error.log` |
| frontend | `logs/frontend-out.log` | `logs/frontend-error.log` |
| landing | `logs/landing-out.log` | `logs/landing-error.log` |

---

## Comprobaciones post-despliegue

```bash
# Backend responde
curl http://localhost:4000/api/health

# Frontend sirve la SPA
curl -I http://localhost:3000

# Landing responde
curl -I http://localhost:5000

# Bases de datos activas
docker-compose ps
```
