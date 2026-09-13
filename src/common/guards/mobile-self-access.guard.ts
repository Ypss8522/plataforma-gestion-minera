import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * RN-08 — Aislamiento absoluto de datos entre trabajadores.
 * Cualquier trabajadorId en params/query/body es ignorado/rechazado si no
 * coincide con el trabajadorId del JWT.
 */
@Injectable()
export class MobileSelfAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.rol !== 'TRABAJADOR' || !user.trabajadorId) {
      throw new ForbiddenException({
        error: { code: 'ACCESO_MOBILE_NO_AUTORIZADO', message: 'Este recurso solo es accesible por el rol TRABAJADOR autenticado.' },
      });
    }

    const trabajadorIdSolicitado =
      request.params?.trabajadorId || request.query?.trabajadorId || request.body?.trabajadorId;

    if (trabajadorIdSolicitado && trabajadorIdSolicitado !== user.trabajadorId) {
      throw new ForbiddenException({
        error: { code: 'TRABAJADOR_ID_NO_COINCIDE', message: 'No puedes consultar datos de otro trabajador.' },
      });
    }

    request.trabajadorIdSeguro = user.trabajadorId;
    return true;
  }
}
