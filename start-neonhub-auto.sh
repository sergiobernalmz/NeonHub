#!/usr/bin/env bash
# Este script se ejecuta al iniciar el sistema

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_PATH="$SCRIPT_DIR"

# Cargar variables de entorno
set -a
[ -f "$ROOT_PATH/.env" ] && . "$ROOT_PATH/.env"
[ -f "$ROOT_PATH/.env.local" ] && . "$ROOT_PATH/.env.local"
[ -f "$ROOT_PATH/.env.production" ] && . "$ROOT_PATH/.env.production"
[ -f "$ROOT_PATH/backend/.env" ] && . "$ROOT_PATH/backend/.env"
[ -f "$ROOT_PATH/frontend/.env" ] && . "$ROOT_PATH/frontend/.env"
[ -f "$ROOT_PATH/landing-page/.env" ] && . "$ROOT_PATH/landing-page/.env"
set +a

# Esperar a que Docker esté listo (si es necesario)
sleep 5

# Iniciar servicios con PM2
pm2 start "$ROOT_PATH/ecosystem.neonhub.config.js" --env production
pm2 save
