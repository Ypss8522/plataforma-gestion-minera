# SCRUM-11 — Endpoint de lectura segura de documentos (URL firmada)

- **Fecha:** 2026-10-26
- **Jira:** SCRUM-11 (Sprint 1, épica E1). Responsable: Aarón (en Jira, etiqueta `dev-b`).
- **Rama sugerida:** `feature/SCRUM-11-lectura-documentos`
- **Estado:** listo para PR.

## 1. Resumen

Se agrega `GET /api/v1/documentos/:id/url`, que devuelve una URL firmada de corta duración
(Cloudflare R2) para ver un documento ya subido. El cliente solo envía el **ID del
documento**; la clave del archivo se lee de la tabla `documento` y solo si el actor tiene
derecho a ese documento. Cierra el pendiente de seguridad "el `fileKey` nunca debe venir
del cliente" que se había dejado documentado desde el diseño del `StorageService`.

## 2. Criterios de aceptación (resumidos de Jira; contrastar con la descripción vigente)

| Criterio | Cómo se cumple |
|---|---|
| El endpoint recibe el ID del documento, nunca un `fileKey` | `:id` validado con `ParseUUIDPipe`; el servicio no acepta ninguna clave de archivo |
| La clave se resuelve desde `documento` | `prisma.documento.findFirst({ select: { archivoUrl } })` |
| Se verifica pertenencia (RN-08 para TRABAJADOR) | El filtro de acceso va **dentro** de la consulta (ver sección 4) |
| Devuelve URL firmada de 5 minutos | Usa `StorageService.obtenerUrlFirmadaLectura`; la vigencia sale de `STORAGE_SIGNED_URL_EXPIRY_SECONDS` (por defecto 300) y se informa en `expiraEnSegundos` |
| Tests de acceso permitido y denegado | 19 tests (ver sección 7) |

## 3. Archivos

**Nuevos**

| Ruta | Para qué sirve |
|---|---|
| `src/acreditacion/documentos-lectura.service.ts` | Lógica: filtro de acceso por rol, firma de URL, auditoría |
| `src/acreditacion/documentos-lectura.controller.ts` | Ruta `GET :id/url`, roles, `Cache-Control: no-store` |
| `src/acreditacion/documentos-lectura.service.spec.ts` | 15 tests de lógica (permitido, denegado, fallos de infraestructura) |
| `src/acreditacion/documentos-lectura.controller.spec.ts` | 4 tests de configuración de seguridad (roles, guard, cabecera, ruta) |
| `docs/reportes/README.md`, `docs/reportes/PLANTILLA.md` | Convención de reportes (ver ese README) |

**Existentes que hay que editar a mano (2 cambios pequeños)**

1. `src/acreditacion/acreditacion.module.ts` — registrar el controlador y el servicio:
   ```ts
   import { DocumentosLecturaController } from './documentos-lectura.controller';
   import { DocumentosLecturaService } from './documentos-lectura.service';

   @Module({
     controllers: [AcreditacionController, DocumentosLecturaController],
     providers: [AcreditacionService, DocumentosLecturaService],
   })
   ```
2. `src/common/storage/storage.service.ts` — agregar este getter (por ejemplo, justo antes de `subirArchivoBase64`):
   ```ts
   /** Segundos de validez de las URLs firmadas (se informa en las respuestas de la API). */
   get expiracionUrlSegundos(): number {
     return this.urlExpirySeconds;
   }
   ```

## 4. Reglas de acceso (qué ve cada rol)

| Rol | Puede leer | Condición aplicada en la consulta |
|---|---|---|
| TRABAJADOR | Solo sus propios documentos | `trabajadorId = <el del token>` (RN-08) |
| RRHH | Documentos de trabajadores de su empresa | `trabajador.empresaId = <empresa del token>` |
| SUPER_ADMIN | Cualquier documento | solo `id` |
| GERENCIA, OPERACIONES, otros | Ninguno | se niega sin consultar la base |

