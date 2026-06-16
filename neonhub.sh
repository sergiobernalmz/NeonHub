#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PM2_CONFIG="$SCRIPT_DIR/ecosystem.neonhub.config.js"
ROOT_PATH="$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║              🚀 NeonHub Control Center               ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_ok() { echo -e "${GREEN}✓${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
print_err() { echo -e "${RED}✗${NC} $1"; }

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || {
        print_err "Comando requerido no encontrado: $1"
        exit 1
    }
}

load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        set -a
        # shellcheck disable=SC1090
        . "$file"
        set +a
        print_ok "Cargado entorno: $(realpath "$file")"
    fi
}

load_env() {
    load_env_file "$ROOT_PATH/.env"
    load_env_file "$ROOT_PATH/.env.local"
    load_env_file "$ROOT_PATH/.env.production"
    load_env_file "$ROOT_PATH/backend/.env"
    load_env_file "$ROOT_PATH/frontend/.env"
    load_env_file "$ROOT_PATH/landing-page/.env"
}

require_env() {
    local name="$1"
    if [ -z "${!name:-}" ]; then
        print_err "Falta variable de entorno: $name"
        return 1
    fi
    return 0
}

check_required_env_production() {
    local ok=0

    require_env "JWT_SECRET" || ok=1
    require_env "JWT_REFRESH_SECRET" || ok=1
    require_env "DB_HOST" || ok=1
    require_env "DB_NAME" || ok=1
    require_env "DB_USER" || ok=1
    require_env "DB_PASSWORD" || ok=1

    require_env "TENANT_BASE_DOMAIN" || ok=1
    require_env "FRONTEND_URL" || ok=1

    require_env "PUBLIC_SITE_URL" || ok=1
    require_env "PUBLIC_API_BASE_URL" || ok=1
    require_env "ADMIN_API_SECRET" || ok=1

    if [ "$ok" -ne 0 ]; then
        echo ""
        print_warn "Crea un fichero .env (recomendado: $ROOT_PATH/.env) con estas variables."
        print_warn "Puedes partir de $ROOT_PATH/.env.neonhub.example"
        echo ""
        exit 1
    fi
}

