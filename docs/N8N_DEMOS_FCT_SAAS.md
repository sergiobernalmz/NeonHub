# Demo n8n para FCT + NeonHub SaaS

Fecha: 02/03/2026

## Objetivo
Usar n8n para mostrar automatización empresarial real sobre NeonHub:
- onboarding SaaS automático,
- operaciones de soporte,
- alertas de negocio,
- reporting para dirección.

La idea es que en presentación se vea claramente: **evento -> decisión -> acción automática -> trazabilidad**.

---

## Arquitectura recomendada (demo)

1. n8n corre como orquestador (self-hosted o cloud).
2. NeonHub expone APIs/webhooks (ya existentes en backend).
3. n8n consume Stripe y APIs de NeonHub.
4. n8n notifica por email/Slack/Telegram y guarda evidencias.

Flujo general:
- Trigger (Stripe/Webhook/Cron) -> IF/Rules -> API NeonHub -> Notificación -> Registro en Google Sheets/Notion/DB.

---

## Workflow 1 (principal): Onboarding SaaS automático

## Qué demuestra
- Conversión real de pago a alta automática de tenant.
- Idempotencia y estado de provisioning.

## Trigger
- `Stripe Trigger` (evento `checkout.session.completed`) o `Webhook` (si Stripe llama a NeonHub y n8n escucha un callback interno).

## Pasos n8n
1. Verifica que `payment_status` sea válido.
2. Extrae metadata (`tenant_name`, `subdomain`, `owner_email`, `plan_id`).
3. Llama a NeonHub:
   - `POST /api/billing/checkout-session` (si n8n inicia compra), o
   - `GET /api/billing/provisioning-status?subdomain=...` para seguimiento.
4. Si `status = active`:
   - enviar email de bienvenida,
   - crear tarea en CRM/Notion,
   - log en Google Sheets “Cliente activado”.
5. Si `status = failed`:
   - alerta a soporte + crear incidencia.

## Mensaje demo
“Cuando Stripe confirma pago, el alta de cliente no depende de nadie; se completa y deja trazabilidad.”

---

## Workflow 1B (temporal): Compra confirmada -> email para alta manual

## Cuándo usarlo
- Úsalo mientras no tengas wildcard DNS y SSL wildcard totalmente operativos.
- Objetivo: vender ya sin bloquear el negocio, con un proceso manual controlado.

## Trigger
- `Stripe Trigger` con evento `checkout.session.completed`.

## Nodos n8n (paso a paso)
1. `Stripe Trigger` (evento `checkout.session.completed`).
2. `IF` validar pago:
   - `payment_status = paid`.
3. `Set` preparar campos para operación:
   - `session_id`
   - `created`
   - `customer_email`
   - `metadata.tenant_name`
   - `metadata.subdomain`
   - `metadata.owner_email`
   - `metadata.owner_first_name`
   - `metadata.owner_last_name`
   - `metadata.plan_id`
4. `Email` a soporte/operaciones con asunto:
   - `Nuevo pago SaaS confirmado - Alta manual requerida - {{subdomain}}`
5. `Google Sheets` o `Notion` (opcional recomendado): registrar fila con estado `pendiente_manual`.

## Plantilla de email recomendada
Asunto:
- `Nuevo pago SaaS confirmado - Alta manual requerida - {{subdomain}}`

Cuerpo:
- `Se ha confirmado un pago SaaS y requiere alta manual.`
- `session_id: {{session_id}}`
- `plan: {{plan_id}}`
- `tenant_name: {{tenant_name}}`
- `subdomain: {{subdomain}}`
- `owner_email: {{owner_email}}`
- `owner_name: {{owner_first_name}} {{owner_last_name}}`
- `customer_email (Stripe): {{customer_email}}`
- `fecha_evento: {{created}}`

## Checklist de alta manual (operaciones)
1. Validar en Stripe Dashboard que la sesión está `paid`.
2. Comprobar deduplicación: revisar si `session_id` ya fue procesada.
3. Crear/activar tenant en NeonHub (store + owner admin + rol admin).
4. Crear subdominio DNS del cliente (modo manual).
5. Verificar acceso HTTPS del subdominio y login del owner.
6. Enviar email final al cliente con URL y pasos de acceso.
7. Marcar registro n8n/Sheet como `completado_manual`.

## SLA operativo recomendado
- Primer contacto al cliente: < 15 minutos tras el pago.
- Alta completa: < 2 horas en horario laboral.

## Mensaje demo
“Aunque el provisioning sea temporalmente manual, la detección del pago, la notificación y la trazabilidad están automatizadas con n8n.”

---

## Workflow 2: Alertas de pago fallido y recuperación

