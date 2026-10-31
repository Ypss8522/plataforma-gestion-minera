import { EstadoSemaforo } from '@prisma/client';

export function calcularEstadoSemaforo(
  fechaVencimiento: Date | null,
  ventanaAlertaDias = 30,
  requiereVencimiento = true,
  fechaReferencia = new Date(),
): { estado: EstadoSemaforo; diasRestantes: number | null } {
  if (!requiereVencimiento) {
    return { estado: EstadoSemaforo.VERDE, diasRestantes: null };
  }

  if (!fechaVencimiento) {
    return { estado: EstadoSemaforo.ROJO, diasRestantes: null };
  }

  const hoy = new Date(fechaReferencia);
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  const diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) return { estado: EstadoSemaforo.ROJO, diasRestantes };
  if (diasRestantes <= ventanaAlertaDias) return { estado: EstadoSemaforo.AMARILLO, diasRestantes };
  return { estado: EstadoSemaforo.VERDE, diasRestantes };
}

