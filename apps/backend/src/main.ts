import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3333;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api';
  const frontendUrl = configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

  const isProd = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: isProd ? [frontendUrl] : true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const documentConfig = new DocumentBuilder()
    .setTitle("Oumoul's App API")
    .setDescription('REST API powering spiritual companion services')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${port}/${apiPrefix}`)
    .addServer(frontendUrl)
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  app.setGlobalPrefix(apiPrefix);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
