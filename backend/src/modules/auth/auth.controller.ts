import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../common/auth/auth-request.interface';
import { Public } from '../../common/auth/public.decorator';
import { createSuccessResponse } from '../../common/http/api-response';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import {
  LoginSuccessEnvelopeDto,
  LogoutSuccessEnvelopeDto,
  RefreshSuccessEnvelopeDto,
  SignupSuccessEnvelopeDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user.' })
  @ApiCreatedResponse({
    description: 'User signed up successfully.',
    type: SignupSuccessEnvelopeDto,
  })
  @ApiConflictResponse({ description: 'Email is already registered.' })
  @ApiTooManyRequestsResponse({ description: 'Auth rate limit exceeded.' })
  async signup(
    @Body() dto: SignupDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signup(
      dto,
      request.headers['user-agent'],
    );
    this.setAuthCookies(
      response,
      result.refreshToken,
      result.csrfToken,
      result.refreshTokenMaxAgeMs,
    );

    return createSuccessResponse('User signed up successfully.', result.data);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password.' })
  @ApiOkResponse({
    description: 'User logged in successfully.',
    type: LoginSuccessEnvelopeDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiTooManyRequestsResponse({ description: 'Auth rate limit exceeded.' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      request.headers['user-agent'],
    );
    this.setAuthCookies(
      response,
      result.refreshToken,
      result.csrfToken,
      result.refreshTokenMaxAgeMs,
    );

    return createSuccessResponse('User logged in successfully.', result.data);
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token and rotate refresh token.' })
  @ApiOkResponse({
    description: 'Access token refreshed successfully.',
    type: RefreshSuccessEnvelopeDto,
  })
  @ApiCookieAuth('refreshToken')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Must match the csrfToken cookie value.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid or revoked.',
  })
  @ApiForbiddenResponse({ description: 'CSRF token is invalid.' })
  @ApiTooManyRequestsResponse({ description: 'Auth rate limit exceeded.' })
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = this.parseCookies(request);
    const result = await this.authService.refresh({
      refreshToken: cookies.refreshToken,
      csrfToken: cookies.csrfToken,
      csrfHeader,
      deviceInfo: request.headers['user-agent'],
    });

    this.setAuthCookies(
      response,
      result.refreshToken,
      result.csrfToken,
      result.refreshTokenMaxAgeMs,
    );

    return createSuccessResponse(
      'Access token refreshed successfully.',
      result.data,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and revoke the current refresh token.' })
  @ApiOkResponse({
    description: 'User logged out successfully.',
    type: LogoutSuccessEnvelopeDto,
  })
  @ApiBearerAuth()
  @ApiCookieAuth('refreshToken')
  @ApiHeader({
    name: 'X-CSRF-Token',
    required: true,
    description: 'Must match the csrfToken cookie value.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required or refresh token is invalid.',
  })
  @ApiForbiddenResponse({ description: 'CSRF token is invalid.' })
  async logout(
    @Req() request: AuthenticatedRequest,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = this.parseCookies(request);

    try {
      const result = await this.authService.logout({
        userId: request.auth?.userId,
        refreshToken: cookies.refreshToken,
        csrfToken: cookies.csrfToken,
        csrfHeader,
      });

      this.clearAuthCookies(response);
      return createSuccessResponse('User logged out successfully.', result);
    } catch (error) {
      if (this.shouldClearAuthCookiesOnLogoutError(error)) {
        this.clearAuthCookies(response);
      }

      throw error;
    }
  }

  private shouldClearAuthCookiesOnLogoutError(error: unknown): boolean {
    if (!(error instanceof HttpException)) {
      return false;
    }

    if (error.getStatus() !== 401) {
      return false;
    }

    const response = error.getResponse();

    if (
      typeof response !== 'object' ||
      response === null ||
      !('code' in response)
    ) {
      return false;
    }

    return response.code === 'AUTH_401_REFRESH_REVOKED';
  }

  private setAuthCookies(
    response: Response,
    refreshToken: string,
    csrfToken: string,
    maxAgeMs: number,
  ): void {
    const isSecureCookie =
      this.configService.get<string>('app.nodeEnv') === 'production';

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'strict',
      path: '/',
      maxAge: maxAgeMs,
    });
    response.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      secure: isSecureCookie,
      sameSite: 'strict',
      path: '/',
      maxAge: maxAgeMs,
    });
  }

  private clearAuthCookies(response: Response): void {
    const isSecureCookie =
      this.configService.get<string>('app.nodeEnv') === 'production';
    const expiredAt = new Date(0);

    response.cookie('refreshToken', '', {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: 'strict',
      path: '/',
      expires: expiredAt,
    });
    response.cookie('csrfToken', '', {
      httpOnly: false,
      secure: isSecureCookie,
      sameSite: 'strict',
      path: '/',
      expires: expiredAt,
    });
  }

  private parseCookies(request: AuthenticatedRequest): Record<string, string> {
    const header = request.headers.cookie;

    if (!header) {
      return {};
    }

    return header.split(';').reduce<Record<string, string>>((acc, chunk) => {
      const [key, ...valueParts] = chunk.trim().split('=');

      if (!key) {
        return acc;
      }

      acc[key] = valueParts.join('=');
      return acc;
    }, {});
  }
}
