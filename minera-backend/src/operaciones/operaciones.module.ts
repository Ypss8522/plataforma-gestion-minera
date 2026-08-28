import { Module } from '@nestjs/common';
import { OperacionesController } from './operaciones.controller';
import { OperacionesService } from './operaciones.service';

@Module({
  controllers: [OperacionesController],
  providers: [OperacionesService],
})
export class OperacionesModule {}
