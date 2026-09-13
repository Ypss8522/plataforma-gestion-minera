import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MobileSelfAccessGuard } from '../common/guards/mobile-self-access.guard';
import { MobileService } from './mobile.service';

/**
 * Todos los endpoints de este controller son consumidos por la app/PWA
 * del Trabajador. Implementa CU-09 y RN-08 (aislamiento absoluto).
 *
 * IMPORTANTE: ningún método de este controller recibe trabajadorId como
 * parámetro de la petición. Siempre se obtiene desde request.trabajadorIdSeguro,
 * que es inyectado por MobileSelfAccessGuard a partir del JWT.
 */
@Controller('api/v1/mobile')
@UseGuards(RolesGuard, MobileSelfAccessGuard)
@Roles('TRABAJADOR' as any)
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
