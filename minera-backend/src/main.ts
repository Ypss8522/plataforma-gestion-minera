import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.)
  app.use(helmet());

  // CORS restringido a los orígenes conocidos del frontend (configurar por .env en producción).
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    credentials: true,
  });

  // Valida y sanea TODO payload de entrada contra los DTOs (class-validator).
  // whitelist: descarta cualquier campo no declarado en el DTO (previene mass assignment).
  // forbidNonWhitelisted: rechaza el request si trae campos extra, en vez de ignorarlos silenciosamente.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
