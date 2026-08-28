import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RolUsuario } from '@prisma/client';
import { GerenciaService } from './gerencia.service';

@Controller('api/v1/reportes')
@UseGuards(RolesGuard)
@Roles(RolUsuario.GERENCIA, RolUsuario.SUPER_ADMIN)
export class GerenciaController {
  constructor(private readonly gerenciaService: GerenciaService) {}

  @Get('personal-100-porciento')
  async personal100(@Query('mineraId') mineraId?: string, @Query('cargoId') cargoId?: string) {
    return this.gerenciaService.reportePersonal100({ mineraId, cargoId });
  }

  @Get('lead-time-habilitacion')
  async leadTime(@Query('mineraId') mineraId?: string, @Query('cargoId') cargoId?: string) {
    return this.gerenciaService.reporteLeadTime({ mineraId, cargoId });
  }
}
