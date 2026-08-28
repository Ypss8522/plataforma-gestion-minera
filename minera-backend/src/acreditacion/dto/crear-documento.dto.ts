import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearDocumentoDto {
  @IsUUID()
  trabajadorId: string;

  @IsUUID()
  documentoTipoId: string;

  @IsOptional()
  @IsDateString()
  fechaEmision?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  /**
   * Foto/escaneo del documento en base64 (JPEG/PNG/PDF).
   * En producción: validar tamaño máximo, mimetype real (magic bytes,
   * no solo extensión) y escanear contra malware antes de subir a S3/GCS.
   */
  @IsString()
  archivoBase64: string;

  @IsOptional()
  @IsString()
  archivoMimeType?: string;
}
