import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RBAC: exige que el rol del usuario autenticado (request.user.rol)
 * esté dentro de los roles declarados con @Roles(...) en el endpoint.
 * Si el endpoint no declara @Roles(), se permite el paso (solo exige auth).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !requiredRoles.includes(user.rol)) {
      throw new ForbiddenException({
        error: {
          code: 'ROL_NO_AUTORIZADO',
          message: 'Tu rol no tiene permiso para acceder a este recurso.',
        },
      });
    }

    return true;
  }
}
