import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseBoolPipe,
  ParseUUIDPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RolUsuario } from '@prisma/client';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MAX_ARCHIVO_TRABAJADORES } from './importacion-trabajadores.parser';
import { CrearTrabajadorDto, EditarTrabajadorDto, ImportarTrabajadoresDto, ListarTrabajadoresDto } from './trabajadores.dto';
import { TrabajadoresService } from './trabajadores.service';

@Controller('api/v1/trabajadores')
@UseGuards(RolesGuard)
@Roles(RolUsuario.RRHH, RolUsuario.SUPER_ADMIN)
export class TrabajadoresController {
  constructor(private readonly trabajadores: TrabajadoresService) {}

  @Get()
  listar(@Query() filtros: ListarTrabajadoresDto, @CurrentUser() actor: JwtPayload) {
    return this.trabajadores.listar(filtros, actor);
  }

  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.trabajadores.obtener(id, actor);
  }

  @Post()
  crear(@Body() dto: CrearTrabajadorDto, @CurrentUser() actor: JwtPayload) {
    return this.trabajadores.crear(dto, actor);
  }

  @Post('importar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo', {
    limits: { fileSize: MAX_ARCHIVO_TRABAJADORES, files: 1, fields: 1, fieldSize: 128 },
  }))
  importar(
    @UploadedFile() archivo: { buffer: Buffer } | undefined,
    @Body() dto: ImportarTrabajadoresDto,
    @Query('dryRun', new ParseBoolPipe({ optional: true })) dryRun: boolean | undefined,
    @CurrentUser() actor: JwtPayload,
  ) {
    if (!archivo?.buffer) throw new BadRequestException('Adjunta el archivo en el campo archivo.');
    return this.trabajadores.importar(archivo.buffer, dto.empresaId, dryRun ?? false, actor);
  }

  @Patch(':id')
  editar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EditarTrabajadorDto, @CurrentUser() actor: JwtPayload) {
    return this.trabajadores.editar(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  darDeBaja(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.trabajadores.darDeBaja(id, actor);
  }
}
