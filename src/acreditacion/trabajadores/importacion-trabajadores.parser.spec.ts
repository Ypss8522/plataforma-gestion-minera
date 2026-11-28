import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { Workbook } from 'exceljs';
import { MAX_ARCHIVO_TRABAJADORES, parsearTrabajadores } from './importacion-trabajadores.parser';

const empresaId = 'a064a930-c6f2-41f7-bafa-6263ed497ded';

it('lee la plantilla XLSX y preserva el cero inicial del DNI', async () => {
  const plantilla = await readFile('docs/plantillas/SCRUM-16-trabajadores.xlsx');
  const resultado = await parsearTrabajadores(plantilla, empresaId);
  expect(resultado.total).toBe(2);
  expect(resultado.errores).toEqual([]);
  expect(resultado.validas[0].datos).toMatchObject({ dni: '01234567', tags: ['mecánico', 'supervisor'] });
});

it('detecta fechas y fórmulas XLSX incluso si la fórmula tiene un valor en caché', async () => {
  const libro = new Workbook();
  const hoja = libro.addWorksheet('Trabajadores');
  hoja.addRow(['dni', 'nombres', 'apellidos', 'fechaIngreso']);
  hoja.addRow(['01234567', 'Ana', 'Prueba', new Date('2026-02-03T00:00:00Z')]);
  hoja.getRow(5).values = ['12345678', { formula: '1+1', result: 2 }, 'Ejemplo', '2026-02-03'];
  const resultado = await parsearTrabajadores(Buffer.from(await libro.xlsx.writeBuffer()), empresaId);
  expect(resultado.validas[0].datos.fechaIngreso).toBe('2026-02-03');
  expect(resultado.errores).toEqual([{ fila: 5, dni: '12345678', motivo: expect.stringContaining('fórmula') }]);
});

it('lee CSV UTF-8 con BOM, punto y coma, filas vacías y comillas', async () => {
  const csv = '\uFEFFdni;nombres;apellidos;fechaIngreso;tags\r\n' +
    '01234567;Ana;"Pérez; Ríos";2026-02-03; Mecánico | Supervisor\r\n\r\n' +
    '01234567;Persona;Duplicada;2026-02-03;\r\n' +
    '12345678;" +1";Ejemplo;2026-02-03;\r\n' +
    '23456789;Luis;Ejemplo;2026-02-30;\r\n' +
    '34567890;Ana;Ejemplo;2026-02-03; Supervisor | supervisor\r\n' +
    'dato-invalido;Luis;Ejemplo;2026-02-01;\r\n';
  const resultado = await parsearTrabajadores(Buffer.from(csv), empresaId);
  expect(resultado.total).toBe(6);
  expect(resultado.validas[0].datos).toMatchObject({ apellidos: 'Pérez; Ríos', tags: ['mecánico', 'supervisor'] });
  expect(resultado.errores).toEqual([
    { fila: 4, dni: '01234567', motivo: expect.stringContaining('duplicado') },
    { fila: 5, dni: '12345678', motivo: expect.stringContaining('fórmula') },
    { fila: 6, dni: '23456789', motivo: expect.stringContaining('fechaIngreso') },
    { fila: 7, dni: '34567890', motivo: expect.stringContaining('tags') },
    { fila: 8, dni: null, motivo: expect.stringContaining('dni') },
  ]);
});

it.each(['=', '+', '-', '@'])('rechaza el prefijo de fórmula %s en CSV', async prefijo => {
  const archivo = Buffer.from(`dni,nombres,apellidos,fechaIngreso\n01234567, ${prefijo}1,Prueba,2026-02-03`);
  const { errores } = await parsearTrabajadores(archivo, empresaId);
  expect(errores).toEqual([{ fila: 2, dni: '01234567', motivo: expect.stringContaining('fórmula') }]);
});

it('mantiene el número físico luego de una fila con salto de línea entre comillas', async () => {
  const archivo = Buffer.from('dni,nombres,apellidos,fechaIngreso\n01234567,"Ana\nMaria",Prueba,2026-02-03\n12345678,=1,Prueba,2026-02-03');
  const { errores } = await parsearTrabajadores(archivo, empresaId);
  expect(errores.map(error => error.fila)).toEqual([2, 4]);
});

it.each([
  [Buffer.from([0xff, 0xd8, 0xff]), /UTF-8/],
  [Buffer.from('PK\x03\x04contenido'), /XLSX válido/],
  [Buffer.from('cualquier,encabezado\ndato,dato'), /Encabezados inválidos/],
  [Buffer.from('dni,nombres,apellidos,fechaIngreso\n12345678,"abierta'), /Estructura CSV/],
  [Buffer.alloc(MAX_ARCHIVO_TRABAJADORES + 1), /5 MiB/],
])('rechaza archivos inválidos por contenido, formato o tamaño', async (archivo, mensaje) => {
  await expect(parsearTrabajadores(archivo, empresaId)).rejects.toThrow(mensaje);
});
