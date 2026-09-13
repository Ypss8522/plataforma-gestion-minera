-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'RRHH', 'OPERACIONES', 'GERENCIA', 'TRABAJADOR');

-- CreateEnum
CREATE TYPE "EstadoSemaforo" AS ENUM ('VERDE', 'AMARILLO', 'ROJO');

-- CreateEnum
CREATE TYPE "EstadoGeneralTrabajador" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO_TRANSPORTE');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('IDENTIDAD', 'ANTECEDENTE', 'MEDICO', 'LICENCIA', 'CURSO');

-- CreateEnum
CREATE TYPE "RolEnFrente" AS ENUM ('LIDER', 'AYUDANTE');

-- CreateEnum
CREATE TYPE "TipoAsignacion" AS ENUM ('FIJO', 'INTERMITENTE');

-- CreateEnum
CREATE TYPE "EstadoFrenteTrabajo" AS ENUM ('PLANIFICADO', 'ACTIVO', 'CERRADO');

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "razon_social" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minera" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color_primario" TEXT,
    "color_secundario" TEXT,
    "logo_url" TEXT,

    CONSTRAINT "minera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "minera_tema" (
    "id" TEXT NOT NULL,
    "minera_id" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "tipografia" TEXT,
    "modo" TEXT NOT NULL DEFAULT 'claro',

    CONSTRAINT "minera_tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_minera" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "minera_id" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "empresa_minera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajador" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3),
    "fecha_ingreso" TIMESTAMP(3) NOT NULL,
    "telefono" TEXT,
    "estado_general" "EstadoGeneralTrabajador" NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajador_tag" (
    "id" TEXT NOT NULL,
    "trabajador_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "asignado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trabajador_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_tipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "ventana_alerta_dias" INTEGER NOT NULL DEFAULT 30,
    "requiere_vencimiento" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "documento_tipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriz_requisito" (
    "id" TEXT NOT NULL,
    "minera_id" TEXT NOT NULL,
    "cargo_id" TEXT NOT NULL,
    "documento_tipo_id" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vigente_desde" TIMESTAMP(3) NOT NULL,
    "vigente_hasta" TIMESTAMP(3),

    CONSTRAINT "matriz_requisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" TEXT NOT NULL,
    "trabajador_id" TEXT NOT NULL,
    "documento_tipo_id" TEXT NOT NULL,
    "archivo_url" TEXT NOT NULL,
    "archivo_hash" TEXT,
    "fecha_emision" TIMESTAMP(3),
    "fecha_vencimiento" TIMESTAMP(3),
    "estado_semaforo" "EstadoSemaforo" NOT NULL DEFAULT 'ROJO',
    "subido_por" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trabajador_estado_contexto" (
    "id" TEXT NOT NULL,
    "trabajador_id" TEXT NOT NULL,
    "minera_id" TEXT NOT NULL,
    "cargo_id" TEXT NOT NULL,
    "porcentaje_avance" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "es_100_porciento" BOOLEAN NOT NULL DEFAULT false,
    "fecha_alcanzo_100" TIMESTAMP(3),
    "calculado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trabajador_estado_contexto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frente_trabajo" (
    "id" TEXT NOT NULL,
    "minera_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "estado" "EstadoFrenteTrabajo" NOT NULL DEFAULT 'PLANIFICADO',

    CONSTRAINT "frente_trabajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frente_trabajo_miembro" (
    "id" TEXT NOT NULL,
    "frente_trabajo_id" TEXT NOT NULL,
    "trabajador_id" TEXT NOT NULL,
    "rol_en_frente" "RolEnFrente" NOT NULL,
    "tipo_asignacion" "TipoAsignacion" NOT NULL,
    "fue_override" BOOLEAN NOT NULL DEFAULT false,
    "override_por" TEXT,
    "override_motivo" TEXT,
    "asignado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frente_trabajo_miembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convoy" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "minera_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "convoy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convoy_miembro" (
    "id" TEXT NOT NULL,
    "convoy_id" TEXT NOT NULL,
    "trabajador_id" TEXT NOT NULL,
    "asignado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convoy_miembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "empresa_id" TEXT,
    "trabajador_id" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_log" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "detalle" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_ruc_key" ON "empresa"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "minera_nombre_key" ON "minera"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "minera_tema_minera_id_key" ON "minera_tema"("minera_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_minera_empresa_id_minera_id_key" ON "empresa_minera"("empresa_id", "minera_id");

-- CreateIndex
CREATE UNIQUE INDEX "trabajador_dni_key" ON "trabajador"("dni");

-- CreateIndex
CREATE INDEX "trabajador_apellidos_idx" ON "trabajador"("apellidos");

-- CreateIndex
CREATE INDEX "trabajador_empresa_id_idx" ON "trabajador"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_nombre_key" ON "tag"("nombre");

-- CreateIndex
CREATE INDEX "trabajador_tag_tag_id_idx" ON "trabajador_tag"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "trabajador_tag_trabajador_id_tag_id_key" ON "trabajador_tag"("trabajador_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_nombre_key" ON "cargo"("nombre");

-- CreateIndex
CREATE INDEX "matriz_requisito_minera_id_cargo_id_idx" ON "matriz_requisito"("minera_id", "cargo_id");

-- CreateIndex
CREATE UNIQUE INDEX "matriz_requisito_minera_id_cargo_id_documento_tipo_id_versi_key" ON "matriz_requisito"("minera_id", "cargo_id", "documento_tipo_id", "version");

-- CreateIndex
CREATE INDEX "documento_trabajador_id_idx" ON "documento"("trabajador_id");

-- CreateIndex
CREATE INDEX "documento_fecha_vencimiento_idx" ON "documento"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "documento_estado_semaforo_idx" ON "documento"("estado_semaforo");

-- CreateIndex
CREATE UNIQUE INDEX "trabajador_estado_contexto_trabajador_id_minera_id_cargo_id_key" ON "trabajador_estado_contexto"("trabajador_id", "minera_id", "cargo_id");

-- CreateIndex
CREATE INDEX "frente_trabajo_miembro_frente_trabajo_id_idx" ON "frente_trabajo_miembro"("frente_trabajo_id");

-- CreateIndex
CREATE INDEX "frente_trabajo_miembro_trabajador_id_idx" ON "frente_trabajo_miembro"("trabajador_id");

-- CreateIndex
CREATE UNIQUE INDEX "convoy_codigo_key" ON "convoy"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_trabajador_id_key" ON "usuario"("trabajador_id");

-- CreateIndex
CREATE INDEX "auditoria_log_entidad_entidad_id_idx" ON "auditoria_log"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_log_created_at_idx" ON "auditoria_log"("created_at");

-- AddForeignKey
ALTER TABLE "minera_tema" ADD CONSTRAINT "minera_tema_minera_id_fkey" FOREIGN KEY ("minera_id") REFERENCES "minera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_minera" ADD CONSTRAINT "empresa_minera_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_minera" ADD CONSTRAINT "empresa_minera_minera_id_fkey" FOREIGN KEY ("minera_id") REFERENCES "minera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador" ADD CONSTRAINT "trabajador_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_tag" ADD CONSTRAINT "trabajador_tag_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_tag" ADD CONSTRAINT "trabajador_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriz_requisito" ADD CONSTRAINT "matriz_requisito_minera_id_fkey" FOREIGN KEY ("minera_id") REFERENCES "minera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriz_requisito" ADD CONSTRAINT "matriz_requisito_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriz_requisito" ADD CONSTRAINT "matriz_requisito_documento_tipo_id_fkey" FOREIGN KEY ("documento_tipo_id") REFERENCES "documento_tipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_documento_tipo_id_fkey" FOREIGN KEY ("documento_tipo_id") REFERENCES "documento_tipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_estado_contexto" ADD CONSTRAINT "trabajador_estado_contexto_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_estado_contexto" ADD CONSTRAINT "trabajador_estado_contexto_minera_id_fkey" FOREIGN KEY ("minera_id") REFERENCES "minera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trabajador_estado_contexto" ADD CONSTRAINT "trabajador_estado_contexto_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frente_trabajo" ADD CONSTRAINT "frente_trabajo_minera_id_fkey" FOREIGN KEY ("minera_id") REFERENCES "minera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frente_trabajo_miembro" ADD CONSTRAINT "frente_trabajo_miembro_frente_trabajo_id_fkey" FOREIGN KEY ("frente_trabajo_id") REFERENCES "frente_trabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frente_trabajo_miembro" ADD CONSTRAINT "frente_trabajo_miembro_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convoy" ADD CONSTRAINT "convoy_minera_id_fkey" FOREIGN KEY ("minera_id") REFERENCES "minera"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convoy_miembro" ADD CONSTRAINT "convoy_miembro_convoy_id_fkey" FOREIGN KEY ("convoy_id") REFERENCES "convoy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convoy_miembro" ADD CONSTRAINT "convoy_miembro_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "trabajador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
