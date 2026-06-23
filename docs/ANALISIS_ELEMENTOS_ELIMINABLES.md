# NeonHub — Análisis de Elementos Eliminables

**Fecha de análisis**: 4 de mayo de 2026  
**Proyecto**: NeonHub — Sistema SaaS Multi-Tenant de E-commerce Sostenible

---

## 1. Introducción

Este documento analiza qué elementos del proyecto NeonHub podrían eliminarse, ya sea porque están duplicados, anticuados, no se utilizan, o son simplemente ruido que dificulta la navegación y mantenimiento del proyecto.

**Nota importante**: Este análisis es únicamente informativo. No se ha modificado ningún archivo del proyecto.

---

## 2. Scripts de Desarrollo/Temporales (backend/)

Estos archivos en la raíz del proyecto `backend/` parecen ser scripts de utilidad temporal que probablemente ya no se necesitan:

| Archivo | Descripción | Recomendación |
|---------|-------------|----------------|
| `delete_user_task.js` | Script para eliminar usuarios | ⏳ Revisar si se usa actualmente |
| `delete_user_temp.js` | Script temporal de eliminación | ⏳ Revisar si se usa actualmente |
| `dev-dump.js` | Script de desarrollo para dumps | ⏳ Probablemente obsoleto |
| `generate-all-thumbnails.js` | Generador de miniaturas | ⚠️ Pode ser útil, revisar si se ejecuta |
| `query-user.js` | Script de consulta de usuarios | ⏳ Revisar uso |
| `seed-programmer.js` | Seed para usuario programador | ⚠️ Mantener si es para tests |
| `setup-db.js` | Script antiguo de setup de BD | ⏳ Revisar si se usa el actual |
| `sync-tickets.js` | Sincronización de tickets | ⚠️ Mantener si es funcional |
| `init-db.js` | Inicialización de base de datos | ⚠️ Mantener si se usa |

### Recomendación

- Revisar cuáles de estos scripts se ejecutan actualmente (verificar en `package.json` scripts o en la documentación)
- Los que no se usen y no tengan documentación asociada se pueden eliminar
- Los que tengan funcionalidad de utilidad (como `seed-programmer.js`) podrían moverse a `scripts/` o `tests/`

---

## 3. Archivos de Documentación Duplicados o Anticuados

### 3.1 Duplicados entre `/docs/` y `/docs/technical/`

El directorio `docs/technical/` contiene archivos que parecen ser versiones más detalladas de documentos existentes en `docs/`:

| Archivo en `/docs/` | Archivo en `/docs/technical/` | Estado |
|---------------------|------------------------------|--------|
| `ARQUITECTURA.md` | `docs/technical/ARCHITECTURE.md` | ⚠️ Duplicado |
| `SEGURIDAD.md` | (no existe) | ✅ Solo en docs |
| `MODELO_DATOS.md` | `docs/technical/DATABASE_SCHEMA.md` | ⚠️ Duplicado (más detallado en technical) |
| `ESTADO_ACTUAL.md` | `docs/technical/PENDING_WORK.md` | ⚠️ Relacionado |
| `README.md` | `docs/technical/PROJECT_OVERVIEW.md` | ⚠️ Duplicado |
| (no existe) | `docs/technical/TECH_STACK.md` | ✅ Solo en technical |
| (no existe) | `docs/technical/API_REFERENCE.md` | ✅ Solo en technical |
| (no existe) | `docs/technical/DEPLOYMENT.md` | ✅ Solo en technical |
| (no existe) | `docs/technical/N8N_WORKFLOWS.md` | ✅ Solo en technical |

### Recomendación

- Consolidar `docs/` con `docs/technical/`: decidir si mantener ambos o elegir la versión más completa
- Si el objetivo es simplificar, eliminar los archivos de `docs/` que están duplicatedos en `docs/technical/` y tienen menos contenido

### 3.2 Documentos Antiguos/Archivo

El directorio `docs/archive/` contiene documentos históricos que podrían no ser relevantes:

| Archivo | Descripción | Recomendación |
|---------|-------------|----------------|
| `PENDIENTES_PANEL_ENTERPRISE_landing.md` | Pendientes antiguos de landing | 🗑️ Posiblemente obsoleto |
| `SaaS_Business_Plan.md` | Plan de negocio antiguo | ⚠️ Mantener si es referencia |
| `REVISION_COMPLETA_SAAS_2026-03-02.md` | Revisión de marzo 2026 | ⚠️ Posible duplicado de ESTADO_ACTUAL |
| `PLAN_TECNICO_SAAS_SEGURIDAD_MAXIMA.md` | Plan de seguridad antiguo | ⚠️ Revisar si está superado por SEGURIDAD.md |
| `SISTEMA_CERTIFICACIONES_DOCUMENTACION.md` | Sistema de certificaciones | ⚠️ Mantener si hay información única |

### Recomendación

- Mover a una carpeta `docs/archive/` solo los documentos que tengan valor histórico
- Los que contengan información obsoleta o duplicada se pueden eliminar
- Antes de eliminar, verificar que la información no exista en otros archivos actualizados

---

## 4. Documentación Técnica en desuso o con problemas

### 4.1 Archivo con token expuesto

| Archivo | Problema |
|---------|----------|
| `docs/n8n-demo-reset-workflow.json` | Contiene `DEMO_RESET_TOKEN` con valor real — **expuesto en el repositorio** |

