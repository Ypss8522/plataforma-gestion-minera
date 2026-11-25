import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MatrizCumplimientoService } from './matriz-cumplimiento.service';
import { MatrizCumplimientoQueryDto } from './dto/matriz-cumplimiento-query.dto';

/**
 * SCRUM-14 — Endpoint de matriz-cumplimiento por trabajador, minera y cargo.
 *
 * Permite a RRHH (así como a OPERACIONES, GERENCIA, SUPER_ADMIN y al propio TRABAJADOR)
 * consultar en tiempo real qué documentos tiene cargados y cuáles le faltan a un trabajador,
 * con semáforo por documento, porcentaje de avance y versión vigente de la matriz.
 */
@Controller('api/v1/matriz-cumplimiento')
@UseGuards(RolesGuard)
export class MatrizCumplimientoController {
  constructor(private readonly matrizCumplimientoService: MatrizCumplimientoService) {}

  @Get()
  @Roles(
    RolUsuario.RRHH,
    RolUsuario.OPERACIONES,
    RolUsuario.GERENCIA,
    RolUsuario.SUPER_ADMIN,
    RolUsuario.TRABAJADOR,
  )
  @Header('Cache-Control', 'no-store')
  consultarMatriz(
    @Query() query: MatrizCumplimientoQueryDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.matrizCumplimientoService.obtenerMatrizCumplimiento({
      trabajadorId: query.trabajadorId,
      mineraId: query.mineraId,
      cargoId: query.cargoId,
      actor,
    });
  }
}
