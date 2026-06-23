# NeonHub (EcoCommerce) — Resumen para TFG (2º DAM)

## 1. Qué es

**NeonHub** (nombre anterior: EcoCommerce) es un **sistema SaaS multi-tenant** para la gestión de un e-commerce con enfoque en **sostenibilidad**. El proyecto ofrece:

- Un **dashboard administrativo** (gestión de catálogo, pedidos, clientes, reportes, métricas y certificaciones).
- Una **tienda pública** (catálogo, carrito y checkout).
- Una **landing page** (marketing del servicio).
- Una **app móvil** (cliente para consumir la API y consultar/crear funcionalidades del sistema).

El objetivo del proyecto es demostrar una solución completa de **arquitectura web moderna**, con separación de capas (frontend/backend), persistencia relacional y medidas de seguridad básicas para un MVP.

## 2. Objetivo del sistema

- Gestionar productos (incluyendo datos relacionados con sostenibilidad y certificaciones).
- Gestionar pedidos y clientes.
- Permitir a usuarios registrarse y operar en la tienda pública.
- Soportar un modelo SaaS multi-tenant con “tiendas/empresas” (tenant) identificadas por subdominio y/o cabeceras.

## 3. Arquitectura (alto nivel)

Componentes principales del repositorio:

- `backend/`: API REST (Node.js + Express) con ORM (Sequelize) y base de datos relacional.
- `frontend/`: SPA (React + Vite) que contiene dashboard + tienda pública.
- `landing-page/`: web de marketing (Astro).
- `mobile/`: app móvil (Expo / React Native) consumiendo la API.
- `docs/`: documentación interna (seguridad, roadmap, etc.).

Flujo típico:

1. El usuario navega por `frontend/` (dashboard/tienda) o `mobile/`.
2. El cliente llama a la API del `backend/` (`/api/...`).
3. La API aplica autenticación/autorización (JWT + roles) y resuelve el contexto tenant (tienda/empresa).
4. Persistencia mediante Sequelize sobre una BD relacional (dialecto configurable por entorno).

## 4. Tecnologías

### Backend (API)

- **Node.js** + **Express**
- **Sequelize** (ORM)
- **Bases de datos** (según entorno/config):
  - PostgreSQL (config por defecto en desarrollo/producción)
  - MySQL (config de tests)
  - SQLite (dependencia disponible)
- **Autenticación**: JWT
- **Seguridad**: Helmet, CORS, rate limiting, sanitización/validaciones
- **Subida de archivos**: Multer + Sharp (imágenes y thumbnails)
- **Pagos/facturación**: Stripe (dependencia e integración parcial)
- **Tiempo real**: Socket.IO (inicializado para tickets)
- **Email**: Nodemailer (instalado, uso según configuración)
- **Testing**: Jest + Supertest

### Frontend (Dashboard + Tienda)

- **React** + **Vite**
- **React Router**
- **TailwindCSS**
- **Axios**
- **Recharts** (gráficas)
- **Stripe Elements** (dependencias instaladas)
- **Testing**: Vitest + Testing Library
- **Lint**: ESLint

### Landing page

- **Astro** (con adaptador Node)
- **TailwindCSS**
- **@astrojs/db** (base/local DB para la landing según configuración)

### App móvil

- **Expo** + **React Native**
- **React Navigation**
- **AsyncStorage**
- **Axios**

## 5. Módulos funcionales (backend)

La API agrupa funcionalidades por rutas (módulos):

- Autenticación y usuarios: `/api/auth`, `/api/users`
- Productos y categorías: `/api/products`, `/api/categories`
- Pedidos: `/api/orders` y endpoints públicos `/api/public/...`
- Carrito: `/api/cart`
- Clientes: `/api/customers`
- Reportes y tickets: `/api/reports`, `/api/tickets`
- Notificaciones: `/api/notifications`
- Sostenibilidad y certificaciones: `/api/sustainability`, `/api/certifications`
- Pagos y facturación: `/api/payments`, `/api/billing`
- Ingesta/admin: `/api/ingest`, `/api/admin`

## 6. Multi-tenancy (SaaS)

El proyecto contempla un modelo SaaS donde una **Store** representa el tenant. La resolución de tenant se realiza principalmente por:

- **Subdominio** (ej.: `empresa.neonhub.es`) y/o
- Cabeceras (`X-NeonHub-Api-Key`, `X-Store-ID`) para ciertos flujos.

## 7. Ejecución en local (referencia)

Requisitos:

- Node.js >= 18, npm >= 9
- Base de datos relacional configurada (según `.env`)

Comandos típicos (desde la raíz):

- Instalar dependencias: `npm run install:all`
- Desarrollo (backend + frontend): `npm run dev`

Comandos habituales por proyecto:

- Backend: `npm run dev`, `npm run migrate`, `npm run seed`, `npm run test`
- Frontend: `npm run dev`, `npm run build`, `npm run lint`, `npm run test`
- Landing: `npm run dev`, `npm run build`
- Mobile: `npm run start` (Expo)

## 8. Despliegue (referencia)

El repositorio incluye configuración para:

- **PM2** (procesos de backend, frontend servido y landing SSR)
- **Nginx** como reverse proxy

## 9. Estado actual (según repo)

- Existe backend, frontend, landing y app móvil en el repositorio.
- Hay documentación previa en `docs/`, pero se han detectado **desajustes** entre documentación y código/configuración (puertos, features marcadas como “pendiente” que ya existen, etc.).

