import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

const APP_VERSION = 'v1';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // HTTP request logging
  const nodeEnv = configService.get<string>('NODE_ENV');
  const morganFormat = nodeEnv === 'production' ? 'combined' : 'dev';
  app.use(morgan(morganFormat));

  // Security: HTTP headers protection

  app.use(helmet());

  // Performance: Enable gzip compression
  app.use(compression());

  app.setGlobalPrefix(APP_VERSION);

  // Enable validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Pluto API')
    .setDescription('The Pluto API description')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, documentFactory);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  const url = await app.getUrl();

  // Log application URLs
  console.log(`🚀 Application is running on: ${url}`);
  console.log(`📘 Swagger docs available at: ${url}/api-docs`);
}

void bootstrap();
