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

  @IsString()
  archivoBase64: string;

  @IsOptional()
  @IsString()
  archivoMimeType?: string;
}
