import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AuthPasswordService } from './auth-password.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { AuthRepository } from './auth.repository';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthTokenService,
    AuthPasswordService,
    AuthRateLimitService,
    AuthRateLimitGuard,
    AuthService,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService, AuthTokenService, AuthRateLimitService],
})
export class AuthModule {}