Si al token le falta `trabajadorId` (TRABAJADOR) o `empresaId` (RRHH), se niega sin consultar.

## 5. Decisiones de diseño (cambiables si el equipo lo decide)

1. **404 uniforme.** Documento inexistente y documento ajeno devuelven el mismo error
   `DOCUMENTO_NO_ENCONTRADO`; no se revela que un documento ajeno existe. Hay un test que lo exige.
2. **Filtro dentro de la consulta**, no verificación posterior: un documento ajeno nunca se carga en memoria.
3. **GERENCIA y OPERACIONES excluidas** (mínimo privilegio sobre antecedentes y exámenes médicos).
   Si el negocio las necesita, se agregan en el `@Roles` del controlador **y** en el `switch` del servicio
   (hay dos capas a propósito; el test de configuración fallará hasta actualizar ambos lados).
4. **Auditoría de lectura** (`AuditoriaLog`, acción `LECTURA_DOCUMENTO`): lo pide el diseño de seguridad
   del proyecto. No se guarda la URL firmada. **Falla cerrado**: si no se puede auditar, no se entrega la URL.
   Es la parte más fácil de quitar si no se quiere.
5. **`Cache-Control: no-store`** en la respuesta, para que la URL firmada no se guarde en cachés.
6. Un solo endpoint para TRABAJADOR y personal; no se creó ruta bajo `/mobile` porque el parámetro es
   un ID de documento, no de trabajador (el `MobileSelfAccessGuard` no aplica aquí).

## 6. Límites conocidos de seguridad

- **RLS no es la defensa aquí.** La protección real es el filtro de la aplicación. Sigue pendiente verificar
  si el rol `minera_app` se salta RLS (SCRUM-13 está en curso con tu compañero).
- La URL firmada es un "bearer": quien la tenga puede abrir el archivo durante su vigencia. Por eso dura 5 minutos
  y no se cachea ni se registra.
- Hay un rate limit global (100 solicitudes por minuto) pero ninguno específico para este endpoint.

## 7. Verificación realizada en el repositorio real

Verificado de manera completa y directa en el repositorio real:

1. **Cliente Prisma (`npx prisma generate`):**
   - Generación exitosa de `@prisma/client` (v5.22.0) sin advertencias.
2. **ESLint (`npx eslint` sobre archivos nuevos y modificados):**
   - Ejecutado sin la opción `--fix` sobre `src/acreditacion/documentos-lectura*.ts`, `src/acreditacion/acreditacion.module.ts` y `src/common/storage/storage.service.ts`.
   - **0 errores, 0 warnings**.
3. **Pruebas unitarias de la historia (`npx jest documentos-lectura`):**
   - `src/acreditacion/documentos-lectura.service.spec.ts`: 15 de 15 tests pasaron.
   - `src/acreditacion/documentos-lectura.controller.spec.ts`: 4 de 4 tests pasaron.
   - Total: **19 de 19 tests pasaron** (2 suites).
4. **Suite completa de pruebas (`npm test`):**
   - Las 3 suites pasaron exitosamente: `documentos-lectura.service.spec.ts`, `documentos-lectura.controller.spec.ts` y `semaforo.util.spec.ts`.
   - Total: **24 de 24 tests pasaron**.
5. **Compilación de producción (`npm run build`):**
   - `nest build` completado exitosamente; `dist/main.js` generado correctamente.
   - **Correcciones de tipos:** No fueron necesarias; el código tipó limpiamente con los modelos reales de Prisma y servicios de NestJS.
