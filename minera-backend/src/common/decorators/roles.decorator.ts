import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator para restringir un endpoint a uno o más roles.
 * Uso: @Roles(RolUsuario.RRHH, RolUsuario.GERENCIA)
 */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
