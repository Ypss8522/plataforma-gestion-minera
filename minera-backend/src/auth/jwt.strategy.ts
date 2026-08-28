import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /**
   * El payload validado se adjunta a request.user.
   * Nunca confiar en campos adicionales que pudiera llevar el token
   * más allá de estos, y nunca aceptar un trabajadorId que no venga
   * firmado en el propio JWT.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      usuarioId: payload.usuarioId,
      email: payload.email,
      rol: payload.rol,
      empresaId: payload.empresaId ?? null,
      trabajadorId: payload.trabajadorId ?? null,
    };
  }
}
