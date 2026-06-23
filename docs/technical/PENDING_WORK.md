# NeonHub — Trabajo Pendiente

Última actualización: 2026-04-21

---

## Prioridad ALTA — Bloquea workflows en producción

### 1. Implementar `GET /api/admin/metrics/daily`
**Impacto**: WF4 (Reporte Ejecutivo Diario) falla silenciosamente sin este endpoint.
**Contexto**: El workflow de n8n se ejecuta cada día a las 08:00 y llama a este endpoint para obtener KPIs. Actualmente el endpoint no existe.
**Datos que debe devolver**:
```json
{
  "new_orders": 12,
  "revenue": 1450.00,
  "new_customers": 3,
  "active_stores": 5,
  "failed_payments": 1,
  "tickets_open": 2,
  "date": "2026-04-21"
}
```
**Ruta sugerida**: `backend/src/routes/adminRoutes.js` + `adminController.js`

---

### 2. Implementar `GET /api/admin/audit-logs` con filtro de anomalías
**Impacto**: WF5 (Seguridad Operativa) no puede detectar anomalías de seguridad.
**Contexto**: El workflow corre cada 10 minutos buscando actividad anómala (>5 anomalías en el período).
**Parámetros esperados**: `?anomalies=true&period=10m`
**Criterios de anomalía sugeridos**: múltiples intentos de login fallidos, accesos desde IPs desconocidas, cambios de rol masivos, deletes en masa.

---

### 3. Configurar credenciales Trello en n8n
**Impacto**: WF3 (Soporte SLA) y WF5 (Seguridad Operativa) no crean tickets automáticamente.
**Acción**: En el panel n8n, añadir credenciales Trello (API Key + OAuth Token) y configurar `TRELLO_BOARD_ID` en los nodos correspondientes.
**Workflows afectados**: WF3, WF5

---

### 4. Validar IDs de canales Slack
**Impacto**: Alertas automáticas pueden no llegar al canal correcto.
**Canales a validar**:
- `#cobros-fallidos` — usado en WF2
- `#seguridad-operativa` — usado en WF4, WF5
**Acción**: Verificar en el workspace Slack de NeonHub Team que los IDs de canal están correctamente configurados en cada nodo Slack de n8n.

---

## Prioridad MEDIA — Funcionalidad incompleta

### 5. Completar flujo de recuperación de contraseña end-to-end
**Estado actual**: El backend tiene `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`. El frontend tiene las páginas `ForgotPassword.jsx` y `ResetPassword.jsx`. El webhook de n8n WF9 existe.
**Pendiente**: Verificar que el backend envía la solicitud al webhook de WF9 y que el enlace del email apunta a la URL correcta. Confirmar flujo completo funciona en producción.

---

### 6. App móvil — Completar pantallas pendientes
**Estado actual**: Expo/React Native con navegación básica, 8 directorios de pantallas.
**Pendiente**: La mayoría de pantallas tienen estructura pero implementación parcial. Funcionalidades principales por completar:
- Checkout con Stripe Mobile
- Gestión de pedidos completa
- Notificaciones push
- Integración Socket.IO para soporte en tiempo real

---

### 7. CSRF Protection global
**Estado actual**: Las cookies httpOnly con `sameSite: strict` mitigan CSRF parcialmente, pero no hay token CSRF explícito implementado.
**Impacto**: Formularios que usan cookies podrían ser vulnerables.
**Acción**: Implementar `csurf` middleware o equivalente para endpoints que modifican estado via cookies.

---

### 8. Redis para caché y rate limiting distribuido
**Estado actual**: `REDIS_ENABLED=false`. Actualmente usando PostgreSQL para SSO tokens y rate limiting in-memory.
**Impacto**: En producción con múltiples instancias (cluster mode), el rate limiting in-memory no es compartido entre workers.
**Acción**: Habilitar Redis y migrar rate limiting y session cache.

---

### 9. Activar y configurar WF8 (Approved Provisioning)
**Estado actual**: Workflow existe pero marcado como demo/placeholder.
**Contexto**: Para el flujo de provisioning manual (aprobación por admin), este workflow notifica al propietario que su tienda ha sido aprobada.
**Pendiente**: Decidir si el flujo de provisioning es siempre automático (WF1) o si habrá casos manuales que requieran WF8.

