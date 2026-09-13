import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';
import { calcularEstadoSemaforo } from '../common/utils/semaforo.util';

const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];
const TAMANO_MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class AcreditacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async crearDocumento(dto: CrearDocumentoDto, subidoPor: string) {
    const tipo = await this.prisma.documentoTipo.findUnique({ where: { id: dto.documentoTipoId } });
    if (!tipo) {
      throw new NotFoundException({
        error: { code: 'DOCUMENTO_TIPO_NO_EXISTE', message: 'Tipo de documento inválido.' },
      });
    }

    const mimeType = dto.archivoMimeType || 'application/pdf';
    this.validarArchivo(dto.archivoBase64, mimeType);

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

    const fileKey = await this.storageService.subirArchivoBase64(
      dto.archivoBase64,
      mimeType,
      dto.trabajadorId,
      dto.documentoTipoId,
    );

    const documento = await this.prisma.documento.create({
      data: {
        trabajadorId: dto.trabajadorId,
        documentoTipoId: dto.documentoTipoId,
        archivoUrl: fileKey,
        fechaEmision: dto.fechaEmision ? new Date(dto.fechaEmision) : null,
        fechaVencimiento,
        estadoSemaforo: estado,
        subidoPor,
      },
    });

    const signedUrl = await this.storageService.obtenerUrlFirmadaLectura(fileKey);

    return {
      id: documento.id,
      estadoSemaforo: documento.estadoSemaforo,
      archivoUrl: signedUrl,
      mensaje: 'Documento registrado y almacenado correctamente',
    };
  }

  private validarArchivo(base64: string, mimeType: string) {
    if (!MIME_PERMITIDOS.includes(mimeType)) {
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
