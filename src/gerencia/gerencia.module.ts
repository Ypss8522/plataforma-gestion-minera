import { Module } from '@nestjs/common';
import { GerenciaController } from './gerencia.controller';
import { GerenciaService } from './gerencia.service';

@Module({
  controllers: [GerenciaController],
  providers: [GerenciaService],
})
export class GerenciaModule {}
