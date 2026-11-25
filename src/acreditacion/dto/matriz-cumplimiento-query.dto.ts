import { IsNotEmpty, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class MatrizCumplimientoQueryDto {
  @Transform(({ obj, value }) => value ?? obj.trabajador_id)
  @IsUUID('4', { message: 'trabajadorId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'trabajadorId es obligatorio' })
  trabajadorId: string;

  @Transform(({ obj, value }) => value ?? obj.minera_id)
  @IsUUID('4', { message: 'mineraId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'mineraId es obligatorio' })
  mineraId: string;

  @Transform(({ obj, value }) => value ?? obj.cargo_id)
  @IsUUID('4', { message: 'cargoId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'cargoId es obligatorio' })
  cargoId: string;
}
