import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MobileSelfAccessGuard } from './mobile-self-access.guard';

describe('MobileSelfAccessGuard (RN-08 — Aislamiento de datos entre trabajadores)', () => {
  let guard: MobileSelfAccessGuard;
  const idPropio = '11111111-1111-4111-8111-111111111111';
  const idAjeno = '22222222-2222-4222-8222-222222222222';
  const idTercero = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    guard = new MobileSelfAccessGuard();
  });

  const crearContexto = (request: Record<string, any>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext);

  describe('G1 — Validación de autenticación y rol TRABAJADOR', () => {
    it('permite el acceso cuando el rol es TRABAJADOR y tiene trabajadorId válido', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        params: {},
        query: {},
        body: {},
      };

      const resultado = guard.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });

    it('rechaza si no existe el objeto user en la petición', () => {
      const request: Record<string, any> = {};

      expect(() => guard.canActivate(crearContexto(request))).toThrow(ForbiddenException);

      try {
        guard.canActivate(crearContexto(request));
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).getResponse()).toEqual({
          error: {
            code: 'ACCESO_MOBILE_NO_AUTORIZADO',
            message: 'Este recurso solo es accesible por el rol TRABAJADOR autenticado.',
          },
        });
      }
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });

    it.each([
      ['RRHH'],
      ['OPERACIONES'],
      ['GERENCIA'],
      ['SUPER_ADMIN'],
      ['ADMIN'],
      ['INVITADO'],
    ])('rechaza con ACCESO_MOBILE_NO_AUTORIZADO si el rol es %s', (rol) => {
      const request: Record<string, any> = {
        user: { rol, trabajadorId: idPropio },
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(
        new ForbiddenException({
          error: {
            code: 'ACCESO_MOBILE_NO_AUTORIZADO',
            message: 'Este recurso solo es accesible por el rol TRABAJADOR autenticado.',
          },
        }),
      );
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['cadena vacía', ''],
    ])('rechaza con ACCESO_MOBILE_NO_AUTORIZADO si trabajadorId en token es %s', (_, valorId) => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: valorId },
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(
        new ForbiddenException({
          error: {
            code: 'ACCESO_MOBILE_NO_AUTORIZADO',
            message: 'Este recurso solo es accesible por el rol TRABAJADOR autenticado.',
          },
        }),
      );
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });
  });

  describe('G2 — Fijación de trabajadorIdSeguro en el objeto request', () => {
    it('fija trabajadorIdSeguro desde el token cuando el cliente envía su propio ID', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        params: { trabajadorId: idPropio },
      };

      guard.canActivate(crearContexto(request));

      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });

    it('fija trabajadorIdSeguro desde el token aunque el cliente envíe una fuente vacía', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        params: { trabajadorId: '' },
        query: { trabajadorId: undefined },
        body: { trabajadorId: null },
      };

      guard.canActivate(crearContexto(request));

      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });

    it('NO fija trabajadorIdSeguro cuando la petición es rechazada por ID ajeno', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        body: { trabajadorId: idAjeno },
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(ForbiddenException);
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });
  });

  describe('G3 — Aislamiento por fuente individual (params, query, body)', () => {
    it.each([
      ['params', { params: { trabajadorId: idAjeno }, query: {}, body: {} }],
      ['query', { params: {}, query: { trabajadorId: idAjeno }, body: {} }],
      ['body', { params: {}, query: {}, body: { trabajadorId: idAjeno } }],
    ])('rechaza con TRABAJADOR_ID_NO_COINCIDE si %s contiene ID ajeno', (_, fuentes) => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        ...fuentes,
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(
        new ForbiddenException({
          error: {
            code: 'TRABAJADOR_ID_NO_COINCIDE',
            message: 'No puedes consultar datos de otro trabajador.',
          },
        }),
      );
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });

    it.each([
      ['params', { params: { trabajadorId: idPropio }, query: {}, body: {} }],
      ['query', { params: {}, query: { trabajadorId: idPropio }, body: {} }],
      ['body', { params: {}, query: {}, body: { trabajadorId: idPropio } }],
    ])('permite el acceso si %s contiene el ID propio', (_, fuentes) => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        ...fuentes,
      };

      const resultado = guard.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });

    it.each([
      ['params con undefined', { params: { trabajadorId: undefined } }],
      ['query con null', { query: { trabajadorId: null } }],
      ['body con cadena vacía', { body: { trabajadorId: '' } }],
    ])('ignora fuentes con valor ausente (%s)', (_, fuentes) => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        ...fuentes,
      };

      const resultado = guard.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });
  });

  describe('G4 — Desajuste combinado entre múltiples fuentes', () => {
    it.each([
      ['params propio y body ajeno', { params: { trabajadorId: idPropio }, body: { trabajadorId: idAjeno } }],
      ['params propio y query ajeno', { params: { trabajadorId: idPropio }, query: { trabajadorId: idAjeno } }],
      ['query propio y body ajeno', { query: { trabajadorId: idPropio }, body: { trabajadorId: idAjeno } }],
      ['body propio y query ajeno', { body: { trabajadorId: idPropio }, query: { trabajadorId: idAjeno } }],
      ['tres fuentes presentes con solo body ajeno', { params: { trabajadorId: idPropio }, query: { trabajadorId: idPropio }, body: { trabajadorId: idAjeno } }],
      ['tres fuentes presentes con solo query ajeno', { params: { trabajadorId: idPropio }, query: { trabajadorId: idAjeno }, body: { trabajadorId: idPropio } }],
      ['tres fuentes presentes con solo params ajeno', { params: { trabajadorId: idAjeno }, query: { trabajadorId: idPropio }, body: { trabajadorId: idPropio } }],
      ['tres fuentes con IDs distintos entre sí', { params: { trabajadorId: idPropio }, query: { trabajadorId: idAjeno }, body: { trabajadorId: idTercero } }],
    ])('rechaza cuando una fuente coincide y otra no (%s)', (_, fuentes) => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        ...fuentes,
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(
        new ForbiddenException({
          error: {
            code: 'TRABAJADOR_ID_NO_COINCIDE',
            message: 'No puedes consultar datos de otro trabajador.',
          },
        }),
      );
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });

    it('permite el acceso cuando las tres fuentes coinciden exactamente con el token', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        params: { trabajadorId: idPropio },
        query: { trabajadorId: idPropio },
        body: { trabajadorId: idPropio },
      };

      const resultado = guard.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });
  });

  describe('G5 — Formas no estándar en parámetros', () => {
    it('rechaza si query.trabajadorId es un arreglo [propio, ajeno]', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        query: { trabajadorId: [idPropio, idAjeno] },
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(
        new ForbiddenException({
          error: {
            code: 'TRABAJADOR_ID_NO_COINCIDE',
            message: 'No puedes consultar datos de otro trabajador.',
          },
        }),
      );
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });

    it('rechaza si body.trabajadorId es un objeto anidado', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
        body: { trabajadorId: { id: idPropio } },
      };

      expect(() => guard.canActivate(crearContexto(request))).toThrow(
        new ForbiddenException({
          error: {
            code: 'TRABAJADOR_ID_NO_COINCIDE',
            message: 'No puedes consultar datos de otro trabajador.',
          },
        }),
      );
      expect(request.trabajadorIdSeguro).toBeUndefined();
    });
  });

  describe('G6 — Robustez ante petición sin params, query o body', () => {
    it('no lanza error y permite acceso si params, query y body no están definidos', () => {
      const request: Record<string, any> = {
        user: { rol: 'TRABAJADOR', trabajadorId: idPropio },
      };

      const resultado = guard.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.trabajadorIdSeguro).toBe(idPropio);
    });
  });
});
