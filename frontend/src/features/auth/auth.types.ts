export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  timezone?: string;
  createdAt?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SignupRequest = {
  email: string;
  password: string;
  displayName: string;
  timezone?: string;
};

export type SignupResponse = {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: string;
};

export type LoginResponse = {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: string;
  bootstrapRequired: boolean;
};

export type RefreshResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
};

export type LogoutResponse = {
  revoked: true;
};