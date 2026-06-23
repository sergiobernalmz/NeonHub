# NeonHub — Guía de Despliegue

## Infraestructura actual

| Componente | Solución | Descripción |
|---|---|---|
| Servidor | VPS propio | Linux con Docker + PM2 |
| Contenedores | Docker Compose | 3 instancias PostgreSQL |
| Procesos Node | PM2 | 4 procesos gestionados |
| Proxy inverso | Nginx | SSL, subdominios, routing |
| Automatización | n8n (servidor separado) | `neonhub.n8nservidor.es` |
| DNS | Wildcard `*.neonhub.es` | Apunta al VPS |

---

## Arquitectura de procesos PM2

Configuración en `ecosystem.neonhub.config.js` (raíz del proyecto):

```javascript
// 4 procesos activos
[neonhub-backend]   :4000  cluster mode  backend/
[neonhub-frontend]  :3000  fork          frontend/dist/ (serve estático)
[neonhub-landing]   :5000  fork          landing-page/ (Astro SSR)
[neonhub-vps]       :5001  fork          panel VPS interno
```

**Comandos PM2 esenciales**:
```bash
pm2 list                          # Estado de todos los procesos
pm2 logs neonhub-backend --lines 50  # Últimas 50 líneas del log
pm2 restart neonhub-backend --update-env  # Reiniciar recargando .env
pm2 reload neonhub-backend        # Reload sin downtime (cluster)
pm2 monit                         # Monitor en tiempo real
```

---

## Bases de datos (Docker Compose)

Configuración en `docker-compose.yml`:

```bash
# Ver estado de contenedores
docker-compose ps

# Iniciar todo
docker-compose up -d

# Ver logs de PostgreSQL
docker-compose logs -f neonhub-postgres

# Acceder a psql directamente
docker exec -it neonhub-postgres psql -U neonhub -d neonhub_db
```

**Bases de datos**:
| Contenedor | Puerto | Base de datos | Usuario |
|---|---|---|---|
| `neonhub-postgres` | 5433 | `neonhub_db` | `neonhub` |
| `postgres-landing` | 5434 | `landing_db` | `landing` |
| `postgres-vps` | 5435 | `vps_db` | — |

---

## Desplegar nueva versión

### Backend

```bash
# 1. Subir cambios al servidor (scp, git pull, rsync, etc.)
git pull origin main

# 2. Instalar dependencias si hay nuevas
cd backend && npm install --production

# 3. Ejecutar migraciones pendientes
node src/database/migrate.js

# 4. Reiniciar con recarga de variables de entorno
pm2 restart neonhub-backend --update-env
```

### Frontend (SaaS React)

```bash
# 1. Build de producción
cd frontend && npm run build

# 2. Reiniciar servidor estático
pm2 restart neonhub-frontend
```

### Landing Page (Astro SSR)

```bash
# 1. Build de producción
cd landing-page && npm run build

# 2. Reiniciar proceso
pm2 restart neonhub-landing
```

---

## Actualizar variables de entorno

Las variables de entorno están en:
- **Backend**: `backend/.env`
- **Landing**: `landing-page/.env`
- **Frontend**: `frontend/.env` (si existe) o variables en Vite build

### Para actualizar en producción (VPS):

```bash
# 1. Editar el archivo .env correspondiente
nano backend/.env

# 2. Reiniciar el proceso con --update-env para que PM2 recargue
pm2 restart neonhub-backend --update-env

# Verificar que cargó el nuevo valor
pm2 env 0  # Muestra variables del proceso ID 0 (backend)
```

**Importante**: `pm2 restart` sin `--update-env` NO recarga las variables de entorno. Siempre usar `--update-env` cuando se modifique el `.env`.

---

## Ejecutar migraciones de base de datos

```bash
cd backend

# Ejecutar todas las migraciones pendientes
node src/database/migrate.js

# Ejecutar una migración específica manualmente
node -e "
const { sequelize } = require('./src/config/database');
const migration = require('./src/database/migrations/027-create-sso-tokens');
migration.up(sequelize.getQueryInterface(), require('sequelize'))
  .then(() => { console.log('OK'); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
"
```

