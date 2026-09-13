-- Row-Level Security (RLS) — Segunda capa de defensa de RN-08
-- Ejecutar DESPUÉS de `prisma migrate dev` / `deploy`, como paso manual.
--
-- Nota: Prisma mapea los `id String @default(uuid())` a columnas TEXT en
-- Postgres (no al tipo nativo UUID), por eso comparamos como texto, sin cast.

ALTER TABLE documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador_estado_contexto ENABLE ROW LEVEL SECURITY;

CREATE POLICY documento_aislamiento_trabajador ON documento
  FOR SELECT
  USING (
    current_setting('app.rol', true) IS DISTINCT FROM 'TRABAJADOR'
    OR trabajador_id = current_setting('app.trabajador_id', true)
  );

CREATE POLICY trabajador_aislamiento_propio ON trabajador
  FOR SELECT
  USING (
    current_setting('app.rol', true) IS DISTINCT FROM 'TRABAJADOR'
    OR id = current_setting('app.trabajador_id', true)
  );

CREATE POLICY estado_contexto_aislamiento_trabajador ON trabajador_estado_contexto
  FOR SELECT
  USING (
    current_setting('app.rol', true) IS DISTINCT FROM 'TRABAJADOR'
    OR trabajador_id = current_setting('app.trabajador_id', true)
  );

-- El usuario de conexión de la app NO debe ser superusuario de Postgres
-- (los superusuarios ignoran RLS por defecto).
-- CREATE ROLE app_backend WITH LOGIN PASSWORD '...' NOBYPASSRLS;
