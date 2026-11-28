import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { parse } from 'csv-parse';
import { CellValue, Workbook } from 'exceljs';
import { fromBuffer } from 'yauzl';
import { CrearTrabajadorDto, PREFIJO_FORMULA } from './trabajadores.dto';

export const MAX_ARCHIVO_TRABAJADORES = 5 * 1024 * 1024;
const MAX_FILAS = 5000;
const REQUERIDAS = ['dni', 'nombres', 'apellidos', 'fechaIngreso'];
const COLUMNAS = new Set([...REQUERIDAS, 'fechaNacimiento', 'telefono', 'tags']);

type FilaArchivo = { numero: number; celdas: CellValue[] };
export type ErrorImportacion = { fila: number; dni: string | null; motivo: string };
export type FilaValida = { fila: number; datos: CrearTrabajadorDto };

export async function parsearTrabajadores(buffer: Buffer, empresaId: string) {
  if (!buffer.length || buffer.length > MAX_ARCHIVO_TRABAJADORES) {
    throw new BadRequestException('El archivo debe tener contenido y pesar como máximo 5 MiB.');
  }

  const esZip = buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
  const filas = esZip ? await leerExcel(buffer) : await leerCsv(buffer);
  const encabezados = validarEncabezados(filas.shift());
  if (filas.length === 0) throw new BadRequestException('El archivo no contiene filas de datos.');

  const validas: FilaValida[] = [];
  const errores: ErrorImportacion[] = [];
  const dnis = new Set<string>();
  for (const { numero, celdas } of filas) {
    const dniCelda = celdas[encabezados.indexOf('dni')];
    const dniTexto = textoSimple(dniCelda);
    const dni = /^\d{8}$/.test(dniTexto ?? '') ? dniTexto : null;
    if (dni && dnis.has(dni)) {
      errores.push({ fila: numero, dni, motivo: 'DNI duplicado en el archivo.' });
      continue;
    }
    if (dni) dnis.add(dni);

    try {
      if (celdas.length > encabezados.length) throw new Error('La fila tiene columnas adicionales.');
      const valores = Object.fromEntries(encabezados.map((campo, indice) => [campo, leerCelda(celdas[indice])]));
      const datos = plainToInstance(CrearTrabajadorDto, {
        ...valores,
        empresaId,
        tags: valores.tags?.split('|'),
      });
      const fallos = validateSync(datos, { validationError: { target: false, value: false } });
      if (fallos.length) throw new Error(`Campos inválidos: ${fallos.map(({ property }) => property).join(', ')}.`);
      validas.push({ fila: numero, datos });
    } catch (error) {
      errores.push({ fila: numero, dni, motivo: (error as Error).message });
    }
  }
  return { total: filas.length, validas, errores };
}

function validarEncabezados(fila: FilaArchivo | undefined): string[] {
  const encabezados = fila?.celdas.map(celda => typeof celda === 'string' ? celda.trim() : '') ?? [];
  if (fila?.numero !== 1 || new Set(encabezados).size !== encabezados.length ||
      encabezados.some(campo => !COLUMNAS.has(campo)) ||
      REQUERIDAS.some(campo => !encabezados.includes(campo))) {
    throw new BadRequestException('Encabezados inválidos. Usa la plantilla de trabajadores.');
  }
  return encabezados;
}

function textoSimple(celda: CellValue): string | null {
  if (typeof celda === 'string') return celda.trim();
  if (typeof celda === 'number' && Number.isSafeInteger(celda)) return String(celda);
  return null;
}

function leerCelda(celda: CellValue): string | undefined {
  if (celda == null) return undefined;
  if (celda instanceof Date && Number.isFinite(celda.getTime()) && celda.toISOString().endsWith('T00:00:00.000Z')) {
    return celda.toISOString().slice(0, 10);
  }
  const texto = textoSimple(celda);
  if (texto === null || PREFIJO_FORMULA.test(texto)) {
    throw new Error('La fila contiene una fórmula o un tipo de celda no admitido.');
  }
  return texto || undefined;
}

function agregarFila(filas: FilaArchivo[], numero: number, celdas: CellValue[]) {
  if (numero !== 1 && celdas.every(celda => celda == null || typeof celda === 'string' && celda.trim() === '')) {
    return;
  }
  if (filas.length >= MAX_FILAS + 1) throw new BadRequestException('El archivo supera las 5000 filas de datos.');
  filas.push({ numero, celdas });
}

async function leerCsv(buffer: Buffer): Promise<FilaArchivo[]> {
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new UnsupportedMediaTypeException('Se requiere un XLSX o CSV UTF-8 válido.');
  }
  if (/(?=[^\t\r\n])\p{Cc}/u.test(texto)) {
    throw new UnsupportedMediaTypeException('Se requiere un XLSX o CSV UTF-8 válido.');
  }
  const primeraLinea = texto.split(/\r\n|\n|\r/, 1)[0];
  const filas: FilaArchivo[] = [];
  let linea = 1;
  try {
    const registros = parse(texto, {
      delimiter: primeraLinea.includes(';') ? ';' : ',',
      info: true,
      relax_column_count: true,
      max_record_size: 8192,
    });
    for await (const { record, info } of registros) {
      agregarFila(filas, linea, record);
      linea = info.lines + 1;
    }
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException('Estructura CSV inválida. Revisa las comillas y los separadores.');
  }
  return filas;
}

async function leerExcel(buffer: Buffer): Promise<FilaArchivo[]> {
  const libro = new Workbook();
  try {
    await verificarContenedorExcel(buffer);
    await libro.xlsx.load(Uint8Array.from(buffer).buffer);
  } catch {
    throw new UnsupportedMediaTypeException('El archivo debe ser un XLSX válido de hasta 32 MiB descomprimido.');
  }
  if (libro.worksheets.length !== 1) throw new BadRequestException('El XLSX debe tener una única hoja.');
  const filas: FilaArchivo[] = [];
  libro.worksheets[0].eachRow((fila, numero) => {
    const valores = fila.values as CellValue[];
    // ExcelJS usa un arreglo disperso indexado desde 1. El cursor se conserva para el reporte.
    agregarFila(filas, numero, Array.from(valores.slice(1)));
  });
  return filas;
}

function verificarContenedorExcel(buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('ZIP inválido.'));
      const nombres = new Set<string>();
      let bytes = 0;
      function fallar() {
        zip.close();
        reject(new Error('Contenedor XLSX inválido.'));
      }
      zip.on('error', fallar);
      zip.on('entry', entrada => {
        bytes += entrada.uncompressedSize;
        if (nombres.has(entrada.fileName) || nombres.size >= 128 || bytes > 32 * 1024 * 1024) return fallar();
        nombres.add(entrada.fileName);
        zip.openReadStream(entrada, (errorLectura, stream) => {
          if (errorLectura || !stream) return fallar();
          stream.on('error', fallar);
          stream.on('end', () => zip.readEntry());
          stream.resume();
        });
      });
      zip.on('end', () => {
        if (!['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'].every(nombre => nombres.has(nombre)) ||
            [...nombres].some(nombre => /vbaProject\.bin$/i.test(nombre))) return fallar();
        resolve();
      });
      zip.readEntry();
    });
  });
}
