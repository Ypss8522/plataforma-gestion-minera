import { Controller, Get, Header, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DocumentosLecturaService } from './documentos-lectura.service';

/**
 * SCRUM-11 — GET /api/v1/documentos/:id/url
 *
 * Devuelve una URL firmada de corta duración para ver un documento ya subido.
 * Roles permitidos: RRHH, SUPER_ADMIN y TRABAJADOR (solo sus propios documentos).
 * GERENCIA y OPERACIONES quedan fuera a propósito (mínimo privilegio sobre datos sensibles).
 */
@Controller('api/v1/documentos')
@UseGuards(RolesGuard)
export class DocumentosLecturaController {
  constructor(private readonly documentosLectura: DocumentosLecturaService) {}

  @Get(':id/url')
  @Roles(RolUsuario.RRHH, RolUsuario.SUPER_ADMIN, RolUsuario.TRABAJADOR)
  @Header('Cache-Control', 'no-store')
  obtenerUrl(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.documentosLectura.obtenerUrlLectura(id, actor);
  }
}
