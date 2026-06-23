# Revisión Completa del Proyecto NeonHub (02/03/2026)

## 1) Objetivo de esta revisión
Este documento resume el estado real del proyecto en código y configuración, identifica qué falta para que NeonHub opere como SaaS sólido y define qué falta para considerar el proyecto “completado” (nivel TFG + nivel producción SaaS).

---

## 2) Resumen ejecutivo

### Estado global (realista)
- **Base funcional fuerte**: backend + frontend + landing + app móvil existente.
- **SaaS en fase intermedia**: hay base multi-tenant (modelo `Store`, ingest por API key, rutas admin), pero **aislamiento y gobierno tenant no están cerrados extremo a extremo**.
- **Pagos y onboarding**: Stripe está integrado técnicamente (intents, webhook, refund), pero faltan piezas de operación SaaS (planes, suscripción, reconciliación, hardening).
- **Calidad**: existen tests, pero **actualmente fallan** (backend y frontend), por lo que la calidad automatizada no está estable.
- **Documentación**: hay bastante documentación, pero con **inconsistencias** entre “pendiente” y “ya implementado”.

### Diagnóstico rápido
- **MVP técnico**: ✅
- **SaaS básico demo**: ✅
- **SaaS listo para escalar clientes reales**: ⚠️ Parcial
- **Proyecto completado para producción real**: ❌

---

## 3) Hallazgos por área

## 3.1 Backend API
### Lo que ya está
- Autenticación JWT con `access token` y `refresh token` (cookie httpOnly).
- Verificación de email implementada.
- Seguridad base: Helmet, rate limiting, sanitización, validación.
- Multi-tenant inicial:
  - Modelo `Store`.
  - `storeMiddleware` (resolución por `X-NeonHub-Api-Key` / `X-Store-ID`).
  - Endpoints de ingest (`/api/ingest/products`, `/api/ingest/orders`).
  - Alta de tiendas vía `/api/admin/stores`.
- Stripe implementado:
  - `create-intent`, `webhook`, `refund`.
  - Registro de transacciones.

### Lo que falta o está débil
- **Aislamiento tenant global incompleto**:
  - Solo parte de controladores filtra por `store_id` explícitamente.
  - Riesgo de fugas si se consulta sin scoping por tenant en rutas internas.
- **Super-admin acoplado a lógica débil**:
  - Comprobación por `username === 'admin'` en vez de política RBAC robusta.
- **Recuperación de contraseña**:
  - Hay cambio de contraseña autenticado, pero no flujo completo “olvidé contraseña” (token de reset por email + expiración + consumo único).
- **Pagos SaaS incompletos**:
  - Integración Stripe existe para e-commerce, pero no se ve sistema completo de **suscripciones SaaS por tenant** (estado de plan, ciclo de cobro, límites por plan).
- **Gobierno de API keys**:
  - Falta rotación formal, expiración, auditoría avanzada y políticas por entorno.

---

## 3.2 Frontend Web (Dashboard + Shop)
### Lo que ya está
- Aplicación funcional con dashboard y tienda.
- Checkout con Stripe Elements y proveedor Stripe.
- Flujos de auth y sesión funcionales.

### Lo que falta o está débil
- **Auth no aprovecha refresco automático de sesión de forma consistente** en cliente web (enfoque principal aún en token local).
- **UX SaaS tenant-aware parcial** (marca/plan/límites/estado de suscripción no se ven consolidados como producto SaaS completo).
- **Testing frontend inestable**: la suite falla por configuración/sintaxis de test setup.

---

## 3.3 App móvil
### Lo que ya está
- La app **sí existe** (Expo/React Native).
- Tiene estructura amplia de pantallas (`auth`, `products`, `cart`, `checkout`, `profile`, `reports`, `sustainability`).
- Servicios API y autenticación con almacenamiento local.

### Lo que falta o está débil
- Validación de cobertura funcional real (no solo estructura).
- Pipeline de build/release y QA móvil (beta interna, métricas de crash, publicación).

---

## 3.4 Calidad, pruebas y fiabilidad
### Evidencias actuales
- Hay tests backend (unit/integration/security) y al menos un test frontend.
- **Resultado real de ejecución**:
  - Backend: fallos por configuración Stripe en tests + error de asociaciones Sequelize (alias duplicado).
  - Frontend: fallo de parseo en setup de tests.

### Conclusión
- Existe framework de pruebas, pero **no está en estado “green”**.
- No se recomienda considerar el proyecto “terminado” sin estabilizar la suite CI.

---

## 3.5 Infraestructura y operación
### Lo que ya está
- Docker compose con PostgreSQL + backend.
- PM2 documentado para servicios.
- Configuraciones Nginx y scripts operativos.

### Lo que falta o está débil
- **CI/CD formal ausente** (workflows automáticos no visibles).
- Observabilidad incompleta (APM, trazas, alerting, SLOs).
- Endurecimiento producción pendiente (secrets management, rotación claves, backups verificados por restauración periódica).

---

## 3.6 Documentación
### Estado
- Muy extensa y útil.
- **Desalineada en varios puntos**:
  - Hay docs que dicen que móvil no existe, pero sí existe carpeta/app.
  - Hay docs que marcan refresh token o pagos como pendientes, pero en código aparecen implementaciones parciales/funcionales.

### Recomendación
- Consolidar una única “fuente de verdad” de estado (status board técnico).

---

## 4) ¿Cómo sería SaaS este proyecto (modelo objetivo)?

