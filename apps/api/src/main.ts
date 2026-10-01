import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (process.env.LOCAL_STORE_ENABLED === 'true') {
    app.enableCors({
      origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/, /^http:\/\/192\.168\.\d+\.\d+:\d+$/],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  }
  const mobileWebRoot = join(__dirname, '..', 'public', 'mobile');
  const uploadRoot = join(process.cwd(), process.env.LOCAL_UPLOAD_PATH ?? 'storage/uploads');
  mkdirSync(uploadRoot, { recursive: true });
  app.useBodyParser('json', { limit: '25mb' });
  app.useStaticAssets(mobileWebRoot, { prefix: '/mobile' });
  app.useStaticAssets(mobileWebRoot, { prefix: '/' });
  app.useStaticAssets(uploadRoot, { prefix: '/uploads' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
