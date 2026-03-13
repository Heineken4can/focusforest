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

const PRIVATE_IPV4_PATTERN =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

function isDevelopmentOriginAllowed(origin: string, nodeEnv?: string): boolean {
  if (nodeEnv === 'production') {
    return false;
  }

  try {
    const url = new URL(origin);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    return (
      hostname === 'localhost' ||
      hostname === '::1' ||
      PRIVATE_IPV4_PATTERN.test(hostname)
    );
  } catch {
    return false;
  }
}

export function configureApp(app: INestApplication): void {
  const logger = app.get(AppLoggerService);
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>('cors.origins') ?? [];
  const nodeEnv = configService.get<string>('app.nodeEnv');

  app.useLogger(logger);
  app.enableShutdownHooks();
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        corsOrigins.includes(origin) ||
        isDevelopmentOriginAllowed(origin, nodeEnv)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS.'), false);
    },
    credentials: true,
    maxAge: 600,
  });

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
      .addCookieAuth(
        'refreshToken',
        {
          type: 'apiKey',
          in: 'cookie',
        },
        'refreshToken',
      )
      .build(),
  );

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
