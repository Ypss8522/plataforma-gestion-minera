import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly urlExpirySeconds: number;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('STORAGE_BUCKET', 'minera-documentos-sensibles');
    this.urlExpirySeconds = parseInt(
      this.configService.get<string>('STORAGE_SIGNED_URL_EXPIRY_SECONDS', '300'),
      10,
    );

    this.s3Client = new S3Client({
      region: this.configService.get<string>('STORAGE_REGION', 'auto'),
      endpoint: this.configService.get<string>('STORAGE_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('STORAGE_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('STORAGE_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  /**
   * Sube un archivo en Base64 a Cloudflare R2 con una clave única estructurada.
   */
  async subirArchivoBase64(
    base64Data: string,
    mimeType: string,
    trabajadorId: string,
    documentoTipoId: string,
  ): Promise<string> {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const extension = mimeType.split('/')[1] || 'bin';
      const fileKey = `documentos/${trabajadorId}/${documentoTipoId}/${uuidv4()}.${extension}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: fileKey,
          Body: buffer,
          ContentType: mimeType,
        }),
      );

      return fileKey;
    } catch (error) {
      this.logger.error('Error al subir archivo a R2', error);
      throw new InternalServerErrorException({
        error: { code: 'STORAGE_UPLOAD_ERROR', message: 'No se pudo guardar el archivo.' },
      });
    }
  }

  /**
   * Genera una URL firmada de corta duración (5 min por defecto) para visualización segura.
   */
  async obtenerUrlFirmadaLectura(fileKey: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: this.urlExpirySeconds,
      });
    } catch (error) {
      this.logger.error('Error al generar URL firmada', error);
      throw new InternalServerErrorException({
        error: { code: 'STORAGE_SIGN_ERROR', message: 'No se pudo acceder al documento.' },
      });
    }
  }
}