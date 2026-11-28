import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { RolUsuario } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { TrabajadoresController } from './trabajadores.controller';
import { CrearTrabajadorDto, EditarTrabajadorDto } from './trabajadores.dto';
import { TrabajadoresService } from './trabajadores.service';

const guard = new RolesGuard(new Reflector());
const rutas = ['listar', 'obtener', 'crear', 'importar', 'editar', 'darDeBaja'] as const;
const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
const alta = { empresaId: 'a064a930-c6f2-41f7-bafa-6263ed497ded', dni: '01234567', nombres: 'Ana', apellidos: 'Prueba', fechaIngreso: '2026-02-03' };

it('aplica RolesGuard al controlador', () => {
  expect(Reflect.getMetadata(GUARDS_METADATA, TrabajadoresController)).toContain(RolesGuard);
});

it.each(rutas)('autoriza solo a RRHH y SUPER_ADMIN para %s', ruta => {
  const contexto = (rol?: RolUsuario) => new ExecutionContextHost(
    [{ user: rol ? { rol } : undefined }], TrabajadoresController, TrabajadoresController.prototype[ruta],
  );
  expect(guard.canActivate(contexto(RolUsuario.RRHH))).toBe(true);
  expect(guard.canActivate(contexto(RolUsuario.SUPER_ADMIN))).toBe(true);
  for (const rol of [RolUsuario.TRABAJADOR, RolUsuario.OPERACIONES, RolUsuario.GERENCIA, undefined]) {
    expect(() => guard.canActivate(contexto(rol))).toThrow(expect.objectContaining({ status: HttpStatus.FORBIDDEN }));
  }
});

it('normaliza tags y valida el máximo y duplicados después de normalizar', async () => {
  const metadata = { type: 'body', metatype: CrearTrabajadorDto } as const;
  await expect(pipe.transform({ ...alta, tags: ['  JEFE  de Frente ', 'Meca\u0301nico'] }, metadata))
    .resolves.toMatchObject({ tags: ['jefe de frente', 'mecánico'] });
  await expect(pipe.transform({ ...alta, tags: ['a', 'b', 'c', 'd', 'e'] }, metadata))
    .resolves.toMatchObject({ tags: ['a', 'b', 'c', 'd', 'e'] });
  await expect(pipe.transform({ ...alta, tags: ['Supervisor', ' supervisor '] }, metadata)).rejects.toThrow();
  await expect(pipe.transform({ ...alta, tags: ['a', 'b', 'c', 'd', 'e', 'f'] }, metadata)).rejects.toThrow();
});

it.each([
  ['carga.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['carga.csv', 'text/csv'],
])('rechaza un JPEG disfrazado de %s aunque declare el MIME esperado', async (originalname, mimetype) => {
  const withRlsContext = jest.fn();
  const servicio = new TrabajadoresService({ withRlsContext } as unknown as PrismaService);
  const controlador = new TrabajadoresController(servicio);
  const archivo = { originalname, mimetype, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) };
  const actor = { usuarioId: 'rrhh', email: 'rrhh@example.test', rol: 'RRHH', empresaId: alta.empresaId, trabajadorId: null };

  await expect(controlador.importar(archivo, { empresaId: alta.empresaId }, false, actor))
    .rejects.toMatchObject({ status: HttpStatus.UNSUPPORTED_MEDIA_TYPE });
  expect(withRlsContext).not.toHaveBeenCalled();
});

it('admite limpiar campos opcionales pero rechaza sustituir tags o campos obligatorios por null', async () => {
  const metadata = { type: 'body', metatype: EditarTrabajadorDto } as const;
  await expect(pipe.transform({ telefono: null, fechaNacimiento: null, tags: [] }, metadata))
    .resolves.toMatchObject({ telefono: null, fechaNacimiento: null, tags: [] });
  await expect(pipe.transform({ tags: null }, metadata)).rejects.toThrow();
  await expect(pipe.transform({ dni: null }, metadata)).rejects.toThrow();
});