---

## Logs del sistema

### Logs de PM2 (archivos locales)

```
logs/
├── backend-out.log     # stdout del backend
├── backend-error.log   # stderr del backend
├── frontend-out.log    # stdout del frontend
├── landing-out.log     # stdout de la landing
```

```bash
# Ver logs en tiempo real
tail -f logs/backend-out.log
tail -f logs/backend-error.log

# PM2 con formato mejorado
pm2 logs neonhub-backend --lines 100 --nostream
```

### Logs remotos (producción)

- **BetterStack**: Panel en `https://logs.betterstack.com` — logs estructurados en tiempo real
- **Sentry**: Panel en `https://sentry.io` — errores y excepciones con stack trace

Credenciales:
- `BETTER_STACK_SOURCE_TOKEN` en `backend/.env`
- `SENTRY_DSN` en `backend/.env`

---

## Logs de n8n

**URL del panel**: `https://neonhub.n8nservidor.es`

En el panel de n8n:
1. Ir a **Executions** (menú lateral)
2. Filtrar por workflow o estado (Success/Error)
3. Hacer click en una ejecución para ver el detalle de cada nodo

Para ver logs del servidor n8n:
```bash
# Si n8n corre en Docker en el servidor dedicado
docker logs n8n --tail 50 -f
```

---

## SSL y dominio

- **Certificado SSL**: Let's Encrypt (wildcard `*.neonhub.es`)
- **Renovación**: Automática via certbot
- **DNS**: Registro A wildcard `*.neonhub.es` → IP del VPS
- **Proxy**: Nginx gestiona los virtual hosts y redirige a los puertos PM2

```nginx
# Configuración simplificada de Nginx
server {
    server_name ~^(?<subdomain>.+)\.neonhub\.es$;
    location /api/ { proxy_pass http://localhost:4000/api/; }
    location / { proxy_pass http://localhost:3000/; }
}
server {
    server_name neonhub.es www.neonhub.es;
    location /api/ { proxy_pass http://localhost:4000/api/; }
    location / { proxy_pass http://localhost:5000/; }
}
```

---

## JWT API Key

- **Usuario**: `programmer` (nivel 200, acceso total al sistema)
- **Caducidad**: Abril 2027
- **Uso**: Llamadas administrativas al API desde herramientas externas o scripts

```bash
# Generar nuevo token manualmente si caduca
node -e "
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'backend/.env' });
const token = jwt.sign(
  { id: 'UUID_DEL_USUARIO_PROGRAMMER', username: 'programmer', email: 'programador@neonhub.es' },
  process.env.JWT_SECRET,
  { expiresIn: '365d' }
);
console.log(token);
"
```

---

## Backup de base de datos

```bash
# Backup completo
docker exec neonhub-postgres pg_dump -U neonhub neonhub_db > backup_$(date +%Y%m%d).sql

# Restaurar
docker exec -i neonhub-postgres psql -U neonhub neonhub_db < backup_20260421.sql
```

---

## Verificación de estado post-deploy

```bash
# 1. Todos los procesos online
pm2 list

# 2. Health check del API
curl https://neonhub.es/api/health

# 3. Landing responde
curl -I https://neonhub.es

# 4. Frontend SaaS responde
curl -I https://demo.neonhub.es

# 5. Últimas líneas del log para errores
pm2 logs neonhub-backend --lines 20 --nostream | grep -E "ERROR|error|Error"
```

---

## Rollback de emergencia

```bash
# 1. Revertir a commit anterior
git reset --hard HEAD~1

# 2. Rebuild y reiniciar
cd frontend && npm run build && cd ..
pm2 restart all --update-env
```

Para rollback de migración, contactar con el DBA/desarrollador ya que las migraciones de Sequelize no tienen `down()` automático en todos los casos.
