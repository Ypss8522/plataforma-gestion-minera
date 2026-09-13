import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { OperacionesService } from './operaciones.service';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { RolUsuario } from '@prisma/client';

@Controller('api/v1')
@UseGuards(RolesGuard)
export class OperacionesController {
  constructor(private readonly operacionesService: OperacionesService) {}

  @Get('trabajadores/buscar-por-competencia')
  @Roles(RolUsuario.OPERACIONES, RolUsuario.RRHH, RolUsuario.GERENCIA, RolUsuario.SUPER_ADMIN)
  async buscarPorCompetencia(
    @Query('tag') tag: string | string[],
    @Query('mineraId') mineraId: string,
    @Query('soloDisponibles100') soloDisponibles100 = 'true',
    @Query('cantidadRequerida') cantidadRequerida?: string,
  ) {
    const tags = Array.isArray(tag) ? tag : [tag];
    return this.operacionesService.buscarPorCompetencia({
      tags,
      mineraId,
      soloDisponibles100: soloDisponibles100 !== 'false',
      cantidadRequerida: cantidadRequerida ? parseInt(cantidadRequerida, 10) : undefined,
    });
  }

  @Post('frentes-trabajo/:id/miembros')
  @Roles(RolUsuario.OPERACIONES, RolUsuario.SUPER_ADMIN, RolUsuario.GERENCIA)
  async agregarMiembro(
    @Param('id') frenteTrabajoId: string,
    @Body() dto: AgregarMiembroDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.operacionesService.agregarMiembro(frenteTrabajoId, dto, actor);
  }
}
