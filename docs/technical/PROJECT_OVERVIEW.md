# NeonHub — Visión General del Proyecto

## Descripción

**NeonHub** es una plataforma SaaS multi-tenant para la gestión integral de tiendas de comercio electrónico con enfoque en sostenibilidad. Permite a empresas y emprendedores lanzar y operar su propia tienda online bajo un subdominio dedicado (`{nombre}.neonhub.es`), con todas las herramientas de gestión incluidas desde el primer día.

El proyecto nació como Trabajo Final de Grado (TFG) del ciclo de Desarrollo de Aplicaciones Multiplataforma (DAM), con la ambición de construir un sistema real, desplegado en producción y con clientes reales.

---

## Problema que resuelve

Las pequeñas y medianas empresas que quieren vender online se enfrentan a dos extremos:

- **Plataformas genéricas** (Shopify, WooCommerce): costosas, poco flexibles, sin diferenciación.
- **Desarrollo a medida**: caro, lento, requiere equipo técnico propio.

NeonHub ocupa el espacio intermedio: una plataforma gestionada donde cada cliente tiene su propio entorno aislado, personalizable, con panel de control completo, sin necesidad de infraestructura propia.

El enfoque en **sostenibilidad** (certificaciones ecológicas, métricas CO₂, reportes medioambientales) lo diferencia en un mercado creciente.

---

## A quién va dirigido

| Perfil | Caso de uso |
|---|---|
| Pymes y emprendedores | Lanzar tienda online sin infraestructura propia |
| Tiendas con enfoque eco | Gestionar y comunicar certificaciones y métricas de sostenibilidad |
| Agencias y revendedores | Crear tiendas para clientes bajo un modelo white-label |

---

## Modelo de negocio

**SaaS por suscripción mensual** con planes diferenciados:

| Plan | Descripción |
|---|---|
| Básico | 1 tienda, funciones esenciales |
| Profesional | Más capacidad, analytics avanzados |
| Empresa | Multi-tienda, soporte prioritario |

El flujo de alta es:
1. Cliente se registra en `neonhub.es`
2. Selecciona plan y paga con Stripe
3. El sistema provisiona automáticamente su tienda con subdominio propio
4. Accede al panel de control en `{subdominio}.neonhub.es/admin`

---

## Estado actual del proyecto

| Área | Estado |
|---|---|
| Backend API | ✅ Producción — 23 módulos de rutas, 69/69 tests pasando |
| Frontend SaaS | ✅ Producción — React 19, 26 páginas |
| Landing Page | ✅ Producción — Astro SSR con registro, checkout y dashboard |
| App Móvil | 🚧 En desarrollo — Expo/React Native, pantallas básicas |
| Automatización n8n | ✅ 9 workflows activos en producción |
| Pagos Stripe | ✅ Integración completa con webhooks |
| SSO cross-subdomain | ✅ Implementado (abril 2026) |
| Multi-tienda | ✅ Implementado (abril 2026) |

---

## URLs de producción

| Servicio | URL |
|---|---|
| Landing page | https://neonhub.es |
| Dashboard de usuario | https://neonhub.es/dashboard |
| Tienda demo | https://demo.neonhub.es |
| API backend | https://neonhub.es/api |
| Admin VPS | https://neonhub.es/admin (panel interno) |

---

## Equipo

| Rol | Responsabilidad |
|---|---|
| Desarrollador principal | Sergio Bernal — alumno TFG DAM |
| Roles en sistema | `programmer`, `ceo_neonhub`, `ceo`, `admin`, `manager`, `employee`, `customer` |

El sistema tiene un usuario `programmer` (nivel de acceso máximo, SaaS management) y `ceo_neonhub` que es el rol propietario del sistema NeonHub como empresa.

---

## Infraestructura activa

- **VPS propio** con Docker + PM2
- **4 procesos PM2**: backend (cluster), frontend (fork), landing (fork), vps-panel (fork)
- **3 bases de datos PostgreSQL**: `neonhub_db` (principal), `landing_db`, `vps_db`
- **n8n** en servidor separado (`neonhub.n8nservidor.es`) con 9 workflows activos
- **Redis**: configurado pero deshabilitado (REDIS_ENABLED=false), usando PostgreSQL para SSO tokens

---

## Notas para el TFG

Este proyecto demuestra:
- Arquitectura multi-tenant real con aislamiento por subdominio
- Sistema de autenticación JWT con refresh tokens, SSO y roles RBAC
- Integración completa de pagos (Stripe checkout, webhooks, provisioning automático)
- Automatización de procesos de negocio con n8n
- Stack moderno: Node.js + React + Astro + PostgreSQL
- Despliegue en producción real con dominio propio y usuarios activos
