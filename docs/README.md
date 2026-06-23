# NeonHub — Documentación Técnica

> **Estado**: En producción — SaaS multi-tenant para gestión de tiendas ecommerce con enfoque en sostenibilidad.
> **Última actualización**: 2026-04-21

---

## Índice de documentos

| Documento | Descripción |
|---|---|
| [technical/PROJECT_OVERVIEW.md](technical/PROJECT_OVERVIEW.md) | Qué es NeonHub, modelo de negocio, estado actual, URLs de producción |
| [technical/TECH_STACK.md](technical/TECH_STACK.md) | Stack completo: Node.js, React, Astro, PostgreSQL, Stripe, n8n, PM2 |
| [technical/ARCHITECTURE.md](technical/ARCHITECTURE.md) | Diagramas C4, flujo de datos, multi-tenancy, módulos del sistema, seguridad |
| [technical/N8N_WORKFLOWS.md](technical/N8N_WORKFLOWS.md) | 10 workflows documentados con nodos, integraciones y pendientes |
| [technical/API_REFERENCE.md](technical/API_REFERENCE.md) | Todos los endpoints REST por módulo con parámetros y respuestas |
| [technical/DATABASE_SCHEMA.md](technical/DATABASE_SCHEMA.md) | 27 modelos Sequelize, relaciones, índices, bugs corregidos |
| [technical/PENDING_WORK.md](technical/PENDING_WORK.md) | Backlog priorizado: endpoints pendientes, Trello/Slack n8n, mejoras |
| [technical/DEPLOYMENT.md](technical/DEPLOYMENT.md) | Guía de despliegue, PM2, Docker, variables de entorno, logs, rollback |

---

## Documentación adicional (legacy/complementaria)

| Documento | Descripción |
|---|---|
| [ARQUITECTURA.md](ARQUITECTURA.md) | Diagramas C4 en formato Mermaid (versión anterior) |
| [MODELO_DATOS.md](MODELO_DATOS.md) | ER diagrams detallados (versión anterior) |
| [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md) | Estado del proyecto en un punto anterior del desarrollo |
| [TFG_RESUMEN_PROYECTO.md](TFG_RESUMEN_PROYECTO.md) | Resumen ejecutivo para la memoria del TFG |
| [TFG_PENDIENTES_Y_SEGURIDAD.md](TFG_PENDIENTES_Y_SEGURIDAD.md) | Checklist de seguridad y pendientes TFG |
| [SEGURIDAD.md](SEGURIDAD.md) | Documentación detallada de medidas de seguridad |
| [api_integration_docs.md](api_integration_docs.md) | Documentación de la Ingest API para integraciones externas |
| [GUIA_LIMPIEZA_TECNICA.md](GUIA_LIMPIEZA_TECNICA.md) | Procedimientos de limpieza de datos y mantenimiento |
| [N8N_DEMOS_FCT_SAAS.md](N8N_DEMOS_FCT_SAAS.md) | Workflows n8n para demos del FCT/SaaS |

---

## Acceso rápido por rol

### Desarrollador nuevo en el proyecto
1. Leer [technical/PROJECT_OVERVIEW.md](technical/PROJECT_OVERVIEW.md) — contexto del negocio
2. Leer [technical/TECH_STACK.md](technical/TECH_STACK.md) — stack y dependencias
3. Leer [technical/ARCHITECTURE.md](technical/ARCHITECTURE.md) — cómo está construido
4. Consultar [technical/API_REFERENCE.md](technical/API_REFERENCE.md) — endpoints disponibles

### Operaciones / DevOps
1. [technical/DEPLOYMENT.md](technical/DEPLOYMENT.md) — todo lo necesario para operar
2. [technical/N8N_WORKFLOWS.md](technical/N8N_WORKFLOWS.md) — automatizaciones activas
3. [technical/PENDING_WORK.md](technical/PENDING_WORK.md) — Sección "Inconsistencias detectadas"

### Memoria del TFG
1. [technical/PROJECT_OVERVIEW.md](technical/PROJECT_OVERVIEW.md) — descripción del proyecto
2. [technical/TECH_STACK.md](technical/TECH_STACK.md) — justificación tecnológica
3. [technical/ARCHITECTURE.md](technical/ARCHITECTURE.md) — diseño arquitectónico
4. [technical/DATABASE_SCHEMA.md](technical/DATABASE_SCHEMA.md) — diseño de datos
5. [TFG_RESUMEN_PROYECTO.md](TFG_RESUMEN_PROYECTO.md) — resumen ejecutivo

---

## Estado del sistema a 2026-04-21

```
Backend API          ✅ Producción  23 módulos · 69/69 tests OK
Frontend SaaS        ✅ Producción  React 19 · 26 páginas
Landing Page         ✅ Producción  Astro 5 SSR
App Móvil            🚧 Desarrollo  Expo/React Native
Pagos Stripe         ✅ Producción  Checkout + Webhooks + Provisioning
SSO cross-subdomain  ✅ Producción  UUID 30s · atómico · PostgreSQL
Multi-tienda         ✅ Producción  user_stores N:M
n8n Workflows        ✅ 9 activos   WF4/WF5 pendientes de endpoint backend
Trello WF3/WF5       ⚠️ Pendiente  Credenciales Trello sin configurar en n8n
Redis                ❌ Deshabilitado  REDIS_ENABLED=false
CI/CD                ❌ No existe  Despliegue manual
```
