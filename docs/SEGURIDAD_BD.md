# Seguridad de la base de datos

## Roles
- `postgres`: solo migraciones (`DIRECT_URL`, puerto 5432). Puede saltarse RLS.
- `minera_app`: runtime de la app (`DATABASE_URL`, puerto 6543). `NOBYPASSRLS`,
  solo SELECT/INSERT/UPDATE/DELETE. No crea ni modifica tablas.

## Crear el rol (una vez por base de datos)
Ver el script en esta sección; la contraseña se define fuera del repo.
CREATE ROLE minera_app LOGIN PASSWORD '<definir>' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO minera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO minera_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO minera_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO minera_app;

## Verificación (resultado del 2026-10)
- Trabajador: ve solo sus filas.
- RRHH/Operaciones/Gerencia: ven todo.
- Sin contexto (app.rol vacío): ve todo. Riesgo conocido: la protección del
  trabajador depende de usar withRlsContext() en el módulo mobile.

## Credenciales
- El seed lee SEED_ADMIN_PASSWORD y no sobrescribe un admin existente.
- Nunca commitear .env ni contraseñas en docs.