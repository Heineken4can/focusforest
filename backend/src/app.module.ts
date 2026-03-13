import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';
import { AppLoggerService } from './common/logger/app-logger.service';
import { HttpLoggingMiddleware } from './common/logger/http-logging.middleware';
import { RequestContextMiddleware } from './common/logger/request-context.middleware';
import { RequestContextService } from './common/logger/request-context.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    RequestContextService,
    RequestContextMiddleware,
    HttpLoggingMiddleware,
    AppLoggerService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware, HttpLoggingMiddleware)
      .exclude(
        {
          path: 'api-docs',
          method: RequestMethod.ALL,
        },
        {
          path: 'api-docs/(.*)',
          method: RequestMethod.ALL,
        },
      )
      .forRoutes('*');
  }
}
