# SCRUM-12 — Pruebas de MobileSelfAccessGuard (RN-08) y asignación restrictiva (RN-04)

- **Fecha:** 2026-10-28
- **Jira:** SCRUM-12 (Sprint 1, épica E1). Responsable: Aarón (etiqueta `dev-b`).
- **Rama:** `feature/SCRUM-12-tests-guards-rn04`
- **Estado:** listo para PR

## 1. Resumen

Se implementa la suite completa de pruebas unitarias automatizadas para blindar el aislamiento de datos entre trabajadores (RN-08, `MobileSelfAccessGuard`), la lógica de programación restrictiva con override auditado (RN-04, `OperacionesService.agregarMiembro`) y la validación de entrada de `AgregarMiembroDto`.
Asimismo, se corrigieron dos defectos reales de seguridad descubiertos durante la fase roja (evaluación de fuentes en el guard y omisión de validación/recorte de motivo en el DTO).

## 2. Criterios de aceptación

| Criterio | Cómo se cumple |
|---|---|
| Tests del guard: rol permitido, `trabajadorId` tomado del JWT y desajuste en params, query y body | Cubierto en `mobile-self-access.guard.spec.ts` (35 tests): G1 valida rol y presencia de usuario/token, G2 verifica fijación inmutable de `trabajadorIdSeguro`, G3 valida fuentes individuales, G4 valida combinaciones, G5 formas no estándar y G6 peticiones sin parámetros. |
| Tests de RN-04: bloqueo de trabajador no habilitado y override auditado | Cubierto en `operaciones.service.spec.ts` (14 tests): S1 valida existencia del frente, S2 consulta contextualizada por minera, S3 bloqueo de no habilitados con detalle de documentos bloqueantes, S4 asignación normal, S5 override con roles permitidos y auditoría en `$transaction`, y S6 manejo de errores transaccionales. |
| Los tests corren en el CI | Los 3 nuevos archivos siguen el patrón `*.spec.ts` en `src/` detectado automáticamente por Jest (`testRegex: ".*\\.spec\\.ts$"`) y ejecutado por el paso `npm test` en `.github/workflows/ci.yml`. |

## 3. Archivos

**Nuevos**

| Ruta | Para qué sirve |
|---|---|
| `src/common/guards/mobile-self-access.guard.spec.ts` | 35 tests unitarios para RN-08 (aislamiento entre trabajadores, fuentes combinadas y tipos). |
| `src/operaciones/operaciones.service.spec.ts` | 14 tests unitarios para RN-04 (regla de asignación a frentes, documentos bloqueantes, override auditado y transacción). |
| `src/operaciones/dto/agregar-miembro.dto.spec.ts` | 18 tests unitarios para validación de entrada (`plainToInstance` + `validate`), UUID, enums y recorte/exigencia de motivo. |
| `docs/reportes/2026-10-27-SCRUM-12-tests-guard-rn04.md` | Documentación técnica y evidencias de verificación de la historia. |

**Modificados**

| Ruta | Qué cambió |
|---|---|
| `src/common/guards/mobile-self-access.guard.ts` | Se reemplazó el cortocircuito `||` por una iteración que evalúa `params`, `query` y `body` de forma independiente contra `user.trabajadorId` (DEF-1). |
| `src/operaciones/dto/agregar-miembro.dto.ts` | Se agregó `@Transform` para recortar espacios y `@IsNotEmpty()` para impedir motivos vacíos o compuestos únicamente por espacios cuando `forzarOverride` es true (DEF-2). |

## 4. Defectos encontrados y su corrección

1. **DEF-1 (Guard bypass por cortocircuito `||`):**
   - *Comportamiento previo:* El guard utilizaba `request.params?.trabajadorId || request.query?.trabajadorId || request.body?.trabajadorId`. Si `params` contenía el ID propio del usuario autenticado, la expresión se evaluaba como verdadera y nunca se inspeccionaban `query` ni `body`, permitiendo inyectar un `trabajadorId` ajeno en el cuerpo o query sin ser detectado.
   - *Corrección:* Se evalúan las tres fuentes por separado en un bucle; si cualquiera de ellas está presente (no nula/indefinida/vacía) y es distinta de `user.trabajadorId`, se lanza de inmediato `ForbiddenException` con código `TRABAJADOR_ID_NO_COINCIDE`.
2. **DEF-2 (DTO aceptaba motivos vacíos en auditoría):**
   - *Comportamiento previo:* `overrideMotivo` solo contaba con `@IsString()`, lo que permitía enviar cadenas vacías `""` o cadenas de espacios `"   "`. Esto causaba que una asignación forzada quedara registrada en `auditoria_log` sin justificación real.
   - *Corrección:* Se agregó el decorador `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)` y `@IsNotEmpty()`, garantizando que el motivo se guarde limpio y no pueda estar en blanco.

