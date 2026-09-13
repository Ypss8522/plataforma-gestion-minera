import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Ejecuta una operación dentro de una sesión con las variables de sesión
   * que consumen las políticas RLS de Postgres (ver 3.3.1 del documento maestro).
   * Uso típico dentro de servicios que atienden requests de rol TRABAJADOR.
   */
  async withRlsContext<T>(
    params: { rol: string; trabajadorId?: string | null; empresaId?: string | null },
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.rol = '${params.rol}'`);
      if (params.trabajadorId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.trabajador_id = '${params.trabajadorId}'`);
      }
      if (params.empresaId) {
        await tx.$executeRawUnsafe(`SET LOCAL app.empresa_id = '${params.empresaId}'`);
      }
      return fn(tx);
    });
  }
}
