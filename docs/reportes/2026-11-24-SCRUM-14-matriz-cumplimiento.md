# SCRUM-14 — Endpoint de matriz-cumplimiento por trabajador, minera y cargo

- **Fecha:** 2026-11-24
- **Jira:** SCRUM-14 (Sprint 2, épica E1). Responsable: Fabián Álvarez.
- **Rama:** `feature/SCRUM-14-matriz-cumplimiento`
- **Estado:** listo para PR.

## 1. Resumen

Se implementa `GET /api/v1/matriz-cumplimiento`, que permite consultar en tiempo real el estado de acreditación de un trabajador para una combinación específica de Minera y Cargo. Evalúa cada documento contra la `MatrizRequisito` vigente, clasificando el estado en `VERDE`, `AMARILLO`, `ROJO` o `FALTANTE`, calcula el porcentaje de avance numérico exacto y expone los documentos bloqueantes o por vencer.

## 2. Criterios de aceptación

| Criterio | Cómo se cumple |
|---|---|
| Endpoint por trabajador + minera + cargo | `GET /api/v1/matriz-cumplimiento?trabajadorId=...&mineraId=...&cargoId=...` validado mediante `MatrizCumplimientoQueryDto` con soporte camelCase y snake_case. |
| Lista cada requisito con estado (VERDE/AMARILLO/ROJO/FALTANTE) y fecha de vencimiento | Mapeo detallado en `requisitos[]` con `diasRestantes`, `fechaVencimiento`, `documentoId` y estado del semáforo. |
| Incluye porcentaje de avance | `porcentajeAvance` calculado con la función unificada de RN-02, indicando `es100Porciento` y `fechaAlcanzo100`. |
| Respeta la versión vigente de la matriz | Filtro temporal `vigenteDesde <= now && (vigenteHasta == null || vigenteHasta >= now)` y selección de la versión más reciente (`versionMatriz`). |

## 3. Archivos

**Nuevos**
| Ruta | Para qué sirve |
|---|---|
| `src/acreditacion/dto/matriz-cumplimiento-query.dto.ts` | DTO con validaciones UUID v4 y transformaciones snake_case/camelCase |
| `src/acreditacion/matriz-cumplimiento.service.ts` | Lógica de consulta, verificación de permisos, resolución de matriz y cálculo |
| `src/acreditacion/matriz-cumplimiento.controller.ts` | Controlador REST con roles RBAC y cabecera `Cache-Control: no-store` |
| `src/acreditacion/matriz-cumplimiento.service.spec.ts` | 6 tests unitarios cubriendo casos de error, aislamiento, porcentajes y versionado |
| `src/acreditacion/matriz-cumplimiento.controller.spec.ts` | 3 tests unitarios validando roles, guards e invocación |

**Modificados**
| Ruta | Qué cambió |
|---|---|
| `src/acreditacion/acreditacion.module.ts` | Registro y exportación de `MatrizCumplimientoController` y `MatrizCumplimientoService` |

## 4. Decisiones de diseño

- **Reutilización de lógica de RN-01 y RN-02**: Se utilizó directamente `recalcularSemaforoDocumento` y `calcularAvanceContexto` de `src/acreditacion/utils/recalculo.util.ts`. Esto garantiza absoluta consistencia entre lo que reporta la API en vivo y lo que calcula el worker BullMQ diario.
- **Resolución de documentos múltiples**: Si un trabajador subió más de un documento para el mismo tipo (ej. uno anterior vencido y una renovación), el servicio prioriza el documento en `VERDE`, garantizando que no se bloquee erróneamente un requisito ya subsanado.
- **Soporte de versionado**: Si existen versiones anteriores inactivas o históricas, el endpoint determina la versión activa de mayor número de versión vigente.

## 5. Seguridad

- **RBAC**: Permite acceso a `RRHH`, `OPERACIONES`, `GERENCIA` y `SUPER_ADMIN`.
- **Aislamiento del Trabajador (RN-08)**: Permite que el rol `TRABAJADOR` consulte su propia matriz, pero rechaza con `403 Forbidden` si intenta consultar la de otro trabajador.
- **Headers HTTP**: Se incluye `Cache-Control: no-store` para evitar caché de datos sensibles de cumplimiento.

## 6. Cómo probarlo

Ejecutar tests unitarios:
```bash
npm test -- src/acreditacion/matriz-cumplimiento
```

Compilar proyecto:
```bash
npm run build
```

## 7. Verificación realizada (y sus límites)

- **Tests unitarios:** 9 tests nuevos específicos para `MatrizCumplimiento` añadidos a la suite general (113 tests en total pasando al 100%).
- **Compilación:** `nest build` compila con 0 errores de TypeScript.
