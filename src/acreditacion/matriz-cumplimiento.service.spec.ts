import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoSemaforo, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatrizCumplimientoService } from './matriz-cumplimiento.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

describe('MatrizCumplimientoService', () => {
  let service: MatrizCumplimientoService;
  let prisma: any;

  const mockActorRRHH: JwtPayload = {
    usuarioId: 'u-rrhh',
    email: 'rrhh@empresa.com',
    rol: RolUsuario.RRHH,
    empresaId: 'emp-1',
    trabajadorId: null,
  };

  const mockActorTrabajador: JwtPayload = {
    usuarioId: 'u-trabajador',
    email: 'trabajador@empresa.com',
    rol: RolUsuario.TRABAJADOR,
    empresaId: 'emp-1',
    trabajadorId: 'trab-1',
  };

  const mockActorOtroTrabajador: JwtPayload = {
    usuarioId: 'u-otro',
    email: 'otro@empresa.com',
    rol: RolUsuario.TRABAJADOR,
    empresaId: 'emp-1',
    trabajadorId: 'trab-99',
  };

  beforeEach(async () => {
    prisma = {
      trabajador: { findUnique: jest.fn() },
      minera: { findUnique: jest.fn() },
      cargo: { findUnique: jest.fn() },
      matrizRequisito: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatrizCumplimientoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MatrizCumplimientoService>(MatrizCumplimientoService);
  });

  it('lanza ForbiddenException si un TRABAJADOR intenta consultar a otro trabajador (RN-08)', async () => {
    await expect(
      service.obtenerMatrizCumplimiento({
        trabajadorId: 'trab-1',
        mineraId: 'min-1',
        cargoId: 'cargo-1',
        actor: mockActorOtroTrabajador,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza NotFoundException si el trabajador no existe', async () => {
    prisma.trabajador.findUnique.mockResolvedValue(null);

    await expect(
      service.obtenerMatrizCumplimiento({
        trabajadorId: 'trab-invalido',
        mineraId: 'min-1',
        cargoId: 'cargo-1',
        actor: mockActorRRHH,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lanza NotFoundException si la minera o el cargo no existen', async () => {
    prisma.trabajador.findUnique.mockResolvedValue({
      id: 'trab-1',
      dni: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      estadoGeneral: 'ACTIVO',
      documentos: [],
      estadosContexto: [],
    });
    prisma.minera.findUnique.mockResolvedValue(null);
    prisma.cargo.findUnique.mockResolvedValue({ id: 'cargo-1', nombre: 'Transportista' });

    await expect(
      service.obtenerMatrizCumplimiento({
        trabajadorId: 'trab-1',
        mineraId: 'min-invalida',
        cargoId: 'cargo-1',
        actor: mockActorRRHH,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('retorna la matriz de cumplimiento completa con requisitos, semáforo y avance', async () => {
    const fechaRef = new Date('2026-11-24T12:00:00Z');
    const en60dias = new Date('2027-01-23T12:00:00Z');

    prisma.trabajador.findUnique.mockResolvedValue({
      id: 'trab-1',
      dni: '70809010',
      nombres: 'Carlos',
      apellidos: 'Mamani',
      estadoGeneral: 'ACTIVO',
      documentos: [
        {
          id: 'doc-dni',
          documentoTipoId: 'dt-dni',
          fechaEmision: new Date('2020-01-01'),
          fechaVencimiento: null,
          estadoSemaforo: EstadoSemaforo.VERDE,
          documentoTipo: { id: 'dt-dni', nombre: 'DNI', categoria: 'IDENTIDAD', requiereVencimiento: false, ventanaAlertaDias: 30 },
        },
        {
          id: 'doc-licencia',
          documentoTipoId: 'dt-licencia',
          fechaEmision: new Date('2025-01-01'),
          fechaVencimiento: en60dias,
          estadoSemaforo: EstadoSemaforo.VERDE,
          documentoTipo: { id: 'dt-licencia', nombre: 'Licencia A-III', categoria: 'LICENCIA', requiereVencimiento: true, ventanaAlertaDias: 45 },
        },
      ],
      estadosContexto: [
        {
          porcentajeAvance: 100,
          es100Porciento: true,
          fechaAlcanzo100: new Date('2026-10-01'),
        },
      ],
    });

    prisma.minera.findUnique.mockResolvedValue({ id: 'min-antapacay', nombre: 'Antapacay' });
    prisma.cargo.findUnique.mockResolvedValue({ id: 'cargo-transp', nombre: 'Transportista' });

    prisma.matrizRequisito.findMany.mockResolvedValue([
      {
        id: 'req-1',
        mineraId: 'min-antapacay',
        cargoId: 'cargo-transp',
        documentoTipoId: 'dt-dni',
        obligatorio: true,
        version: 1,
        documentoTipo: { id: 'dt-dni', nombre: 'DNI', categoria: 'IDENTIDAD', requiereVencimiento: false, ventanaAlertaDias: 30 },
      },
      {
        id: 'req-2',
        mineraId: 'min-antapacay',
        cargoId: 'cargo-transp',
        documentoTipoId: 'dt-licencia',
        obligatorio: true,
        version: 1,
        documentoTipo: { id: 'dt-licencia', nombre: 'Licencia A-III', categoria: 'LICENCIA', requiereVencimiento: true, ventanaAlertaDias: 45 },
      },
    ]);

    const res = await service.obtenerMatrizCumplimiento({
      trabajadorId: 'trab-1',
      mineraId: 'min-antapacay',
      cargoId: 'cargo-transp',
      actor: mockActorRRHH,
      fechaReferencia: fechaRef,
    });

    expect(res.trabajador.id).toBe('trab-1');
    expect(res.minera.nombre).toBe('Antapacay');
    expect(res.cargo.nombre).toBe('Transportista');
    expect(res.versionMatriz).toBe(1);
    expect(res.totalRequisitos).toBe(2);
    expect(res.requisitosObligatorios).toBe(2);
    expect(res.cumplidosEnVerde).toBe(2);
    expect(res.porcentajeAvance).toBe(100);
    expect(res.es100Porciento).toBe(true);
    expect(res.documentosFaltantesOEnAlerta).toHaveLength(0);

    const reqDni = res.requisitos.find((r) => r.documentoTipoId === 'dt-dni');
    expect(reqDni?.estado).toBe('VERDE');
    expect(reqDni?.documentoId).toBe('doc-dni');

    const reqLicencia = res.requisitos.find((r) => r.documentoTipoId === 'dt-licencia');
    expect(reqLicencia?.estado).toBe('VERDE');
    expect(reqLicencia?.documentoId).toBe('doc-licencia');
  });

  it('detecta documentos FALTANTE, EN_ALERTA y VENCIDO y calcula el porcentaje parcial', async () => {
    const fechaRef = new Date('2026-11-24T12:00:00Z');
    const vencidoAyer = new Date('2026-11-23T12:00:00Z');
    const en15dias = new Date('2026-12-09T12:00:00Z'); // Alerta (<= 30 días)

    prisma.trabajador.findUnique.mockResolvedValue({
      id: 'trab-1',
      dni: '70809010',
      nombres: 'Carlos',
      apellidos: 'Mamani',
      estadoGeneral: 'ACTIVO',
      documentos: [
        // DNI: cargado y vigente
        {
          id: 'doc-dni',
          documentoTipoId: 'dt-dni',
          fechaEmision: new Date('2020-01-01'),
          fechaVencimiento: null,
          estadoSemaforo: EstadoSemaforo.VERDE,
          documentoTipo: { id: 'dt-dni', nombre: 'DNI', categoria: 'IDENTIDAD', requiereVencimiento: false, ventanaAlertaDias: 30 },
        },
        // Antecedentes: vencido ayer
        {
          id: 'doc-ant',
          documentoTipoId: 'dt-ant',
          fechaEmision: new Date('2026-05-01'),
          fechaVencimiento: vencidoAyer,
          estadoSemaforo: EstadoSemaforo.ROJO,
          documentoTipo: { id: 'dt-ant', nombre: 'Antecedentes', categoria: 'ANTECEDENTE', requiereVencimiento: true, ventanaAlertaDias: 30 },
        },
        // Médico: en alerta (vence en 15 días)
        {
          id: 'doc-med',
          documentoTipoId: 'dt-med',
          fechaEmision: new Date('2025-12-01'),
          fechaVencimiento: en15dias,
          estadoSemaforo: EstadoSemaforo.AMARILLO,
          documentoTipo: { id: 'dt-med', nombre: 'Examen Médico', categoria: 'MEDICO', requiereVencimiento: true, ventanaAlertaDias: 30 },
        },
        // Licencia: NO cargada (FALTANTE)
      ],
      estadosContexto: [],
    });

    prisma.minera.findUnique.mockResolvedValue({ id: 'min-lasbambas', nombre: 'Las Bambas' });
    prisma.cargo.findUnique.mockResolvedValue({ id: 'cargo-transp', nombre: 'Transportista' });

    // 4 requisitos obligatorios de Las Bambas
    prisma.matrizRequisito.findMany.mockResolvedValue([
      { id: 'r-1', mineraId: 'min-lasbambas', cargoId: 'cargo-transp', documentoTipoId: 'dt-dni', obligatorio: true, version: 1, documentoTipo: { id: 'dt-dni', nombre: 'DNI', categoria: 'IDENTIDAD', requiereVencimiento: false, ventanaAlertaDias: 30 } },
      { id: 'r-2', mineraId: 'min-lasbambas', cargoId: 'cargo-transp', documentoTipoId: 'dt-ant', obligatorio: true, version: 1, documentoTipo: { id: 'dt-ant', nombre: 'Antecedentes', categoria: 'ANTECEDENTE', requiereVencimiento: true, ventanaAlertaDias: 30 } },
      { id: 'r-3', mineraId: 'min-lasbambas', cargoId: 'cargo-transp', documentoTipoId: 'dt-med', obligatorio: true, version: 1, documentoTipo: { id: 'dt-med', nombre: 'Examen Médico', categoria: 'MEDICO', requiereVencimiento: true, ventanaAlertaDias: 30 } },
      { id: 'r-4', mineraId: 'min-lasbambas', cargoId: 'cargo-transp', documentoTipoId: 'dt-lic', obligatorio: true, version: 1, documentoTipo: { id: 'dt-lic', nombre: 'Licencia A-III', categoria: 'LICENCIA', requiereVencimiento: true, ventanaAlertaDias: 45 } },
    ]);

    const res = await service.obtenerMatrizCumplimiento({
      trabajadorId: 'trab-1',
      mineraId: 'min-lasbambas',
      cargoId: 'cargo-transp',
      actor: mockActorRRHH,
      fechaReferencia: fechaRef,
    });

    // 1 de 4 en VERDE -> 25.00%
    expect(res.totalRequisitos).toBe(4);
    expect(res.cumplidosEnVerde).toBe(1);
    expect(res.porcentajeAvance).toBe(25);
    expect(res.es100Porciento).toBe(false);
    expect(res.fechaAlcanzo100).toBeNull();

    // Comprobar estados individuales
    expect(res.requisitos.find((r) => r.documentoTipoId === 'dt-dni')?.estado).toBe('VERDE');
    expect(res.requisitos.find((r) => r.documentoTipoId === 'dt-ant')?.estado).toBe('ROJO');
    expect(res.requisitos.find((r) => r.documentoTipoId === 'dt-med')?.estado).toBe('AMARILLO');
    expect(res.requisitos.find((r) => r.documentoTipoId === 'dt-lic')?.estado).toBe('FALTANTE');

    // Comprobar lista de faltantes/alertas
    expect(res.documentosFaltantesOEnAlerta).toHaveLength(3);
    expect(res.documentosFaltantesOEnAlerta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ documentoTipoId: 'dt-ant', motivo: 'VENCIDO' }),
        expect.objectContaining({ documentoTipoId: 'dt-med', motivo: 'EN_ALERTA' }),
        expect.objectContaining({ documentoTipoId: 'dt-lic', motivo: 'FALTANTE' }),
      ]),
    );
  });

  it('respeta la versión vigente más alta de la matriz cuando existen múltiples versiones', async () => {
    prisma.trabajador.findUnique.mockResolvedValue({
      id: 'trab-1',
      dni: '70809010',
      nombres: 'Carlos',
      apellidos: 'Mamani',
      estadoGeneral: 'ACTIVO',
      documentos: [],
      estadosContexto: [],
    });

    prisma.minera.findUnique.mockResolvedValue({ id: 'min-1', nombre: 'Minera X' });
    prisma.cargo.findUnique.mockResolvedValue({ id: 'cargo-1', nombre: 'Cargo Y' });

    // Versión 1 y Versión 2 configuradas
    prisma.matrizRequisito.findMany.mockResolvedValue([
      { id: 'req-v2', mineraId: 'min-1', cargoId: 'cargo-1', documentoTipoId: 'dt-v2', obligatorio: true, version: 2, documentoTipo: { id: 'dt-v2', nombre: 'Doc V2', categoria: 'CURSO', requiereVencimiento: true, ventanaAlertaDias: 30 } },
      { id: 'req-v1', mineraId: 'min-1', cargoId: 'cargo-1', documentoTipoId: 'dt-v1', obligatorio: true, version: 1, documentoTipo: { id: 'dt-v1', nombre: 'Doc V1 Obsoleto', categoria: 'CURSO', requiereVencimiento: true, ventanaAlertaDias: 30 } },
    ]);

    const res = await service.obtenerMatrizCumplimiento({
      trabajadorId: 'trab-1',
      mineraId: 'min-1',
      cargoId: 'cargo-1',
      actor: mockActorRRHH,
    });

    expect(res.versionMatriz).toBe(2);
    expect(res.requisitos).toHaveLength(1);
    expect(res.requisitos[0].documentoTipoId).toBe('dt-v2');
  });

  it('permite que un TRABAJADOR consulte su propia matriz', async () => {
    prisma.trabajador.findUnique.mockResolvedValue({
      id: 'trab-1',
      dni: '70809010',
      nombres: 'Carlos',
      apellidos: 'Mamani',
      estadoGeneral: 'ACTIVO',
      documentos: [],
      estadosContexto: [],
    });
    prisma.minera.findUnique.mockResolvedValue({ id: 'min-1', nombre: 'Minera X' });
    prisma.cargo.findUnique.mockResolvedValue({ id: 'cargo-1', nombre: 'Cargo Y' });
    prisma.matrizRequisito.findMany.mockResolvedValue([]);

    const res = await service.obtenerMatrizCumplimiento({
      trabajadorId: 'trab-1',
      mineraId: 'min-1',
      cargoId: 'cargo-1',
      actor: mockActorTrabajador,
    });

    expect(res.trabajador.id).toBe('trab-1');
  });
});
