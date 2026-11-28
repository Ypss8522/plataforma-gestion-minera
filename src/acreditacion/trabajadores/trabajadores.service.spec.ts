import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { TrabajadoresService } from './trabajadores.service';

const empresaId = 'a064a930-c6f2-41f7-bafa-6263ed497ded';
const actor: JwtPayload = { usuarioId: 'rrhh', email: 'rrhh@example.test', rol: 'RRHH', empresaId, trabajadorId: null };
const cabecera = 'dni,nombres,apellidos,fechaIngreso,tags';
const alta = { empresaId, dni: '01234567', nombres: 'Ana', apellidos: 'Prueba', fechaIngreso: '2026-02-03' };

function preparar() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'trabajador' }]),
    empresa: { findUnique: jest.fn().mockResolvedValue({ id: empresaId }) },
    trabajador: {
      findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id: 'trabajador' }),
      create: jest.fn().mockResolvedValue({ id: 'trabajador' }), update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }), count: jest.fn().mockResolvedValue(1),
      createManyAndReturn: jest.fn(async ({ data }: { data: { dni: string }[] }) =>
        data.filter(({ dni }) => dni !== '01234567').map(({ dni }) => ({ id: dni, dni }))),
    },
    tag: { findMany: jest.fn().mockResolvedValue([{ id: 'tag-existente', nombre: 'Mecánico' }]), createMany: jest.fn() },
    trabajadorTag: { createMany: jest.fn(), deleteMany: jest.fn() },
  };
  const withRlsContext = jest.fn(async (_actor, ejecutar) => ejecutar(tx));
  return { servicio: new TrabajadoresService({ withRlsContext } as unknown as PrismaService), tx, withRlsContext };
}

it('crea, lee, edita y da de baja a través del contexto RLS, reutilizando tags existentes', async () => {
  const { servicio, tx, withRlsContext } = preparar();
  await servicio.crear({ ...alta, tags: ['mecánico'] }, actor);
  expect(tx.trabajadorTag.createMany).toHaveBeenCalledWith({ data: [{ trabajadorId: 'trabajador', tagId: 'tag-existente' }], skipDuplicates: true });
  expect(tx.tag.createMany).not.toHaveBeenCalled();
  await expect(servicio.obtener('trabajador', actor)).resolves.toMatchObject({ id: 'trabajador' });
  await expect(servicio.listar({ pagina: 1, limite: 10 }, actor)).resolves.toMatchObject({ total: 1 });
  await servicio.editar('trabajador', { nombres: 'María', tags: [] }, actor);
  expect(tx.trabajadorTag.deleteMany).toHaveBeenCalledWith({ where: { trabajadorId: 'trabajador', tagId: { notIn: [] } } });
  await servicio.darDeBaja('trabajador', actor);
  expect(tx.trabajador.updateMany).toHaveBeenCalledWith({ where: { id: 'trabajador' }, data: { estadoGeneral: 'INACTIVO' } });
  expect(withRlsContext).toHaveBeenCalledTimes(5);
  expect(withRlsContext.mock.calls.every(([contexto]) => contexto === actor)).toBe(true);
});

it('traduce DNI duplicado a conflicto y verifica que la empresa exista', async () => {
  const { servicio, tx } = preparar();
  tx.trabajador.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicado', { code: 'P2002', clientVersion: 'test' }));
  await expect(servicio.crear(alta, actor)).rejects.toThrow(ConflictException);
  tx.empresa.findUnique.mockResolvedValueOnce(null);
  await expect(servicio.crear(alta, actor)).rejects.toThrow(NotFoundException);
});

it('excluye bajas del listado general, permite consultarlas por estado y reactiva el registro existente', async () => {
  const { servicio, tx } = preparar();
  await servicio.listar({ pagina: 1, limite: 10 }, actor);
  expect(tx.trabajador.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { estadoGeneral: { not: 'INACTIVO' } } }));
  await servicio.listar({ pagina: 1, limite: 10, estadoGeneral: 'INACTIVO' }, actor);
  expect(tx.trabajador.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { estadoGeneral: 'INACTIVO' } }));
  await servicio.editar('trabajador', { estadoGeneral: 'ACTIVO' }, actor);
  expect(tx.trabajador.update).toHaveBeenCalledWith({ where: { id: 'trabajador' }, data: expect.objectContaining({ estadoGeneral: 'ACTIVO' }) });
  expect(tx.trabajador.create).not.toHaveBeenCalled();
});

it.each([true, false])('rechaza una empresa inexistente antes de procesar lotes con dryRun=%s', async dryRun => {
  const { servicio, tx } = preparar();
  tx.empresa.findUnique.mockResolvedValueOnce(null);
  const archivo = Buffer.from([cabecera, '12345678,Ana,Prueba,2026-02-03,'].join('\n'));
  await expect(servicio.importar(archivo, empresaId, dryRun, actor)).rejects.toMatchObject({ status: 404 });
  expect(tx.trabajador.findMany).not.toHaveBeenCalled();
  expect(tx.trabajador.createManyAndReturn).not.toHaveBeenCalled();
  expect(tx.tag.createMany).not.toHaveBeenCalled();
});

it('reporta errores de parser, DNI existente y duplicado en archivo sin modificar datos en dry run', async () => {
  const { servicio, tx } = preparar();
  tx.trabajador.findMany.mockResolvedValueOnce([{ dni: '01234567' }]);
  const archivo = Buffer.from([cabecera, '01234567,Ana,Prueba,2026-02-03,', '01234567,Ana,Prueba,2026-02-03,',
    '12345678,Ana,Prueba,2026-02-03,Mecánico', 'otro,Ana,Prueba,2026-02-03,'].join('\n'));
  const resultado = await servicio.importar(archivo, empresaId, true, actor);
  expect(resultado).toMatchObject({ total: 4, creadas: 0, validas: 1, rechazadas: 3 });
  expect(resultado.errores.map(({ fila }) => fila)).toEqual([2, 3, 5]);
  expect(tx.trabajador.createManyAndReturn).not.toHaveBeenCalled();
  expect(tx.tag.createMany).not.toHaveBeenCalled();
  expect(tx.trabajadorTag.createMany).not.toHaveBeenCalled();
});

it('importa 601 filas en lotes de 100 y conserva las filas válidas ante un DNI existente', async () => {
  const { servicio, tx, withRlsContext } = preparar();
  const filas = Array.from({ length: 600 }, (_, i) => `${i + 10000000},Ana,Prueba,2026-02-03,Mecánico`);
  const archivo = Buffer.from([cabecera, '01234567,Ana,Prueba,2026-02-03,otro', ...filas].join('\n'));
  expect(await servicio.importar(archivo, empresaId, false, actor)).toEqual({
    total: 601, creadas: 600, validas: 600, rechazadas: 1,
    errores: [{ fila: 2, dni: '01234567', motivo: expect.stringContaining('base de datos') }],
  });
  expect(tx.trabajador.createManyAndReturn.mock.calls.map(([{ data }]) => data.length)).toEqual([100, 100, 100, 100, 100, 100, 1]);
  expect(withRlsContext).toHaveBeenCalledTimes(8);
  expect(tx.tag.createMany).not.toHaveBeenCalled();
  expect(tx.trabajadorTag.createMany).toHaveBeenCalledTimes(7);
});
