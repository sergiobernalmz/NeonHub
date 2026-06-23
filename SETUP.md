# Setup — NeonHub (desarrollo local)

Guía para arrancar todos los servicios de NeonHub en local desde cero.

---

## Prerequisitos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | incluido con Node |
| PostgreSQL | 14+ | solo para el backend en modo dev/prod |
| Expo CLI | cualquiera reciente | solo para la app móvil |
| Git | cualquiera | — |

> Los tests del backend pueden correr sin PostgreSQL: si no se detecta conexión, Sequelize cae automáticamente a SQLite en memoria.

---

## Estructura de servicios y puertos

| Servicio | Directorio | Puerto (dev) | Tecnología |
|----------|-----------|--------------|------------|
| Backend API | `backend/` | **3000** | Node.js + Express |
| Frontend (dashboard + tienda) | `frontend/` | **5173** | React + Vite |
| Landing page | `landing-page/` | **4321** | Astro SSR |

| Mobile app | `mobile/` | — | Expo / React Native |

---

## 1. Clonar y preparar dependencias

```bash
git clone <url-del-repo>
cd TrabajoFinalCursoDAM
```

Instalar dependencias de cada servicio por separado (no hay workspace raíz):

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Landing page
cd landing-page && npm install && cd ..

# Mobile
cd mobile && npm install && cd ..
```

---

## 2. Variables de entorno

### Backend — `backend/.env`

Copia y rellena los valores mínimos para desarrollo:

```env
# Servidor
NODE_ENV=development
PORT=3000
HOST=localhost

# Base de datos (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=neonhub_db
DB_USER=neonhub
DB_PASSWORD=tu_password_local
DB_DIALECT=postgres

# JWT
JWT_SECRET=cambia_esto_por_un_secreto_largo
JWT_REFRESH_SECRET=cambia_esto_por_otro_secreto
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# URLs de los otros servicios (necesario para CORS)
FRONTEND_URL=http://localhost:5173
LANDING_URL=http://localhost:4321
PUBLIC_SITE_URL=http://localhost:3000

# Stripe (usa claves de test para dev)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BILLING_MODE=subscription
STRIPE_CURRENCY=eur

# Email (opcional en dev; puedes dejar vacío para deshabilitar)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@neonhub.dev

# Observabilidad (opcional en dev)
SENTRY_DSN=
BETTER_STACK_SOURCE_TOKEN=

# n8n webhooks (opcional en dev)
N8N_ONBOARDING_WEBHOOK_URL=
N8N_STORE_CREATED_WEBHOOK_URL=
N8N_APPROVED_WEBHOOK_URL=

# Tenant
TENANT_BASE_DOMAIN=localhost

# Features (opcional)
ENABLE_CERTIFICATION_SCHEDULER=false
ENABLE_REAL_TIME_SUSTAINABILITY=false
```

### Frontend — `frontend/.env`

```env
VITE_API_BASE=http://localhost:3000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_TENANT_BASE_DOMAIN=localhost
```

### Landing page

La landing usa **Astro DB (SQLite embebido)**; no requiere variables adicionales para funcionar en local.

---

## 3. Preparar la base de datos

Con PostgreSQL en marcha, crea la base de datos y ejecuta las migraciones:

```bash
# Crear la base de datos (una sola vez)
psql -U postgres -c "CREATE DATABASE neonhub_db;"
psql -U postgres -c "CREATE USER neonhub WITH PASSWORD 'tu_password_local';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE neonhub_db TO neonhub;"

# Desde la carpeta backend:
cd backend
npm run migrate   # crea las tablas (Sequelize sync)
npm run seed      # carga datos de ejemplo
```

---

## 4. Arrancar los servicios

Orden recomendado (el frontend depende del backend):

### Backend
```bash
cd backend
npm run dev        # nodemon — recarga automática
```

### Frontend
```bash
cd frontend
npm run dev        # Vite — hot reload en http://localhost:5173
```

### Landing page (opcional para desarrollo de backend/frontend)
```bash
cd landing-page
npm run dev        # Astro dev en http://localhost:4321
```

### Mobile app
```bash
cd mobile
npm start          # Expo — abre QR para Expo Go en el móvil

# O directamente en simulador:
npm run android
npm run ios
```

---

## 5. Verificar que todo funciona

```bash
# Comprobar que el backend responde
curl http://localhost:3000/api/health

# Comprobar la versión de la API
curl http://localhost:3000/api/v1/status
```

Panel de administración: [http://localhost:5173/admin](http://localhost:5173/admin)  
Tienda pública: [http://localhost:5173/shop](http://localhost:5173/shop)  
Landing: [http://localhost:4321](http://localhost:4321)

---

## 6. Tests

Ver [TESTING.md](TESTING.md) para la guía completa de tests.

```bash
# Tests del backend (rápido)
cd backend && npm test
```

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `ECONNREFUSED` al arrancar el backend | PostgreSQL no está corriendo | Iniciar el servicio de PostgreSQL |
| `JWT_SECRET is not defined` | Falta el `.env` en backend | Crear `backend/.env` con los valores mínimos |
| CORS error en el frontend | `FRONTEND_URL` mal configurada en backend | Verificar que `FRONTEND_URL=http://localhost:5173` |
| `Cannot find module` en mobile | Dependencias no instaladas | `cd mobile && npm install` |
| Puerto 3000 en uso | Otro proceso usando el puerto | `lsof -i :3000` y matar el proceso |
