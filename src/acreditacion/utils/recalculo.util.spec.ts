import { EstadoSemaforo } from '@prisma/client';
import {
  calcularAvanceContexto,
  recalcularSemaforoDocumento,
  RequisitoCalculo,
  DocumentoCalculo,
} from './recalculo.util';

describe('RN-02 — Recálculo de avance y habilitación de trabajador', () => {
  const fechaHoy = new Date('2026-10-30T12:00:00Z');

  const docTipoDni = {
    id: 'dt-dni',
    nombre: 'DNI',
    ventanaAlertaDias: 30,
    requiereVencimiento: false,
  };

  const docTipoLicencia = {
    id: 'dt-licencia',
    nombre: 'Licencia A-III',
    ventanaAlertaDias: 45,
    requiereVencimiento: true,
  };

  const docTipoMedico = {
    id: 'dt-medico',
    nombre: 'Examen Médico',
    ventanaAlertaDias: 30,
    requiereVencimiento: true,
  };

  const docTipoOpcional = {
    id: 'dt-opcional',
    nombre: 'Curso Adicional',
    ventanaAlertaDias: 30,
    requiereVencimiento: true,
  };

  const matrizBase: RequisitoCalculo[] = [
    { id: 'req-1', documentoTipoId: 'dt-dni', obligatorio: true, documentoTipo: docTipoDni },
    { id: 'req-2', documentoTipoId: 'dt-licencia', obligatorio: true, documentoTipo: docTipoLicencia },
    { id: 'req-3', documentoTipoId: 'dt-medico', obligatorio: true, documentoTipo: docTipoMedico },
    { id: 'req-4', documentoTipoId: 'dt-opcional', obligatorio: false, documentoTipo: docTipoOpcional },
  ];

  it('alcanza el 100% cuando todos los documentos obligatorios están en VERDE', () => {
    const en60dias = new Date('2026-12-29T12:00:00Z');
    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
      { id: 'd-2', documentoTipoId: 'dt-licencia', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoLicencia },
      { id: 'd-3', documentoTipoId: 'dt-medico', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoMedico },
    ];

    const res = calcularAvanceContexto({
      requisitos: matrizBase,
      documentos,
      fechaReferencia: fechaHoy,
    });

    expect(res.totalRequeridos).toBe(3);
    expect(res.cumplidosEnVerde).toBe(3);
    expect(res.porcentajeAvance).toBe(100);
    expect(res.es100Porciento).toBe(true);
    expect(res.fechaAlcanzo100).toEqual(fechaHoy);
    expect(res.documentosFaltantes).toHaveLength(0);
  });

  it('conserva la fecha original si ya había alcanzado el 100% previamente', () => {
    const fechaPrevia = new Date('2026-09-01T10:00:00Z');
    const en60dias = new Date('2026-12-29T12:00:00Z');
    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
      { id: 'd-2', documentoTipoId: 'dt-licencia', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoLicencia },
      { id: 'd-3', documentoTipoId: 'dt-medico', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoMedico },
    ];

    const res = calcularAvanceContexto({
      requisitos: matrizBase,
      documentos,
      contextoActual: {
        porcentajeAvance: 100,
        es100Porciento: true,
        fechaAlcanzo100: fechaPrevia,
      },
      fechaReferencia: fechaHoy,
    });

    expect(res.es100Porciento).toBe(true);
    expect(res.fechaAlcanzo100).toEqual(fechaPrevia);
  });

  it('calcula avance parcial exacto cuando faltan documentos obligatorios', () => {
    const en60dias = new Date('2026-12-29T12:00:00Z');
    // Solo tiene DNI cargado (1 de 3 obligatorios = 33.33%)
    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
    ];

    const res = calcularAvanceContexto({
      requisitos: matrizBase,
      documentos,
      fechaReferencia: fechaHoy,
    });

    expect(res.totalRequeridos).toBe(3);
    expect(res.cumplidosEnVerde).toBe(1);
    expect(res.porcentajeAvance).toBe(33.33);
    expect(res.es100Porciento).toBe(false);
    expect(res.fechaAlcanzo100).toBeNull();
    expect(res.documentosFaltantes).toHaveLength(2);
    expect(res.documentosFaltantes).toEqual(
      expect.arrayContaining([
        { documentoTipoId: 'dt-licencia', nombre: 'Licencia A-III', motivo: 'FALTANTE' },
        { documentoTipoId: 'dt-medico', nombre: 'Examen Médico', motivo: 'FALTANTE' },
      ]),
    );
  });

  it('no otorga 100% si un documento obligatorio está en AMARILLO (alerta de vencimiento)', () => {
    const en60dias = new Date('2026-12-29T12:00:00Z');
    // Licencia vence en 10 días (dentro de ventana de alerta 45 días -> AMARILLO)
    const en10dias = new Date('2026-11-09T12:00:00Z');

    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
      { id: 'd-2', documentoTipoId: 'dt-licencia', fechaVencimiento: en10dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoLicencia },
      { id: 'd-3', documentoTipoId: 'dt-medico', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoMedico },
    ];

    const res = calcularAvanceContexto({
      requisitos: matrizBase,
      documentos,
      fechaReferencia: fechaHoy,
    });

    expect(res.totalRequeridos).toBe(3);
    expect(res.cumplidosEnVerde).toBe(2);
    expect(res.porcentajeAvance).toBe(66.67);
    expect(res.es100Porciento).toBe(false);
    expect(res.fechaAlcanzo100).toBeNull();
    expect(res.documentosFaltantes).toEqual([
      { documentoTipoId: 'dt-licencia', nombre: 'Licencia A-III', motivo: 'EN_ALERTA' },
    ]);
  });

  it('resetea fechaAlcanzo100 a null si un trabajador que era 100% pasa a tener un documento vencido', () => {
    const fechaHistorica = new Date('2026-08-01T10:00:00Z');
    const vencidoAyer = new Date('2026-10-29T12:00:00Z');
    const en60dias = new Date('2026-12-29T12:00:00Z');

    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
      { id: 'd-2', documentoTipoId: 'dt-licencia', fechaVencimiento: vencidoAyer, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoLicencia },
      { id: 'd-3', documentoTipoId: 'dt-medico', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoMedico },
    ];

    const res = calcularAvanceContexto({
      requisitos: matrizBase,
      documentos,
      contextoActual: {
        porcentajeAvance: 100,
        es100Porciento: true,
        fechaAlcanzo100: fechaHistorica,
      },
      fechaReferencia: fechaHoy,
    });

    expect(res.es100Porciento).toBe(false);
    expect(res.porcentajeAvance).toBe(66.67);
    expect(res.fechaAlcanzo100).toBeNull();
    expect(res.documentosFaltantes).toEqual([
      { documentoTipoId: 'dt-licencia', nombre: 'Licencia A-III', motivo: 'VENCIDO' },
    ]);
  });

  it('toma en cuenta el documento más vigente si el trabajador subió un reemplazo/renovación', () => {
    const en60dias = new Date('2026-12-29T12:00:00Z');
    const vencido = new Date('2026-09-01T12:00:00Z');

    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
      // Documento anterior vencido
      { id: 'd-2-old', documentoTipoId: 'dt-licencia', fechaVencimiento: vencido, estadoSemaforo: EstadoSemaforo.ROJO, documentoTipo: docTipoLicencia },
      // Documento nuevo renovado
      { id: 'd-2-new', documentoTipoId: 'dt-licencia', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoLicencia },
      { id: 'd-3', documentoTipoId: 'dt-medico', fechaVencimiento: en60dias, estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoMedico },
    ];

    const res = calcularAvanceContexto({
      requisitos: matrizBase,
      documentos,
      fechaReferencia: fechaHoy,
    });

    expect(res.es100Porciento).toBe(true);
    expect(res.porcentajeAvance).toBe(100);
  });

  it('ignora requisitos que ya no están vigentes según fecha de inicio/fin de la matriz', () => {
    const requisitosConFechas: RequisitoCalculo[] = [
      { id: 'r-1', documentoTipoId: 'dt-dni', obligatorio: true, documentoTipo: docTipoDni },
      {
        id: 'r-antiguo',
        documentoTipoId: 'dt-licencia',
        obligatorio: true,
        vigenteHasta: new Date('2026-01-01'), // Ya no está vigente
        documentoTipo: docTipoLicencia,
      },
    ];

    const documentos: DocumentoCalculo[] = [
      { id: 'd-1', documentoTipoId: 'dt-dni', estadoSemaforo: EstadoSemaforo.VERDE, documentoTipo: docTipoDni },
    ];

    const res = calcularAvanceContexto({
      requisitos: requisitosConFechas,
      documentos,
      fechaReferencia: fechaHoy,
    });

    expect(res.totalRequeridos).toBe(1);
    expect(res.cumplidosEnVerde).toBe(1);
    expect(res.es100Porciento).toBe(true);
    expect(res.porcentajeAvance).toBe(100);
  });

  it('retorna 0% y false si la matriz no tiene requisitos obligatorios activos', () => {
    const res = calcularAvanceContexto({
      requisitos: [],
      documentos: [],
      fechaReferencia: fechaHoy,
    });

    expect(res.totalRequeridos).toBe(0);
    expect(res.porcentajeAvance).toBe(0);
    expect(res.es100Porciento).toBe(false);
    expect(res.fechaAlcanzo100).toBeNull();
  });

  it('recalcula correctamente el semáforo de un documento individual', () => {
    const en10dias = new Date('2026-11-09T12:00:00Z');
    const ayer = new Date('2026-10-29T12:00:00Z');

    const docAlerta: DocumentoCalculo = {
      id: 'd-1',
      documentoTipoId: 'dt-medico',
      fechaVencimiento: en10dias,
      estadoSemaforo: EstadoSemaforo.VERDE,
      documentoTipo: docTipoMedico,
    };
    expect(recalcularSemaforoDocumento(docAlerta, fechaHoy).estado).toBe(EstadoSemaforo.AMARILLO);

    const docVencido: DocumentoCalculo = {
      id: 'd-2',
      documentoTipoId: 'dt-medico',
      fechaVencimiento: ayer,
      estadoSemaforo: EstadoSemaforo.AMARILLO,
      documentoTipo: docTipoMedico,
    };
    expect(recalcularSemaforoDocumento(docVencido, fechaHoy).estado).toBe(EstadoSemaforo.ROJO);
  });
});
