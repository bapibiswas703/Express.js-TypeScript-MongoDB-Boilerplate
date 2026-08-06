import type { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
  TwoFactorVerifyDto,
  TwoFactorValidateDto,
  TwoFactorDisableDto,
} from './auth.types';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/ApiResponse';
import { auditLogger, AuditAction } from '../../common/logger';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto: RegisterDto = req.body;
    const data = await authService.registerUser(dto, req.ip, req.headers['user-agent']);
    auditLogger.log(req, {
      action: AuditAction.REGISTER,
      module: 'auth',
      description: `User registered: ${dto.email}`,
      targetId: data.user.id,
      targetType: 'User',
    });
    sendCreated(res, data, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto: LoginDto = req.body;
    const data = await authService.loginUser(dto, req.ip, req.headers['user-agent']);
    if (data.requiresTwoFactor) {
      sendSuccess(res, { requiresTwoFactor: true }, '2FA code required');
      return;
    }
    auditLogger.log(req, {
      action: AuditAction.LOGIN,
      module: 'auth',
      description: `User logged in: ${dto.email}`,
      targetId: data.user!.id,
      targetType: 'User',
    });
    sendSuccess(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenDto = req.body;
    const tokens = await authService.refreshTokens(refreshToken, req.ip, req.headers['user-agent']);
    sendSuccess(res, tokens, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenDto = req.body;
    await authService.logoutUser(refreshToken);
    auditLogger.log(req, {
      action: AuditAction.LOGOUT,
      module: 'auth',
      description: 'User logged out',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await authService.logoutAllDevices(req.userId!);
    auditLogger.log(req, {
      action: AuditAction.LOGOUT,
      module: 'auth',
      description: 'User logged out from all devices',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getMe(req.userId!);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: ChangePasswordDto = req.body;
    await authService.changePassword(req.userId!, dto);
    auditLogger.log(req, {
      action: AuditAction.PASSWORD_CHANGE,
      module: 'auth',
      description: 'Password changed',
    });
    sendSuccess(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: ForgotPasswordDto = req.body;
    await authService.forgotPassword(dto);
    sendSuccess(res, null, 'If the email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: ResetPasswordDto = req.body;
    await authService.resetPassword(dto);
    auditLogger.log(req, {
      action: AuditAction.PASSWORD_CHANGE,
      module: 'auth',
      description: 'Password reset via token',
    });
    sendSuccess(res, null, 'Password has been reset successfully');
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.query.token as string;
    if (!token) {
      sendSuccess(res, null, 'Verification token is required');
      return;
    }
    await authService.verifyEmail(token);
    sendSuccess(res, null, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

export const resendVerification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await authService.resendVerificationEmail(req.userId!);
    sendSuccess(res, null, 'Verification email sent');
  } catch (err) {
    next(err);
  }
};

export const twoFactorSetup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await authService.setup2FA(req.userId!);
    sendSuccess(res, data, '2FA setup initiated. Scan the QR code and verify.');
  } catch (err) {
    next(err);
  }
};

export const twoFactorVerify = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { code }: TwoFactorVerifyDto = req.body;
    const data = await authService.verify2FA(req.userId!, code);
    auditLogger.log(req, {
      action: AuditAction.PROFILE_UPDATE,
      module: 'auth',
      description: '2FA enabled',
    });
    sendSuccess(res, data, '2FA enabled successfully. Save your backup codes.');
  } catch (err) {
    next(err);
  }
};

export const twoFactorValidate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: TwoFactorValidateDto = req.body;
    const data = await authService.validate2FALogin(dto, req.ip, req.headers['user-agent']);
    auditLogger.log(req, {
      action: AuditAction.LOGIN,
      module: 'auth',
      description: `2FA login: ${dto.email}`,
      targetId: data.user.id,
      targetType: 'User',
    });
    sendSuccess(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};

export const twoFactorDisable = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: TwoFactorDisableDto = req.body;
    await authService.disable2FA(req.userId!, dto);
    auditLogger.log(req, {
      action: AuditAction.PROFILE_UPDATE,
      module: 'auth',
      description: '2FA disabled',
    });
    sendSuccess(res, null, '2FA disabled successfully');
  } catch (err) {
    next(err);
  }
};

export const socialLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: SocialLoginDto = req.body;
    const data = await authService.socialLoginUser(dto, req.ip, req.headers['user-agent']);
    auditLogger.log(req, {
      action: AuditAction.LOGIN,
      module: 'auth',
      description: `Social login: ${data.user.email}`,
      targetId: data.user.id,
      targetType: 'User',
    });
    sendSuccess(res, data, 'Login successful');
  } catch (err) {
    next(err);
  }
};
