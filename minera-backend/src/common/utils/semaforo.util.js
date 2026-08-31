"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcularEstadoSemaforo = calcularEstadoSemaforo;
var client_1 = require("@prisma/client");
/**
 * RN-01 — Lógica del semáforo.
 * El umbral de "amarillo" es configurable por documento_tipo.ventanaAlertaDias
 * (default 30), NUNCA hardcodeado a nivel de código de negocio general.
 */
function calcularEstadoSemaforo(fechaVencimiento, ventanaAlertaDias) {
    if (ventanaAlertaDias === void 0) { ventanaAlertaDias = 30; }
    if (!fechaVencimiento) {
        // Documento sin fecha de vencimiento registrada => se asume incompleto/rojo,
        // nunca se asume vigente por defecto (regla explícita de RN-01).
        return { estado: client_1.EstadoSemaforo.ROJO, diasRestantes: null };
    }
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    var diasRestantes = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes < 0)
        return { estado: client_1.EstadoSemaforo.ROJO, diasRestantes: diasRestantes };
    if (diasRestantes <= ventanaAlertaDias)
        return { estado: client_1.EstadoSemaforo.AMARILLO, diasRestantes: diasRestantes };
    return { estado: client_1.EstadoSemaforo.VERDE, diasRestantes: diasRestantes };
}
