import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RolUsuario } from '@prisma/client';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { StorageService } from '../common/storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SCRUM-11 — Lectura segura de documentos ya subidos.
 *
 * Regla de oro: el cliente SOLO envía el ID del documento. La clave del archivo en R2
 * (`archivoUrl`) se obtiene siempre de la tabla `documento`, y solo si el actor tiene
 * derecho a ese documento. El filtro de acceso va DENTRO de la consulta: un documento
 * ajeno nunca se carga en memoria.
 */
@Injectable()
export class DocumentosLecturaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async obtenerUrlLectura(documentoId: string, actor: JwtPayload) {
    const filtroAcceso = this.filtroDeAcceso(actor);
    if (!filtroAcceso) {
      throw this.documentoNoEncontrado();
    }

    const documento = await this.prisma.documento.findFirst({
      // `id` va después del filtro para que ningún filtro pueda pisarlo.
      where: { ...filtroAcceso, id: documentoId },
      select: { id: true, archivoUrl: true, trabajadorId: true },
    });

    // Mismo error si no existe o si no es tuyo: no se revela la existencia de documentos ajenos.
    if (!documento) {
      throw this.documentoNoEncontrado();
    }

    const url = await this.storage.obtenerUrlFirmadaLectura(documento.archivoUrl);

    // Falla cerrado: si no se puede registrar el acceso, no se entrega la URL.
    await this.prisma.auditoriaLog.create({
      data: {
        usuarioId: actor.usuarioId,
        accion: 'LECTURA_DOCUMENTO',
        entidad: 'documento',
        entidadId: documento.id,
        detalle: { trabajadorId: documento.trabajadorId, rol: actor.rol },
      },
    });

    return {
      documentoId: documento.id,
      url,
      expiraEnSegundos: this.storage.expiracionUrlSegundos,
    };
  }

  /**
   * Devuelve la condición de acceso según el rol, o null si el actor no puede leer documentos.
   * Por defecto se niega: cualquier rol no listado aquí queda fuera.
   */
  private filtroDeAcceso(actor: JwtPayload): Prisma.DocumentoWhereInput | null {
    switch (actor.rol) {
      case RolUsuario.TRABAJADOR:
        // RN-08: solo sus propios documentos.
        return actor.trabajadorId ? { trabajadorId: actor.trabajadorId } : null;
      case RolUsuario.RRHH:
        // Aislamiento por empresa: solo documentos de trabajadores de su empresa.
        return actor.empresaId ? { trabajador: { empresaId: actor.empresaId } } : null;
      case RolUsuario.SUPER_ADMIN:
        return {};
      default:
        return null;
    }
  }

  private documentoNoEncontrado(): NotFoundException {
    return new NotFoundException({
      error: {
        code: 'DOCUMENTO_NO_ENCONTRADO',
        message: 'El documento no existe o no tienes acceso a él.',
      },
    });
  }
}
