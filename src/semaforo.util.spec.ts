import { calcularEstadoSemaforo } from './common/utils/semaforo.util';

describe('RN-01 — Lógica del semáforo', () => {
  it('marca ROJO cuando la fecha de vencimiento ya pasó', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const resultado = calcularEstadoSemaforo(ayer);
    expect(resultado.estado).toBe('ROJO');
  });

  it('marca AMARILLO cuando faltan 30 días o menos (umbral default)', () => {
    const en20dias = new Date();
    en20dias.setDate(en20dias.getDate() + 20);
    const resultado = calcularEstadoSemaforo(en20dias);
    expect(resultado.estado).toBe('AMARILLO');
  });

  it('marca VERDE cuando faltan más de 30 días', () => {
    const en60dias = new Date();
    en60dias.setDate(en60dias.getDate() + 60);
    const resultado = calcularEstadoSemaforo(en60dias);
    expect(resultado.estado).toBe('VERDE');
  });

  it('marca ROJO cuando no hay fecha de vencimiento (nunca se asume vigente)', () => {
    const resultado = calcularEstadoSemaforo(null);
    expect(resultado.estado).toBe('ROJO');
  });

  it('respeta la ventana de alerta configurable por documento_tipo', () => {
    const en40dias = new Date();
    en40dias.setDate(en40dias.getDate() + 40);
    // Con ventana default (30) sería VERDE, pero con ventana de 45 (ej. licencias) debe ser AMARILLO.
    const resultado = calcularEstadoSemaforo(en40dias, 45);
    expect(resultado.estado).toBe('AMARILLO');
  });
});
