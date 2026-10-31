import { NotFoundException } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { StorageService } from '../common/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentosLecturaService } from './documentos-lectura.service';

const DOC_ID = '11111111-1111-4111-8111-111111111111';
const FILE_KEY = 'documentos/t1/tipo-1/archivo-abc.pdf';
const URL_FIRMADA = 'https://r2.example.com/documentos/t1/tipo-1/archivo-abc.pdf?X-Amz-Signature=firma';

function actor(parcial: Partial<JwtPayload>): JwtPayload {
  return {
    usuarioId: 'u1',
    email: 'u@empresa.pe',
    rol: RolUsuario.RRHH,
    empresaId: 'empresa-1',
    trabajadorId: null,
    ...parcial,
  };
}

describe('DocumentosLecturaService (SCRUM-11)', () => {
  let findFirst: jest.Mock;
  let auditoriaCreate: jest.Mock;
  let firmar: jest.Mock;
  let service: DocumentosLecturaService;

  beforeEach(() => {
    findFirst = jest.fn().mockResolvedValue({ id: DOC_ID, archivoUrl: FILE_KEY, trabajadorId: 't1' });
    auditoriaCreate = jest.fn().mockResolvedValue({});
    firmar = jest.fn().mockResolvedValue(URL_FIRMADA);

    const prisma = {
      documento: { findFirst },
      auditoriaLog: { create: auditoriaCreate },
    } as unknown as PrismaService;
    const storage = {
      obtenerUrlFirmadaLectura: firmar,
      expiracionUrlSegundos: 300,
    } as unknown as StorageService;

    service = new DocumentosLecturaService(prisma, storage);
  });

  describe('acceso permitido', () => {
    it('TRABAJADOR dueño: filtra por su trabajadorId y recibe la URL firmada', async () => {
      const resultado = await service.obtenerUrlLectura(
        DOC_ID,
        actor({ rol: RolUsuario.TRABAJADOR, trabajadorId: 't1', empresaId: null }),
      );

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { trabajadorId: 't1', id: DOC_ID } }),
      );
      expect(resultado).toEqual({ documentoId: DOC_ID, url: URL_FIRMADA, expiraEnSegundos: 300 });
    });

    it('RRHH: filtra por la empresa del actor', async () => {
      await service.obtenerUrlLectura(DOC_ID, actor({ rol: RolUsuario.RRHH, empresaId: 'empresa-1' }));

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { trabajador: { empresaId: 'empresa-1' }, id: DOC_ID },
        }),
      );
    });

    it('SUPER_ADMIN: solo filtra por el ID del documento', async () => {
      await service.obtenerUrlLectura(DOC_ID, actor({ rol: RolUsuario.SUPER_ADMIN, empresaId: null }));

      expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: DOC_ID } }));
    });

    it('firma la clave guardada en la base de datos, nunca el ID recibido', async () => {
      await service.obtenerUrlLectura(DOC_ID, actor({}));

      expect(firmar).toHaveBeenCalledTimes(1);
      expect(firmar).toHaveBeenCalledWith(FILE_KEY);
      expect(firmar).not.toHaveBeenCalledWith(DOC_ID);
    });

    it('registra el acceso en auditoría sin guardar la URL firmada', async () => {
      await service.obtenerUrlLectura(DOC_ID, actor({ usuarioId: 'u-rrhh' }));

      expect(auditoriaCreate).toHaveBeenCalledTimes(1);
      const llamada = auditoriaCreate.mock.calls[0][0];
      expect(llamada.data).toMatchObject({
        usuarioId: 'u-rrhh',
        accion: 'LECTURA_DOCUMENTO',
        entidad: 'documento',
        entidadId: DOC_ID,
      });
      expect(JSON.stringify(llamada)).not.toContain(URL_FIRMADA);
      expect(JSON.stringify(llamada)).not.toContain('X-Amz-Signature');
    });
  });

  describe('acceso denegado', () => {
    it('TRABAJADOR con documento ajeno: 404 y no se firma ni se audita', async () => {
      findFirst.mockResolvedValue(null); // la consulta filtrada por su trabajadorId no encuentra nada

      await expect(
        service.obtenerUrlLectura(DOC_ID, actor({ rol: RolUsuario.TRABAJADOR, trabajadorId: 't-otro', empresaId: null })),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { trabajadorId: 't-otro', id: DOC_ID } }),
      );
      expect(firmar).not.toHaveBeenCalled();
      expect(auditoriaCreate).not.toHaveBeenCalled();
    });

    it('RRHH de otra empresa: 404 y no se firma', async () => {
      findFirst.mockResolvedValue(null);

      await expect(
        service.obtenerUrlLectura(DOC_ID, actor({ rol: RolUsuario.RRHH, empresaId: 'empresa-2' })),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(firmar).not.toHaveBeenCalled();
    });

    it('documento inexistente y documento ajeno devuelven exactamente el mismo error', async () => {
      findFirst.mockResolvedValue(null);

      const errores: unknown[] = [];
      for (const a of [
        actor({ rol: RolUsuario.TRABAJADOR, trabajadorId: 't-otro', empresaId: null }),
        actor({ rol: RolUsuario.SUPER_ADMIN, empresaId: null }),
      ]) {
        errores.push(await service.obtenerUrlLectura(DOC_ID, a).catch((e) => (e as NotFoundException).getResponse()));
      }

      expect(errores[0]).toEqual(errores[1]);
    });

    it('TRABAJADOR sin trabajadorId en el token: ni siquiera consulta la base', async () => {
      await expect(
        service.obtenerUrlLectura(DOC_ID, actor({ rol: RolUsuario.TRABAJADOR, trabajadorId: null })),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(findFirst).not.toHaveBeenCalled();
    });

    it('RRHH sin empresaId en el token: ni siquiera consulta la base', async () => {
      await expect(
        service.obtenerUrlLectura(DOC_ID, actor({ rol: RolUsuario.RRHH, empresaId: null })),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(findFirst).not.toHaveBeenCalled();
    });

    it.each([RolUsuario.OPERACIONES, RolUsuario.GERENCIA, 'ROL_DESCONOCIDO'])(
      'rol %s: se niega por defecto sin consultar la base',
      async (rol) => {
        await expect(service.obtenerUrlLectura(DOC_ID, actor({ rol }))).rejects.toBeInstanceOf(NotFoundException);

        expect(findFirst).not.toHaveBeenCalled();
        expect(firmar).not.toHaveBeenCalled();
      },
    );
  });

  describe('fallos de infraestructura', () => {
    it('si la firma falla, se propaga el error y no se registra auditoría', async () => {
      firmar.mockRejectedValue(new Error('R2 no disponible'));

      await expect(service.obtenerUrlLectura(DOC_ID, actor({}))).rejects.toThrow('R2 no disponible');
      expect(auditoriaCreate).not.toHaveBeenCalled();
    });

    it('si la auditoría falla, no se entrega la URL (falla cerrado)', async () => {
      auditoriaCreate.mockRejectedValue(new Error('BD no disponible'));

      await expect(service.obtenerUrlLectura(DOC_ID, actor({}))).rejects.toThrow('BD no disponible');
    });
  });
});
