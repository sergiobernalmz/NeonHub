# 🛣️ Módulo 3: Rutas Dinámicas (Custom Paths)

Permite cambiar `/shop` por `/tienda` o `/dashboard` por `/panel` en cada tienda de forma independiente.

## 📋 Tareas
1.  **Backend/Models/Store.js**: Añadir objeto `url_mapping` (JSON).
2.  **Frontend/AppRoutes.jsx**: Refactoreo del routing para usar variables dinámicas basadas en este mapping.
3.  **Frontend/Contexts/ConfigContext.js**: Descargar el mapeo asincrónicamente al cargar el Tenant.

## 🚀 PROMPT PARA COMENZAR:
> "Antigravity, vamos con el Módulo 3 del ROADMAP (Rutas Dinámicas). Añade el campo 'url_mapping' (JSON) al Store en el backend y refactoriza el routing del frontend para que /shop, /dashboard, etc., sean personalizables por el cliente."
