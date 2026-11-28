import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoGeneralTrabajador, Prisma } from '@prisma/client';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorImportacion, FilaValida, parsearTrabajadores } from './importacion-trabajadores.parser';
import { CrearTrabajadorDto, EditarTrabajadorDto, ListarTrabajadoresDto, normalizarTag } from './trabajadores.dto';

const LOTE_IMPORTACION = 100;
const INACTIVO = EstadoGeneralTrabajador.INACTIVO;
const DETALLE = { tags: { include: { tag: true }, orderBy: { tag: { nombre: 'asc' } } } } satisfies Prisma.TrabajadorInclude;

@Injectable()
export class TrabajadoresService {
  constructor(private readonly prisma: PrismaService) {}

  listar(dto: ListarTrabajadoresDto, actor: JwtPayload) {
    return this.prisma.withRlsContext(actor, async (tx: Prisma.TransactionClient) => {
      const where = { estadoGeneral: dto.estadoGeneral ?? { not: INACTIVO } };
      const total = await tx.trabajador.count({ where });
      const trabajadores = await tx.trabajador.findMany({
        where,
        include: DETALLE,
        orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }, { id: 'asc' }],
        skip: (dto.pagina - 1) * dto.limite,
        take: dto.limite,
      });
      return { trabajadores, total, pagina: dto.pagina, limite: dto.limite };
    });
  }

  obtener(id: string, actor: JwtPayload) {
    return this.prisma.withRlsContext(actor, (tx: Prisma.TransactionClient) => this.buscarTrabajador(tx, id));
  }

  async crear(dto: CrearTrabajadorDto, actor: JwtPayload) {
    try {
      return await this.prisma.withRlsContext(actor, async (tx: Prisma.TransactionClient) => {
        await this.verificarEmpresa(tx, dto.empresaId);
        const trabajador = await tx.trabajador.create({ data: datosDeAlta(dto) });
        const tags = await this.resolverTags(tx, dto.tags ?? []);
        await this.asignarTags(tx, trabajador.id, dto.tags ?? [], tags);
        return this.buscarTrabajador(tx, trabajador.id);
      });
    } catch (error) {
      this.manejarErrorDeEscritura(error);
    }
  }

  async editar(id: string, dto: EditarTrabajadorDto, actor: JwtPayload) {
    try {
      return await this.prisma.withRlsContext(actor, async (tx: Prisma.TransactionClient) => {
        const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM trabajador WHERE id = ${id} FOR UPDATE`;
        if (filas.length === 0) throw new NotFoundException('El trabajador no existe.');
        const { tags, ...campos } = dto;
        const data = convertirFechas(campos);
        if (Object.values(data).some(valor => valor !== undefined)) {
          await tx.trabajador.update({ where: { id }, data });
        }
        if (tags !== undefined) {
          const ids = await this.resolverTags(tx, tags);
          await tx.trabajadorTag.deleteMany({ where: { trabajadorId: id, tagId: { notIn: tags.map(tag => ids.get(tag)!) } } });
          await this.asignarTags(tx, id, tags, ids);
        }
        return this.buscarTrabajador(tx, id);
      });
    } catch (error) {
      this.manejarErrorDeEscritura(error);
    }
  }

  async darDeBaja(id: string, actor: JwtPayload) {
    await this.prisma.withRlsContext(actor, async (tx: Prisma.TransactionClient) => {
      const { count } = await tx.trabajador.updateMany({ where: { id }, data: { estadoGeneral: INACTIVO } });
      if (count === 0) throw new NotFoundException('El trabajador no existe.');
    });
  }

  async importar(archivo: Buffer, empresaId: string, dryRun: boolean, actor: JwtPayload) {
    const { total, validas, errores } = await parsearTrabajadores(archivo, empresaId);
    await this.prisma.withRlsContext(actor, (tx: Prisma.TransactionClient) => this.verificarEmpresa(tx, empresaId));
    let aceptadas = 0;
    for (let i = 0; i < validas.length; i += LOTE_IMPORTACION) {
      const lote = validas.slice(i, i + LOTE_IMPORTACION);
      const erroresLote = await this.prisma.withRlsContext(actor, (tx: Prisma.TransactionClient) =>
        this.procesarLote(tx, lote, dryRun));
      aceptadas += lote.length - erroresLote.length;
      errores.push(...erroresLote);
    }
    return {
      total,
      creadas: dryRun ? 0 : aceptadas,
      validas: aceptadas,
      rechazadas: errores.length,
      errores: errores.sort((a, b) => a.fila - b.fila),
    };
  }

  private async procesarLote(tx: Prisma.TransactionClient, lote: FilaValida[], dryRun: boolean) {
    const dnis = lote.map(({ datos }) => datos.dni);
    if (dryRun) {
      const existentes = await tx.trabajador.findMany({ where: { dni: { in: dnis } }, select: { dni: true } });
      const ocupados = new Set(existentes.map(({ dni }) => dni));
      return lote.filter(({ datos }) => ocupados.has(datos.dni)).map(errorDniExistente);
    }

    // PostgreSQL omite también los DNI insertados concurrentemente. El RETURNING identifica las altas del lote.
    const creados = await tx.trabajador.createManyAndReturn({
      data: lote.map(({ datos }) => datosDeAlta(datos)).sort((a, b) => a.dni.localeCompare(b.dni)),
      skipDuplicates: true,
      select: { id: true, dni: true },
    });
    const idsPorDni = new Map(creados.map(({ id, dni }) => [dni, id]));
    const tags = await this.resolverTags(tx, lote.flatMap(({ datos }) => idsPorDni.has(datos.dni) ? datos.tags ?? [] : []));
    const errores: ErrorImportacion[] = [];
    const asignaciones: Prisma.TrabajadorTagCreateManyInput[] = [];
    for (const fila of lote) {
      const id = idsPorDni.get(fila.datos.dni);
      if (!id) {
        errores.push(errorDniExistente(fila));
        continue;
      }
      for (const nombre of fila.datos.tags ?? []) asignaciones.push({ trabajadorId: id, tagId: tags.get(nombre)! });
    }
    if (asignaciones.length) await tx.trabajadorTag.createMany({ data: asignaciones });
    return errores;
  }

  private async buscarTrabajador(tx: Prisma.TransactionClient, id: string) {
    const trabajador = await tx.trabajador.findUnique({ where: { id }, include: DETALLE });
    if (!trabajador) throw new NotFoundException('El trabajador no existe.');
    return trabajador;
  }

  private async verificarEmpresa(tx: Prisma.TransactionClient, id: string) {
    const empresa = await tx.empresa.findUnique({ where: { id }, select: { id: true } });
    if (!empresa) throw new NotFoundException('La empresa no existe.');
  }

  private async resolverTags(tx: Prisma.TransactionClient, nombres: string[]) {
    const requeridos = [...new Set(nombres)].sort();
    const ids = new Map<string, string>();
    if (requeridos.length === 0) return ids;

    // Conserva los nombres ya usados por la búsqueda de Operaciones, incluidos los del seed.
    const existentes = await tx.tag.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } });
    for (const tag of existentes) {
      const clave = normalizarTag(tag.nombre);
      if (!ids.has(clave)) ids.set(clave, tag.id);
    }
    const faltantes = requeridos.filter(nombre => !ids.has(nombre));
    if (faltantes.length > 0) {
      await tx.tag.createMany({ data: faltantes.map(nombre => ({ nombre })), skipDuplicates: true });
      const nuevos = await tx.tag.findMany({ where: { nombre: { in: faltantes } }, select: { id: true, nombre: true } });
      for (const tag of nuevos) ids.set(tag.nombre, tag.id);
    }
    return ids;
  }

  private async asignarTags(tx: Prisma.TransactionClient, id: string, tags: string[], ids: Map<string, string>) {
    if (tags.length) {
      await tx.trabajadorTag.createMany({
        data: tags.map(nombre => ({ trabajadorId: id, tagId: ids.get(nombre)! })),
        skipDuplicates: true,
      });
    }
  }

  private manejarErrorDeEscritura(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('El DNI ya pertenece a un trabajador.');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new ConflictException('La empresa o un tag asociado ya no está disponible.');
    }
    throw error;
  }
}

function convertirFechas<T extends { fechaIngreso?: string; fechaNacimiento?: string | null }>(campos: T) {
  const { fechaIngreso, fechaNacimiento, ...otros } = campos;
  return {
    ...otros,
    fechaIngreso: fechaIngreso === undefined ? undefined : new Date(fechaIngreso),
    fechaNacimiento: fechaNacimiento == null ? fechaNacimiento : new Date(fechaNacimiento),
  };
}

function datosDeAlta(dto: CrearTrabajadorDto): Prisma.TrabajadorCreateManyInput {
  return {
    empresaId: dto.empresaId,
    dni: dto.dni,
    nombres: dto.nombres,
    apellidos: dto.apellidos,
    fechaIngreso: new Date(dto.fechaIngreso),
    fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : dto.fechaNacimiento,
    telefono: dto.telefono,
  };
}

function errorDniExistente({ fila, datos }: FilaValida): ErrorImportacion {
  return { fila, dni: datos.dni, motivo: 'El DNI ya existe en la base de datos.' };
}
