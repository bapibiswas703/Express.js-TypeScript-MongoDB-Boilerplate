import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';
import { config } from '../../config';
import { userRepository } from '../user';
import { roleRepository } from '../role';
import type {
  RegisterDto,
  LoginDto,
  AuthResponse,
  LoginResponse,
  TokenPair,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SocialLoginDto,
  TwoFactorSetupResponse,
  TwoFactorValidateDto,
  TwoFactorDisableDto,
} from './auth.types';
import { ApiError } from '../../common/utils/ApiError';
import { DEFAULT_ROLES } from '../../common/constants/permissions';
import { queueEmail } from '../../common/queues';
import { initFirebase } from '../../common/services/firebase';
import type { IUser } from '../user';
import RefreshToken from './refresh-token.model';
import Device from '../device/device.model';
import { parseUserAgent } from '../../common/utils/parseUserAgent';
import { lookupIp } from '../../common/utils/geoip';
import { deviceRepository } from '../device';

const MAX_ACTIVE_DEVICES = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface TokenPairWithId extends TokenPair {
  refreshTokenId: string;
}

const signAccessToken = (id: string): string =>
  jwt.sign({ id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);

const generateRefreshToken = (): string => randomBytes(40).toString('hex');

const generateSecureToken = (): { token: string; hash: string } => {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

const parseExpiry = (expiresIn: string): Date => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback 7d
  const value = parseInt(match[1]);
  const unit = match[2];
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit]!;
  return new Date(Date.now() + value * ms);
};

const createTokenPair = async (
  userId: string,
  ip?: string,
  userAgent?: string,
): Promise<TokenPairWithId> => {
  const accessToken = signAccessToken(userId);
  const token = generateRefreshToken();
  const expiresAt = parseExpiry(config.jwt.refreshExpiresIn);

  const refreshDoc = await RefreshToken.create({ token, user: userId, expiresAt, ip, userAgent });

  return { accessToken, refreshToken: token, refreshTokenId: refreshDoc._id.toString() };
};

