import { EstadoSemaforo } from '@prisma/client';

/**
 * RN-01 — Lógica del semáforo.
 * El umbral de "amarillo" es configurable por documento_tipo.ventanaAlertaDias
 * (default 30), NUNCA hardcodeado a nivel de código de negocio general.
 */
export function calcularEstadoSemaforo(
  fechaVencimiento: Date | null,
  ventanaAlertaDias = 30,
): { estado: EstadoSemaforo; diasRestantes: number | null } {
  if (!fechaVencimiento) {
    // Documento sin fecha de vencimiento registrada => se asume incompleto/rojo,
    // nunca se asume vigente por defecto (regla explícita de RN-01).
    return { estado: EstadoSemaforo.ROJO, diasRestantes: null };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  const diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return { estado: EstadoSemaforo.ROJO, diasRestantes };
  if (diasRestantes <= ventanaAlertaDias) return { estado: EstadoSemaforo.AMARILLO, diasRestantes };
  return { estado: EstadoSemaforo.VERDE, diasRestantes };
}