6. **Pruebas manuales en entorno local (Paso 5):**
   - Verificado que `DATABASE_URL` en `.env` apunta a `localhost`.
   - Contenedores `postgres` y `redis` activos via `docker compose`.
   - Servidor NestJS temporal iniciado y verificado respondiendo en `/api/v1/health` (HTTP 200).
   - Autenticación local exitosa obteniendo JWT de administrador contra la base de datos local.
   - **Casos negativos:**
     - Solicitud sin token: HTTP **401** (Unauthorized).
     - Solicitud con ID no-UUID (`no-es-uuid`): HTTP **400** (Bad Request).
     - Solicitud con UUID válido inexistente: HTTP **404** (`DOCUMENTO_NO_ENCONTRADO`).
   - **Caso positivo con datos reales en BD local:**
     - Inserción de trabajador y documento de prueba en PostgreSQL local.
     - Solicitud GET devolvió HTTP **200**.
     - Cabecera verificada: `Cache-Control: no-store`.
     - Estructura de respuesta: claves `documentoId`, `url`, `expiraEnSegundos` (300).
     - Firma presignada `X-Amz-Signature` presente en la URL.
   - **Auditoría:**
     - Verificada inserción de registro en `auditoria_log` con acción `LECTURA_DOCUMENTO`, entidad `documento` y `entidad_id` correspondiente.
   - **Limpieza obligatoria:**
     - Registros de prueba borrados de `auditoria_log`, `documento` y `trabajador`.
     - Archivos temporales eliminados y proceso del servidor terminado.

**Límites de la verificación:**
- Los casos de `TRABAJADOR` y `RRHH` fueron validados exhaustivamente a través de las 19 pruebas unitarias automatizadas (con dobles simulando tokens de ambos roles), ya que la base local no cuenta con usuarios específicos sembrados para cada rol.
- No se descargó el binario final desde Cloudflare R2 real (la URL se genera mediante firma criptográfica localmente sin conectar a internet).

## 8. Cómo probarlo en el repo real

```bash
git checkout main && git pull origin main
git checkout -b feature/SCRUM-11-lectura-documentos
# copiar los 4 archivos nuevos de src/acreditacion/ y aplicar las 2 ediciones de la sección 3
npm run lint && npm test && npm run build
```

Prueba manual con el backend local (`npm run dev:build` y `npm run dev:run`). Sin datos previos se pueden
comprobar los casos negativos:

```bash
# 1) Sin token -> 401
curl -i http://localhost:3000/api/v1/documentos/11111111-1111-4111-8111-111111111111/url
# 2) Con token pero ID inválido -> 400
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/documentos/no-es-uuid/url
# 3) Con token y UUID válido inexistente -> 404 DOCUMENTO_NO_ENCONTRADO
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/documentos/11111111-1111-4111-8111-111111111111/url
```

El caso positivo (200 con URL) necesita un trabajador y un documento reales: o bien SCRUM-16 (CRUD de
trabajadores), o bien insertar un trabajador por SQL en la base local y subir un archivo con
`POST /api/v1/documentos`. Verifica también que la respuesta trae `Cache-Control: no-store`.

## 9. Pendientes y siguientes pasos

- [x] Aplicar al repo real y correr lint/build/tests.
- [ ] Abrir PR (CI verde + 1 aprobación).
- [ ] Mover SCRUM-11 a "En curso" y luego a "Hecho" en Jira cuando se mergee.
- [ ] Acordar con el equipo si GERENCIA u OPERACIONES deben poder ver documentos.
- [ ] Siguiente tarea de Aarón en Sprint 1: **SCRUM-12** (tests de guards y RN-04).

## 10. Contexto para otras IAs

- Este endpoint es la **única** vía prevista para obtener URLs de lectura de documentos. No agregar rutas que reciban
  una clave de archivo del cliente.
- El rol llega del JWT (`@CurrentUser`); `RolesGuard` **no es global**: cada controlador debe declarar
  `@UseGuards(RolesGuard)` además de `@Roles(...)`, y el test de configuración lo comprueba.
- Los IDs de Prisma son `String @default(uuid())` (columnas TEXT en Postgres).
- Stack y flujo de desarrollo siguen siendo los de `docs/CONTEXTO_PROYECTO.txt`, si existe.
