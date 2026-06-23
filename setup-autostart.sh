#!/usr/bin/env bash

# Script para configurar inicio automático de NeonHub con PM2
# Ejecutar con: sudo ./setup-autostart.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER_NAME="sergio"
USER_HOME="/home/sergio"

echo "🔧 Configurando inicio automático de NeonHub..."
echo ""

# 1. Setup PM2 startup
echo "1️⃣  Configurando PM2 para iniciar como servicio systemd..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER_NAME --hp $USER_HOME
echo ""

# 2. Crear un wrapper script que carga el entorno y inicia NeonHub
echo "2️⃣  Creando script de arranque con variables de entorno..."
cat > "$SCRIPT_DIR/start-neonhub-auto.sh" << 'EOF'
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
EOF

chmod +x "$SCRIPT_DIR/start-neonhub-auto.sh"
echo "✓ Script de arranque creado en: $SCRIPT_DIR/start-neonhub-auto.sh"
echo ""

# 3. Iniciar NeonHub con PM2
echo "3️⃣  Iniciando NeonHub con PM2 por primera vez..."
cd "$SCRIPT_DIR"
"$SCRIPT_DIR/start-neonhub-auto.sh"
echo ""

# 4. Guardar configuración
echo "4️⃣  Guardando configuración de PM2..."
pm2 save
echo ""

# 5. Crear servicio cron que verifica PM2 cada 5 minutos
echo "5️⃣  Configurando supervisión automática con cron..."
CRON_JOB="*/5 * * * * /home/sergio/.pm2/io-pm2-auto-pull.js > /dev/null 2>&1"

# Verificar si ya existe
if ! crontab -u $USER_NAME -l 2>/dev/null | grep -q "pm2-auto"; then
    (crontab -u $USER_NAME -l 2>/dev/null || echo ""; echo "*/5 * * * * /usr/bin/pm2 resurrect > /dev/null 2>&1 # pm2-auto") | crontab -u $USER_NAME -
    echo "✓ Cron configurado para revisar PM2 cada 5 minutos"
else
    echo "✓ Cron ya configurado"
fi
echo ""

echo "✅ ¡Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verifica que los servicios estén arrancados:"
echo "      pm2 status"
echo "   2. Prueba que se inician automáticamente después de reiniciar"
echo "   3. Si necesitas detener el autostart:"
echo "      sudo pm2 unstartup systemd -u sergio"
echo ""
echo "🚀 Los servicios se iniciarán automáticamente al reiniciar el sistema"
