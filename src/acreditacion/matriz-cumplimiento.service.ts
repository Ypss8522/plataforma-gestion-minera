import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoSemaforo, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import {
  calcularAvanceContexto,
  recalcularSemaforoDocumento,
} from './utils/recalculo.util';

export type EstadoCumplimientoRequisito = 'VERDE' | 'AMARILLO' | 'ROJO' | 'FALTANTE';

export interface DetalleRequisitoCumplimiento {
  requisitoId: string;
  documentoTipoId: string;
  documentoTipo: string;
  categoria: string;
  obligatorio: boolean;
  version: number;
  estado: EstadoCumplimientoRequisito;
  documentoId: string | null;
  fechaEmision: Date | null;
  fechaVencimiento: Date | null;
  diasRestantes: number | null;
}

export interface DocumentoAlertaFaltante {
  documentoTipoId: string;
  documentoTipo: string;
  estado: EstadoCumplimientoRequisito;
  motivo: 'FALTANTE' | 'VENCIDO' | 'EN_ALERTA';
  diasRestantes: number | null;
}

export interface MatrizCumplimientoResponse {
  trabajador: {
    id: string;
    dni: string;
    nombres: string;
    apellidos: string;
    estadoGeneral: string;
  };
  minera: {
    id: string;
    nombre: string;
  };
  cargo: {
    id: string;
    nombre: string;
  };
  versionMatriz: number;
  totalRequisitos: number;
  requisitosObligatorios: number;
  cumplidosEnVerde: number;
  porcentajeAvance: number;
  es100Porciento: boolean;
  fechaAlcanzo100: Date | null;
  requisitos: DetalleRequisitoCumplimiento[];
  documentosFaltantesOEnAlerta: DocumentoAlertaFaltante[];
}

