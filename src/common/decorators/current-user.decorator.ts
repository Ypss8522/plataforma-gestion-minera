import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  usuarioId: string;
  email: string;
  rol: string;
  empresaId: string | null;
  /** Presente únicamente si rol = TRABAJADOR. Nunca confiar en un trabajadorId enviado en el body/query. */
  trabajadorId: string | null;
}

/**
 * Extrae el usuario autenticado (payload del JWT) inyectado por JwtAuthGuard.
 * Uso: async miEstado(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    return data ? user?.[data] : user;
  },
);