wait_for_service() {
    local url="$1"
    local name="$2"
    local attempts=60
    local n=1
    echo -e "${YELLOW}⏳ Esperando ${name}...${NC}"
    while [ "$n" -le "$attempts" ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -Eq "200|301|302|304"; then
            print_ok "${name} activo"
            return 0
        fi
        echo -n "."
        sleep 1
        n=$((n + 1))
    done
    echo ""
    print_warn "${name} no confirmó a tiempo (puede seguir arrancando)"
    return 1
}

check_prereqs() {
    require_cmd pm2
    require_cmd npm
    require_cmd curl

    if [ ! -f "$PM2_CONFIG" ]; then
        print_err "No existe el archivo PM2: $PM2_CONFIG"
        exit 1
    fi
}

show_status_short() {
    pm2 status 2>/dev/null | sed -n '1,15p'
}

check_frontend_env_production() {
    # Vite solo carga .env.production cuando ejecuta `npm run build`.
    # Si no existe, el bundle se compila con los valores de .env (desarrollo local,
    # VITE_API_BASE=http://localhost:3011/api), lo que rompe el frontend en producción
    # porque el navegador intenta llamar a localhost:3011 en vez de al backend real.
    if [ ! -f "$ROOT_PATH/frontend/.env.production" ]; then
        print_err "frontend/.env.production no existe en este servidor."
        print_err "Vite lo necesita para compilar el bundle de producción."
        print_err "Crea el archivo a partir de frontend/.env.example con los valores de producción:"
        print_err "  VITE_API_BASE=/api"
        print_err "  VITE_TENANT_BASE_DOMAIN=neonhub.es"
        print_err "  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (o pk_live_...)"
        echo ""
        return 1
    fi
    print_ok "frontend/.env.production presente"
    return 0
}

build_frontend() {
    echo -e "\n${BLUE}🔨 Build frontend...${NC}"
    check_frontend_env_production || return 1
    cd "$ROOT_PATH/frontend" && npm run build
}

build_landing() {
    echo -e "\n${BLUE}🔨 Build landing...${NC}"
    cd "$ROOT_PATH/landing-page" && ASTRO_DATABASE_FILE="$ROOT_PATH/landing-page/landing.db" npm run build
}

start_neonhub() {
    echo -e "\n${BLUE}🚀 Iniciando NeonHub completo...${NC}"
    cd "$ROOT_PATH" || exit 1
    load_env
    check_required_env_production
    pm2 start "$PM2_CONFIG" --env production
    pm2 save
    wait_for_service "http://localhost:3000" "Frontend"
    wait_for_service "http://localhost:4000/api/health" "Backend"
    wait_for_service "http://localhost:5000" "Landing"
    echo ""
    pm2 status
}

start_full_deploy() {
    echo -e "\n${BLUE}🚀 Deploy completo (build + start)...${NC}"
    load_env
    check_required_env_production
    build_frontend || return 1
    build_landing || return 1
    cd "$ROOT_PATH" || exit 1
    pm2 delete all >/dev/null 2>&1 || true
    start_neonhub
}

restart_neonhub() {
    echo -e "\n${BLUE}🔄 Reiniciando NeonHub...${NC}"
    cd "$ROOT_PATH" || exit 1
    load_env
    check_required_env_production
    pm2 reload "$PM2_CONFIG" --env production
    pm2 save
    pm2 status
}

stop_neonhub() {
    echo -e "\n${YELLOW}⏹ Deteniendo NeonHub...${NC}"
    cd "$ROOT_PATH" || exit 1
    pm2 delete "$PM2_CONFIG" >/dev/null 2>&1 || pm2 delete neonhub-backend neonhub-frontend neonhub-landing >/dev/null 2>&1 || true
    print_ok "Servicios detenidos"
}

restart_db() {
    echo -e "\n${BLUE}🔄 Reiniciando Bases de Datos (Docker)...${NC}"
    cd "$ROOT_PATH" || exit 1
    docker compose restart
    print_ok "Bases de datos reiniciadas"
}

show_docker_status() {
    echo -e "\n${BLUE}🐳 Estado de contenedores Docker:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

show_status() {
    echo -e "\n${BLUE}📊 Estado PM2:${NC}"
    pm2 status
    echo -e "\n${BLUE}🌐 Health checks:${NC}"
    echo -n "Backend  : " && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/api/health || true
    echo -n "Frontend : " && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000 || true
    echo -n "Landing  : " && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000 || true
}

logs_realtime_all() {
    echo -e "\n${BLUE}📋 Logs en tiempo real (Ctrl+C para salir)...${NC}\n"
    pm2 logs neonhub-backend neonhub-frontend neonhub-landing --lines 100
}

logs_realtime_backend() {
    echo -e "\n${BLUE}📋 Logs backend en tiempo real (Ctrl+C para salir)...${NC}\n"
    pm2 logs neonhub-backend --lines 100
}

logs_realtime_frontend() {
    echo -e "\n${BLUE}📋 Logs frontend en tiempo real (Ctrl+C para salir)...${NC}\n"
    pm2 logs neonhub-frontend --lines 100
}

monitor_pm2_realtime() {
    echo -e "\n${BLUE}🧠 PM2 Monit en tiempo real (q para salir)...${NC}\n"
    pm2 monit
}

monitor_http_realtime() {
    echo -e "\n${BLUE}🌐 Monitor HTTP en tiempo real (Ctrl+C para salir)...${NC}\n"
    watch -n 2 '
        echo "=== $(date) ==="
        echo -n "backend /api/health: "; curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health; echo
        echo -n "frontend /        : "; curl -s -o /dev/null -w "%{http_code}" http://localhost:3000; echo
        echo -n "landing /         : "; curl -s -o /dev/null -w "%{http_code}" http://localhost:5000; echo
        echo ""
        pm2 status | sed -n "1,15p"
    '
}

open_neonhub() {
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "https://neonhub.es" >/dev/null 2>&1 &
        print_ok "Abierto https://neonhub.es"
    else
        print_warn "No se encontró xdg-open. Abre manualmente: https://neonhub.es"
    fi
}

release_electron() {
    echo -e "\n${BLUE}📦 Release Electron (app de escritorio)...${NC}"

    CURRENT_VERSION=$(node -e "
        const pkg = JSON.parse(require('fs').readFileSync('$ROOT_PATH/frontend/package.json'));
        console.log(pkg.version);
    ")

    echo ""
    echo -e "${CYAN}Versión actual instalada: v${CURRENT_VERSION}${NC}"
    echo ""
    read -r -p "Introduce la nueva versión (ej: 1.2.0): " version

    if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        print_err "Formato de versión inválido. Usa el formato: 1.2.0"
        return 1
    fi

    echo ""
    echo "Notas del release (describe los cambios):"
    read -r -p "> " release_notes

    if [ -z "$release_notes" ]; then
        release_notes="Mejoras y correcciones de errores"
    fi

    echo ""
    echo -e "${YELLOW}Se va a publicar la versión v${version}${NC}"
    echo "Esto hará:"
    echo "  1. Actualizar frontend/package.json → $version"
    echo "  2. git add + commit + tag v${version}"
    echo "  3. git push origin main + push tag"
    echo "  4. GitHub Actions compilará el instalador automáticamente"
    echo "  5. Notas: $release_notes"
    echo ""
    read -r -p "¿Continuar? (s/N): " confirm

    if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
        print_warn "Operación cancelada"
        return 0
    fi

    cd "$ROOT_PATH/frontend" || return 1

    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = '$version';
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
        console.log('✓ package.json actualizado a $version');
    "

    cd "$ROOT_PATH" || return 1

    echo ""
    echo -e "${BLUE}📤 Subiendo a GitHub...${NC}"

    git add frontend/package.json
    git commit -m "release: v${version} - ${release_notes}" || {
        print_warn "No hay cambios que commitear (package.json ya tenía esa versión)"
    }

    git tag -d "v${version}" 2>/dev/null || true
    git push origin ":refs/tags/v${version}" 2>/dev/null || true

    git tag "v${version}"
    git push origin main
    git push origin "v${version}"

    echo ""
    print_ok "Tag v${version} subido a GitHub"
    print_ok "GitHub Actions compilará el instalador automáticamente"
    echo ""
    echo -e "${CYAN}Progreso en:${NC}"
    echo "  https://github.com/ElCoronaoV2/TFG-DAM-2-/actions"
    echo ""
    echo -e "${CYAN}Instalador disponible en ~10 min en:${NC}"
    echo "  https://neonhub.es/updates/"
    echo "  https://github.com/ElCoronaoV2/TFG-DAM-2-/releases"
}

wait_key() {
    echo ""
    read -r -p "Pulsa ENTER para continuar..." _
}

show_menu() {
    clear
    print_header
    echo -e "${BLUE}Estado rápido:${NC}"
    show_status_short
    echo ""
    echo -e "${CYAN}1${NC}) 🚀 Iniciar NeonHub"
    echo -e "${CYAN}2${NC}) 🔨 Build + Deploy completo"
    echo -e "${CYAN}3${NC}) 🔄 Reiniciar NeonHub"
    echo -e "${CYAN}4${NC}) ⏹ Detener NeonHub"
    echo -e "${CYAN}5${NC}) 📊 Ver estado y health checks"
    echo ""
    echo -e "${YELLOW}6${NC}) 📋 Logs tiempo real (todos)"
    echo -e "${YELLOW}7${NC}) 📋 Logs tiempo real backend"
    echo -e "${YELLOW}8${NC}) 📋 Logs tiempo real frontend"
    echo -e "${YELLOW}9${NC}) 🧠 PM2 monit (tiempo real)"
    echo -e "${YELLOW}10${NC}) 🌐 Monitor HTTP en vivo"
    echo ""
    echo -e "${GREEN}11${NC}) 🌍 Abrir neonhub.es"
    echo -e "${CYAN}12${NC}) 🔄 Reiniciar bases de datos (Docker)"
    echo -e "${YELLOW}13${NC}) 🐳 Ver estado de Docker"
    echo -e "${CYAN}14${NC}) 📦 Release app Electron (nueva versión)"
    echo -e "${RED}0${NC}) ❌ Salir"
    echo ""
}

main() {
    check_prereqs

    while true; do
        show_menu
        read -r -p "Selecciona opción [0-14]: " choice
        case "$choice" in
            1) start_neonhub; wait_key ;;
            2) start_full_deploy; wait_key ;;
            3) restart_neonhub; wait_key ;;
            4) stop_neonhub; wait_key ;;
            5) show_status; wait_key ;;
            6) logs_realtime_all ;;
            7) logs_realtime_backend ;;
            8) logs_realtime_frontend ;;
            9) monitor_pm2_realtime ;;
            10) monitor_http_realtime ;;
            11) open_neonhub; wait_key ;;
            12) restart_db; wait_key ;;
            13) show_docker_status; wait_key ;;
            14) release_electron; wait_key ;;
            0|q|Q) echo -e "\n${GREEN}👋 Saliendo...${NC}\n"; exit 0 ;;
            *) print_err "Opción no válida"; sleep 1 ;;
        esac
    done
}

main
