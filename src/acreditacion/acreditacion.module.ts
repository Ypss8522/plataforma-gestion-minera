import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AcreditacionController } from './acreditacion.controller';
import { AcreditacionService } from './acreditacion.service';
import { RecalculoEstadoService } from './services/recalculo-estado.service';
import { RecalculoEstadoProcessor } from './processors/recalculo-estado.processor';
import { RecalculoScheduler } from './schedulers/recalculo.scheduler';
import { QUEUE_RECALCULO_ESTADO } from './constants/recalculo.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_RECALCULO_ESTADO,
    }),
  ],
  controllers: [AcreditacionController],
  providers: [
    AcreditacionService,
    RecalculoEstadoService,
    RecalculoEstadoProcessor,
    RecalculoScheduler,
  ],
  exports: [
    AcreditacionService,
    RecalculoEstadoService,
    RecalculoScheduler,
  ],
})
export class AcreditacionModule {}
