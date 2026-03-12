import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  API_PREFIX,
  HEALTH_LIVE_PATH,
  HEALTH_READY_PATH,
  SWAGGER_PATH,
} from './common/config/app.config';
import { HttpExceptionFilter } from './common/http/http-exception.filter';
import { AppLoggerService } from './common/logger/app-logger.service';

export function configureApp(app: INestApplication): void {
  const logger = app.get(AppLoggerService);
  const configService = app.get(ConfigService);

  app.useLogger(logger);
  app.enableShutdownHooks();

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [
      {
        path: HEALTH_LIVE_PATH,
        method: RequestMethod.GET,
      },
      {
        path: HEALTH_READY_PATH,
        method: RequestMethod.GET,
      },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Focus Forest API')
      .setDescription('Focus Forest V1 backend bootstrap')
      .setVersion(configService.get<string>('app.version') ?? '0.1.0')
      .addBearerAuth()
      .build(),
  );

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
