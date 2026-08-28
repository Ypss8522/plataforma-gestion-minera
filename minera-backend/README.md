# Backend — Sistema de Acreditación Minera

Esqueleto inicial (Sprint 1) basado en la Documentación Técnica Maestra v1.0.

**Stack:** NestJS (TypeScript) + Prisma + PostgreSQL + Redis (BullMQ) + JWT/RBAC + RLS.

## Estructura de módulos (calcada a los actores del dominio)

```
src/
├── auth/            # Login, JWT strategy
├── acreditacion/     # RRHH — documentos, cursos, cálculo de semáforo (RN-01)
├── operaciones/       # Búsqueda por competencia, frentes de trabajo (RN-03, RN-04)
├── gerencia/          # Reportes KPI (RN-02, RN-07)
├── mobile/            # App del Trabajador — aislamiento absoluto (RN-08)
├── common/
│   ├── decorators/     # @Roles, @CurrentUser, @Public
│   ├── guards/          # JwtAuthGuard, RolesGuard, MobileSelfAccessGuard
│   └── utils/            # semaforo.util.ts (RN-01)
└── prisma/            # PrismaService con soporte de contexto RLS
```

## Cómo levantar el proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# editar .env con tu DATABASE_URL real y un JWT_SECRET fuerte

# 3. Levantar Postgres y Redis (docker-compose incluido)
docker compose up -d

# 4. Generar cliente Prisma y correr migraciones
npm run prisma:generate
npm run prisma:migrate

# 5. Aplicar las políticas RLS (Prisma no las gestiona nativamente)
psql "$DATABASE_URL" -f prisma/rls-policies.sql

# 6. Cargar datos semilla (mineras Antapacay/Las Bambas, tags, matriz de requisitos)
npm run prisma:seed

# 7. Levantar en modo desarrollo
npm run start:dev
```

API disponible en `http://localhost:3000/api/v1`.

## Capas de seguridad implementadas en este esqueleto

1. **Helmet** — headers HTTP seguros (main.ts).
2. **ValidationPipe global** con `whitelist` + `forbidNonWhitelisted` — previene mass assignment y payloads no declarados.
3. **JwtAuthGuard global** — todo endpoint requiere JWT válido salvo `@Public()` (ej. login).
4. **RolesGuard** — RBAC declarativo vía `@Roles(...)`.
5. **MobileSelfAccessGuard** — bloquea cualquier intento de un TRABAJADOR de leer datos de otro trabajador, ignorando cualquier `trabajadorId` que no venga del JWT.
6. **Row-Level Security en Postgres** (`prisma/rls-policies.sql`) — defensa en profundidad, independiente del código de aplicación.
7. **Rate limiting** — global (100 req/min) y reforzado en `/auth/login` (5 intentos/min) contra fuerza bruta.
8. **bcrypt** para hash de contraseñas, nunca texto plano.

## Pendiente para completar Sprint 1

- [ ] `StorageService` real (S3/GCS) con URLs firmadas de 5 min para subida de fotos de documentos.
- [ ] Worker BullMQ: job diario de recálculo de `trabajador_estado_contexto` y disparo de notificaciones (push/email).
- [ ] Endpoints de `matriz-cumplimiento` (bulk) y `candidato-cargo` (sección 4 del doc maestro).
- [ ] Tests unitarios de los guards de seguridad (crítico: `MobileSelfAccessGuard` y RN-04).
- [ ] CI: correr `npm run lint && npm run test` en cada PR antes de merge.
