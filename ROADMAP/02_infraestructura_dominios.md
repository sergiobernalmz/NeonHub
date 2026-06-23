# 🌐 Módulo 2: Dominios Personalizados (Custom Domains)

El cliente podrá usar su propio dominio (`tu-tienda.com`) para acceder directamente a su shop en NeonHub.

## 📋 Tareas
1.  **Backend/Models/Store.js**: Añadir campo `custom_domain`.
2.  **Backend/Middleware/tenantContext.js**: Permitir búsqueda por `req.headers.host` si no es un subdominio de `neonhub.es`.
3.  **Frontend/Components/TenantGuard.jsx**: Refactoreo para que no asuma que el dominio siempre termina en `.neonhub.es`.

## 🚀 PROMPT PARA COMENZAR:
> "Antigravity, vamos con el Módulo 2 del ROADMAP (Dominios). Modifica el modelo Store para incluir 'custom_domain' y actualiza el middleware tenantContext y el TenantGuard del frontend para soportar dominios externos."