## 5. Decisiones de diseño

1. **Pruebas unitarias sin base de datos ni Docker:**
   - Se instanció directamente el guard simulando el `ExecutionContext` con un mock de `getRequest()`.
   - Para `OperacionesService`, se inyectó un mock de `PrismaService` y su transacción `$transaction` simulada como callback síncrono/asíncrono, permitiendo verificar qué se escribe y qué no en la base de datos sin depender de latencia de red ni contenedores.
   - Para el DTO, se utilizó directamente `class-transformer` (`plainToInstance`) y `class-validator` (`validate`), replicando con exactitud el comportamiento del `ValidationPipe` global de NestJS.
2. **Aislamiento de fuentes ausentes en el Guard:**
   - Valores como `undefined`, `null` y `''` se consideran ausencia de parámetro. Arreglos u objetos anidados enviados en `query` o `body` no se consideran ausentes y fallan por no ser estrictamente iguales al string del token JWT.

## 6. Cómo probarlo

Ejecutar las pruebas unitarias de la historia:
```bash
npx jest mobile-self-access operaciones agregar-miembro --verbose
```
Ejecutar la suite completa del proyecto:
```bash
npm test
```
Verificar el linter sobre los archivos de la historia:
```bash
npx eslint src/common/guards/mobile-self-access.guard.ts \
           src/common/guards/mobile-self-access.guard.spec.ts \
           src/operaciones/operaciones.service.spec.ts \
           src/operaciones/dto/agregar-miembro.dto.ts \
           src/operaciones/dto/agregar-miembro.dto.spec.ts
```
Verificar compilación:
```bash
npm run build && ls dist/main.js
```

## 7. Verificación realizada (y sus límites)

### Fase Rojo
Se ejecutaron los tests contra el código original sin modificar:
- Fallaron **9 tests** (6 en `mobile-self-access.guard.spec.ts` y 3 en `agregar-miembro.dto.spec.ts`).
- Las fallas confirmaron exactamente los defectos DEF-1 y DEF-2 previstos.

### Fase Verde
Tras aplicar las dos correcciones mínimas:
- `npx jest mobile-self-access operaciones agregar-miembro --verbose`: **67 de 67 tests pasaron** (0 fallas).
- `npm test`: **91 de 91 tests pasaron** en 6 suites completas.
- `npx eslint`: **0 errores**.
- `npm run build`: Compilación limpia, `dist/main.js` generado.

### Pruebas de Mutación (M1 a M8)
Se verificó que cada mutación introducida intencionalmente rompiera la suite:
- **M1** (quitar validación de roles en override): **3 tests fallaron**.
- **M2** (eliminar llamada a `auditoriaLog.create`): **4 tests fallaron**.
- **M3** (`es100Porciento ?? true`): **1 test falló**.
- **M4** (consultar minera equivocada): **1 test falló**.
- **M5** (`overridePor: null`): **3 tests fallaron**.
- **M6** (aceptar cualquier rol en el guard): **6 tests fallaron**.
- **M7** (`trabajadorIdSeguro = request.body?.trabajadorId ?? user.trabajadorId`): **1 test falló**.
- **M8** (quitar `@IsNotEmpty()` en DTO): **2 tests fallaron**.
*Efectividad de mutación: 100% de mutaciones detectadas (8 de 8).*

### Límites de la verificación
- Las pruebas son de alcance unitario con dobles de prueba; no prueban la ejecución contra una instancia real de PostgreSQL con extensiones ni validan restricciones a nivel de DDL/claves foráneas de base de datos.

## 8. Pendientes y siguientes pasos

- [ ] Abrir Pull Request de `feature/SCRUM-12-tests-guards-rn04` hacia `main`.
- [ ] Validar que GitHub Actions pase en verde y obtener 1 aprobación de equipo.
- [ ] Mover SCRUM-12 a "En curso" y luego a "Hecho" en Jira al mergear.
- [ ] Atender las observaciones fuera de alcance en historias posteriores del backlog.

## 9. Contexto para otras IAs

- En `MobileSelfAccessGuard`, nunca volver al patrón `request.params?.id || request.query?.id || request.body?.id`: cada fuente debe validarse independientemente para evitar escalamiento de privilegios por combinación de parámetros.
- `overrideMotivo` en `AgregarMiembroDto` debe mantener siempre `@Transform` con trim y `@IsNotEmpty()` mientras `forzarOverride` sea true.
- `JwtPayload` exportado en `current-user.decorator.ts` tiene `trabajadorId: string | null`, por lo que cualquier mock de actor que tipifique como `JwtPayload` debe incluir `trabajadorId` explícitamente.
