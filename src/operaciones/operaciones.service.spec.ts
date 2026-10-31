import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OperacionesService } from './operaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolEnFrente, TipoAsignacion } from '@prisma/client';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';

describe('OperacionesService.agregarMiembro (RN-04 — Programación restrictiva y override)', () => {
  let service: OperacionesService;
  let prismaMock: any;
  let txMock: any;

  const frenteId = '11111111-1111-4111-8111-111111111111';
  const mineraId = '22222222-2222-4222-8222-222222222222';
  const trabajadorId = '33333333-3333-4333-8333-333333333333';
  const usuarioId = '44444444-4444-4444-8444-444444444444';
  const miembroCreadoId = '55555555-5555-4555-8555-555555555555';

  const actorOperaciones: JwtPayload = {
    usuarioId,
    email: 'operaciones@minera.pe',
    rol: 'OPERACIONES',
    empresaId: '66666666-6666-4666-8666-666666666666',
    trabajadorId: null,
  };

  const dtoBase: AgregarMiembroDto = {
    trabajadorId,
    rolEnFrente: RolEnFrente.AYUDANTE,
    tipoAsignacion: TipoAsignacion.FIJO,
    forzarOverride: false,
  };

  const frenteMock = {
    id: frenteId,
    mineraId,
    nombre: 'Frente Norte - Tajo Abierto',
  };

  beforeEach(() => {
    txMock = {
      frenteTrabajoMiembro: {
        create: jest.fn().mockResolvedValue({
          id: miembroCreadoId,
          frenteTrabajoId: frenteId,
          trabajadorId,
          rolEnFrente: RolEnFrente.AYUDANTE,
          tipoAsignacion: TipoAsignacion.FIJO,
          fueOverride: false,
          overridePor: null,
          overrideMotivo: null,
        }),
      },
      auditoriaLog: {
        create: jest.fn().mockResolvedValue({
          id: 'auditoria-uuid',
        }),
      },
    };

    prismaMock = {
      frenteTrabajo: {
        findUnique: jest.fn().mockResolvedValue(frenteMock),
      },
      trabajadorEstadoContexto: {
        findFirst: jest.fn(),
      },
      documento: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(txMock)),
    };

    service = new OperacionesService(prismaMock as unknown as PrismaService);
  });

  describe('S1 — Validación de existencia del frente de trabajo', () => {
    it('lanza NotFoundException con FRENTE_NO_ENCONTRADO si el frente no existe', async () => {
      prismaMock.frenteTrabajo.findUnique.mockResolvedValue(null);

      await expect(service.agregarMiembro(frenteId, dtoBase, actorOperaciones)).rejects.toThrow(
        NotFoundException,
      );

      try {
        await service.agregarMiembro(frenteId, dtoBase, actorOperaciones);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).getResponse()).toEqual({
          error: {
            code: 'FRENTE_NO_ENCONTRADO',
            message: 'El frente de trabajo no existe.',
          },
        });
      }

      expect(prismaMock.frenteTrabajo.findUnique).toHaveBeenCalledWith({
        where: { id: frenteId },
      });
      expect(prismaMock.trabajadorEstadoContexto.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('S2 — Consulta de habilitación contextualizada', () => {
    it('consulta trabajadorEstadoContexto con el trabajadorId y la mineraId del frente', async () => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: true,
      });

      await service.agregarMiembro(frenteId, dtoBase, actorOperaciones);

      expect(prismaMock.trabajadorEstadoContexto.findFirst).toHaveBeenCalledWith({
        where: { trabajadorId, mineraId },
      });
    });
  });

  describe('S3 — Bloqueo de trabajador no habilitado sin override', () => {
    const docsBloqueantesMock = [
      {
        id: 'doc-1',
        trabajadorId,
        documentoTipoId: 'tipo-1',
        estadoSemaforo: 'ROJO',
        fechaVencimiento: new Date('2026-01-01'),
        documentoTipo: { nombre: 'Examen Médico Ocupacional' },
      },
      {
        id: 'doc-2',
        trabajadorId,
        documentoTipoId: 'tipo-2',
        estadoSemaforo: 'AMARILLO',
        fechaVencimiento: new Date('2026-11-05'),
        documentoTipo: { nombre: 'Manejo Defensivo en Mina' },
      },
    ];

    it.each([
      ['con registro pero es100Porciento = false', { es100Porciento: false }],
      ['sin registro de estado (null)', null],
    ])('bloquea con ConflictException y lista documentos bloqueantes (%s)', async (_, estado) => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue(estado);
      prismaMock.documento.findMany.mockResolvedValue(docsBloqueantesMock);

      try {
        await service.agregarMiembro(frenteId, dtoBase, actorOperaciones);
        fail('Se esperaba ConflictException');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const resp = (error as ConflictException).getResponse() as any;
        expect(resp.error.code).toBe('TRABAJADOR_NO_DISPONIBLE');
        expect(resp.error.message).toBe('El trabajador no está 100% habilitado para esta minera.');
        expect(resp.error.detalle.documentosBloqueantes).toEqual([
          {
            documentoTipo: 'Examen Médico Ocupacional',
            estado: 'ROJO',
            fechaVencimiento: new Date('2026-01-01'),
          },
          {
            documentoTipo: 'Manejo Defensivo en Mina',
            estado: 'AMARILLO',
            fechaVencimiento: new Date('2026-11-05'),
          },
        ]);
      }

      expect(prismaMock.documento.findMany).toHaveBeenCalledWith({
        where: { trabajadorId, estadoSemaforo: { in: ['AMARILLO', 'ROJO'] } },
        include: { documentoTipo: true },
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.frenteTrabajoMiembro.create).not.toHaveBeenCalled();
      expect(txMock.auditoriaLog.create).not.toHaveBeenCalled();
    });
  });

  describe('S4 — Asignación exitosa de trabajador habilitado (sin override)', () => {
    it('crea el miembro con estado CONFIRMADA y sin datos de override ni auditoría', async () => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: true,
      });

      const resultado = await service.agregarMiembro(frenteId, dtoBase, actorOperaciones);

      expect(resultado).toEqual({
        id: miembroCreadoId,
        trabajadorId,
        estadoAsignacion: 'CONFIRMADA',
      });

      expect(txMock.frenteTrabajoMiembro.create).toHaveBeenCalledWith({
        data: {
          frenteTrabajoId: frenteId,
          trabajadorId,
          rolEnFrente: RolEnFrente.AYUDANTE,
          tipoAsignacion: TipoAsignacion.FIJO,
          fueOverride: false,
          overridePor: null,
          overrideMotivo: null,
        },
      });
      expect(txMock.auditoriaLog.create).not.toHaveBeenCalled();
    });

    it('no marca fueOverride ni audita si el trabajador ya está habilitado aunque forzarOverride sea true', async () => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: true,
      });

      const dtoConOverrideInnecesario: AgregarMiembroDto = {
        ...dtoBase,
        forzarOverride: true,
        overrideMotivo: 'Motivo redundante porque ya está al 100%',
      };

      const resultado = await service.agregarMiembro(frenteId, dtoConOverrideInnecesario, actorOperaciones);

      expect(resultado.estadoAsignacion).toBe('CONFIRMADA');
      expect(txMock.frenteTrabajoMiembro.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fueOverride: false,
          overridePor: null,
          overrideMotivo: null,
        }),
      });
      expect(txMock.auditoriaLog.create).not.toHaveBeenCalled();
    });
  });

  describe('S5 — Asignación forzada con override y registro de auditoría', () => {
    const dtoOverride: AgregarMiembroDto = {
      ...dtoBase,
      forzarOverride: true,
      overrideMotivo: 'Reemplazo de emergencia autorizado por Jefatura',
    };

    it.each([
      ['OPERACIONES', 'OPERACIONES'],
      ['GERENCIA', 'GERENCIA'],
      ['SUPER_ADMIN', 'SUPER_ADMIN'],
    ])('permite override y audita cuando el actor tiene rol %s', async (_, rol) => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: false,
      });

      txMock.frenteTrabajoMiembro.create.mockResolvedValue({
        id: miembroCreadoId,
        trabajadorId,
        fueOverride: true,
      });

      const actor: JwtPayload = { ...actorOperaciones, rol: rol as any };

      const resultado = await service.agregarMiembro(frenteId, dtoOverride, actor);

      expect(resultado).toEqual({
        id: miembroCreadoId,
        trabajadorId,
        estadoAsignacion: 'CONFIRMADA_CON_OVERRIDE',
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      expect(txMock.frenteTrabajoMiembro.create).toHaveBeenCalledWith({
        data: {
          frenteTrabajoId: frenteId,
          trabajadorId,
          rolEnFrente: RolEnFrente.AYUDANTE,
          tipoAsignacion: TipoAsignacion.FIJO,
          fueOverride: true,
          overridePor: actor.usuarioId,
          overrideMotivo: 'Reemplazo de emergencia autorizado por Jefatura',
        },
      });

      expect(txMock.auditoriaLog.create).toHaveBeenCalledWith({
        data: {
          usuarioId: actor.usuarioId,
          accion: 'OVERRIDE_ASIGNACION',
          entidad: 'frente_trabajo_miembro',
          entidadId: miembroCreadoId,
          detalle: {
            trabajadorId,
            motivo: 'Reemplazo de emergencia autorizado por Jefatura',
          },
        },
      });
    });

    it.each([
      ['RRHH'],
      ['TRABAJADOR'],
      ['ANALISTA_SEGURIDAD'],
    ])('rechaza con ForbiddenException OVERRIDE_NO_AUTORIZADO si el rol no autorizado es %s', async (rol) => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: false,
      });

      const actorNoAutorizado: JwtPayload = { ...actorOperaciones, rol: rol as any };

      await expect(service.agregarMiembro(frenteId, dtoOverride, actorNoAutorizado)).rejects.toThrow(
        new ForbiddenException({
          error: {
            code: 'OVERRIDE_NO_AUTORIZADO',
            message: 'Tu rol no puede forzar asignaciones.',
          },
        }),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.frenteTrabajoMiembro.create).not.toHaveBeenCalled();
      expect(txMock.auditoriaLog.create).not.toHaveBeenCalled();
    });
  });

  describe('S6 — Manejo de errores dentro de la transacción', () => {
    const dtoOverride: AgregarMiembroDto = {
      ...dtoBase,
      forzarOverride: true,
      overrideMotivo: 'Asignación excepcional',
    };

    it('propaga el error y aborta si la inserción en auditoriaLog falla', async () => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: false,
      });

      txMock.frenteTrabajoMiembro.create.mockResolvedValue({
        id: miembroCreadoId,
        trabajadorId,
        fueOverride: true,
      });

      const errorAuditoria = new Error('Fallo de conexión en BD al escribir auditoría');
      txMock.auditoriaLog.create.mockRejectedValue(errorAuditoria);

      await expect(service.agregarMiembro(frenteId, dtoOverride, actorOperaciones)).rejects.toThrow(
        errorAuditoria,
      );

      expect(txMock.frenteTrabajoMiembro.create).toHaveBeenCalled();
      expect(txMock.auditoriaLog.create).toHaveBeenCalled();
    });

    it('no intenta auditar si la creación del miembro en frenteTrabajoMiembro falla', async () => {
      prismaMock.trabajadorEstadoContexto.findFirst.mockResolvedValue({
        id: 'ctx-1',
        trabajadorId,
        mineraId,
        es100Porciento: false,
      });

      const errorMiembro = new Error('Fallo al insertar miembro en BD');
      txMock.frenteTrabajoMiembro.create.mockRejectedValue(errorMiembro);

      await expect(service.agregarMiembro(frenteId, dtoOverride, actorOperaciones)).rejects.toThrow(
        errorMiembro,
      );

      expect(txMock.frenteTrabajoMiembro.create).toHaveBeenCalled();
      expect(txMock.auditoriaLog.create).not.toHaveBeenCalled();
    });
  });
});
