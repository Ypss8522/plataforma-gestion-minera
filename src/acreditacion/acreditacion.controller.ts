import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { RolUsuario } from '@prisma/client';
import { AcreditacionService } from './acreditacion.service';
import { CrearDocumentoDto } from './dto/crear-documento.dto';

@Controller('api/v1/documentos')
@UseGuards(RolesGuard)
export class AcreditacionController {
  constructor(private readonly acreditacionService: AcreditacionService) {}

  @Post()
  @Roles(RolUsuario.RRHH, RolUsuario.TRABAJADOR, RolUsuario.SUPER_ADMIN)
  async crear(@Body() dto: CrearDocumentoDto, @CurrentUser() actor: JwtPayload) {
    return this.acreditacionService.crearDocumento(dto, actor.usuarioId);
  }
}
