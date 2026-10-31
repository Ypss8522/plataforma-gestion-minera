import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_RECALCULO_ESTADO, JOB_RECALCULO_DIARIO } from '../constants/recalculo.constants';

@Injectable()
export class RecalculoScheduler implements OnModuleInit {
  private readonly logger = new Logger(RecalculoScheduler.name);

  constructor(
    @InjectQueue(QUEUE_RECALCULO_ESTADO)
    private readonly recalculoQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Configurando job diario repetible de recálculo en BullMQ/Redis (tz: America/Lima)...');
    try {
      // Limpiar jobs repetibles anteriores para evitar jobs huérfanos sin zona horaria
      const repeatableJobs = await this.recalculoQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.name === JOB_RECALCULO_DIARIO) {
          await this.recalculoQueue.removeRepeatableByKey(job.key);
        }
      }

      // Registrar el job repetible diario a medianoche (00:00) en zona horaria America/Lima
      await this.recalculoQueue.add(
        JOB_RECALCULO_DIARIO,
        {},
        {
          repeat: {
            cron: '0 0 * * *',
            tz: 'America/Lima',
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log('Job diario repetible de recálculo registrado en BullMQ (00:00 America/Lima).');
    } catch (error) {
      this.logger.error('Error al registrar job repetible en BullMQ:', error);
    }
  }

  /**
   * Encola manualmente o bajo demanda la ejecución del job diario de recálculo.
   */
  async encolarRecalculoDiario() {
    const job = await this.recalculoQueue.add(
      JOB_RECALCULO_DIARIO,
      {},
      {
        removeOnComplete: true,
      },
    );
    return {
      jobId: job.id,
      cola: QUEUE_RECALCULO_ESTADO,
      estado: 'ENCOLADO',
      timestamp: new Date().toISOString(),
    };
  }
}