const createDevice = async (
  userId: string,
  refreshTokenId: string,
  ip?: string,
  userAgent?: string,
): Promise<void> => {
  const info = parseUserAgent(userAgent);

  // Enforce max active devices — evict the oldest if limit reached
  const activeDevices = await deviceRepository.findByUser(userId);
  if (activeDevices.length >= MAX_ACTIVE_DEVICES) {
    const oldest = activeDevices[activeDevices.length - 1]; // sorted by lastActive desc
    await RefreshToken.updateOne(
      { _id: oldest.refreshToken },
      { revoked: true, revokedAt: new Date() },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await deviceRepository.updateById(oldest._id.toString(), { isActive: false } as any);
  }

  const location = lookupIp(ip);

  await Device.create({
    user: userId,
    refreshToken: refreshTokenId,
    deviceName: info.deviceName,
    deviceType: info.deviceType,
    browser: info.browser,
    os: info.os,
    ip: ip || '',
    ...(location && { location }),
    lastActive: new Date(),
  });
};

const notifyNewDevice = async (user: IUser, ip?: string, userAgent?: string): Promise<void> => {
  const info = parseUserAgent(userAgent);
  const location = lookupIp(ip);
  const locationStr = location
    ? [location.city, location.region, location.country].filter(Boolean).join(', ')
    : 'Unknown';

  await queueEmail({
    to: user.email,
    subject: `New device login - ${config.appName}`,
    template: 'new-device',
    data: {
      name: user.name,
      deviceName: info.deviceName,
      browser: info.browser,
      os: info.os,
      ip: ip || 'Unknown',
      location: locationStr,
      time: new Date().toISOString(),
    },
  });
};

const toAuthResponse = (
  tokens: TokenPairWithId,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: { _id: any; email: string; name: string },
  roleName: string | null = null,
): AuthResponse => ({
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  user: { id: user._id.toString(), email: user.email, name: user.name, role: roleName },
});

export const registerUser = async (
  dto: RegisterDto,
  ip?: string,
  userAgent?: string,
): Promise<AuthResponse> => {
  const existing = await userRepository.findByEmail(dto.email);
  if (existing) throw new ApiError(409, 'Email already registered');

  const defaultRole = await roleRepository.findByName(DEFAULT_ROLES.USER);

  // Generate email verification token
  const { token: verifyToken, hash: verifyHash } = generateSecureToken();

  const user = await userRepository.create({
    ...dto,
    ...(defaultRole && { role: defaultRole._id }),
    emailVerificationToken: verifyHash,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const tokens = await createTokenPair(user._id.toString(), ip, userAgent);
  await createDevice(user._id.toString(), tokens.refreshTokenId, ip, userAgent);

  await queueEmail({
    to: user.email,
    subject: `Welcome to ${config.appName}`,
    template: 'welcome',
    data: { name: user.name, email: user.email, loginUrl: '#' },
  });

  // Send verification email
  await queueEmail({
    to: user.email,
    subject: `Verify your email - ${config.appName}`,
    template: 'verify-email',
    data: { name: user.name, verifyToken },
  });

  return toAuthResponse(tokens, user, defaultRole?.name ?? null);
};

const verifyCredentials = async (email: string, password: string): Promise<IUser> => {
  const user = await userRepository.findByEmail(email, true);
  if (!user) throw new ApiError(401, 'Invalid email or password');

  if (user.isLocked()) {
    throw new ApiError(423, 'Account is temporarily locked. Please try again later.');
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    const attempts = (user.failedLoginAttempts || 0) + 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      update.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await userRepository.updateById(user._id.toString(), update);
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.failedLoginAttempts > 0) {
    await userRepository.updateById(user._id.toString(), {
      failedLoginAttempts: 0,
      lockUntil: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  return user;
};

const completeLogin = async (
  user: IUser,
  ip?: string,
  userAgent?: string,
): Promise<AuthResponse> => {
  const populated = await userRepository.findWithRole(user._id.toString());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleName = populated?.role ? (populated.role as any).name : null;

  const tokens = await createTokenPair(user._id.toString(), ip, userAgent);
  await createDevice(user._id.toString(), tokens.refreshTokenId, ip, userAgent);

  notifyNewDevice(user, ip, userAgent).catch(() => {});

  return toAuthResponse(tokens, user, roleName);
};

export const loginUser = async (
  dto: LoginDto,
  ip?: string,
  userAgent?: string,
): Promise<LoginResponse> => {
  const user = await verifyCredentials(dto.email, dto.password);

  // If 2FA is enabled, don't issue tokens yet — require TOTP code
  if (user.twoFactorEnabled) {
    return { requiresTwoFactor: true };
  }

  return completeLogin(user, ip, userAgent);
};

export const refreshTokens = async (
  refreshToken: string,
  ip?: string,
  userAgent?: string,
): Promise<TokenPair> => {
  const existing = await RefreshToken.findOne({ token: refreshToken });

  if (!existing) throw new ApiError(401, 'Invalid refresh token');

  if (existing.revoked) {
    // Possible token reuse attack — revoke all tokens for this user
    await RefreshToken.updateMany(
      { user: existing.user },
      { revoked: true, revokedAt: new Date() },
    );
    await deviceRepository.deactivateByUser(existing.user.toString());
    throw new ApiError(401, 'Refresh token has been revoked');
  }

  if (existing.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token has expired');
  }

  // Rotate: revoke old token and create new pair
  const newToken = generateRefreshToken();
  existing.revoked = true;
  existing.revokedAt = new Date();
  existing.replacedByToken = newToken;
  await existing.save();

  const accessToken = signAccessToken(existing.user.toString());
  const expiresAt = parseExpiry(config.jwt.refreshExpiresIn);

  const newRefreshDoc = await RefreshToken.create({
    token: newToken,
    user: existing.user,
    expiresAt,
    ip,
    userAgent,
  });

  // Update the existing device to point to the new refresh token
  const device = await deviceRepository.findByRefreshToken(existing._id.toString());
  if (device) {
    const info = parseUserAgent(userAgent);
    await deviceRepository.updateById(device._id.toString(), {
      refreshToken: newRefreshDoc._id,
      ip: ip || device.ip,
      lastActive: new Date(),
      browser: info.browser,
      os: info.os,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  return { accessToken, refreshToken: newToken };
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const existing = await RefreshToken.findOne({ token: refreshToken });
  if (!existing) throw new ApiError(400, 'Invalid refresh token');

  if (!existing.revoked) {
    existing.revoked = true;
    existing.revokedAt = new Date();
    await existing.save();
  }

  // Deactivate the associated device
  await deviceRepository.deactivateByRefreshToken(existing._id.toString());
};

export const logoutAllDevices = async (userId: string): Promise<void> => {
  await RefreshToken.updateMany(
    { user: userId, revoked: false },
    { revoked: true, revokedAt: new Date() },
  );
  await deviceRepository.deactivateByUser(userId);
};

export const getMe = async (userId: string): Promise<IUser> => {
  const user = await userRepository.findWithRole(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const changePassword = async (userId: string, dto: ChangePasswordDto): Promise<void> => {
  const user = await userRepository.findById(userId, '+password');
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await user.comparePassword(dto.currentPassword);
  if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

  user.password = dto.newPassword;
  await user.save();
};

export const forgotPassword = async (dto: ForgotPasswordDto): Promise<void> => {
  const user = await userRepository.findByEmail(dto.email);
  // Always return success to prevent email enumeration
  if (!user) return;

  const { token, hash } = generateSecureToken();

  await userRepository.updateById(user._id.toString(), {
    passwordResetToken: hash,
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  await queueEmail({
    to: user.email,
    subject: `Password Reset - ${config.appName}`,
    template: 'reset-password',
    data: { name: user.name, resetToken: token },
  });
};

export const resetPassword = async (dto: ResetPasswordDto): Promise<void> => {
  const hash = createHash('sha256').update(dto.token).digest('hex');

  const user = await userRepository.findOne(
    { passwordResetToken: hash, passwordResetExpires: { $gt: new Date() } },
    '+passwordResetToken +passwordResetExpires',
  );

  if (!user) throw new ApiError(400, 'Invalid or expired reset token');

  user.password = dto.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // Revoke all existing refresh tokens for security
  await RefreshToken.updateMany(
    { user: user._id, revoked: false },
    { revoked: true, revokedAt: new Date() },
  );
  await deviceRepository.deactivateByUser(user._id.toString());
};

export const verifyEmail = async (token: string): Promise<void> => {
  const hash = createHash('sha256').update(token).digest('hex');

  const user = await userRepository.findOne(
    { emailVerificationToken: hash, emailVerificationExpires: { $gt: new Date() } },
    '+emailVerificationToken +emailVerificationExpires',
  );

  if (!user) throw new ApiError(400, 'Invalid or expired verification token');

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
};

export const socialLoginUser = async (
  dto: SocialLoginDto,
  ip?: string,
  userAgent?: string,
): Promise<AuthResponse> => {
  initFirebase();

  // Dynamic import to avoid Jest ESM issues with firebase-admin/auth → jose
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require('firebase-admin/auth');

  // Verify Firebase ID token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decoded: any;
  try {
    decoded = await getAuth().verifyIdToken(dto.idToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired Firebase token');
  }

  const { uid, email, name, picture } = decoded;
  if (!email) throw new ApiError(400, 'Email is required for social login');

  const provider = decoded.firebase?.sign_in_provider || 'firebase';

  // Check if user already exists with this Firebase UID
  let user = await userRepository.findByFirebaseUid(uid);

  if (!user) {
    // Check if a local user exists with the same email
    user = await userRepository.findByEmail(email);

    if (user) {
      // Link the existing account to Firebase
      await userRepository.updateById(user._id.toString(), {
        firebaseUid: uid,
        authProvider: provider,
        ...(picture && !user.avatar && { avatar: picture }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } else {
      // Create a new user (no password needed for social login)
      const defaultRole = await roleRepository.findByName(DEFAULT_ROLES.USER);
      user = await userRepository.create({
        email,
        name: name || email.split('@')[0],
        authProvider: provider,
        firebaseUid: uid,
        isEmailVerified: true, // Email verified by the provider
        ...(picture && { avatar: picture }),
        ...(defaultRole && { role: defaultRole._id }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await queueEmail({
        to: user.email,
        subject: `Welcome to ${config.appName}`,
        template: 'welcome',
        data: { name: user.name, email: user.email, loginUrl: '#' },
      });
    }
  }

  const populated = await userRepository.findWithRole(user._id.toString());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleName = populated?.role ? (populated.role as any).name : null;

  const tokens = await createTokenPair(user._id.toString(), ip, userAgent);
  await createDevice(user._id.toString(), tokens.refreshTokenId, ip, userAgent);

  return toAuthResponse(tokens, user, roleName);
};

// ── Two-Factor Authentication ──────────────────────────────────────────

const BACKUP_CODE_COUNT = 8;

const generateBackupCodes = (): string[] =>
  Array.from({ length: BACKUP_CODE_COUNT }, () => randomBytes(4).toString('hex'));

const hashBackupCodes = (codes: string[]): string[] =>
  codes.map((c) => createHash('sha256').update(c).digest('hex'));

export const setup2FA = async (userId: string): Promise<TwoFactorSetupResponse> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.twoFactorEnabled) throw new ApiError(400, '2FA is already enabled');

  const { TOTP, Secret } = await import('otpauth');
  const secret = new Secret();
  const totp = new TOTP({
    issuer: config.appName,
    label: user.email,
    secret,
  });

  // Store the secret (not yet enabled — user must verify first)
  await userRepository.updateById(userId, {
    twoFactorSecret: secret.base32,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const otpauthUrl = totp.toString();
  const QRCode = await import('qrcode');
  const qrCode = await QRCode.toDataURL(otpauthUrl);

  return { secret: secret.base32, qrCode };
};

export const verify2FA = async (
  userId: string,
  code: string,
): Promise<{ backupCodes: string[] }> => {
  const user = await userRepository.findOne({ _id: userId }, '+twoFactorSecret');
  if (!user) throw new ApiError(404, 'User not found');
  if (user.twoFactorEnabled) throw new ApiError(400, '2FA is already enabled');
  if (!user.twoFactorSecret) throw new ApiError(400, 'Call setup endpoint first');

  const { TOTP, Secret } = await import('otpauth');
  const totp = new TOTP({
    issuer: config.appName,
    label: user.email,
    secret: Secret.fromBase32(user.twoFactorSecret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) throw new ApiError(400, 'Invalid 2FA code');

  const backupCodes = generateBackupCodes();

  await userRepository.updateById(userId, {
    twoFactorEnabled: true,
    twoFactorBackupCodes: hashBackupCodes(backupCodes),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return { backupCodes };
};

export const validate2FALogin = async (
  dto: TwoFactorValidateDto,
  ip?: string,
  userAgent?: string,
): Promise<AuthResponse> => {
  const user = await verifyCredentials(dto.email, dto.password);

  if (!user.twoFactorEnabled) {
    throw new ApiError(400, '2FA is not enabled on this account');
  }

  // Try TOTP code first
  const userWithSecret = await userRepository.findOne(
    { _id: user._id },
    '+twoFactorSecret +twoFactorBackupCodes',
  );
  if (!userWithSecret?.twoFactorSecret) {
    throw new ApiError(500, '2FA secret not found');
  }

  const { TOTP, Secret } = await import('otpauth');
  const totp = new TOTP({
    issuer: config.appName,
    label: user.email,
    secret: Secret.fromBase32(userWithSecret.twoFactorSecret),
  });

  const delta = totp.validate({ token: dto.code, window: 1 });

  if (delta === null) {
    // Try backup code
    const codeHash = createHash('sha256').update(dto.code).digest('hex');
    const backupCodes = userWithSecret.twoFactorBackupCodes || [];
    const idx = backupCodes.indexOf(codeHash);

    if (idx === -1) {
      throw new ApiError(401, 'Invalid 2FA code');
    }

    // Consume the backup code
    backupCodes.splice(idx, 1);
    await userRepository.updateById(user._id.toString(), {
      twoFactorBackupCodes: backupCodes,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  return completeLogin(user, ip, userAgent);
};

export const disable2FA = async (userId: string, dto: TwoFactorDisableDto): Promise<void> => {
  const user = await userRepository.findById(userId, '+password');
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.twoFactorEnabled) throw new ApiError(400, '2FA is not enabled');

  const isMatch = await user.comparePassword(dto.password);
  if (!isMatch) throw new ApiError(400, 'Invalid password');

  // Verify TOTP or backup code
  const userWithSecret = await userRepository.findOne(
    { _id: userId },
    '+twoFactorSecret +twoFactorBackupCodes',
  );
  if (!userWithSecret?.twoFactorSecret) {
    throw new ApiError(500, '2FA secret not found');
  }

  const { TOTP, Secret } = await import('otpauth');
  const totp = new TOTP({
    issuer: config.appName,
    label: user.email,
    secret: Secret.fromBase32(userWithSecret.twoFactorSecret),
  });

  const delta = totp.validate({ token: dto.code, window: 1 });
  if (delta === null) {
    // Try backup code
    const codeHash = createHash('sha256').update(dto.code).digest('hex');
    const backupCodes = userWithSecret.twoFactorBackupCodes || [];
    if (!backupCodes.includes(codeHash)) {
      throw new ApiError(400, 'Invalid 2FA code');
    }
  }

  await userRepository.updateById(userId, {
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

export const resendVerificationEmail = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.isEmailVerified) throw new ApiError(400, 'Email is already verified');

  const { token, hash } = generateSecureToken();

  await userRepository.updateById(user._id.toString(), {
    emailVerificationToken: hash,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  await queueEmail({
    to: user.email,
    subject: `Verify your email - ${config.appName}`,
    template: 'verify-email',
    data: { name: user.name, verifyToken: token },
  });
};
