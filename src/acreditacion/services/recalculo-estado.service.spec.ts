import { Test, TestingModule } from '@nestjs/testing';
import { RecalculoEstadoService } from './recalculo-estado.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoSemaforo } from '@prisma/client';

describe('RecalculoEstadoService', () => {
  let service: RecalculoEstadoService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      documento: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      trabajador: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      cargo: {
        findMany: jest.fn(),
      },
      matrizRequisito: {
        findMany: jest.fn(),
      },
      trabajadorEstadoContexto: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecalculoEstadoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecalculoEstadoService>(RecalculoEstadoService);
  });

  describe('recalcularSemaforosDocumentos', () => {
    it('actualiza el semáforo si el estado calculado difiere del almacenado', async () => {
      const fechaRef = new Date('2026-10-30T12:00:00Z');
      const ayer = new Date('2026-10-29T12:00:00Z');

      prisma.documento.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          documentoTipoId: 'dt-1',
          fechaVencimiento: ayer,
          estadoSemaforo: EstadoSemaforo.VERDE, // Estaba verde pero ya venció
          documentoTipo: { ventanaAlertaDias: 30, requiereVencimiento: true },
        },
      ]);
      prisma.documento.update.mockResolvedValue({});

      const actualizados = await service.recalcularSemaforosDocumentos(fechaRef);

      expect(actualizados).toBe(1);
      expect(prisma.documento.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { estadoSemaforo: EstadoSemaforo.ROJO },
      });
    });

    it('no actualiza nada si los semáforos ya coinciden', async () => {
      const fechaRef = new Date('2026-10-30T12:00:00Z');
      const en60dias = new Date('2026-12-29T12:00:00Z');

      prisma.documento.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          documentoTipoId: 'dt-1',
          fechaVencimiento: en60dias,
          estadoSemaforo: EstadoSemaforo.VERDE,
          documentoTipo: { ventanaAlertaDias: 30, requiereVencimiento: true },
        },
      ]);

      const actualizados = await service.recalcularSemaforosDocumentos(fechaRef);
      expect(actualizados).toBe(0);
      expect(prisma.documento.update).not.toHaveBeenCalled();
    });
  });

  describe('recalcularTrabajador', () => {
    it('calcula y hace upsert del contexto para un trabajador con requisitos completos', async () => {
      const fechaRef = new Date('2026-10-30T12:00:00Z');
      const en60dias = new Date('2026-12-29T12:00:00Z');

      prisma.trabajador.findUnique.mockResolvedValue({
        id: 'trab-1',
        empresaId: 'emp-1',
        documentos: [
          {
            id: 'doc-1',
            documentoTipoId: 'dt-dni',
            estadoSemaforo: EstadoSemaforo.VERDE,
            documentoTipo: { id: 'dt-dni', nombre: 'DNI', requiereVencimiento: false, ventanaAlertaDias: 30 },
          },
          {
            id: 'doc-2',
            documentoTipoId: 'dt-licencia',
            fechaVencimiento: en60dias,
            estadoSemaforo: EstadoSemaforo.VERDE,
            documentoTipo: { id: 'dt-licencia', nombre: 'Licencia', requiereVencimiento: true, ventanaAlertaDias: 30 },
          },
        ],
        estadosContexto: [
          {
            id: 'ctx-1',
            mineraId: 'min-1',
            cargoId: 'cargo-1',
            porcentajeAvance: 50,
            es100Porciento: false,
            fechaAlcanzo100: null,
          },
        ],
        tags: [],
        empresa: { mineras: [{ mineraId: 'min-1', activo: true }] },
      });

      prisma.cargo.findMany.mockResolvedValue([]);
      prisma.matrizRequisito.findMany.mockResolvedValue([
        { id: 'mr-1', mineraId: 'min-1', cargoId: 'cargo-1', documentoTipoId: 'dt-dni', obligatorio: true },
        { id: 'mr-2', mineraId: 'min-1', cargoId: 'cargo-1', documentoTipoId: 'dt-licencia', obligatorio: true },
      ]);

      prisma.trabajadorEstadoContexto.upsert.mockResolvedValue({
        id: 'ctx-1',
        porcentajeAvance: 100,
        es100Porciento: true,
        fechaAlcanzo100: fechaRef,
      });

      const res = await service.recalcularTrabajador('trab-1', fechaRef);

      expect(res).not.toBeNull();
      expect(res?.trabajadorId).toBe('trab-1');
      expect(res?.contextos[0].porcentajeAvance).toBe(100);
      expect(res?.contextos[0].es100Porciento).toBe(true);

      expect(prisma.trabajadorEstadoContexto.upsert).toHaveBeenCalledWith({
        where: {
          trabajadorId_mineraId_cargoId: {
            trabajadorId: 'trab-1',
            mineraId: 'min-1',
            cargoId: 'cargo-1',
          },
        },
        update: {
          porcentajeAvance: 100,
          es100Porciento: true,
          fechaAlcanzo100: fechaRef,
          calculadoEn: fechaRef,
        },
        create: {
          trabajadorId: 'trab-1',
          mineraId: 'min-1',
          cargoId: 'cargo-1',
          porcentajeAvance: 100,
          es100Porciento: true,
          fechaAlcanzo100: fechaRef,
          calculadoEn: fechaRef,
        },
      });
    });
  });

  describe('recalcularTodosLosTrabajadores', () => {
    it('itera por todos los trabajadores y reporta estadísticas completas', async () => {
      prisma.documento.findMany.mockResolvedValue([]);
      prisma.trabajador.findMany.mockResolvedValue([{ id: 'trab-1' }, { id: 'trab-2' }]);
      jest.spyOn(service, 'recalcularTrabajador').mockResolvedValue({
        trabajadorId: 'trab-1',
        contextos: [{ mineraId: 'm1', cargoId: 'c1', porcentajeAvance: 100, es100Porciento: true, fechaAlcanzo100: null, documentosFaltantes: [] }],
      });

      const res = await service.recalcularTodosLosTrabajadores();

      expect(res.exito).toBe(true);
      expect(res.totalTrabajadores).toBe(2);
      expect(res.contextosCalculados).toBe(2);
      expect(service.recalcularTrabajador).toHaveBeenCalledTimes(2);
    });
  });
});
