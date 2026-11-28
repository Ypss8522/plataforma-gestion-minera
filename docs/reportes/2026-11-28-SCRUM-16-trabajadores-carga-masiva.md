# SCRUM-16 — Gestión de trabajadores y carga masiva

- **Fecha** 2026-11-28
- **Jira** [SCRUM-16](https://fabianandrealv852.atlassian.net/browse/SCRUM-16), Sprint 2, Acreditación. Responsable según Jira, Aarón Quiñonez.
- **Rama** `feat/SCRUM-16-trabajadores-carga-masiva`
- **Estado** listo para revisión

## Resumen

Acreditación puede dar de alta, consultar, editar y dar de baja trabajadores, además de asociar hasta cinco tags. El mismo módulo puede validar o importar un archivo XLSX o CSV y devolver errores por fila. La [guía de carga](../CARGA_TRABAJADORES.md) describe los endpoints, el formato, la plantilla y la respuesta.

## Criterios de aceptación

| Criterio | Implementación |
|---|---|
| CRUD y hasta cinco tags | Listado paginado, detalle, alta, edición y baja lógica. Los tags se normalizan antes de comprobar el límite y la unicidad. |
| Carga XLSX y CSV con errores por fila | Multipart con límite de 5 MiB, reporte ordenado y `dryRun`. La operación real inserta las filas válidas en transacciones de hasta 100. |
| DNI único | Ocho dígitos. Se detectan duplicados del archivo y de PostgreSQL. La restricción única también protege importaciones concurrentes. |
| Solo RRHH y SUPER_ADMIN | `RolesGuard` en el controlador, contexto del JWT en `withRlsContext()` y políticas de escritura de PostgreSQL para esos dos roles. |

## Archivos

| Ruta | Cambio |
|---|---|
| `src/acreditacion/trabajadores/` | Controlador, servicio, DTO, parser y pruebas de servicio, parser y roles. |
| `src/acreditacion/acreditacion.module.ts` | Registro del controlador y el servicio. |
| `prisma/migrations/20261128170000_scrum_16_trabajador_escritura/` | Políticas RLS para altas y actualizaciones. Se reutilizan `Trabajador`, `Tag` y `TrabajadorTag` con sus restricciones vigentes. |
| `package.json`, `package-lock.json` | Lectura y validación de XLSX/CSV y DTO parciales. |
| `docs/CARGA_TRABAJADORES.md`, `docs/plantillas/` | Contrato de la API y plantilla XLSX con datos ficticios. |
| `docs/SEGURIDAD_BD.md` | Notas sobre políticas de escritura y despliegue. |

## Decisiones de diseño y seguridad

- La baja lógica conserva documentos, asignaciones e historial. El DNI queda reservado. El listado ordinario excluye bajas y el detalle sigue disponible por UUID para usuarios autorizados.
- Cada archivo corresponde a una empresa existente y recibe su `empresaId` como campo multipart. La edición de un trabajador conserva su empresa. Se siguen los permisos internos de RRHH y SUPER_ADMIN documentados para la aplicación.
- Al asignar tags se reutilizan los nombres existentes, incluidos los del seed usados por Operaciones. Los nombres nuevos se guardan normalizados. El trabajador mantiene los vínculos que continúan al sustituir sus tags.
- El archivo se procesa en memoria. XLSX requiere firma ZIP y entradas propias de un libro, con límites sobre el tamaño descomprimido. CSV se verifica como texto UTF‑8 y por su estructura y encabezados. El parser rechaza fórmulas y prefijos de fórmula. Los DNI válidos se devuelven a los roles autorizados como parte del reporte de errores. El flujo no emite logs con DNI.
- Cada lote confirma sus inserciones y vínculos de tags en una sola transacción. Si falla la infraestructura después de confirmar algún lote, los lotes confirmados permanecen guardados. Un reintento comprueba de nuevo la unicidad de DNI. La simulación no reserva DNI ni crea trabajadores o tags.
- El endurecimiento de lectura RLS sin contexto sigue registrado en [SCRUM-28](https://fabianandrealv852.atlassian.net/browse/SCRUM-28).

## Pruebas y verificación

- `npm run lint` y `npm run build` finalizaron correctamente. `npm test -- --runInBand` completó 140 pruebas en 13 suites. Las tres suites nuevas se ejecutan con el comando de Jest que ya usa GitHub Actions.
- Prueba local de HTTP y PostgreSQL 16 temporal con las migraciones aplicadas, RLS habilitado y rol `minera_app` sin bypass. Se probaron un XLSX, un CSV de 601 filas, simulación, repetición de DNI, acceso denegado a TRABAJADOR, alta de tags, edición y baja. El middleware de la prueba proporcionó los roles y se ejecutó el `RolesGuard` real.
- Para probar manualmente el endpoint, utiliza el `curl` y la plantilla de la [guía de carga](../CARGA_TRABAJADORES.md).

## Despliegue

Aplica la migración en el entorno de destino mediante el procedimiento habitual. La verificación usa una base temporal local y deja pendiente validar el despliegue cuando se integre la rama.
