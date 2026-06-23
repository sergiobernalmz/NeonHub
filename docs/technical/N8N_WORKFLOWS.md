# NeonHub — Workflows n8n

## Servidor

- **URL**: `https://neonhub.n8nservidor.es`
- **Localización de archivos**: `docs/n8n/workflows/`
- **Total workflows**: 10 (9 en producción + 1 demo reset extra)

---

## Resumen de workflows

| # | Nombre | Estado | Trigger | Propósito |
|---|---|---|---|---|
| WF1 | Onboarding SaaS Automático | ✅ Producción | Stripe webhook | Provisiona tienda tras pago |
| WF1B | Onboarding Manual | ⚠️ Placeholder | Webhook manual | Fallback manual para onboarding |
| WF2 | Revenue Recovery | ✅ Producción | Stripe webhook | Email + Slack ante pago fallido |
| WF3 | Soporte SLA | ✅ Producción (parcial) | Cron 5 min | Alerta tickets críticos sin respuesta |
| WF4 | Reporte Ejecutivo Diario | ✅ Producción | Cron 08:00 | KPIs diarios por email y Slack |
| WF5 | Seguridad Operativa | ✅ Producción (parcial) | Cron 10 min | Detecta anomalías en audit logs |
| WF6 | Verificación Email Landing | ✅ Producción | Webhook | Verifica emails de usuarios landing |
| WF7 | Store Created | ✅ Producción | Webhook | Email de bienvenida al propietario |
| WF8 | Approved Provisioning | ⚠️ Demo | Webhook | Notifica aprovación de tienda (demo) |
| WF9 | Password Reset | ✅ Producción | Webhook | Email de recuperación de contraseña |
| DEMO | Demo Reset Cada Hora | ✅ Producción | Cron 1h | Resetea la tienda Demo automáticamente |

---

## WF1 — Onboarding SaaS Automático

**Archivo**: `1-Onboarding-SaaS-Automatico.json`
**Estado**: ✅ Producción

### Nodos
1. `Stripe Webhook (checkout.session.completed)` — Trigger via Stripe
2. `Verify Payment Paid` — IF: verifica que `payment_status = paid`
3. `Provision in NeonHub` — HTTP POST al backend para crear la tienda
4. `Email Welcome` — Email de bienvenida al nuevo cliente
5. `Slack Notification` — Alerta en canal de éxito
6. `Slack Alert (Failed)` — Alerta en canal si el provisioning falla

### Integraciones
- **Stripe**: webhook `checkout.session.completed`
- **Backend**: `POST /api/admin/provision-store` (con `x-admin-secret`)
- **Email SMTP**: `soporte@neonhub.es`
- **Slack**: canal de onboarding exitoso

### Variables de entorno necesarias
- `NEONHUB_API_BASE` — URL base del backend
- `NEONHUB_API_KEY` / `x-admin-secret` — Clave de acceso al backend
- Credenciales SMTP configuradas en n8n

---

## WF1B — Onboarding Manual

**Archivo**: `1B-Onboarding-Manual.json`
**Estado**: ⚠️ Placeholder / fallback

### Nodos
1. `Webhook` — Trigger manual
2. `IF_Paid` — Verificación de pago
3. `Set Data` — Preparación de datos
4. `Simulate Email` — Simulación de envío (HTTP request)

### Notas
Este workflow es un placeholder para casos donde el onboarding automático (WF1) falla o necesita intervención manual. No está completamente configurado para producción.

---

## WF2 — Revenue Recovery (Pago Fallido)

**Archivo**: `2-Revenue-Recovery.json`
**Estado**: ✅ Producción

### Nodos
1. `Stripe Webhook (invoice.payment_failed)` — Trigger via Stripe
2. `Verify Failed Event` — IF: verifica tipo de evento
3. `Email Recovery` — Email al cliente con instrucciones para actualizar método de pago
4. `Slack Churn Alert` — Alerta en canal `#cobros-fallidos`

### Integraciones
- **Stripe**: webhook `invoice.payment_failed`
- **Email SMTP**: email de recuperación al cliente
- **Slack**: canal `#cobros-fallidos`

### Variables de entorno necesarias
- Credenciales SMTP en n8n
- `SLACK_CHANNEL_COBROS_FALLIDOS` — ID del canal Slack (pendiente de validar)

---

## WF3 — Soporte SLA (Reportes Críticos)

**Archivo**: `3-Soporte-SLA.json`
**Estado**: ✅ Producción (Trello pendiente de configurar)

