-- ============================================================
-- Row-Level Security (RLS) — Segunda capa de defensa de RN-08
-- Ejecutar DESPUÉS de `prisma migrate dev`, como migración manual
-- (Prisma no gestiona políticas RLS nativamente).
--
-- Estas políticas garantizan que, incluso ante un bug en el código
-- de aplicación, la base de datos NUNCA retorna documentos ni
-- datos de un trabajador a una sesión de otro trabajador.
--
-- Las variables de sesión (app.rol, app.trabajador_id, app.empresa_id)
-- se setean por request desde PrismaService.withRlsContext().
-- ============================================================

ALTER TABLE documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajador_estado_contexto ENABLE ROW LEVEL SECURITY;

-- Documento: un TRABAJADOR solo puede ver sus propios documentos.
CREATE POLICY documento_aislamiento_trabajador ON documento
  FOR SELECT
  USING (
    current_setting('app.rol', true) IS DISTINCT FROM 'TRABAJADOR'
    OR trabajador_id = current_setting('app.trabajador_id', true)::uuid
  );

-- Trabajador: un TRABAJADOR solo puede ver su propio registro.
CREATE POLICY trabajador_aislamiento_propio ON trabajador
  FOR SELECT
  USING (
    current_setting('app.rol', true) IS DISTINCT FROM 'TRABAJADOR'
    OR id = current_setting('app.trabajador_id', true)::uuid
  );

-- Estado de contexto: idem.
CREATE POLICY estado_contexto_aislamiento_trabajador ON trabajador_estado_contexto
  FOR SELECT
  USING (
    current_setting('app.rol', true) IS DISTINCT FROM 'TRABAJADOR'
    OR trabajador_id = current_setting('app.trabajador_id', true)::uuid
  );

-- NOTA: el usuario de conexión de la aplicación (el que usa DATABASE_URL)
-- NO debe ser un superusuario de Postgres — los superusuarios ignoran RLS
-- por defecto (BYPASSRLS). Crear un rol dedicado sin ese privilegio:
--
-- CREATE ROLE app_backend WITH LOGIN PASSWORD '...' NOBYPASSRLS;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_backend;
