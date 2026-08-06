export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface SocialLoginDto {
  idToken: string;
}

export interface TwoFactorVerifyDto {
  code: string;
}

export interface TwoFactorValidateDto {
  email: string;
  password: string;
  code: string;
}

export interface TwoFactorDisableDto {
  password: string;
  code: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCode: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string | null;
  };
}

export interface LoginResponse {
  requiresTwoFactor?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string | null;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