@Injectable()
export class MatrizCumplimientoService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerMatrizCumplimiento(params: {
    trabajadorId: string;
    mineraId: string;
    cargoId: string;
    actor: JwtPayload;
    fechaReferencia?: Date;
  }): Promise<MatrizCumplimientoResponse> {
    const { trabajadorId, mineraId, cargoId, actor } = params;
    const fechaRef = params.fechaReferencia ?? new Date();

    // Regla de aislamiento RN-08: un trabajador solo puede consultar su propia matriz
    if (actor.rol === RolUsuario.TRABAJADOR && actor.trabajadorId !== trabajadorId) {
      throw new ForbiddenException({
        error: {
          code: 'ACCESO_DENEGADO',
          message: 'No tienes permiso para consultar la matriz de cumplimiento de otro trabajador.',
        },
      });
    }

    // 1. Validar existencia del trabajador
    const trabajador = await this.prisma.trabajador.findUnique({
      where: { id: trabajadorId },
      include: {
        documentos: {
          include: { documentoTipo: true },
        },
        estadosContexto: {
          where: { mineraId, cargoId },
        },
      },
    });

    if (!trabajador) {
      throw new NotFoundException({
        error: {
          code: 'TRABAJADOR_NO_ENCONTRADO',
          message: 'El trabajador especificado no existe.',
        },
      });
    }

    // 2. Validar existencia de minera y cargo en paralelo
    const [minera, cargo] = await Promise.all([
      this.prisma.minera.findUnique({ where: { id: mineraId } }),
      this.prisma.cargo.findUnique({ where: { id: cargoId } }),
    ]);

    if (!minera) {
      throw new NotFoundException({
        error: {
          code: 'MINERA_NO_ENCONTRADA',
          message: 'La minera especificada no existe.',
        },
      });
    }

    if (!cargo) {
      throw new NotFoundException({
        error: {
          code: 'CARGO_NO_ENCONTRADO',
          message: 'El cargo especificado no existe.',
        },
      });
    }

    // 3. Obtener requisitos vigentes de la matriz para (mineraId, cargoId)
    // Se respetan vigencia temporal y versión vigente
    const requisitosActivos = await this.prisma.matrizRequisito.findMany({
      where: {
        mineraId,
        cargoId,
        vigenteDesde: { lte: fechaRef },
        OR: [
          { vigenteHasta: null },
          { vigenteHasta: { gte: fechaRef } },
        ],
      },
      include: { documentoTipo: true },
      orderBy: { version: 'desc' },
    });

    // Si existen versiones distintas, seleccionar la versión vigente más reciente
    const versionVigente = requisitosActivos.length > 0
      ? Math.max(...requisitosActivos.map((r) => r.version))
      : 1;

    const requisitosMatriz = requisitosActivos.filter((r) => r.version === versionVigente);

    // 4. Calcular el avance y estado agregado usando la lógica unificada de RN-01 y RN-02
    const contextoActual = trabajador.estadosContexto[0]
      ? {
          porcentajeAvance: Number(trabajador.estadosContexto[0].porcentajeAvance),
          es100Porciento: trabajador.estadosContexto[0].es100Porciento,
          fechaAlcanzo100: trabajador.estadosContexto[0].fechaAlcanzo100,
        }
      : null;

    const calculoAvance = calcularAvanceContexto({
      requisitos: requisitosMatriz,
      documentos: trabajador.documentos,
      contextoActual,
      fechaReferencia: fechaRef,
    });

    // 5. Agrupar documentos cargados del trabajador por documentoTipoId
    const docsPorTipo = new Map<string, typeof trabajador.documentos>();
    for (const doc of trabajador.documentos) {
      const lista = docsPorTipo.get(doc.documentoTipoId) ?? [];
      lista.push(doc);
      docsPorTipo.set(doc.documentoTipoId, lista);
    }

    // 6. Mapear cada requisito con su estado exacto (VERDE / AMARILLO / ROJO / FALTANTE)
    const detalleRequisitos: DetalleRequisitoCumplimiento[] = [];
    const faltantesOEnAlerta: DocumentoAlertaFaltante[] = [];

    for (const req of requisitosMatriz) {
      const docsCargados = docsPorTipo.get(req.documentoTipoId) ?? [];

      if (docsCargados.length === 0) {
        detalleRequisitos.push({
          requisitoId: req.id,
          documentoTipoId: req.documentoTipoId,
          documentoTipo: req.documentoTipo.nombre,
          categoria: req.documentoTipo.categoria,
          obligatorio: req.obligatorio,
          version: req.version,
          estado: 'FALTANTE',
          documentoId: null,
          fechaEmision: null,
          fechaVencimiento: null,
          diasRestantes: null,
        });

        if (req.obligatorio) {
          faltantesOEnAlerta.push({
            documentoTipoId: req.documentoTipoId,
            documentoTipo: req.documentoTipo.nombre,
            estado: 'FALTANTE',
            motivo: 'FALTANTE',
            diasRestantes: null,
          });
        }
        continue;
      }

      // Si hay más de un documento subido para el mismo tipo, priorizar el más vigente
      let docElegido = docsCargados[0];
      let mejorEvaluacion = recalcularSemaforoDocumento(docElegido, fechaRef);

      for (let i = 1; i < docsCargados.length; i++) {
        const evaluacion = recalcularSemaforoDocumento(docsCargados[i], fechaRef);
        // Si encontramos uno VERDE, lo tomamos de inmediato
        if (evaluacion.estado === EstadoSemaforo.VERDE) {
          docElegido = docsCargados[i];
          mejorEvaluacion = evaluacion;
          break;
        }
        // Si no, preferimos AMARILLO sobre ROJO
        if (evaluacion.estado === EstadoSemaforo.AMARILLO && mejorEvaluacion.estado === EstadoSemaforo.ROJO) {
          docElegido = docsCargados[i];
          mejorEvaluacion = evaluacion;
        }
      }

      const estadoRequisito: EstadoCumplimientoRequisito = mejorEvaluacion.estado;

      detalleRequisitos.push({
        requisitoId: req.id,
        documentoTipoId: req.documentoTipoId,
        documentoTipo: req.documentoTipo.nombre,
        categoria: req.documentoTipo.categoria,
        obligatorio: req.obligatorio,
        version: req.version,
        estado: estadoRequisito,
        documentoId: docElegido.id,
        fechaEmision: docElegido.fechaEmision,
        fechaVencimiento: docElegido.fechaVencimiento,
        diasRestantes: mejorEvaluacion.diasRestantes,
      });

      if (req.obligatorio && estadoRequisito !== 'VERDE') {
        faltantesOEnAlerta.push({
          documentoTipoId: req.documentoTipoId,
          documentoTipo: req.documentoTipo.nombre,
          estado: estadoRequisito,
          motivo: estadoRequisito === 'AMARILLO' ? 'EN_ALERTA' : 'VENCIDO',
          diasRestantes: mejorEvaluacion.diasRestantes,
        });
      }
    }

    return {
      trabajador: {
        id: trabajador.id,
        dni: trabajador.dni,
        nombres: trabajador.nombres,
        apellidos: trabajador.apellidos,
        estadoGeneral: trabajador.estadoGeneral,
      },
      minera: {
        id: minera.id,
        nombre: minera.nombre,
      },
      cargo: {
        id: cargo.id,
        nombre: cargo.nombre,
      },
      versionMatriz: versionVigente,
      totalRequisitos: requisitosMatriz.length,
      requisitosObligatorios: calculoAvance.totalRequeridos,
      cumplidosEnVerde: calculoAvance.cumplidosEnVerde,
      porcentajeAvance: calculoAvance.porcentajeAvance,
      es100Porciento: calculoAvance.es100Porciento,
      fechaAlcanzo100: calculoAvance.fechaAlcanzo100,
      requisitos: detalleRequisitos,
      documentosFaltantesOEnAlerta: faltantesOEnAlerta,
    };
  }
}
