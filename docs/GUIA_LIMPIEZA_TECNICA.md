# 🧹 Guía de Higiene y Limpieza Técnica (Proyecto NeonHub)

Esta guía detalla los pasos críticos para "limpiar" y profesionalizar el repositorio de **NeonHub** antes de la entrega definitiva del TFG (2º DAM). El objetivo es pasar de un "entorno de desarrollo" a un "entorno de entrega" impecable.

---

## 📋 1. Limpieza de Código y Calidad (Higiene Técnica)

### ✅ Checklist 1.1: Depuración y Logs
- [ ] **Eliminar `console.log`**: 
    - Actualmente hay más de 180 repartidos por el proyecto. 
    - *Acción*: Eliminar todos los que no sean estrictamente necesarios para errores críticos. 
    - *Comando rápido*: `grep -r "console.log" .` para localizarlos.
- [ ] **Limpieza de "Código Muerto"**: 
    - Eliminar funciones comentadas, importaciones no utilizadas y variables huérfanas.
    - Especial atención a archivos `.bak`, `.old` o carpetas temporales de pruebas.

### ✅ Checklist 1.2: Estándares y Estilo
- [ ] **Ejecutar Lint en Frontend**: 
    - El proyecto reporta errores de reglas de hooks y variables no usadas.
    - *Acción*: Correr `npm run lint --fix` en la carpeta `frontend`.
- [ ] **Formateo de Código**: 
    - Asegurar que todo el proyecto sigue las mismas reglas de indentación (preferiblemente usar un archivo `.prettierrc`).

---

## 🔒 2. Seguridad y Privacidad

### ✅ Checklist 2.1: Gestión de Secretos
- [ ] **Verificación de `.env.example`**: 
    - Confirmar que todas las variables de entorno necesarias están documentadas en los archivos `.example` (especialmente Stripe, Mailer y JWT).
- [ ] **Limpieza de Historial**: 
    - Si en algún momento se subieron claves reales al historial de Git, considerar mencionarlo como "medida de mitigación" en la memoria del TFG.

### ✅ Checklist 2.2: Auditoría y Dependencias
- [ ] **Auditoría de Vulnerabilidades**: 
    - *Acción*: Ejecutar `npm audit` en la raíz, backend y frontend.
    - *Acción*: Corregir vulnerabilidades críticas/altas o documentar si son falsos positivos.

---

## 🎨 3. Consistencia de Marca y Documentación

### ✅ Checklist 3.1: Branding (EcoCommerce -> NeonHub)
- [ ] **Búsqueda Global**: 
    - Buscar "EcoCommerce" en todo el repositorio y sustituir por "NeonHub" (excepto quizás en alguna mención histórica en la memoria).
- [ ] **README y Manuales**: 
    - Asegurar que el `README.md` principal menciona NeonHub y tiene los enlaces y puertos actualizados.

### ✅ Checklist 3.2: Puertos y URLs
- [ ] **Estandarización de Puertos**:
    - Backend: `4000` (o el que se decida).
    - Frontend: `5173` (Vite por defecto).
    - Landing: `3000` (Astro).
    - *Acción*: Confirmar que estos puertos coinciden en las configuraciones de CORS y en los manuales de usuario.

---

## 📦 4. Preparación para la Entrega (Packaging)

### ✅ Checklist 4.1: Base de Datos y Seeds
- [ ] **Reset de Datos**: 
    - El tribunal debe poder arrancar el proyecto y verlo con datos.
    - *Acción*: Asegurar que `npm run db:reset` o `npm run seed` funciona perfectamente y carga un catálogo "limpio" (sin productos de prueba como "asfghjkl").

### ✅ Checklist 4.2: Limpieza de Archivos Temporales
- [ ] **Uploads**: 
    - Vaciar `backend/uploads` excepto por las imágenes base del sistema.
- [ ] **Logs de Servidor**: 
    - Borrar archivos `.log` locales para no enviarlos en el ZIP.

### ✅ Checklist 4.3: Empaquetado final (ZIP)
- [ ] **Exclusiones**:
    - NO incluir `node_modules`.
    - NO incluir carpetas de build/dist (`frontend/dist`, `backend/build`).
    - NO incluir archivos `.env` reales (solo `.env.example`).
    - NO incluir carpetas ocultas de IDEs (`.vscode`, `.idea`).

---

## 🚀 Próximos Pasos Recomendados

1.  **Limpieza Automática**: Correr scripts de lint y formateo.
2.  **Limpieza Manual de Logs**: Revisar los controladores principales.
3.  **Capturas para la Memoria**: Realizar las capturas de pantalla **DESPUÉS** de la limpieza para que el código y la interfaz se vean profesionales.

---
*Documento generado para el TFG de 2º DAM - NeonHub*
