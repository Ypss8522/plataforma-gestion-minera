# Gestión e importación de trabajadores

Las rutas requieren JWT con rol `RRHH` o `SUPER_ADMIN` y establecen el contexto de sesión en PostgreSQL. Aplica `npm run prisma:migrate:deploy` para instalar las políticas de alta y actualización sobre `trabajador`. En instalaciones nuevas aplica también `prisma/rls-policies.sql` según la guía de instalación para habilitar RLS y las políticas de lectura.

| Método y ruta | Uso |
|---|---|
| `GET /api/v1/trabajadores` | Lista paginada con `pagina` y `limite` (máximo 100). Por defecto excluye bajas. `estadoGeneral` permite consultar un estado concreto. |
| `GET /api/v1/trabajadores/:id` | Consulta por UUID, incluidas las bajas cuando se conoce su identificador. |
| `POST /api/v1/trabajadores` | Alta con `empresaId` y los campos del formato de carga. En JSON, `tags` es un arreglo de nombres. |
| `PATCH /api/v1/trabajadores/:id` | Edición parcial con los mismos campos salvo `empresaId`. Admite `estadoGeneral`. Enviar `tags` sustituye el conjunto y `[]` lo vacía. `null` limpia `telefono` o `fechaNacimiento`. |
| `DELETE /api/v1/trabajadores/:id` | Baja lógica con estado `INACTIVO`. Conserva el historial y la reserva del DNI. Devuelve 204. |
| `POST /api/v1/trabajadores/importar?dryRun=true` | Carga multipart con `archivo` (XLSX o CSV) y `empresaId` (UUID de una empresa existente). Omite `dryRun` o usa `false` para guardar. |

## Preparar el archivo

Usa la [plantilla Excel](plantillas/SCRUM-16-trabajadores.xlsx). Sustituye las filas ficticias. Coloca los encabezados en la primera fila y los datos en la única hoja del XLSX. Para CSV, usa UTF-8 con coma o punto y coma como separador. Mantén el DNI como texto si empieza con cero.

| Columna | Obligatoria | Formato |
|---|---|---|
| `dni` | Sí | Ocho dígitos y único. |
| `nombres`, `apellidos` | Sí | Hasta 120 caracteres cada uno. |
| `fechaIngreso` | Sí | `AAAA-MM-DD`. En Excel también se admite una celda de fecha sin hora. |
| `fechaNacimiento` | Opcional | Fecha con el mismo formato. |
| `telefono` | Opcional | Empieza con un dígito. Admite espacios, paréntesis y guiones. |
| `tags` | Opcional | Hasta cinco nombres separados por `\|`. Los nombres se comparan sin diferencias de mayúsculas, espacios extra ni composición Unicode. Ejemplo `Mecánico \| Supervisor`. |

Límite de archivo de 5 MiB, 5 000 registros y una hoja. El XLSX debe ser un contenedor ZIP de una hoja de cálculo válido. El CSV debe ser texto UTF-8 válido con los encabezados del formato. Las filas con fórmulas de Excel o valores que después de quitar espacios comiencen con `=`, `+`, `-` o `@` se rechazan. Los errores devuelven el DNI únicamente cuando tiene ocho dígitos, y para valores inválidos devuelven `null`.

## Interpretar el resultado

`total` cuenta las filas de datos con contenido. `creadas` cuenta las filas insertadas. `validas` indica cuántas pasaron la validación o se pudieron insertar. `rechazadas` cuenta las filas con error. Cada elemento de `errores` contiene `fila`, `dni` y `motivo`. En simulación `creadas` siempre es 0 y los DNI se vuelven a verificar al guardar. Para un DNI repetido en el archivo se considera su primera aparición, aunque esa fila tenga otros errores. La carga inserta únicamente filas válidas en lotes de 100 y nunca actualiza un trabajador existente.

```bash
curl -X POST 'http://localhost:3000/api/v1/trabajadores/importar?dryRun=true' \
  -H "Authorization: Bearer $TOKEN" \
  -F "empresaId=$EMPRESA_ID" \
  -F 'archivo=@docs/plantillas/SCRUM-16-trabajadores.xlsx'
```
