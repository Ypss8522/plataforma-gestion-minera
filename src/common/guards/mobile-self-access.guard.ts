import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * RN-08 — Aislamiento absoluto de datos entre trabajadores.
 *
 * Este guard se aplica a TODOS los endpoints bajo /mobile/*.
 * Regla dura: cualquier trabajadorId presente en params/query/body
 * es IGNORADO Y RECHAZADO si no coincide con el trabajadorId del JWT.
 * El controller nunca debe leer un trabajadorId "de fuera" para este módulo;
 * siempre debe usar request.user.trabajadorId.
 *
 * Esta es la segunda capa de defensa (aplicación) además del RLS de Postgres
 * (ver sección 3.3.1 de la Documentación Técnica Maestra).
 */
@Injectable()
export class MobileSelfAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.rol !== 'TRABAJADOR' || !user.trabajadorId) {
      throw new ForbiddenException({
        error: {
          code: 'ACCESO_MOBILE_NO_AUTORIZADO',
          message: 'Este recurso solo es accesible por el rol TRABAJADOR autenticado.',
        },
      });
    }

    const trabajadorIdSolicitado =
      request.params?.trabajadorId || request.query?.trabajadorId || request.body?.trabajadorId;

    if (trabajadorIdSolicitado && trabajadorIdSolicitado !== user.trabajadorId) {
      throw new ForbiddenException({
        error: {
          code: 'TRABAJADOR_ID_NO_COINCIDE',
          message: 'No puedes consultar datos de otro trabajador.',
        },
      });
    }

    // Fuerza el trabajadorId correcto en el request para que el controller
    // SIEMPRE lo lea de aquí, nunca de params/query/body.
    request.trabajadorIdSeguro = user.trabajadorId;

    return true;
  }
}
