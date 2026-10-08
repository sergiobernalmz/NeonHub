# AGENTS.md — NeonHub

Proyecto documentado en el vault: `~/vault/oc.local/Proyectos/NeonHub/`

El plugin vault-guard ya inyecta automaticamente en cada turno:
- `index.md` (estado, stack, pendientes)
- tareas abiertas y en curso de `tareas.md`

Este fichero es una red de seguridad si el plugin fallara. Si lo lees a mano:
- `~/vault/oc.local/Proyectos/NeonHub/index.md`
- `~/vault/oc.local/Proyectos/NeonHub/tareas.md`

## Reglas
1. No inventes estado del proyecto: si el vault no lo dice, verificalo en el codigo.
2. Si creas/modificas/eliminas codigo, dependencias, endpoints, modelos o tareas,
   actualiza el fichero correspondiente del vault (stack.md/api.md/modelos.md/
   issues.md/historial.md) antes de terminar.
3. Usa la herramienta `vault_task` para gestionar tareas, no edites tareas.md a mano.
4. git commit/push quedan bloqueados si hay cambios sin reflejar en el vault
   (escape: antepone VAULT_GUARD_SKIP=1 al comando si de verdad necesitas saltarlo).

Prefijo de REF de este proyecto: NH
