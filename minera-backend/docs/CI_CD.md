# CI/CD — Guía de configuración (Render)

## Resumen del flujo

```
Feature branch → Pull Request → CI (GitHub Actions) → Merge a main → CD (Render, automático)
```

- **CI**: `.github/workflows/ci.yml`. Corre en cada PR: lint, valida migraciones de Prisma contra un Postgres efímero, tests, build. Bloquea el merge si algo falla (una vez actives la regla de protección de rama — ver abajo).
- **CD**: lo hace **Render**, sin workflow adicional. Con `autoDeploy: true` en `render.yaml`, cada push a `main` dispara build + deploy solo.

## Paso a paso — configuración inicial (una sola vez)

### 1. Generar la primera migración de Prisma (en tu máquina)
```bash
docker compose up -d          # levanta Postgres/Redis local
cp .env.example .env
npm install
npm run prisma:migrate        # te pedirá un nombre, ej: "init"
```
Esto crea `prisma/migrations/xxxxxx_init/`. **Comitéala al repo** — sin ella, `migrate deploy` en Render no tiene nada que aplicar.

```bash
git add prisma/migrations
git commit -m "chore: migración inicial de Prisma"
git push
```

### 2. Crear los servicios en Render usando el Blueprint

El repo ya incluye `render.yaml` en la raíz, que define los 3 servicios (backend, Postgres, Redis) como código.

1. https://dashboard.render.com → **New +** → **Blueprint**.
2. Conecta tu cuenta de GitHub y selecciona el repo.
3. Render detecta `render.yaml` automáticamente y muestra los 3 recursos que va a crear: `minera-postgres`, `minera-redis`, `minera-backend`. Click **Apply**.
4. Render genera solo el `JWT_SECRET` (por `generateValue: true`) y conecta `DATABASE_URL`/`REDIS_HOST`/`REDIS_PORT` automáticamente entre servicios — no necesitas copiar/pegar nada de eso a mano.
5. Revisa **Environment** del servicio `minera-backend` y ajusta `CORS_ORIGINS` cuando tengan el dominio real del frontend.

> **Alternativa sin Blueprint** (clicks manuales en vez de `render.yaml`): New + → PostgreSQL, New + → Redis, New + → Web Service (conectar repo, build command `npm install && npm run prisma:generate && npm run build`, start command `npm run prisma:migrate:deploy && npm run start:prod`), y agregar las variables de entorno a mano referenciando la Postgres/Redis creadas. El Blueprint simplemente automatiza esto mismo.

### 3. Confirmar el plan de los servicios
Los planes `free` en `render.yaml` son solo para arrancar en desarrollo:
- **Free web service**: se "duerme" tras 15 min sin tráfico y tarda ~30-50s en despertar en el siguiente request. Aceptable en Sprint 1-2, molesto para demos con la minera.
- **Free Postgres**: expira a los 30 días en el plan gratuito de Render — revisar antes de que caduque y hacer upgrade a un plan pago si el proyecto sigue activo.

Cuando se acerquen a un piloto real, cambien `plan: free` → `plan: starter` (o superior) en `render.yaml` y hagan push; Render aplica el cambio de plan al detectar la diferencia.

### 4. Aplicar RLS la primera vez (manual, una sola vez por entorno)
Prisma no gestiona políticas RLS. Después del primer deploy exitoso:
```bash
# Render → minera-postgres → Connect → copiar "External Database URL"
psql "postgresql://...render-url.../minera_acreditacion" -f prisma/rls-policies.sql
```
Repite esto solo cuando agreguen una tabla nueva que necesite RLS — es intencionalmente manual, para revisar cambios de seguridad antes de aplicarlos.

### 5. Proteger la rama `main` en GitHub
GitHub → repo → **Settings → Branches → Add branch protection rule**:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging → seleccionar el job `ci` (aparece en la lista después de que corra al menos una vez)
- ✅ Require branches to be up to date before merging

Sin esto, el CI corre pero no impide que se mergee código roto.

## Flujo de trabajo del día a día

1. `git checkout -b feature/nombre-corto`
2. Trabajas, commiteas.
3. `git push origin feature/nombre-corto` → abres Pull Request contra `main`.
4. GitHub Actions corre solo. Si falla, corriges y vuelves a pushear.
5. El otro revisa y aprueba el PR.
6. Merge a `main` → Render detecta el push (`autoDeploy: true`) → build → `prisma migrate deploy` → arranca la app. En ~2-5 min (más si el free tier estaba dormido) está desplegado.

## Verificar que el deploy salió bien

Render expone logs en vivo del build y del arranque (**Logs** tab del servicio). Además, ya quedó listo un endpoint de healthcheck que Render usa automáticamente para confirmar que el servicio levantó:
```
GET https://minera-backend.onrender.com/api/v1/health
→ { "status": "ok", "timestamp": "..." }
```

## Entornos: ¿uno solo o staging + producción?

Con 2 personas, un solo entorno en Render (tratado como staging real) es suficiente por ahora. Cuando estén cerca de un piloto con la minera, dupliquen el Blueprint en un segundo proyecto de Render con variables separadas, y ahí sí conviene atar el deploy de producción a un tag (`v1.0.0`) en vez de cada push a `main`. No monten esa complejidad todavía.

## Secrets — checklist de seguridad

- [ ] `.env` está en `.gitignore` (ya viene configurado).
- [ ] `JWT_SECRET` lo genera Render automáticamente (`generateValue: true`) — nunca lo pongas a mano en el repo.
- [ ] `DATABASE_URL`/`REDIS_HOST`/`REDIS_PORT` los inyecta Render entre servicios — nunca hardcodeados.
- [ ] Si más adelante agregan un workflow de GitHub Actions que hable con la API de Render (ej. para forzar un deploy manual), el token de Render va en **GitHub → Settings → Secrets and variables → Actions**, no en el YAML.
