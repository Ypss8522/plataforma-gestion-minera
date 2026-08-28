import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { RolEnFrente, TipoAsignacion } from '@prisma/client';

export class AgregarMiembroDto {
  @IsUUID()
  trabajadorId: string;

  @IsEnum(RolEnFrente)
  rolEnFrente: RolEnFrente;

  @IsEnum(TipoAsignacion)
  tipoAsignacion: TipoAsignacion;

  @IsOptional()
  @IsBoolean()
  forzarOverride?: boolean = false;

  @ValidateIf((o) => o.forzarOverride === true)
  @IsString()
  overrideMotivo?: string;
}
