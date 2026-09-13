# CI/CD — Guía de configuración (Render)

## Resumen del flujo

```
Feature branch → Pull Request → CI (GitHub Actions) → Merge a main → CD (Render, automático)
```

- **CI**: `.github/workflows/ci.yml`. Corre en cada PR: lint, valida migraciones de Prisma, tests, build.
- **CD**: lo hace **Render**, sin workflow adicional. Con `autoDeploy: true` en `render.yaml`, cada push a `main` dispara build + deploy solo.

**IMPORTANTE — estructura del repo:** el código vive en la **raíz del repositorio**
(no dentro de una subcarpeta). Tanto `render.yaml` como `.github/workflows/ci.yml`
asumen esto — ninguno de los dos usa `rootDir`/`working-directory`. Si en algún
momento el proyecto se reorganiza dentro de una subcarpeta, ambos archivos
necesitan actualizarse para apuntar a esa ruta (ver la sección de
Troubleshooting al final, fue exactamente la causa de que el CI se quedara
"Queued" indefinidamente en una versión anterior de este repo).

## Paso a paso — configuración inicial (una sola vez)

### 1. Generar la primera migración de Prisma (en tu máquina)
```bash
docker compose up -d
cp .env.example .env
npm install
npm run prisma:migrate
```
Comitea `prisma/migrations/` al repo — sin ella, `migrate deploy` en Render no tiene nada que aplicar.

### 2. Crear los servicios en Render usando el Blueprint
1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Conecta GitHub y selecciona el repo.
3. Render detecta `render.yaml` en la raíz automáticamente y muestra los 3 recursos: `minera-postgres`, `minera-redis`, `minera-backend`. Click **Apply**.
4. Render genera `JWT_SECRET` automáticamente. Las variables `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` están marcadas como `sync: false` en el blueprint — debes ingresarlas manualmente en el dashboard (Environment del servicio `minera-backend`) con tus credenciales reales de Cloudflare R2, ya que son secretos que no deben vivir en `render.yaml`.
5. Ajusta `CORS_ORIGINS` cuando tengan el dominio real del frontend.

### 3. Confirmar el plan de los servicios
Los planes `free` son solo para desarrollo:
- **Free web service**: se "duerme" tras 15 min sin tráfico (~30-50s en despertar).
- **Free Postgres**: expira a los 30 días — hacer upgrade antes de esa fecha si el proyecto sigue activo.

### 4. Aplicar RLS la primera vez (manual)
```bash
psql "postgresql://...render-url.../minera_acreditacion" -f prisma/rls-policies.sql
```

### 4.1 Cargar datos semilla (manual)
```bash
DATABASE_URL="postgresql://...render-url.../minera_acreditacion" npm run prisma:seed
```

### 4.2 Checklist de base de datos
- [ ] Blueprint aplicado (instancia existe, vacía).
- [ ] `prisma migrate deploy` corrió en el primer deploy (tablas existen).
- [ ] RLS aplicado manualmente.
- [ ] Seed corrido manualmente.
- [ ] Vigilar la caducidad de 30 días del plan free de Postgres.

### 5. Proteger la rama `main` en GitHub
GitHub → repo → **Settings → Branches → Add branch protection rule** → `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging → seleccionar el job `ci`
  (solo aparece en la lista **después** de que el workflow haya corrido
  exitosamente al menos una vez sobre `main` — si nunca corrió, actívalo
  sin este checkbox primero, haz un PR de prueba, y luego vuelve a editar
  la regla para marcarlo)
- ✅ Require approvals (mínimo 1)

## Flujo de trabajo del día a día

1. `git checkout -b feature/nombre-corto`
2. Commitea tus cambios.
3. `git push origin feature/nombre-corto` → abre PR contra `main`.
4. GitHub Actions corre solo. Si falla, corrige y vuelve a pushear.
5. El otro revisa y aprueba.
6. Merge a `main` → Render redeploya automáticamente (~2-5 min).

## Verificar que el deploy salió bien
```
GET https://minera-backend.onrender.com/api/v1/health
→ { "status": "ok", "timestamp": "..." }
```

## Patrón de seguridad para futuros endpoints de lectura de documentos

Cuando se construya un endpoint que devuelva la URL firmada de un documento
ya subido (ej. para que RRHH o el propio trabajador lo visualicen), la regla
dura es: **el `fileKey` nunca se acepta como parámetro del cliente.** Siempre
se resuelve consultando la tabla `documento` por su ID interno y verificando
explícitamente que pertenece al trabajador autorizado (o que el actor tiene
un rol con permiso amplio, como RRHH/GERENCIA). Solo después de esa
verificación se llama a `storageService.obtenerUrlFirmadaLectura(...)`.

## Troubleshooting — problemas reales ya resueltos

### CI se queda "Queued" (amarillo/gris) indefinidamente, sin iniciar steps
Causa más probable: desajuste entre dónde vive realmente el código en el
repo y las rutas asumidas por `render.yaml`/`ci.yml`. En una versión anterior
de este proyecto, el código vivía en una subcarpeta (`minera-backend/`) y
`ci.yml` tenía `defaults.run.working-directory: minera-backend` — al mover
todo a la raíz del repo sin actualizar esa configuración (o viceversa), el
workflow podía quedar mal referenciado. Solución: confirmar que la ubicación
real del `package.json` en el repo coincide exactamente con lo que asumen
`render.yaml` (sin `rootDir` si está en la raíz) y `ci.yml` (sin
`working-directory` si está en la raíz).

Otras causas a descartar en orden: cuota de minutos de Actions agotada
(Settings de la cuenta → Billing → Actions), permisos de Actions
restringidos (repo → Settings → Actions → General), o el workflow
individual deshabilitado manualmente (Actions → nombre del workflow →
buscar banner "This workflow is disabled").

### `ENOENT: no such file or directory, open '.../package.json'` en Render
Causa: Render buscando el `package.json` en una ruta que no coincide con
la estructura real del repo. Solución: si el código está en la raíz, no usar
`rootDir` en `render.yaml`. Si está en una subcarpeta, sí usarlo.

### Build falla buscando `nest`/`@nestjs/cli`
Causa: Render corre `npm install` con `NODE_ENV=production`, que omite
`devDependencies`, y `@nestjs/cli` estaba ahí. Solución aplicada: usar
`npm install --include=dev` en el build command (ya en `render.yaml`), y
mantener `@nestjs/cli` en `dependencies` como doble seguro.

### `dist/main.js` no existe pese a que el build dice "0 errors"
Causa: caché incremental de TypeScript (`*.tsbuildinfo`) corrupta.
Solución aplicada: se quitó `"incremental": true` de `tsconfig.json`
permanentemente, y `*.tsbuildinfo` está en `.gitignore`.
