import { Module } from '@nestjs/common';
import { AcreditacionController } from './acreditacion.controller';
import { AcreditacionService } from './acreditacion.service';

@Module({
  controllers: [AcreditacionController],
  providers: [AcreditacionService],
})
export class AcreditacionModule {}
