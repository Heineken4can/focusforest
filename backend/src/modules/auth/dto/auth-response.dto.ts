import { ApiProperty } from '@nestjs/swagger';

class SignupUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  createdAt!: string;
}

class LoginUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  timezone!: string;
}

class SignupResponseDataDto {
  @ApiProperty({ type: SignupUserDto })
  user!: SignupUserDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  accessTokenExpiresAt!: string;
}

class LoginResponseDataDto {
  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;

  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  accessTokenExpiresAt!: string;

  @ApiProperty()
  bootstrapRequired!: boolean;
}

class RefreshResponseDataDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  accessTokenExpiresAt!: string;
}

class LogoutResponseDataDto {
  @ApiProperty({ example: true })
  revoked!: boolean;
}

export class SignupSuccessEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty({ example: 'User signed up successfully.' })
  message!: string;

  @ApiProperty({ type: SignupResponseDataDto })
  data!: SignupResponseDataDto;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  meta!: Record<string, unknown>;
}

export class LoginSuccessEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty({ example: 'User logged in successfully.' })
  message!: string;

  @ApiProperty({ type: LoginResponseDataDto })
  data!: LoginResponseDataDto;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  meta!: Record<string, unknown>;
}

export class RefreshSuccessEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty({ example: 'Access token refreshed successfully.' })
  message!: string;

  @ApiProperty({ type: RefreshResponseDataDto })
  data!: RefreshResponseDataDto;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  meta!: Record<string, unknown>;
}

export class LogoutSuccessEnvelopeDto {
  @ApiProperty({ example: 'success' })
  status!: 'success';

  @ApiProperty({ example: 'User logged out successfully.' })
  message!: string;

  @ApiProperty({ type: LogoutResponseDataDto })
  data!: LogoutResponseDataDto;

  @ApiProperty({ type: 'object', additionalProperties: true, example: {} })
  meta!: Record<string, unknown>;
}
