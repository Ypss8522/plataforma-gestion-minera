import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  QUEUE_RECALCULO_ESTADO,
  JOB_RECALCULO_DIARIO,
  JOB_RECALCULO_TRABAJADOR,
} from '../constants/recalculo.constants';
import { RecalculoEstadoService } from '../services/recalculo-estado.service';

@Processor(QUEUE_RECALCULO_ESTADO)
export class RecalculoEstadoProcessor {
  private readonly logger = new Logger(RecalculoEstadoProcessor.name);

  constructor(private readonly recalculoService: RecalculoEstadoService) {}

  @Process(JOB_RECALCULO_DIARIO)
  async procesarRecalculoDiario(job: Job) {
    this.logger.log(`[BullMQ Worker] Ejecutando job diario de recálculo (Job ID: ${job.id})`);
    const resultado = await this.recalculoService.recalcularTodosLosTrabajadores();
    this.logger.log(`[BullMQ Worker] Job diario completado: ${JSON.stringify(resultado)}`);
    return resultado;
  }

  @Process(JOB_RECALCULO_TRABAJADOR)
  async procesarRecalculoTrabajador(job: Job<{ trabajadorId: string }>) {
    this.logger.log(`[BullMQ Worker] Recalculando trabajador ${job.data.trabajadorId} (Job ID: ${job.id})`);
    return this.recalculoService.recalcularTrabajador(job.data.trabajadorId);
  }
}