### Nodos
1. `Cron (5 min)` — Se ejecuta cada 5 minutos
2. `Fetch Critical Reports` — HTTP GET al backend buscando tickets críticos sin respuesta
3. `IF Has Reports` — Si hay tickets críticos
4. `Slack Critical Alert` — Alerta en canal de soporte
5. `Create Ticket (Trello)` — Crea tarjeta en tablero Trello

### Integraciones
- **Backend**: `GET /api/tickets?status=critical&unanswered=true`
- **Slack**: canal de soporte/operaciones
- **Trello**: creación de tarjetas (⚠️ pendiente configurar credenciales Trello en n8n)

### Pendientes
- Configurar credenciales Trello en el panel n8n
- Validar el ID del tablero y lista de Trello correctos
- Validar el ID del canal Slack

---

## WF4 — Reporte Ejecutivo Diario

**Archivo**: `4-Reporte-Ejecutivo-Diario.json`
**Estado**: ✅ Producción (endpoint backend pendiente)

### Nodos
1. `Cron (Diario 08:00)` — Se ejecuta cada día a las 08:00
2. `Fetch KPIs` — HTTP GET al backend para obtener métricas del día
3. `Generate Report Markdown` — Genera el cuerpo del informe en Markdown
4. `Email to CEO` — Envía el reporte por email
5. `Slack Executive` — Publica resumen en canal ejecutivo

### Integraciones
- **Backend**: `GET /api/admin/metrics/daily` ⚠️ **Endpoint pendiente de implementar**
- **Email SMTP**: email diario al CEO/dirección configurada
- **Slack**: canal `#seguridad-operativa` o canal ejecutivo

### Pendientes
- Implementar `GET /api/admin/metrics/daily` en el backend
- Validar ID del canal Slack ejecutivo

---

## WF5 — Seguridad Operativa

**Archivo**: `5-Seguridad-Operativa.json`
**Estado**: ✅ Producción (endpoint backend pendiente)

### Nodos
1. `Cron (10 min)` — Se ejecuta cada 10 minutos
2. `Fetch Audit Logs` — HTTP GET al backend para obtener logs de auditoría recientes
3. `IF > 5 Anomalies` — Si hay más de 5 anomalías en el período
4. `Slack Security Alert` — Alerta en canal `#seguridad-operativa`
5. `Create Incident Ticket` — Crea ticket de incidente (HTTP POST, Trello pendiente)

### Integraciones
- **Backend**: `GET /api/admin/audit-logs?anomalies=true` ⚠️ **Endpoint pendiente de implementar**
- **Slack**: canal `#seguridad-operativa`
- **Trello**: creación de incidente (⚠️ pendiente configurar)

### Pendientes
- Implementar `GET /api/admin/audit-logs` con filtro de anomalías
- Configurar credenciales Trello en n8n
- Validar ID del canal `#seguridad-operativa` en Slack

---

## WF6 — Verificación de Email (Landing)

**Archivo**: `6-Verificacion-Email-Landing.json`
**Estado**: ✅ Producción

### Nodos
1. `Webhook verify-email-landing` — Recibe token desde enlace en email
2. `Token presente?` — IF: valida que el token existe en el body
3. `POST /api/auth/verify-email` — Llama al backend para verificar
4. `Verificación exitosa?` — IF: verifica respuesta del backend
5. `Email: Verificación correcta` — Email de confirmación al usuario
6. `Log: Token inválido o ya usado` — Set node para logging
7. `Log: Sin token` — Set node para logging

### Integraciones
- **Astro API**: `POST /api/verify-email` (landing-page)
- **Email SMTP**: confirmación de verificación exitosa

### Notas
Este workflow actúa como intermediario entre el enlace de verificación en el email del usuario y el sistema de backend. La URL del webhook está en `N8N_VERIFY_EMAIL_WEBHOOK` en el `.env` de la landing.

---

## WF7 — Store Created (Email Bienvenida)

**Archivo**: `7-Store-Created.json`
**Estado**: ✅ Producción

### Nodos
1. `Webhook store-created` — Llamado por el backend tras provisioning exitoso
2. `Payload válido?` — IF: verifica campos obligatorios en el payload
3. `Email: Bienvenida owner` — Email con URLs del panel y tienda al propietario
4. `Log: Payload inválido` — Set node para logging de errores