---

### 10. Completar WF1B (Onboarding Manual)
**Estado actual**: Placeholder con nodos básicos.
**Contexto**: Fallback cuando WF1 falla. Actualmente solo simula el envío de email.
**Acción**: Implementar lógica real de provisioning manual con notificación al admin y al cliente.

---

## Prioridad BAJA — Mejoras y funcionalidades futuras

### 11. Validaciones end-to-end de todos los módulos
- Tests de integración para el flujo completo de checkout + provisioning
- Tests E2E con Playwright/Cypress para el frontend
- Actualmente: 69/69 tests unitarios/integración backend pasando

### 12. CI/CD con GitHub Actions
**Estado actual**: No hay pipeline de CI/CD automatizado.
**Acción**: Crear workflow de GitHub Actions para:
- Ejecutar tests en cada PR
- Build automático
- Deploy a producción en merge a main

### 13. Reseñas y valoraciones de productos
**Funcionalidad no implementada**: Los clientes no pueden valorar productos ni dejar reseñas.

### 14. Sistema de cupones/descuentos frontend
**Estado actual**: El modelo `DiscountCode` existe en BD y hay una página `DiscountCodes.jsx`, pero la integración con el checkout puede no estar completa.
**Pendiente**: Verificar que los códigos de descuento se aplican correctamente en el proceso de compra.

### 15. 2FA (Autenticación de Dos Factores)
**No implementado**: Para usuarios con roles altos (CEO, admin) sería recomendable 2FA con TOTP (Google Authenticator).

### 16. Internacionalización (i18n) completa
**Estado actual**: Existe `LanguageContext.jsx` y `LanguageSelector.jsx` pero la cobertura de traducciones es parcial.

### 17. Limpieza de warnings de ESLint en el frontend
**Estado actual**: El build del frontend produce warnings de ESLint. No bloquea la compilación pero indica código a mejorar.

### 18. Documentar URL del webhook WF9 en el backend
**Acción**: Verificar que `POST /api/auth/forgot-password` realmente envía el token al webhook de n8n WF9, o si usa el servicio de email directamente.

---

## Inconsistencias detectadas entre código y documentación

| Inconsistencia | Ubicación | Impacto |
|---|---|---|
| `GET /api/info` devuelve `"EcoCommerce API"` como nombre | `routes/index.js:41` | Menor — nombre desactualizado del proyecto anterior |
| `GET /api/info` no incluye `/billing` y `/tickets` en la lista de endpoints | `routes/index.js:56` | Menor — documentación desactualizada |
| `DEMO_RESET_TOKEN` en `docs/n8n-demo-reset-workflow.json` tiene el valor real del token | Archivo JSON en repo | ⚠️ El token está expuesto en el repositorio — si el repo es público, rotar el token |
| Las migraciones 012-014 tienen numeración duplicada (012-a, 012-b, etc.) | `migrations/` | Menor — no afecta funcionalidad pero dificulta el orden de ejecución |

---

## Estado de APIs externas (configuradas pero no activas)

| API | Variable env | Estado |
|---|---|---|
| CO2 Signal | `CO2_SIGNAL_API_KEY=your_carbon_api_key` | ⚠️ Valor placeholder — sin configurar |
| OpenWeather | `OPENWEATHER_API_KEY=` | ⚠️ Vacía |
| Air Quality | `AIR_QUALITY_API_KEY=` | ⚠️ Vacía |
| Electricity Map | `ELECTRICITY_MAP_API_KEY=` | ⚠️ Vacía |
| Energy Star | `ENERGY_STAR_API_KEY=` | ⚠️ Vacía |
| EU Ecolabel | `EU_ECOLABEL_API_KEY=` | ⚠️ Vacía |
| EPEAT | `EPEAT_API_KEY=` | ⚠️ Vacía |
| FSC | `FSC_API_KEY=` | ⚠️ Vacía |
| C2C | `C2C_API_KEY=` | ⚠️ Vacía |

Estas APIs alimentarían los módulos de Sostenibilidad y Certificaciones en tiempo real. Sin ellas, el sistema usa datos mock o los últimos datos guardados en BD.
