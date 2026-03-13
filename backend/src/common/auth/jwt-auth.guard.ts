import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth-request.interface';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthTokenService } from '../../modules/auth/auth-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authTokenService: AuthTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const accessToken = this.extractBearerToken(authorization);

    if (!accessToken) {
      throw this.unauthorized();
    }

    const payload = this.authTokenService.verifyAccessToken(accessToken);

    if (!payload) {
      throw this.unauthorized();
    }

    request.auth = {
      userId: payload.userId,
      email: payload.email,
    };

    return true;
  }

  private extractBearerToken(header?: string): string | undefined {
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }

    return header.slice('Bearer '.length).trim() || undefined;
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      message: 'Authentication required.',
      code: 'AUTH_401_UNAUTHORIZED',
      data: null,
    });
  }
}
