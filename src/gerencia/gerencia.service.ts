import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GerenciaService {
  constructor(private readonly prisma: PrismaService) {}

  /** CU-07 — KPI principal: % de personal al 100%. */
  async reportePersonal100(filtros: { mineraId?: string; cargoId?: string }) {
    const contextos = await this.prisma.trabajadorEstadoContexto.findMany({
      where: {
        ...(filtros.mineraId && { mineraId: filtros.mineraId }),
        ...(filtros.cargoId && { cargoId: filtros.cargoId }),
      },
      include: { minera: true },
    });

    const total = contextos.length;
    const al100 = contextos.filter((c) => c.es100Porciento).length;

    const porMinera = new Map<string, { total: number; al100: number; nombre: string }>();
    for (const c of contextos) {
      const key = c.mineraId;
      const actual = porMinera.get(key) ?? { total: 0, al100: 0, nombre: c.minera.nombre };
      actual.total += 1;
      if (c.es100Porciento) actual.al100 += 1;
      porMinera.set(key, actual);
    }

    return {
      resumen: {
        totalTrabajadores: total,
        al100Porciento: al100,
        porcentaje100: total ? Number(((al100 / total) * 100).toFixed(1)) : 0,
      },
      distribucionPorMinera: Array.from(porMinera.values()).map((v) => ({
        minera: v.nombre,
        total: v.total,
        al100: v.al100,
        porcentaje: v.total ? Number(((v.al100 / v.total) * 100).toFixed(1)) : 0,
      })),
    };
  }

  /** RN-07 — Lead time de habilitación. */
  async reporteLeadTime(filtros: { mineraId?: string; cargoId?: string }) {
    const contextos = await this.prisma.trabajadorEstadoContexto.findMany({
      where: {
        es100Porciento: true,
        fechaAlcanzo100: { not: null },
        ...(filtros.mineraId && { mineraId: filtros.mineraId }),
        ...(filtros.cargoId && { cargoId: filtros.cargoId }),
      },
      include: { trabajador: true },
    });

    const dias = contextos
      .map((c) => {
        if (!c.fechaAlcanzo100) return null;
        const ingreso = new Date(c.trabajador.fechaIngreso).getTime();
        const alcanzo = new Date(c.fechaAlcanzo100).getTime();
        return Math.round((alcanzo - ingreso) / (1000 * 60 * 60 * 24));
      })
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

    const promedio = dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : 0;
    const mediana = dias.length ? dias[Math.floor(dias.length / 2)] : 0;
    const p90 = dias.length ? dias[Math.floor(dias.length * 0.9)] : 0;

    return {
      leadTimePromedioDias: Number(promedio.toFixed(1)),
      leadTimeMedianaDias: mediana,
      leadTimeP90Dias: p90,
      muestra: dias.length,
    };
  }
}
