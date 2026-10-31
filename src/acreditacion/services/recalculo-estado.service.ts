import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { calcularAvanceContexto, recalcularSemaforoDocumento } from '../utils/recalculo.util';

@Injectable()
export class RecalculoEstadoService {
  private readonly logger = new Logger(RecalculoEstadoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcula el estado semáforo de todos los documentos en la base de datos (RN-01).
   * Si el estado cambia (por ejemplo de VERDE a AMARILLO o de AMARILLO a ROJO), lo actualiza en Postgres.
   */
  async recalcularSemaforosDocumentos(fechaReferencia: Date = new Date()): Promise<number> {
    const documentos = await this.prisma.documento.findMany({
      include: { documentoTipo: true },
    });

    let documentosActualizados = 0;

    for (const doc of documentos) {
      const { estado } = recalcularSemaforoDocumento(doc, fechaReferencia);
      if (doc.estadoSemaforo !== estado) {
        await this.prisma.documento.update({
          where: { id: doc.id },
          data: { estadoSemaforo: estado },
        });
        documentosActualizados++;
      }
    }

    this.logger.log(
      `Semáforo de documentos recalculado: ${documentosActualizados} de ${documentos.length} actualizados.`,
    );

    return documentosActualizados;
  }

  /**
   * Recalcula el avance y porcentaje de acreditación de un trabajador para todos sus contextos Minera + Cargo (RN-02).
   */
  async recalcularTrabajador(trabajadorId: string, fechaReferencia: Date = new Date()) {
    const trabajador = await this.prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      include: {
        documentos: { include: { documentoTipo: true } },
        estadosContexto: true,
        tags: { include: { tag: true } },
        empresa: {
          include: {
            mineras: { where: { activo: true } },
          },
        },
      },
    });

    if (!trabajador) {
      this.logger.warn(`Trabajador con id ${trabajadorId} no encontrado para recálculo.`);
      return null;
    }

    // 1. Identificar pares únicos (mineraId, cargoId) aplicables al trabajador
    const contextosMap = new Map<string, { mineraId: string; cargoId: string }>();

    // A. Contextos que ya existen para el trabajador
    for (const ctx of trabajador.estadosContexto) {
      const key = `${ctx.mineraId}:${ctx.cargoId}`;
      contextosMap.set(key, { mineraId: ctx.mineraId, cargoId: ctx.cargoId });
    }

    // B. Contextos derivados de los tags del trabajador que coinciden con cargos, para las mineras de su empresa
    const tagNombres = trabajador.tags.map((t) => t.tag.nombre.trim().toLowerCase());
    const cargos = await this.prisma.cargo.findMany();
    const cargosCoincidentes = cargos.filter((c) => tagNombres.includes(c.nombre.trim().toLowerCase()));

    for (const em of trabajador.empresa.mineras) {
      for (const cargo of cargosCoincidentes) {
        const key = `${em.mineraId}:${cargo.id}`;
        if (!contextosMap.has(key)) {
          contextosMap.set(key, { mineraId: em.mineraId, cargoId: cargo.id });
        }
      }
    }

    // C. Si no tuviera contextos previos ni tags coincidentes, pero hay matrices configuradas para las mineras de su empresa
    if (contextosMap.size === 0) {
      for (const em of trabajador.empresa.mineras) {
        const matrices = await this.prisma.matrizRequisito.findMany({
          where: { mineraId: em.mineraId },
          select: { cargoId: true },
          distinct: ['cargoId'],
        });
        for (const m of matrices) {
          const key = `${em.mineraId}:${m.cargoId}`;
          contextosMap.set(key, { mineraId: em.mineraId, cargoId: m.cargoId });
        }
      }
    }

    const resultadosContextos = [];

    // 2. Para cada contexto, obtener matriz y calcular avance
    for (const { mineraId, cargoId } of contextosMap.values()) {
      const requisitos = await this.prisma.matrizRequisito.findMany({
        where: { mineraId, cargoId },
        include: { documentoTipo: true },
      });

      const rawContexto = trabajador.estadosContexto.find(
        (c) => c.mineraId === mineraId && c.cargoId === cargoId,
      );

      const contextoActual = rawContexto
        ? {
            porcentajeAvance: Number(rawContexto.porcentajeAvance),
            es100Porciento: rawContexto.es100Porciento,
            fechaAlcanzo100: rawContexto.fechaAlcanzo100,
          }
        : null;

      const resultado = calcularAvanceContexto({
        requisitos,
        documentos: trabajador.documentos,
        contextoActual,
        fechaReferencia,
      });

      const contextoGuardado = await this.prisma.trabajadorEstadoContexto.upsert({
        where: {
          trabajadorId_mineraId_cargoId: {
            trabajadorId: trabajador.id,
            mineraId,
            cargoId,
          },
        },
        update: {
          porcentajeAvance: resultado.porcentajeAvance,
          es100Porciento: resultado.es100Porciento,
          fechaAlcanzo100: resultado.fechaAlcanzo100,
          calculadoEn: fechaReferencia,
        },
        create: {
          trabajadorId: trabajador.id,
          mineraId,
          cargoId,
          porcentajeAvance: resultado.porcentajeAvance,
          es100Porciento: resultado.es100Porciento,
          fechaAlcanzo100: resultado.fechaAlcanzo100,
          calculadoEn: fechaReferencia,
        },
      });

      resultadosContextos.push({
        mineraId,
        cargoId,
        porcentajeAvance: Number(contextoGuardado.porcentajeAvance),
        es100Porciento: contextoGuardado.es100Porciento,
        fechaAlcanzo100: contextoGuardado.fechaAlcanzo100,
        documentosFaltantes: resultado.documentosFaltantes,
      });
    }

    return {
      trabajadorId: trabajador.id,
      contextos: resultadosContextos,
    };
  }

  /**
   * Recorre todos los trabajadores del sistema para recalcular semáforos y estados de contexto (Job diario BullMQ).
   */
  async recalcularTodosLosTrabajadores(fechaReferencia: Date = new Date()) {
    const inicio = Date.now();
    this.logger.log('Iniciando recálculo global de trabajadores y documentos...');

    // 1. Recalcular semáforo de documentos en bloque
    const docsActualizados = await this.recalcularSemaforosDocumentos(fechaReferencia);

    // 2. Obtener todos los trabajadores activos
    const trabajadores = await this.prisma.trabajador.findMany({
      select: { id: true },
    });

    let totalContextos = 0;
    for (const t of trabajadores) {
      const res = await this.recalcularTrabajador(t.id, fechaReferencia);
      if (res) {
        totalContextos += res.contextos.length;
      }
    }

    const duracionMs = Date.now() - inicio;
    this.logger.log(
      `Recálculo global completado en ${duracionMs}ms. Trabajadores: ${trabajadores.length}, Contextos: ${totalContextos}, Docs modificados: ${docsActualizados}.`,
    );

    return {
      exito: true,
      totalTrabajadores: trabajadores.length,
      documentosSemaforoActualizados: docsActualizados,
      contextosCalculados: totalContextos,
      fechaEjecucion: fechaReferencia,
      duracionMs,
    };
  }
}
