import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.create({
    data: { razonSocial: 'Contratista Ejemplo S.A.C.', ruc: '20123456789' },
  });

  const antapacay = await prisma.minera.create({
    data: { nombre: 'Antapacay', colorPrimario: '#0033A0', colorSecundario: '#FFC72C' },
  });
  const lasBambas = await prisma.minera.create({
    data: { nombre: 'Las Bambas', colorPrimario: '#E8720C', colorSecundario: '#2B2B2B' },
  });

  await prisma.empresaMinera.createMany({
    data: [
      { empresaId: empresa.id, mineraId: antapacay.id },
      { empresaId: empresa.id, mineraId: lasBambas.id },
    ],
  });

  const tags = await Promise.all(
    ['Mecánico', 'Supervisor', 'Electricista', 'Cocinero', 'Conductor', 'Transportista'].map((nombre) =>
      prisma.tag.create({ data: { nombre, categoria: 'Operativo' } }),
    ),
  );

  const cargoTransportista = await prisma.cargo.create({
    data: { nombre: 'Transportista', descripcion: 'Conductor de convoy minero' },
  });
  const cargoMecanico = await prisma.cargo.create({ data: { nombre: 'Mecánico' } });

  const docDni = await prisma.documentoTipo.create({
    data: { nombre: 'DNI', categoria: 'IDENTIDAD', requiereVencimiento: false },
  });
  const docAntecedentes = await prisma.documentoTipo.create({
    data: { nombre: 'Antecedentes Penales y Policiales', categoria: 'ANTECEDENTE', ventanaAlertaDias: 30 },
  });
  const docMedico = await prisma.documentoTipo.create({
    data: { nombre: 'Examen Médico Ocupacional', categoria: 'MEDICO', ventanaAlertaDias: 30 },
  });
  const docLicencia = await prisma.documentoTipo.create({
    data: { nombre: 'Licencia de Conducir Clase A-III', categoria: 'LICENCIA', ventanaAlertaDias: 45 },
  });

  // Matriz de requisitos: Antapacay exige menos cursos que Las Bambas (según el requerimiento original).
  await prisma.matrizRequisito.createMany({
    data: [
      { mineraId: antapacay.id, cargoId: cargoTransportista.id, documentoTipoId: docDni.id, obligatorio: true, vigenteDesde: new Date() },
      { mineraId: antapacay.id, cargoId: cargoTransportista.id, documentoTipoId: docLicencia.id, obligatorio: true, vigenteDesde: new Date() },
      { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docDni.id, obligatorio: true, vigenteDesde: new Date() },
      { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docAntecedentes.id, obligatorio: true, vigenteDesde: new Date() },
      { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docMedico.id, obligatorio: true, vigenteDesde: new Date() },
      { mineraId: lasBambas.id, cargoId: cargoTransportista.id, documentoTipoId: docLicencia.id, obligatorio: true, vigenteDesde: new Date() },
    ],
  });

  const passwordHash = await bcrypt.hash('CambiarEn.Produccion123!', 10);
  await prisma.usuario.create({
    data: { email: 'admin@empresa-ejemplo.pe', passwordHash, rol: 'SUPER_ADMIN' },
  });

  console.log('Seed completado:', { empresa: empresa.id, antapacay: antapacay.id, lasBambas: lasBambas.id, tags: tags.length, cargoMecanico: cargoMecanico.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
