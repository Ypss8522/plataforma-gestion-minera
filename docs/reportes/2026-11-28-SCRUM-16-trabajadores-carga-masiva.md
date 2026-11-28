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

- Al asignar tags se reutilizan los nombres existentes, incluidos los del seed usados por Operaciones. Los nombres nuevos se guardan normalizados. El trabajador mantiene los vínculos que continúan al sustituir sus tags.
- El archivo se procesa en memoria. XLSX requiere firma ZIP y entradas propias de un libro, con límites sobre el tamaño descomprimido. CSV se verifica como texto UTF‑8 y por su estructura y encabezados. El parser rechaza fórmulas y prefijos de fórmula. Los DNI válidos se devuelven a los roles autorizados como parte del reporte de errores. El flujo no emite logs con DNI.
- Cada lote confirma sus inserciones y vínculos de tags en una sola transacción. Si falla la infraestructura después de confirmar algún lote, los lotes confirmados permanecen guardados. Un reintento comprueba de nuevo la unicidad de DNI. La simulación no reserva DNI ni crea trabajadores o tags.

## Baja lógica y reactivación

`DELETE /api/v1/trabajadores/:id` establece `estadoGeneral = INACTIVO` (`estado_general` en PostgreSQL). El listado predeterminado excluye `INACTIVO`. El filtro `?estadoGeneral=INACTIVO` permite consultar las bajas y el detalle sigue disponible por UUID para RRHH y SUPER_ADMIN. El DNI queda reservado, así que un nuevo `POST` con ese DNI devuelve `409` y la importación lo reporta como duplicado.

RRHH y SUPER_ADMIN pueden reactivar al trabajador con el `PATCH /api/v1/trabajadores/:id` existente y el cuerpo `{"estadoGeneral":"ACTIVO"}`. Se conserva el UUID, el DNI y el historial. En esta revisión se agregó una prueba del listado y la reactivación por el servicio. El comportamiento ya estaba implementado.

## Empresa de la carga

`empresaId` se recibe como campo del formulario multipart y debe ser un UUID. Todas las filas usan esa misma empresa. Un valor ausente o con formato inválido devuelve `400`. Con un archivo válido y un UUID que no corresponde a una empresa existente, el servicio devuelve `404` (`La empresa no existe.`) antes de procesar lotes, tanto en simulación como en carga real. La edición individual conserva la empresa del registro.

## Dependencias agregadas y auditoría

| Librería | Versión en la rama | Uso y hallazgos de `npm audit` |
|---|---|---|
| `@nestjs/mapped-types` | `2.1.0` | Deriva el DTO de edición parcial del DTO base y conserva su validación. Sin hallazgos nuevos. |
| `csv-parse` | `7.0.3` | Interpreta campos entrecomillados, separadores y números de línea de CSV. Sin hallazgos nuevos. |
| `exceljs` | `4.4.0` | Lee las celdas, fechas y fórmulas del XLSX. Sin hallazgos nuevos. |
| `yauzl` | `3.4.0` | Valida el contenedor ZIP y el tamaño de las entradas antes de leer el XLSX. Sin hallazgos nuevos. |
| `@types/yauzl` | `2.10.3` | Tipos TypeScript de `yauzl`. Dependencia de desarrollo. Sin hallazgos nuevos. |
| `uuid` bajo `exceljs` | `11.1.1` | Dependencia transitiva fijada mediante `overrides`. La auditoría solo señaló otras rutas de `uuid` que ya existían en la base. |

`npm audit --json` devolvió código `1` en la rama y en el commit base `9026b77`. Ambos registraron 39 hallazgos, repartidos en 3 bajos, 24 moderados, 10 altos y 2 críticos. Al comparar los paquetes y las rutas afectadas, no apareció ningún hallazgo nuevo en las dependencias directas ni transitivas de SCRUM-16. Entre los hallazgos existentes, `multer` figura con severidad alta y es relevante porque atiende el multipart de la carga. Se debe evaluar una actualización compatible de `@nestjs/platform-express` que incluya una versión corregida de Multer antes del despliegue. Los dos críticos existentes corresponden a `handlebars` y `proxy-addr`.

## Cobertura de las suites nuevas

