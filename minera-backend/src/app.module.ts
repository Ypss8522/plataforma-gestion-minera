import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AcreditacionModule } from './acreditacion/acreditacion.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { GerenciaModule } from './gerencia/gerencia.module';
import { MobileModule } from './mobile/mobile.module';
import { HealthController } from './health.controller';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]), // rate limit global por defecto
    PrismaModule,
    AuthModule,
    AcreditacionModule,
    OperacionesModule,
    GerenciaModule,
    MobileModule,
  ],
  controllers: [HealthController],
  providers: [
    // Orden de guards globales: rate limit -> autenticación JWT -> RBAC.
    // Los guards @UseGuards() a nivel de controller (RolesGuard con @Roles)
    // se ejecutan después y son más específicos por endpoint.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
