# 📱 NeonHub Mobile - React Native App

Aplicación móvil para NeonHub E-commerce Sostenible.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Expo Go app en tu móvil ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Instalación

```bash
# Ya está instalado, solo ejecuta:
npm start
```

### Ejecutar la App

```bash
# Iniciar el servidor de desarrollo
npm start

# O directamente en Android
npm run android

# O en iOS (requiere Mac)
npm run ios
```

## 📱 Usar con Expo Go

1. Ejecuta `npm start`
2. Escanea el código QR con:
   - **Android**: App Expo Go
   - **iOS**: Cámara del iPhone
3. ¡La app se abrirá automáticamente!

## 🔧 Configuración del Backend

La app está configurada para conectarse a `http://10.0.2.2:3011/api` (emulador Android).

**Para dispositivo físico**, edita `src/services/api.js`:

```javascript
// Cambia esta línea:
const API_URL = 'http://10.0.2.2:3011/api';

// Por tu IP local:
const API_URL = 'http://TU_IP_LOCAL:3011/api';
// Ejemplo: 'http://192.168.1.100:3011/api'
```

### Encontrar tu IP local:

```bash
# Linux/Mac
ip addr show | grep inet

# O
ifconfig | grep inet
```

## 📂 Estructura del Proyecto

```
mobile/
├── src/
│   ├── screens/          # Pantallas de la app
│   │   ├── auth/        # Login, Register
│   │   ├── products/    # Catálogo
│   │   └── cart/        # Carrito
│   ├── services/        # API services (reutilizados del web)
│   ├── context/         # State management
│   ├── components/      # Componentes reutilizables
│   └── utils/           # Tema y utilidades
├── App.js              # Componente principal
└── package.json
```

## ✅ Funcionalidades Implementadas

- ✅ Login con JWT
- ✅ Catálogo de productos
- ✅ Carrito de compras
- ✅ Persistencia local (AsyncStorage)
- ✅ Tema "Neon" consistente con web
- ✅ Navegación con React Navigation

## 🎨 Tema

Colores del tema "Neon":
- Verde Neón: `#00ff88`
- Azul Neón: `#00ccff`
- Fondo Oscuro: `#0a0a0a`
- Cards: `#1a1a1a`

## 🔐 Credenciales de Prueba

```
Email: admin@test.com
Password: admin123
```

## 📦 Próximos Pasos

- [ ] Pantalla de perfil
- [ ] Checkout completo
- [ ] Notificaciones push
- [ ] Métricas de sostenibilidad
- [ ] Build para producción

## 🐛 Solución de Problemas

### No se conecta al backend

1. Verifica que el backend esté corriendo en `http://localhost:3011`
2. Si usas dispositivo físico, cambia la IP en `src/services/api.js`
3. Asegúrate de que el backend permita CORS

### La app no carga

```bash
# Limpia caché
npm start -- --clear

# O reinstala dependencias
rm -rf node_modules
npm install
```

## 📱 Build para Producción

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

---

**Desarrollado con React Native + Expo**