## 4.1 Propuesta SaaS final
NeonHub debe operar como **plataforma multi-tenant B2B** para tiendas:
- Cada cliente = un `Store/Tenant` con aislamiento estricto de datos.
- Onboarding self-service:
  1. Registro de tenant.
  2. Selección de plan.
  3. Alta de método de pago.
  4. Provisioning automático (store, admin, API keys).
- Monetización por suscripción:
  - Planes con límites (usuarios, pedidos/mes, módulos).
  - Cobro recurrente + gestión de impagos + upgrade/downgrade.
- Integración:
  - API keys por tenant para ingest y conectores.
  - Auditoría y trazabilidad por tenant.
- Operación:
  - Métricas por tenant, SLA, alertas, soporte y compliance.

## 4.2 Capacidades mínimas para decir “somos SaaS”
1. Aislamiento tenant completo y probado.
2. Suscripción y facturación recurrente operativa.
3. Onboarding automatizado de clientes.
4. Seguridad y gobierno de acceso por roles/tenant.
5. Observabilidad y soporte operativo básico.

---

## 5) Qué falta para ser SaaS (brechas concretas)

## 5.1 Multi-tenancy y seguridad (alta prioridad)
- Aplicar `tenant scoping` sistemático en todos los repositorios/controladores.
- Eliminar fallback ambiguo de tenant en rutas sensibles.
- Reforzar `super admin` con RBAC real (no por username fijo).
- Añadir tests de aislamiento: “Tenant A nunca ve datos de Tenant B”.

## 5.2 Billing SaaS (alta prioridad)
- Crear dominio de suscripción:
  - `Plan`, `Subscription`, `Usage`, `Invoice` SaaS.
- Implementar ciclo de vida:
  - trial, activa, past_due, suspendida, cancelada.
- Webhooks de suscripción y reconciliación de estados.
- Enforzar límites por plan en backend.

## 5.3 Onboarding y experiencia cliente (media-alta)
- Flujo unificado de alta tenant desde landing.
- Provisioning automático de store/admin/roles/api keys.
- Panel de “mi suscripción” y facturación para cliente.

## 5.4 Calidad y entrega (alta prioridad)
- Dejar tests en verde (backend/frontend).
- Añadir CI con gates mínimos:
  - lint
  - test
  - build
- Cobertura objetivo razonable por capas.

## 5.5 Operación producción (media-alta)
- Observabilidad: logs estructurados, métricas, alertas.
- Backups con pruebas de restauración.
- Gestión segura de secretos y rotación.
- Hardening CORS/cookies/proxy según dominio final.

---

## 6) Qué falta para completar el proyecto (visión TFG + producto)

## 6.1 Para cerrar TFG con solidez
- Estabilizar pruebas automatizadas y evidenciar ejecución.
- Demostrar flujo extremo a extremo:
  - tienda/ingest → pedido → pago → dashboard.
- Actualizar documentación para que coincida con el estado real.
- Incluir capítulo de arquitectura SaaS final + límites conocidos.

## 6.2 Para cerrar como producto SaaS vendible
- Completar billing recurrente y límites por plan.
- Garantizar aislamiento multi-tenant con pruebas formales.
- Cerrar flujo “forgot/reset password”.
- Montar CI/CD + observabilidad + runbooks operativos.

---

## 7) Roadmap recomendado (8 semanas)

### Fase 1 (Semanas 1-2): Base crítica
- Arreglar tests backend/frontend hasta estado green.
- Corregir inconsistencias de asociaciones y setup test.
- Inventario de endpoints sin scoping tenant.

### Fase 2 (Semanas 3-4): Aislamiento y seguridad SaaS
- Aplicar tenant scoping completo.
- Endurecer RBAC super-admin/admin/tenant-admin.
- Tests de aislamiento multi-tenant.

### Fase 3 (Semanas 5-6): Billing y onboarding SaaS
- Modelo `Plan/Subscription/Usage`.
- Cobro recurrente + webhooks de suscripción.
- Portal de suscripción del cliente.

### Fase 4 (Semanas 7-8): Operación y cierre
- CI/CD mínimo viable.
- Observabilidad y alertas.
- Documentación final sincronizada + checklist de salida.

---

## 8) Checklist final de “Proyecto completado”

Marcar como completado cuando todos sean ✅:
- [ ] Tests backend/frontend en verde en local y CI.
- [ ] Aislamiento multi-tenant verificado por tests automáticos.
- [ ] Billing SaaS recurrente operativo por plan.
- [ ] Onboarding self-service de tenant funcionando.
- [ ] Recuperación de contraseña completa.
- [ ] Observabilidad y backups validados.
- [ ] Documentación única, actualizada y coherente con código.

---

## 9) Conclusión
NeonHub está **bien encaminado** y ya supera un MVP típico: tiene arquitectura amplia, app móvil existente, pagos y base multi-tenant. Sin embargo, para ser **SaaS completo y listo para escalar clientes reales**, faltan cerrar piezas críticas de aislamiento global, suscripción recurrente, estabilidad de testing y operación productiva. Con un plan disciplinado por fases, el salto a SaaS completo es totalmente viable.

---

## Anexo: Plan técnico de implementación SaaS

Para ejecución técnica detallada (DDL, flujo Stripe idempotente, aprovisionamiento automático, RBAC y hardening), ver:

- `docs/PLAN_TECNICO_SAAS_SEGURIDAD_MAXIMA.md`
