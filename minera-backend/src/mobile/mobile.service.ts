import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MobileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve CU-09. El parámetro trabajadorId SIEMPRE viene del JWT
   * (nunca de un input del cliente) — ver MobileSelfAccessGuard.
   */
  async obtenerMiEstado(trabajadorId: string) {
    return this.prisma.withRlsContext({ rol: 'TRABAJADOR', trabajadorId }, async (tx) => {
      const trabajador = await tx.trabajador.findUnique({
        where: { id: trabajadorId },
        select: { id: true, nombres: true, apellidos: true, dni: true, estadoGeneral: true },
      });

      if (!trabajador) {
        throw new NotFoundException({
          error: { code: 'TRABAJADOR_NO_ENCONTRADO', message: 'No se encontró el trabajador.' },
        });
      }

      const contextos = await tx.trabajadorEstadoContexto.findMany({
        where: { trabajadorId },
        include: { minera: true, cargo: true },
      });

      const documentos = await tx.documento.findMany({
        where: { trabajadorId },
        include: { documentoTipo: true },
        orderBy: { fechaVencimiento: 'asc' },
      });

      return {
        trabajador,
        contextos: contextos.map((c) => ({
          minera: { id: c.minera.id, nombre: c.minera.nombre, colorPrimario: c.minera.colorPrimario },
          cargo: { id: c.cargo.id, nombre: c.cargo.nombre },
          porcentajeAvance: c.porcentajeAvance,
          es100Porciento: c.es100Porciento,
        })),
        documentos: documentos.map((d) => ({
          documentoTipo: d.documentoTipo.nombre,
          estadoSemaforo: d.estadoSemaforo,
          fechaVencimiento: d.fechaVencimiento,
        })),
      };
    });
  }

  async obtenerMisNotificaciones(trabajadorId: string) {
    // Placeholder: integrar con tabla de notificaciones cuando se implemente
    // el módulo de alertas (Worker + BullMQ, ver sección 3 del doc maestro).
    return { trabajadorId, notificaciones: [] };
  }
}
