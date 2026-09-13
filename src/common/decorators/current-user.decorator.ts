import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  usuarioId: string;
  email: string;
  rol: string;
  empresaId: string | null;
  trabajadorId: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    return data ? user?.[data] : user;
  },
);
