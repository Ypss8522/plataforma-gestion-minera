import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    // Mensaje genérico deliberado: no revelar si el email existe o no (previene enumeración).
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException({
        error: { code: 'CREDENCIALES_INVALIDAS', message: 'Email o contraseña incorrectos.' },
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      throw new UnauthorizedException({
        error: { code: 'CREDENCIALES_INVALIDAS', message: 'Email o contraseña incorrectos.' },
      });
    }

    const payload = {
      usuarioId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
      trabajadorId: usuario.trabajadorId,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol },
    };
  }
}