### Integraciones
- **Backend → n8n**: `N8N_STORE_CREATED_WEBHOOK_URL` en `.env`
- **Email SMTP**: email de bienvenida con credenciales y URLs

### Payload esperado del backend
```json
{
  "owner_email": "email@empresa.com",
  "owner_name": "Nombre Propietario",
  "store_name": "Nombre Tienda",
  "subdomain": "mitienda",
  "panel_url": "https://mitienda.neonhub.es/admin"
}
```

---

## WF8 — Approved Provisioning

**Archivo**: `8-Approved-Provisioning.json`
**Estado**: ⚠️ Demo / pruebas

### Nodos
1. `Webhook stripe-webhook-demo-approved` — Trigger de aprobación manual
2. `Payload válido?` — IF: validación
3. `Construir URLs del tenant` — Set node con URLs calculadas
4. `Email: Tenant aprobado` — Email notificando aprobación
5. `Log: Payload inválido` — Set node

### Notas
Este workflow es para el flujo de provisioning manual (donde un admin aprueba la solicitud). Actualmente es solo para demo/pruebas, no está en producción activa.

---

## WF9 — Password Reset

**Archivo**: `9-Password-Reset.json`
**Estado**: ✅ Producción

### Nodos
1. `Webhook password-reset` — Recibe solicitud de reset
2. `Datos válidos?` — IF: valida email y token
3. `Email: Recuperación de contraseña` — Email con enlace de reset
4. `Log: Datos inválidos` — Set node

### Integraciones
- **Email SMTP**: email con enlace de recuperación
- Enlace apunta a `https://neonhub.es/reset-password?token={token}` o `https://{sub}.neonhub.es/reset-password`

---

## DEMO — Demo Reset Cada Hora

**Archivo**: `n8n-demo-reset-workflow.json` (en `/docs/`)
**Estado**: ✅ Producción

### Nodos
1. `Cada hora` — Schedule trigger cada 60 minutos
2. `POST reset Demo` — HTTP POST a `/api/billing/admin/demo/reset` con `X-Reset-Token`
3. `¿Éxito?` — IF: verifica `response.success === true`
4. `OK (sin acción)` — NoOp si éxito
5. `Email — alerta error` — Email a `soporte@neonhub.es` si el reset falla

### Integraciones
- **Backend**: `POST /api/billing/admin/demo/reset` — Protegido por `X-Reset-Token` header
- **Email SMTP**: alerta de error a soporte@neonhub.es

### Variables necesarias
- `DEMO_RESET_TOKEN` en el backend `.env`
- Token configurado directamente en el nodo HTTP del workflow

---

## Variables de entorno usadas por n8n

Estas variables deben estar configuradas en el panel de n8n como credenciales o variables de entorno:

| Variable | Descripción | Workflows |
|---|---|---|
| SMTP credentials | Servidor, puerto, usuario, pass de soporte@neonhub.es | WF1,2,3,4,6,7,8,9,DEMO |
| `NEONHUB_API_BASE` | URL base del backend (`https://neonhub.es/api`) | WF1,3,4,5 |
| `NEONHUB_API_KEY` | `x-admin-secret` para backend | WF1 |
| `SLACK_BOT_TOKEN` | Token de bot Slack | WF1,2,3,4,5 |
| `SLACK_CHANNEL_COBROS_FALLIDOS` | ID canal `#cobros-fallidos` | WF2 |
| `SLACK_CHANNEL_SEGURIDAD` | ID canal `#seguridad-operativa` | WF4,5 |
| `TRELLO_API_KEY` | API key de Trello | WF3,5 |
| `TRELLO_TOKEN` | Token OAuth de Trello | WF3,5 |
| `TRELLO_BOARD_ID` | ID del tablero de soporte | WF3 |
| `TRELLO_BOARD_INCIDENTES` | ID del tablero de incidentes | WF5 |
| `DEMO_RESET_TOKEN` | Token para reset de Demo | DEMO |

---

## Pendientes globales n8n

1. **Configurar credenciales Trello** en el panel n8n para WF3 y WF5
2. **Validar IDs de canales Slack** (`#cobros-fallidos`, `#seguridad-operativa`)
3. **Implementar `GET /api/admin/metrics/daily`** en backend (WF4 depende de este endpoint)
4. **Implementar `GET /api/admin/audit-logs`** en backend (WF5 depende de este endpoint)
5. **Activar WF8** para flujo manual de aprovación si se necesita
6. **Documentar URL del webhook** para WF9 Password Reset en el backend