| Suite | Cobertura |
|---|---|
| `trabajadores.service.spec.ts` | CRUD a través de `withRlsContext()`, reutilización de tags, baja, filtro y reactivación, conflicto por DNI existente (`P2002`), duplicados en simulación y carga, reporte ordenado, simulación sin escrituras, empresa inexistente en ambos modos y división de 601 filas en lotes de 100 con Prisma simulado. |
| `importacion-trabajadores.parser.spec.ts` | Plantilla XLSX con DNI que empieza por cero, fechas de Excel, fórmulas XLSX con resultado en caché, prefijos de fórmula en CSV, CSV con BOM y comillas, números de fila físicos, DNI repetido dentro del archivo, valores inválidos, tags repetidos después de normalizar, ZIP inválido, tamaño máximo y archivos de cero bytes o con solo encabezados. |
| `trabajadores.controller.spec.ts` | `RolesGuard` en las seis rutas, permisos para RRHH y SUPER_ADMIN, `403` para OPERACIONES, GERENCIA y TRABAJADOR, aceptación de cinco tags y rechazo de seis, normalización Unicode, espacios y mayúsculas, validación de `null` en el DTO y rechazo `415` de un JPEG presentado como `.xlsx` o `.csv` con el MIME declarado correspondiente. |

Los ocho casos pedidos están cubiertos. Los duplicados en BD y `dryRun` se prueban en el servicio, el DNI repetido y las fórmulas en el parser y el máximo de tags, el tipo falso y los tres permisos denegados en el controlador. El parser prueba el archivo vacío. Los tests de archivo disfrazado invocan el controlador y el parser reales con Prisma simulado y comprueban que el rechazo ocurre antes de consultar la BD. En esta revisión se agregaron siete pruebas y se hicieron explícitas las aserciones de `403` y de aceptación de cinco tags. El código de producción y la migración se conservaron.

## Pendientes y límites

- La prueba HTTP se ejecutó en local con PostgreSQL 16 temporal, las migraciones aplicadas, RLS habilitado y el rol `minera_app` sin bypass. Verificó escrituras permitidas, denegación de TRABAJADOR por el guard, carga XLSX, carga CSV de 601 filas, simulación, duplicados, tags, edición y baja. Usó roles inyectados por el middleware del ensayo. Quedan fuera el JWT real y la denegación de escritura probada directamente en PostgreSQL para cada rol no autorizado.
- GitHub Actions aplica la migración y ejecuta las suites de Jest. La prueba HTTP con RLS activo y el rol `minera_app`, incluida la carga real de 601 filas, quedó fuera de CI. El caso de 601 filas de Jest usa Prisma simulado y comprueba la división en lotes.
- Quedan sin medir el rendimiento en el entorno de destino y la concurrencia entre importaciones en una prueba de integración. La unicidad simultánea depende de la restricción de DNI de PostgreSQL.
- La carga admite una empresa, una hoja XLSX o un CSV UTF‑8, 5 MiB y hasta 5 000 filas. Esta historia deja fuera archivos `.xls`, la actualización de trabajadores existentes por importación y el despliegue. La migración se aplicó únicamente a la base temporal local, sin merge ni aplicación en Supabase.
- Queda pendiente revisar con el equipo la actualización de la dependencia compartida `multer` indicada en la auditoría.

## Impacto en otros equipos

- **Operaciones.** La migración agrega políticas `INSERT` y `UPDATE` únicamente sobre `trabajador`. Conserva las políticas de lectura. La búsqueda por competencia sigue filtrando por `ACTIVO`, por lo que deja de mostrar a quien se da de baja y vuelve a incluirlo al reactivarlo si cumple los demás filtros. Las asignaciones previas y los nombres de tags existentes se conservan. Una futura escritura directa de `trabajador` con rol OPERACIONES quedaría denegada si sigue vigente esta política.
- **SCRUM-28.** El endurecimiento de lectura sin contexto sigue abierto. Al cambiar las políticas generales se debe conservar el acceso de RRHH y SUPER_ADMIN para el CRUD, la importación y la reactivación, además de definir por separado el contexto del worker. La migración de SCRUM-16 no modifica las políticas de `documento` ni de `trabajador_estado_contexto`. [SCRUM-28](https://fabianandrealv852.atlassian.net/browse/SCRUM-28)

## Resultados finales de la revisión

| Comando | Resultado local |
|---|---|
| `npm run lint` | Correcto, código de salida `0`. |
| `npm run build` | Correcto, código de salida `0`. |
| `npm test -- --runInBand` | `13 passed, 13 total` suites. `147 passed, 147 total` pruebas. Código de salida `0`. |
