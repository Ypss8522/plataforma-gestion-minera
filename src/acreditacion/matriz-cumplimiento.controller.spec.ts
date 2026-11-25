import { Test, TestingModule } from '@nestjs/testing';
import { RolUsuario } from '@prisma/client';
import { MatrizCumplimientoController } from './matriz-cumplimiento.controller';
import { MatrizCumplimientoService } from './matriz-cumplimiento.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

describe('MatrizCumplimientoController', () => {
  let controller: MatrizCumplimientoController;
  let service: any;

  const mockActor: JwtPayload = {
    usuarioId: 'u-1',
    email: 'rrhh@empresa.com',
    rol: RolUsuario.RRHH,
    empresaId: 'emp-1',
    trabajadorId: null,
  };

  beforeEach(async () => {
    service = {
      obtenerMatrizCumplimiento: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatrizCumplimientoController],
      providers: [
        { provide: MatrizCumplimientoService, useValue: service },
      ],
    }).compile();

    controller = module.get<MatrizCumplimientoController>(MatrizCumplimientoController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe tener configurados los roles permitidos en el método consultarMatriz', () => {
    const reflector = new Reflector();
    const roles = reflector.get<RolUsuario[]>(ROLES_KEY, MatrizCumplimientoController.prototype.consultarMatriz);

    expect(roles).toBeDefined();
    expect(roles).toEqual(
      expect.arrayContaining([
        RolUsuario.RRHH,
        RolUsuario.OPERACIONES,
        RolUsuario.GERENCIA,
        RolUsuario.SUPER_ADMIN,
        RolUsuario.TRABAJADOR,
      ]),
    );
  });

  it('debe invocar a matrizCumplimientoService con los parámetros correctos', async () => {
    const mockResultado = {
      trabajador: { id: 't-1' },
      minera: { id: 'm-1' },
      cargo: { id: 'c-1' },
      porcentajeAvance: 100,
      es100Porciento: true,
      requisitos: [],
    };
    service.obtenerMatrizCumplimiento.mockResolvedValue(mockResultado);

    const query = {
      trabajadorId: 't-1',
      mineraId: 'm-1',
      cargoId: 'c-1',
    };

    const res = await controller.consultarMatriz(query, mockActor);

    expect(res).toBe(mockResultado);
    expect(service.obtenerMatrizCumplimiento).toHaveBeenCalledWith({
      trabajadorId: 't-1',
      mineraId: 'm-1',
      cargoId: 'c-1',
      actor: mockActor,
    });
  });
});
