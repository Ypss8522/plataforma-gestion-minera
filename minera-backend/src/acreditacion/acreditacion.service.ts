import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';
import { calcularEstadoSemaforo } from '../common/utils/semaforo.util';

const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];
const TAMANO_MAX_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class AcreditacionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-01 — Registro de documento (incluye fotos tomadas desde la app móvil).
   * La subida real a Cloud Storage (S3/GCS) se delega a un StorageService
   * (no incluido en este esqueleto); aquí se valida y se calcula el semáforo.
   */
  async crearDocumento(dto: CrearDocumentoDto, subidoPor: string) {
    const tipo = await this.prisma.documentoTipo.findUnique({ where: { id: dto.documentoTipoId } });
    if (!tipo) {
      throw new NotFoundException({
        error: { code: 'DOCUMENTO_TIPO_NO_EXISTE', message: 'Tipo de documento inválido.' },
      });
    }

    this.validarArchivo(dto.archivoBase64, dto.archivoMimeType);

    if (tipo.requiereVencimiento && !dto.fechaVencimiento) {
      throw new BadRequestException({
        error: { code: 'VENCIMIENTO_REQUERIDO', message: 'Este tipo de documento requiere fecha de vencimiento.' },
      });
    }

    const fechaVencimiento = dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null;

    if (fechaVencimiento && fechaVencimiento < new Date()) {
      throw new BadRequestException({
        error: { code: 'DOCUMENTO_YA_VENCIDO', message: 'La fecha de vencimiento es anterior a hoy.' },
      });
    }

    const { estado } = calcularEstadoSemaforo(fechaVencimiento, tipo.ventanaAlertaDias);

    // TODO (Sprint 1): subir dto.archivoBase64 a Cloud Storage vía StorageService
    // y obtener una URL firmada de corta duración; nunca persistir el binario
    // ni una URL pública permanente en la base de datos.
    const archivoUrl = `pending-upload://${dto.trabajadorId}/${dto.documentoTipoId}`;

    const documento = await this.prisma.documento.create({
      data: {
        trabajadorId: dto.trabajadorId,
        documentoTipoId: dto.documentoTipoId,
        archivoUrl,
        fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : null,
        fechaVencimiento,
        estadoSemaforo: estado,
        subidoPor,
      },
    });

    // TODO: disparar recálculo de trabajador_estado_contexto (trigger o job encolado en BullMQ)

    return {
      id: documento.id,
      estadoSemaforo: documento.estadoSemaforo,
      archivoUrl: documento.archivoUrl,
      mensaje: 'Documento registrado correctamente',
    };
  }

  private validarArchivo(base64: string, mimeType?: string) {
    if (mimeType && !MIME_PERMITIDOS.includes(mimeType)) {
      throw new BadRequestException({
        error: { code: 'TIPO_ARCHIVO_NO_PERMITIDO', message: 'Solo se permiten imágenes JPEG/PNG o PDF.' },
      });
    }

    const tamanoAprox = (base64.length * 3) / 4;
    if (tamanoAprox > TAMANO_MAX_BYTES) {
      throw new BadRequestException({
        error: { code: 'ARCHIVO_MUY_GRANDE', message: 'El archivo excede el tamaño máximo permitido (10MB).' },
      });
    }
  }
}