**Acción recomendada**: Rotar el token inmediatamente si el repositorio es público, o eliminar el archivo si ya no se usa.

### 4.2 Documentación con información desactualizada

| Archivo | Problema |
|---------|----------|
| `docs/n8n/` | Directorio que contiene documentación de n8n — verificar si los workflows están activos |
| `backend/schema.txt` | Archivo antiguo de esquema — verificar si está actualizado con las migraciones actuales |

---

## 5. Directorios y Archivos de Construcción/Cache

### 5.1 Directorio coverage

```
backend/coverage/
```

Contiene informes de cobertura de tests generados por Jest. No es necesario versionarlo (debería estar en `.gitignore`).

**Recomendación**: Verificar que está en `.gitignore`. Si no está, añadirlo.

### 5.2 Backups

```
backend/backups/
```

Contiene backups de la base de datos. No deberían estar en el repositorio.

**Recomendación**: Añadir a `.gitignore` si no lo está.

### 5.3 Logs

```
backend/logs/
logs/
```

Directorios de logs. No deberían estar en el repositorio.

**Recomendación**: Verificar que están en `.gitignore`.

---

## 6. Archivos de Configuración Obsoletos o Duplicados

### 6.1 nginx-nonhub.conf

Ubicación: `docs/nginx-nonhub.conf`

Este archivo de configuración de Nginx debería estar en el proyecto, pero hay que verificar:
- Si es la configuración actual usada en producción
- Si hay una versión más reciente en el VPS

**Recomendación**: Verificar que refleja la configuración real del servidor.

### 6.2 Documentos con información redundante

| Archivo | Problema |
|---------|----------|
| `backend/docs/` | Hay un directorio `backend/docs/` que podría contener documentación anticuada |

**Recomendación**: Revisar contenido de `backend/docs/` y decidir si mover a `docs/` o eliminar.

---

## 7. Elementos de la App Móvil que podrían no usarse

Revisar el directorio `mobile/` para identificar:
- Screens no implementadas completamente
- Componentes no utilizados
- Assets que ya no se usan

Según la documentación, la mayoría de pantallas están implementadas pero con implementación parcial. Esto no significa que se deban eliminar, pero sí que requieren trabajo de finalización.

---

## 8. Código no utilizado en el Backend

### 8.1 Rutas no implementadas

Según la documentación técnica, hay endpoints que no existen pero están documentados:

- `GET /api/admin/metrics/daily` — No implementado pero documentado
- `GET /api/admin/audit-logs` con filtro de anomalías — No implementado

### 8.2 APIs externas no configuradas

El backend tiene variables de entorno para APIs externas que no están configuradas:

- CO2 Signal API
- OpenWeather API
- Air Quality API
- Electricity Map API
- Energy Star API
- EU Ecolabel API
- EPEAT API
- FSC API
- C2C API

Estas APIs alimentarían módulos de Sostenibilidad, pero no están activas.

**Recomendación**: No eliminar el código que las usa, pero documentar que están placeholder.

---

## 9. Documentos con información potencialmente sensible

Los siguientes documentos deben revisarse antes de hacer público el repositorio:

| Archivo | Revisión recomendada |
|---------|---------------------|
| `docs/n8n-demo-reset-workflow.json` | ✅ Eliminar token expuesto |
| `.env` en backend/ | ✅ Verificar que no esté en repo (debe estar en .gitignore) |
| `.env` en frontend/ | ✅ Verificar que no esté en repo |

---

## 10. Resumen de Recomendaciones

### 🗑️ Eliminar (con precaución)

1. **Scripts temporales sin uso** en `backend/` (revisar package.json antes)
2. **Token expuesto** en `docs/n8n-demo-reset-workflow.json` — rotar o eliminar
3. **Duplicados de documentación** entre `docs/` y `docs/technical/` — consolidar

### ⚠️ Revisar antes de eliminar

1. `docs/archive/` — verificar qué tiene información única
2. `backend/schema.txt` — verificar si está actualizado
3. Scripts en raíz de `backend/` — confirmar que no se usan

### ✅ Mantener pero revisar estado

1. `.gitignore` — verificar que cubre coverage, backups, logs, uploads, .env
2. Configuración Nginx en `docs/nginx-nonhub.conf` — verificar que es la actual
3. APIs externas placeholder — mantener el código pero documentar estado

---

## 11. Checklist de Limpieza

- [ ] Revisar scripts en `backend/` que no se usan
- [ ] Eliminar/rotar token expuesto en `n8n-demo-reset-workflow.json`
- [ ] Consolidar documentación duplicada entre `docs/` y `docs/technical/`
- [ ] Verificar `.gitignore` cubre: coverage/, backups/, logs/, uploads/, .env
- [ ] Revisar contenido de `docs/archive/` y eliminar obsoletos
- [ ] Verificar que `backend/docs/` no tenga información anticuada
- [ ] Confirmar que la configuración de Nginx (`nginx-nonhub.conf`) es la actual

---

## 12. Notas Adicionales

- **No se ha modificado ningún archivo**: Las recomendaciones de este documento son informativas
- **Hacer backup antes de eliminar**: Siempre es recomendable hacer un backup o confirmar en git antes de borrar
- **Revisar estado actual del repositorio**: Antes de limpiar, verificar el estado real con `git status`

---

*Documento generado el 4 de mayo de 2026*
*Proyecto: NeonHub — Trabajo Final de Curso DAM*
*Este documento es únicamente informativo — no se han realizado cambios en el proyecto*