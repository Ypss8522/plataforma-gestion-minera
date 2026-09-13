import { calcularEstadoSemaforo } from './common/utils/semaforo.util';

describe('RN-01 — Lógica del semáforo', () => {
  it('marca ROJO cuando la fecha de vencimiento ya pasó', () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    expect(calcularEstadoSemaforo(ayer).estado).toBe('ROJO');
  });

  it('marca AMARILLO cuando faltan 30 días o menos', () => {
    const en20dias = new Date();
    en20dias.setDate(en20dias.getDate() + 20);
    expect(calcularEstadoSemaforo(en20dias).estado).toBe('AMARILLO');
  });

  it('marca VERDE cuando faltan más de 30 días', () => {
    const en60dias = new Date();
    en60dias.setDate(en60dias.getDate() + 60);
    expect(calcularEstadoSemaforo(en60dias).estado).toBe('VERDE');
  });

  it('marca ROJO cuando no hay fecha de vencimiento', () => {
    expect(calcularEstadoSemaforo(null).estado).toBe('ROJO');
  });

  it('respeta la ventana de alerta configurable', () => {
    const en40dias = new Date();
    en40dias.setDate(en40dias.getDate() + 40);
    expect(calcularEstadoSemaforo(en40dias, 45).estado).toBe('AMARILLO');
  });
});
