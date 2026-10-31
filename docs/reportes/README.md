# Reportes de cambios

Regla del proyecto: **todo cambio de código genera un reporte `.md` en esta carpeta.**
Sirven para que cualquier persona o IA (Gemini, Claude, Antigravity) sepa qué se hizo, por qué y qué
quedó pendiente, sin leer todo el historial de git.

## Cuándo se escribe uno

- Uno por pull request (o por tarea de Jira, si la tarea abarca varios PR).
- También para cambios de configuración, infraestructura o base de datos (render.yaml, CI, migraciones, roles de BD).
- Se escribe **antes** de abrir el PR y se incluye en el mismo PR.

## Nombre del archivo

`AAAA-MM-DD-SCRUM-N-descripcion-corta.md`, por ejemplo `2026-10-24-SCRUM-11-lectura-documentos.md`.
Si no hay historia de Jira: `AAAA-MM-DD-chore-descripcion-corta.md`.
Los archivos se ordenan solos por fecha; **no hay un índice manual** para evitar conflictos de merge entre PR en paralelo.

## Contenido

Copiar `PLANTILLA.md`. Las secciones son obligatorias; si una no aplica, se escribe "No aplica".

## Reglas del contenido

1. **Nunca incluir secretos**: contraseñas, claves, URLs de base de datos con contraseña, tokens, URLs firmadas completas.
2. **Decir la verdad sobre la verificación**: qué se ejecutó de verdad y qué no se pudo comprobar. No marcar como hecho lo que no se probó.
3. Si el código final difiere de lo que decía un reporte anterior, el reporte nuevo lo dice explícitamente.
4. Escribir en español, con datos concretos (rutas, comandos, resultados), sin relleno.

## Cómo dárselos a una IA

Adjuntar `docs/CONTEXTO_PROYECTO.txt` (si existe) más los 3 a 5 reportes más recientes.