## Qué demuestra
- Operación SaaS (revenue protection).

## Trigger
- Stripe (`payment_intent.payment_failed` o eventos de suscripción `invoice.payment_failed`).

## Pasos n8n
1. Identifica tenant/cliente afectado.
2. Envía email automático de recuperación con CTA.
3. Crea ticket de seguimiento (Notion/Jira/Trello).
4. Si pasan X horas sin recuperar -> escalar por Slack/Telegram.

## Mensaje demo
“Reducimos churn y tickets manuales con una secuencia de recuperación automática.”

---

## Workflow 3: Soporte inteligente desde reportes internos

## Qué demuestra
- Integración de procesos internos y SLA.

## Trigger
- Cron cada 5 min o webhook interno al crear reporte crítico.

## Pasos n8n
1. Consulta reportes críticos en NeonHub (`reports` API interna).
2. Para prioridad `critical`:
   - notifica canal soporte,
   - crea tarea con SLA,
   - asigna responsable en herramienta externa.
3. Al resolver, envía resumen automático diario.

## Mensaje demo
“Los incidentes críticos no se pierden; el sistema crea escalado automático.”

---

## Workflow 4: Reporte ejecutivo diario (KPIs SaaS)

## Qué demuestra
- Visión de negocio y automatización de reporting.

## Trigger
- Cron diario (08:00).

## KPIs sugeridos
- nuevos tenants activados,
- pagos completados/fallidos,
- provisioning success rate,
- tickets críticos abiertos/cerrados,
- MRR estimado por plan.

## Pasos n8n
1. Llama a endpoints NeonHub y/o DB read-only.
2. Consolida datos (Function node).
3. Genera resumen markdown/html.
4. Envía por email y Slack.

## Mensaje demo
“Cada mañana dirección recibe KPIs sin generar informes manualmente.”

---

## Workflow 5: Seguridad operativa (detección básica)

## Qué demuestra
- Postura de seguridad activa.

## Trigger
- Cron cada 10 min.

## Pasos n8n
1. Consulta logs/auditoría (login fallidos, picos 401/403, anomalías).
2. Si supera umbral:
   - alerta seguridad,
   - crea incidente,
   - guarda evidencia.

## Mensaje demo
“n8n también sirve para seguridad operacional y compliance básico.”

---

## Workflow 6 (pendiente): Alerta de bajo stock al responsable

## Objetivo
- Avisar automáticamente al encargado de reposición cuando un producto esté por debajo del stock mínimo.

## Estado
- **Pendiente de implementación** (solo definido para hacerlo después).

## Diseño previsto
1. Trigger programado (cada 15-30 min) o evento interno desde NeonHub.
2. Consulta de productos con `stock_quantity <= min_stock_level`.
3. Agrupación por tienda/categoría/proveedor.
4. Notificación automática al responsable (email/Slack/Telegram).
5. Creación de tarea de reposición (Notion/Jira/Trello).
6. Evitar spam con deduplicación (no repetir alerta del mismo SKU en ventana temporal).

## Mensaje demo
“El sistema detecta riesgo de rotura de stock y avisa al responsable sin intervención manual.”

---

## Guion de demo recomendado (10-12 min)

1. Comprar plan demo en landing (o simular evento Stripe).
2. Mostrar en vivo estado de provisioning (`/api/billing/provisioning-status`).
3. Ver email/tarea automática creada por n8n.
4. Simular fallo de pago y ver escalado automático.
5. Cerrar con dashboard de KPI diario generado por n8n.

---

## Qué necesitas configurar

## En n8n
- Credenciales Stripe.
- Credenciales SMTP/Slack/Telegram.
- Variables:
  - `NEONHUB_API_BASE`
  - `NEONHUB_API_KEY` (si expones API técnica para n8n)
  - `N8N_WEBHOOK_SECRET`

## En NeonHub
- Entorno Stripe activo (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`).
- Endpoint de estado de provisioning activo.
- (Opcional recomendado) endpoint interno para “event push” a n8n con firma HMAC.

---

## Recomendación para FCT (alto impacto / bajo riesgo)

Si solo haces 2 workflows:
1) **Onboarding SaaS automático**
2) **Reporte ejecutivo diario**

Con eso enseñas:
- integración real de negocio,
- operación automatizada,
- valor para empresa (tiempo, errores, escalabilidad).

---

## Siguiente implementación técnica sugerida

1. Añadir en backend un `EventDispatcherService` para enviar eventos firmados a n8n:
- `tenant.provisioned`
- `payment.failed`
- `report.critical.created`

2. Crear carpeta de export de workflows n8n en repo:
- `docs/n8n/workflows/*.json`

3. Preparar dataset demo + script de simulación para presentación.
