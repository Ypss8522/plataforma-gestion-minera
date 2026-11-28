-- La baja es lógica. Solo los roles que administran trabajadores pueden insertar o actualizar filas.
CREATE POLICY trabajador_alta_rrhh ON trabajador
  FOR INSERT
  WITH CHECK (current_setting('app.rol', true) IN ('RRHH', 'SUPER_ADMIN'));

CREATE POLICY trabajador_edicion_rrhh ON trabajador
  FOR UPDATE
  USING (current_setting('app.rol', true) IN ('RRHH', 'SUPER_ADMIN'))
  WITH CHECK (current_setting('app.rol', true) IN ('RRHH', 'SUPER_ADMIN'));
