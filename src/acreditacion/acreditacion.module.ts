import { Module } from '@nestjs/common';
import { AcreditacionController } from './acreditacion.controller';
import { AcreditacionService } from './acreditacion.service';
import { DocumentosLecturaController } from './documentos-lectura.controller';
import { DocumentosLecturaService } from './documentos-lectura.service';

@Module({
  controllers: [AcreditacionController, DocumentosLecturaController],
  providers: [AcreditacionService, DocumentosLecturaService],
})
export class AcreditacionModule {}
