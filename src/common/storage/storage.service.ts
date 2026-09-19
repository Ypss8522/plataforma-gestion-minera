import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { fromBuffer } from 'file-type';

const MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly urlExpirySeconds: number;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.requireEnv('STORAGE_BUCKET');
    this.urlExpirySeconds = parseInt(
      this.configService.get<string>('STORAGE_SIGNED_URL_EXPIRY_SECONDS', '300'),
      10,
    );

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.requireEnv('STORAGE_ENDPOINT'),
      credentials: {
        accessKeyId: this.requireEnv('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: this.requireEnv('STORAGE_SECRET_ACCESS_KEY'),
      },
    });
  }

  private requireEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`[StorageService] Falta la variable de entorno "${key}".`);
    }
    return value;
  }

  /**
   * IMPORTANTE: trabajadorId y documentoTipoId deben venir siempre de un
   * contexto autorizado (JWT / query filtrada), nunca de un input arbitrario.
   */
  async subirArchivoBase64(
    base64Data: string,
    mimeTypeDeclarado: string,
    trabajadorId: string,
    documentoTipoId: string,
  ): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');

    const tipoDetectado = await fromBuffer(buffer);
    const mimeReal = tipoDetectado?.mime ?? mimeTypeDeclarado;

    if (!MIME_PERMITIDOS.includes(mimeReal)) {
      throw new InternalServerErrorException({
        error: { code: 'TIPO_ARCHIVO_NO_PERMITIDO', message: 'El contenido del archivo no es un tipo permitido.' },
      });
    }

    try {
      const extension = mimeReal.split('/')[1] || 'bin';
      const fileKey = `documentos/${trabajadorId}/${documentoTipoId}/${uuidv4()}.${extension}`;

      await this.s3Client.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: fileKey, Body: buffer, ContentType: mimeReal }),
      );

      return fileKey;
    } catch (error) {
      this.logger.error(`Error al subir archivo a R2: ${(error as Error).message}`);
      throw new InternalServerErrorException({
        error: { code: 'STORAGE_UPLOAD_ERROR', message: 'No se pudo guardar el archivo.' },
      });
    }
  }

  /**
   * IMPORTANTE: el fileKey debe venir siempre de una consulta a `documento`
   * ya filtrada por el trabajador autorizado — nunca aceptado del cliente.
   */
  async obtenerUrlFirmadaLectura(fileKey: string): Promise<string> {
    try {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: fileKey });
      return await getSignedUrl(this.s3Client, command, { expiresIn: this.urlExpirySeconds });
    } catch (error) {
      this.logger.error(`Error al generar URL firmada: ${(error as Error).message}`);
      throw new InternalServerErrorException({
        error: { code: 'STORAGE_SIGN_ERROR', message: 'No se pudo acceder al documento.' },
      });
    }
  }
}
