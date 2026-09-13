import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgregarMiembroDto } from './dto/agregar-miembro.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class OperacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorCompetencia(params: {
    tags: string[];
    mineraId: string;
    soloDisponibles100: boolean;
    cantidadRequerida?: number;
  }) {
    const trabajadores = await this.prisma.trabajador.findMany({
      where: {
        estadoGeneral: 'ACTIVO',
        tags: { some: { tag: { nombre: { in: params.tags } } } },
        ...(params.soloDisponibles100 && {
          estadosContexto: { some: { mineraId: params.mineraId, es100Porciento: true } },
        }),
      },
      include: {
        tags: { include: { tag: true } },
        estadosContexto: { where: { mineraId: params.mineraId } },
      },
    });

    const resultado = trabajadores.map((t) => ({
      id: t.id,
      apellidosNombres: `${t.apellidos}, ${t.nombres}`,
      tags: t.tags.map((tt) => tt.tag.nombre),
      es100Porciento: t.estadosContexto[0]?.es100Porciento ?? false,
    }));

    return {
      criterio: params,
      cantidadRequerida: params.cantidadRequerida ?? null,
      cantidadEncontrada: resultado.length,
      deficit: params.cantidadRequerida ? Math.max(params.cantidadRequerida - resultado.length, 0) : null,
      trabajadores: resultado,
    };
  }

  async agregarMiembro(frenteTrabajoId: string, dto: AgregarMiembroDto, actor: JwtPayload) {
    const frente = await this.prisma.frenteTrabajo.findUnique({ where: { id: frenteTrabajoId } });
    if (!frente) {
      throw new NotFoundException({
        error: { code: 'FRENTE_NO_ENCONTRADO', message: 'El frente de trabajo no existe.' },
      });
    }

    const estadoContexto = await this.prisma.trabajadorEstadoContexto.findFirst({
      where: { trabajadorId: dto.trabajadorId, mineraId: frente.mineraId },
    });

    const estaHabilitado = estadoContexto?.es100Porciento ?? false;

    if (!estaHabilitado) {
      if (!dto.forzarOverride) {
        const documentosBloqueantes = await this.obtenerDocumentosBloqueantes(dto.trabajadorId);
        throw new ConflictException({
          error: {
            code: 'TRABAJADOR_NO_DISPONIBLE',
            message: 'El trabajador no está 100% habilitado para esta minera.',
            detalle: { documentosBloqueantes },
          },
        });
      }

      if (!['OPERACIONES', 'GERENCIA', 'SUPER_ADMIN'].includes(actor.rol)) {
        throw new ForbiddenException({
          error: { code: 'OVERRIDE_NO_AUTORIZADO', message: 'Tu rol no puede forzar asignaciones.' },
        });
      }
    }

    const miembro = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.frenteTrabajoMiembro.create({
        data: {
          frenteTrabajoId,
          trabajadorId: dto.trabajadorId,
          rolEnFrente: dto.rolEnFrente,
          tipoAsignacion: dto.tipoAsignacion,
          fueOverride: !estaHabilitado && !!dto.forzarOverride,
          overridePor: !estaHabilitado && dto.forzarOverride ? actor.usuarioId : null,
          overrideMotivo: !estaHabilitado && dto.forzarOverride ? dto.overrideMotivo : null,
        },
      });

      if (!estaHabilitado && dto.forzarOverride) {
        await tx.auditoriaLog.create({
          data: {
            usuarioId: actor.usuarioId,
            accion: 'OVERRIDE_ASIGNACION',
            entidad: 'frente_trabajo_miembro',
            entidadId: creado.id,
            detalle: { trabajadorId: dto.trabajadorId, motivo: dto.overrideMotivo },
          },
        });
      }

      return creado;
    });

    return {
      id: miembro.id,
      trabajadorId: miembro.trabajadorId,
      estadoAsignacion: miembro.fueOverride ? 'CONFIRMADA_CON_OVERRIDE' : 'CONFIRMADA',
    };
  }

  private async obtenerDocumentosBloqueantes(trabajadorId: string) {
    const documentos = await this.prisma.documento.findMany({
      where: { trabajadorId, estadoSemaforo: { in: ['AMARILLO', 'ROJO'] } },
      include: { documentoTipo: true },
    });

    return documentos.map((d) => ({
      documentoTipo: d.documentoTipo.nombre,
      estado: d.estadoSemaforo,
      fechaVencimiento: d.fechaVencimiento,
    }));
  }
}
