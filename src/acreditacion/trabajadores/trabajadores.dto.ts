import { PartialType } from '@nestjs/mapped-types';
import { EstadoGeneralTrabajador } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayUnique, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min,
  ValidateIf,
} from 'class-validator';

export const PREFIJO_FORMULA = /^[=+\-@]/;
const TEXTO_SEGURO = /^(?![=+\-@])[^\p{Cc}]+$/u;

export function normalizarTag(nombre: string): string {
  return nombre.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es');
}

class DatosTrabajadorDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  dni!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(TEXTO_SEGURO)
  nombres!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(TEXTO_SEGURO)
  apellidos!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fechaIngreso!: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  fechaNacimiento?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Matches(/^\d[\d ()-]{0,29}$/)
  telefono?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => Array.isArray(value)
    ? value.map((tag: unknown) => typeof tag === 'string' ? normalizarTag(tag) : tag)
    : value)
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @Matches(TEXTO_SEGURO, { each: true })
  tags?: string[];
}

export class CrearTrabajadorDto extends DatosTrabajadorDto {
  @IsUUID()
  empresaId!: string;
}

export class EditarTrabajadorDto extends PartialType(DatosTrabajadorDto, { skipNullProperties: false }) {
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(EstadoGeneralTrabajador)
  estadoGeneral?: EstadoGeneralTrabajador;
}

export class ListarTrabajadoresDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  pagina = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite = 25;

  @IsOptional()
  @IsEnum(EstadoGeneralTrabajador)
  estadoGeneral?: EstadoGeneralTrabajador;
}

export class ImportarTrabajadoresDto {
  @IsUUID()
  empresaId!: string;
}
