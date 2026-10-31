import { EstadoSemaforo } from '@prisma/client';
import { calcularEstadoSemaforo } from '../../common/utils/semaforo.util';

export interface DocumentoCalculo {
  id: string;
  documentoTipoId: string;
  fechaEmision?: Date | null;
  fechaVencimiento?: Date | null;
  estadoSemaforo: EstadoSemaforo;
  createdAt?: Date;
  documentoTipo?: {
    id: string;
    nombre: string;
    ventanaAlertaDias: number;
    requiereVencimiento: boolean;
  };
}

export interface RequisitoCalculo {
  id: string;
  documentoTipoId: string;
  obligatorio: boolean;
  version?: number;
  vigenteDesde?: Date;
  vigenteHasta?: Date | null;
  documentoTipo?: {
    id: string;
    nombre: string;
    ventanaAlertaDias: number;
    requiereVencimiento: boolean;
  };
}

export interface ContextoActualCalculo {
  porcentajeAvance?: number | any;
  es100Porciento?: boolean;
  fechaAlcanzo100?: Date | null;
}

export interface DocumentoFaltanteDetalle {
  documentoTipoId: string;
  nombre?: string;
  motivo: 'FALTANTE' | 'VENCIDO' | 'EN_ALERTA';
}

export interface ResultadoCalculoAvance {
  totalRequeridos: number;
  cumplidosEnVerde: number;
  porcentajeAvance: number;
  es100Porciento: boolean;
  fechaAlcanzo100: Date | null;
  documentosFaltantes: DocumentoFaltanteDetalle[];
}

/**
 * Evalúa y recalcula el estado semáforo actual de un documento individual (RN-01).
 */
export function recalcularSemaforoDocumento(
  doc: DocumentoCalculo,
  fechaReferencia: Date = new Date(),
): { estado: EstadoSemaforo; diasRestantes: number | null } {
  const ventanaAlertaDias = doc.documentoTipo?.ventanaAlertaDias ?? 30;
  const requiereVencimiento = doc.documentoTipo?.requiereVencimiento ?? true;
  return calcularEstadoSemaforo(doc.fechaVencimiento ?? null, ventanaAlertaDias, requiereVencimiento, fechaReferencia);
}

/**
 * Calcula el avance y habilitación de un trabajador para un contexto Minera + Cargo (RN-02).
 */
export function calcularAvanceContexto(params: {
  requisitos: RequisitoCalculo[];
  documentos: DocumentoCalculo[];
  contextoActual?: ContextoActualCalculo | null;
  fechaReferencia?: Date;
}): ResultadoCalculoAvance {
  const fechaReferencia = params.fechaReferencia ?? new Date();

  // Filtrar requisitos que estén activos a la fecha de referencia y sean obligatorios
  const requisitosObligatoriosActivos = params.requisitos.filter((req) => {
    if (!req.obligatorio) return false;
    if (req.vigenteDesde && req.vigenteDesde > fechaReferencia) return false;
    if (req.vigenteHasta && req.vigenteHasta < fechaReferencia) return false;
    return true;
  });

  const totalRequeridos = requisitosObligatoriosActivos.length;
  if (totalRequeridos === 0) {
    return {
      totalRequeridos: 0,
      cumplidosEnVerde: 0,
      porcentajeAvance: 0,
      es100Porciento: false,
      fechaAlcanzo100: null,
      documentosFaltantes: [],
    };
  }

  // Agrupar los documentos del trabajador por tipo de documento
  const docsPorTipo = new Map<string, DocumentoCalculo[]>();
  for (const doc of params.documentos) {
    const lista = docsPorTipo.get(doc.documentoTipoId) ?? [];
    lista.push(doc);
    docsPorTipo.set(doc.documentoTipoId, lista);
  }

  let cumplidosEnVerde = 0;
  const documentosFaltantes: DocumentoFaltanteDetalle[] = [];

  for (const req of requisitosObligatoriosActivos) {
    const docs = docsPorTipo.get(req.documentoTipoId) ?? [];

    if (docs.length === 0) {
      documentosFaltantes.push({
        documentoTipoId: req.documentoTipoId,
        nombre: req.documentoTipo?.nombre,
        motivo: 'FALTANTE',
      });
      continue;
    }

    // Verificar si existe al menos un documento válido en VERDE para este requisito
    const tieneVerde = docs.some((d) => {
      const { estado } = recalcularSemaforoDocumento(d, fechaReferencia);
      return estado === EstadoSemaforo.VERDE;
    });

    if (tieneVerde) {
      cumplidosEnVerde++;
    } else {
      // Si no tiene verde, verificar si tiene alguno en amarillo (alerta) o si están todos rojos (vencidos)
      const tieneAmarillo = docs.some((d) => {
        const { estado } = recalcularSemaforoDocumento(d, fechaReferencia);
        return estado === EstadoSemaforo.AMARILLO;
      });

      documentosFaltantes.push({
        documentoTipoId: req.documentoTipoId,
        nombre: req.documentoTipo?.nombre,
        motivo: tieneAmarillo ? 'EN_ALERTA' : 'VENCIDO',
      });
    }
  }

  const porcentajeAvance = Number(((cumplidosEnVerde / totalRequeridos) * 100).toFixed(2));
  const es100Porciento = cumplidosEnVerde === totalRequeridos && totalRequeridos > 0;

  let fechaAlcanzo100: Date | null = null;
  if (es100Porciento) {
    // Si ya lo había alcanzado previamente, se conserva la fecha histórica; si es nuevo, se fija fechaReferencia
    fechaAlcanzo100 = params.contextoActual?.fechaAlcanzo100 ?? fechaReferencia;
  } else {
    // Si ya no está al 100% (ej. venció un documento), se limpia para reflejar la pérdida de habilitación
    fechaAlcanzo100 = null;
  }

  return {
    totalRequeridos,
    cumplidosEnVerde,
    porcentajeAvance,
    es100Porciento,
    fechaAlcanzo100,
    documentosFaltantes,
  };
}
