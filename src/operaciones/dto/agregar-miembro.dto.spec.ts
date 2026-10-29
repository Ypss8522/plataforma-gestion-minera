import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AgregarMiembroDto } from './agregar-miembro.dto';
import { RolEnFrente, TipoAsignacion } from '@prisma/client';

describe('AgregarMiembroDto (Validación de entrada y reglas de override)', () => {
  const trabajadorIdValido = '11111111-1111-4111-8111-111111111111';

  const datosValidosBase = {
    trabajadorId: trabajadorIdValido,
    rolEnFrente: RolEnFrente.AYUDANTE,
    tipoAsignacion: TipoAsignacion.FIJO,
  };

  describe('D1 — Validación de overrideMotivo cuando forzarOverride es true', () => {
    it('acepta un motivo válido sin espacios redundantes', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: true,
        overrideMotivo: 'Reemplazo urgente por descanso médico',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBe(0);
      expect(dto.overrideMotivo).toBe('Reemplazo urgente por descanso médico');
    });

    it('recorta automáticamente los espacios en blanco al inicio y al final del motivo', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: true,
        overrideMotivo: '   Asignación de emergencia autorizada por superintendente   ',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBe(0);
      expect(dto.overrideMotivo).toBe('Asignación de emergencia autorizada por superintendente');
    });

    it('falla si forzarOverride es true y overrideMotivo no se envía (undefined)', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: true,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorMotivo = errores.find((e) => e.property === 'overrideMotivo');
      expect(errorMotivo).toBeDefined();
    });

    it('falla si forzarOverride es true y overrideMotivo es una cadena vacía', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: true,
        overrideMotivo: '',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorMotivo = errores.find((e) => e.property === 'overrideMotivo');
      expect(errorMotivo).toBeDefined();
      expect(errorMotivo?.constraints).toHaveProperty('isNotEmpty');
    });

    it('falla si forzarOverride es true y overrideMotivo contiene únicamente espacios en blanco', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: true,
        overrideMotivo: '     ',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorMotivo = errores.find((e) => e.property === 'overrideMotivo');
      expect(errorMotivo).toBeDefined();
      expect(errorMotivo?.constraints).toHaveProperty('isNotEmpty');
    });

    it('falla si forzarOverride es true y overrideMotivo no es de tipo string', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: true,
        overrideMotivo: 12345,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorMotivo = errores.find((e) => e.property === 'overrideMotivo');
      expect(errorMotivo).toBeDefined();
      expect(errorMotivo?.constraints).toHaveProperty('isString');
    });
  });

  describe('D2 — Comportamiento cuando forzarOverride es false o no se envía', () => {
    it('pasa la validación cuando forzarOverride es false y no se envía overrideMotivo', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: false,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBe(0);
      expect(dto.forzarOverride).toBe(false);
    });

    it('fija forzarOverride en false por defecto si no se especifica', async () => {
      const objeto = {
        ...datosValidosBase,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBe(0);
      expect(dto.forzarOverride).toBe(false);
    });

    it('falla si forzarOverride se envía como texto "true" en lugar de booleano', async () => {
      const objeto = {
        ...datosValidosBase,
        forzarOverride: 'true',
        overrideMotivo: 'Motivo válido',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorOverride = errores.find((e) => e.property === 'forzarOverride');
      expect(errorOverride).toBeDefined();
      expect(errorOverride?.constraints).toHaveProperty('isBoolean');
    });
  });

  describe('D3 — Validación de tipos y restricciones en campos base', () => {
    it.each([
      ['no-es-un-uuid'],
      ['12345'],
      [''],
    ])('falla si trabajadorId no es un UUID válido (%s)', async (valorInvalido) => {
      const objeto = {
        ...datosValidosBase,
        trabajadorId: valorInvalido,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorTrabajador = errores.find((e) => e.property === 'trabajadorId');
      expect(errorTrabajador).toBeDefined();
      expect(errorTrabajador?.constraints).toHaveProperty('isUuid');
    });

    it.each([
      [RolEnFrente.LIDER],
      [RolEnFrente.AYUDANTE],
    ])('acepta valores válidos para rolEnFrente (%s)', async (rolValido) => {
      const objeto = {
        ...datosValidosBase,
        rolEnFrente: rolValido,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBe(0);
    });

    it('falla si rolEnFrente tiene un valor no permitido en el enum', async () => {
      const objeto = {
        ...datosValidosBase,
        rolEnFrente: 'SUPERVISOR',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorRol = errores.find((e) => e.property === 'rolEnFrente');
      expect(errorRol).toBeDefined();
      expect(errorRol?.constraints).toHaveProperty('isEnum');
    });

    it.each([
      [TipoAsignacion.FIJO],
      [TipoAsignacion.INTERMITENTE],
    ])('acepta valores válidos para tipoAsignacion (%s)', async (tipoValido) => {
      const objeto = {
        ...datosValidosBase,
        tipoAsignacion: tipoValido,
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBe(0);
    });

    it('falla si tipoAsignacion tiene un valor no permitido en el enum', async () => {
      const objeto = {
        ...datosValidosBase,
        tipoAsignacion: 'TEMPORAL',
      };

      const dto = plainToInstance(AgregarMiembroDto, objeto);
      const errores = await validate(dto);

      expect(errores.length).toBeGreaterThan(0);
      const errorTipo = errores.find((e) => e.property === 'tipoAsignacion');
      expect(errorTipo).toBeDefined();
      expect(errorTipo?.constraints).toHaveProperty('isEnum');
    });
  });
});
