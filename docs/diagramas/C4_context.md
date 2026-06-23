# C4 — Nivel 1: Diagrama de Contexto del Sistema

**Proyecto:** NeonHub  
**Nivel C4:** Context (Nivel 1)  
**Fecha:** 2026-04-10  

---

## Descripción

Este diagrama muestra NeonHub como sistema central, los actores que interactúan con él y los sistemas externos de los que depende. No detalla la arquitectura interna; eso se ve en el diagrama de Contenedores.

---

```mermaid
C4Context
  title Diagrama de Contexto — NeonHub SaaS

  Person(cliente, "Cliente Final", "Usuario que navega la tienda pública, compra productos y consulta sus pedidos desde web o app móvil")
  Person(admin, "Administrador de Tienda", "Gestiona catálogo, pedidos, clientes, métricas de sostenibilidad y configuración del tenant")
  Person(integrador, "Programador / Integrador", "Conecta plataformas externas (Shopify, WooCommerce, sistemas propios) a NeonHub mediante API Key")
  Person_Ext(operador, "Operador SaaS", "Empresa o autónomo que contrata NeonHub como servicio, gestiona su suscripción y aprovisiona su tienda")

  System(neonhub, "NeonHub", "Plataforma SaaS multi-tenant para gestión de e-commerce. Incluye dashboard admin, tienda pública, app móvil, landing de marketing y servicio VPS. Enfoque en sostenibilidad y certificaciones.")

  System_Ext(stripe, "Stripe", "Procesamiento de pagos de clientes finales y gestión de suscripciones SaaS de operadores")
  System_Ext(n8n, "n8n", "Automatización de workflows: onboarding de tenants, alertas de negocio, reportes ejecutivos y recuperación de ingresos")
  System_Ext(betterstack, "BetterStack", "Logging centralizado y monitorización de uptime del servicio")
  System_Ext(sentry, "Sentry", "Tracking de errores en tiempo real y alertas de rendimiento del backend")
  System_Ext(smtp, "SMTP / Nodemailer", "Envío de emails transaccionales: confirmaciones de pedido, recuperación de contraseña, notificaciones de sistema")

  Rel(cliente, neonhub, "Navega, compra y consulta pedidos", "HTTPS / App nativa")
  Rel(admin, neonhub, "Gestiona el negocio desde el dashboard", "HTTPS")
  Rel(integrador, neonhub, "Sincroniza productos y pedidos via Ingest API", "HTTPS / REST + API Key")
  Rel(operador, neonhub, "Contrata plan, aprovisiona tenant y configura tienda", "HTTPS")

  Rel(neonhub, stripe, "Crea payment intents, gestiona suscripciones y procesa webhooks", "HTTPS / Stripe SDK")
  Rel(neonhub, n8n, "Dispara eventos y webhooks para automatización", "HTTPS / Webhook")
  Rel(neonhub, betterstack, "Envía logs estructurados del backend", "HTTPS / @logtail/node")
  Rel(neonhub, sentry, "Reporta excepciones y trazas de error", "HTTPS / @sentry/node")
  Rel(neonhub, smtp, "Envía emails transaccionales", "SMTP / Nodemailer")
```

---

## Actores

| Actor | Tipo | Descripción |
|-------|------|-------------|
| **Cliente Final** | Usuario interno | Interactúa con la tienda pública (web) y/o la app móvil para comprar y consultar |
| **Administrador de Tienda** | Usuario interno | Usa el dashboard React para gestionar el negocio de su tenant |
| **Programador / Integrador** | Usuario interno | Consume la Ingest API con su API Key para sincronizar datos desde sistemas externos |
| **Operador SaaS** | Usuario externo | Empresa que contrata NeonHub; interactúa con la landing page para contratar y aprovisionar |

## Sistemas externos

| Sistema | Rol |
|---------|-----|
| **Stripe** | Pagos de clientes finales + suscripciones SaaS de operadores |
| **n8n** | Automatización: onboarding, alertas, reportes, revenue recovery |
| **BetterStack** | Observabilidad: logs del backend en producción |
| **Sentry** | Error tracking: excepciones del backend en tiempo real |
| **SMTP / Nodemailer** | Emails transaccionales (confirmaciones, notificaciones) |
