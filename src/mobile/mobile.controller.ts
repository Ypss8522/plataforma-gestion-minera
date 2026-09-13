import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MobileSelfAccessGuard } from '../common/guards/mobile-self-access.guard';
import { MobileService } from './mobile.service';
import { RolUsuario } from '@prisma/client';

@Controller('api/v1/mobile')
@UseGuards(RolesGuard, MobileSelfAccessGuard)
@Roles(RolUsuario.TRABAJADOR)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('mi-estado')
  async miEstado(@Req() request: Request & { trabajadorIdSeguro: string }) {
    return this.mobileService.obtenerMiEstado(request.trabajadorIdSeguro);
  }

  @Get('mis-notificaciones')
  async misNotificaciones(@Req() request: Request & { trabajadorIdSeguro: string }) {
    return this.mobileService.obtenerMisNotificaciones(request.trabajadorIdSeguro);
  }
}
