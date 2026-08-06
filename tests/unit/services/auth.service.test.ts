import { ApiError } from '../../../src/common/utils/ApiError';

// Mock dependencies before importing the service
const mockUserRepo = {
  findByEmail: jest.fn(),
  findByFirebaseUid: jest.fn(),
  create: jest.fn(),
  findWithRole: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  updateById: jest.fn(),
};
const mockRoleRepo = {
  findByName: jest.fn(),
};
const mockQueueEmail = jest.fn();

const mockRefreshTokenCreate = jest.fn();
const mockRefreshTokenFindOne = jest.fn();
const mockRefreshTokenUpdateMany = jest.fn();
const mockRefreshTokenUpdateOne = jest.fn();

const mockDeviceCreate = jest.fn();
const mockDeviceRepo = {
  findByUser: jest.fn(),
  findByRefreshToken: jest.fn(),
  updateById: jest.fn(),
  deactivateByUser: jest.fn(),
  deactivateByRefreshToken: jest.fn(),
};

jest.mock('../../../src/modules/user/user.repository', () => ({
  __esModule: true,
  default: mockUserRepo,
}));
jest.mock('../../../src/modules/role/role.repository', () => ({
  __esModule: true,
  default: mockRoleRepo,
}));
jest.mock('../../../src/common/queues', () => ({
  queueEmail: mockQueueEmail,
}));
jest.mock('../../../src/modules/auth/refresh-token.model', () => ({
  __esModule: true,
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (...args: any[]) => mockRefreshTokenCreate(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findOne: (...args: any[]) => mockRefreshTokenFindOne(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateMany: (...args: any[]) => mockRefreshTokenUpdateMany(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateOne: (...args: any[]) => mockRefreshTokenUpdateOne(...args),
  },
}));
jest.mock('../../../src/modules/device/device.model', () => ({
  __esModule: true,
  default: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (...args: any[]) => mockDeviceCreate(...args),
  },
}));
jest.mock('../../../src/modules/device/device.repository', () => ({
  __esModule: true,
  default: mockDeviceRepo,
}));
jest.mock('../../../src/common/utils/parseUserAgent', () => ({
  parseUserAgent: () => ({
    deviceName: 'Chrome on Windows',
    deviceType: 'desktop',
    browser: 'Chrome 120',
    os: 'Windows 11',
  }),
}));
jest.mock('../../../src/common/utils/geoip', () => ({
  lookupIp: () => undefined,
}));
jest.mock('../../../src/common/services/firebase', () => ({
  initFirebase: jest.fn(),
}));
const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

const mockTotpValidate = jest.fn();
jest.mock('otpauth', () => ({
  TOTP: jest.fn().mockImplementation(() => ({
    validate: mockTotpValidate,
    toString: () => 'otpauth://totp/test',
  })),
  Secret: jest.fn().mockImplementation(() => ({
    base32: 'MOCKSECRETBASE32',
  })),
}));
// Add fromBase32 as a static method
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('otpauth').Secret.fromBase32 = jest.fn().mockReturnValue({ base32: 'MOCKSECRETBASE32' });

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
}));

import * as authService from '../../../src/modules/auth/auth.service';

describe('AuthService', () => {
  afterEach(() => jest.clearAllMocks());

  beforeEach(() => {
    // Default: RefreshToken.create returns doc with _id
    mockRefreshTokenCreate.mockResolvedValue({ _id: 'rt-id' });
    mockDeviceCreate.mockResolvedValue({});
    mockDeviceRepo.findByUser.mockResolvedValue([]); // no existing devices
  });

  describe('registerUser', () => {
    const dto = { email: 'test@example.com', password: 'password123', name: 'Test' };

    it('should register a new user and return auth response with tokens', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockRoleRepo.findByName.mockResolvedValue({ _id: 'role-id', name: 'user' });
      mockUserRepo.create.mockResolvedValue({
        _id: { toString: () => 'user-id' },
        email: dto.email,
        name: dto.name,
      });
      mockQueueEmail.mockResolvedValue(undefined);

      const result = await authService.registerUser(dto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(dto.email);
      expect(result.user.role).toBe('user');
      expect(mockQueueEmail).toHaveBeenCalledTimes(2); // welcome + verification
      expect(mockRefreshTokenCreate).toHaveBeenCalledTimes(1);
      expect(mockDeviceCreate).toHaveBeenCalledTimes(1);
    });

    it('should throw 409 if email already registered', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ email: dto.email });

      await expect(authService.registerUser(dto)).rejects.toThrow(ApiError);
      await expect(authService.registerUser(dto)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
      });
    });
  });

  describe('loginUser', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('should return auth response with tokens on valid credentials', async () => {
      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: dto.email,
        name: 'Test',
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
      };
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.findWithRole.mockResolvedValue({
        ...mockUser,
        role: { name: 'user' },
      });

      const result = await authService.loginUser(dto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user!.email).toBe(dto.email);
      expect(mockDeviceCreate).toHaveBeenCalledTimes(1);
    });

    it('should return requiresTwoFactor when 2FA is enabled', async () => {
      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: dto.email,
        name: 'Test',
        failedLoginAttempts: 0,
        twoFactorEnabled: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
      };
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.loginUser(dto);

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.accessToken).toBeUndefined();
      expect(mockDeviceCreate).not.toHaveBeenCalled();
    });

    it('should throw 401 if user not found', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(authService.loginUser(dto)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should throw 401 if password is wrong', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        _id: { toString: () => 'user-id' },
        failedLoginAttempts: 0,
        comparePassword: jest.fn().mockResolvedValue(false),
        isLocked: jest.fn().mockReturnValue(false),
      });
      mockUserRepo.updateById.mockResolvedValue({});

      await expect(authService.loginUser(dto)).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(mockUserRepo.updateById).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ failedLoginAttempts: 1 }),
      );
    });

    it('should throw 423 if account is locked', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        _id: { toString: () => 'user-id' },
        isLocked: jest.fn().mockReturnValue(true),
      });

      await expect(authService.loginUser(dto)).rejects.toMatchObject({
        statusCode: 423,
      });
    });
  });

  describe('refreshTokens', () => {
    it('should rotate tokens and update device', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockExisting: Record<string, any> = {
        _id: 'old-rt-id',
        token: 'old-token',
        user: { toString: () => 'user-id' },
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockRefreshTokenFindOne.mockResolvedValue(mockExisting);
      mockDeviceRepo.findByRefreshToken.mockResolvedValue({
        _id: { toString: () => 'device-id' },
        ip: '127.0.0.1',
      });
      mockDeviceRepo.updateById.mockResolvedValue({});

      const result = await authService.refreshTokens('old-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe('old-token');
      expect(mockExisting.revoked).toBe(true);
      expect(mockExisting.revokedAt).toBeDefined();
      expect(mockExisting.replacedByToken).toBeDefined();
      expect(mockExisting.save).toHaveBeenCalled();
      expect(mockRefreshTokenCreate).toHaveBeenCalledTimes(1);
      expect(mockDeviceRepo.findByRefreshToken).toHaveBeenCalledWith('old-rt-id');
      expect(mockDeviceRepo.updateById).toHaveBeenCalled();
    });

    it('should throw 401 for invalid refresh token', async () => {
      mockRefreshTokenFindOne.mockResolvedValue(null);

      await expect(authService.refreshTokens('invalid')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid refresh token',
      });
    });

    it('should revoke all tokens and deactivate devices on reuse of revoked token', async () => {
      mockRefreshTokenFindOne.mockResolvedValue({
        token: 'reused-token',
        user: 'user-id',
        revoked: true,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockRefreshTokenUpdateMany.mockResolvedValue({});
      mockDeviceRepo.deactivateByUser.mockResolvedValue(undefined);

      await expect(authService.refreshTokens('reused-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Refresh token has been revoked',
      });
      expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith(
        { user: 'user-id' },
        expect.objectContaining({ revoked: true }),
      );
      expect(mockDeviceRepo.deactivateByUser).toHaveBeenCalledWith('user-id');
    });

    it('should throw 401 for expired refresh token', async () => {
      mockRefreshTokenFindOne.mockResolvedValue({
        token: 'expired-token',
        user: 'user-id',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(authService.refreshTokens('expired-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Refresh token has expired',
      });
    });
  });

  describe('logoutUser', () => {
    it('should revoke the refresh token and deactivate device', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockExisting: Record<string, any> = {
        _id: 'rt-id',
        token: 'token',
        revoked: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockRefreshTokenFindOne.mockResolvedValue(mockExisting);
      mockDeviceRepo.deactivateByRefreshToken.mockResolvedValue(undefined);

      await authService.logoutUser('token');

      expect(mockExisting.revoked).toBe(true);
      expect(mockExisting.revokedAt).toBeDefined();
      expect(mockExisting.save).toHaveBeenCalled();
      expect(mockDeviceRepo.deactivateByRefreshToken).toHaveBeenCalledWith('rt-id');
    });

    it('should throw 400 for invalid refresh token', async () => {
      mockRefreshTokenFindOne.mockResolvedValue(null);

      await expect(authService.logoutUser('invalid')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid refresh token',
      });
    });

    it('should not re-save already revoked token but still deactivate device', async () => {
      const mockExisting = {
        _id: 'rt-id',
        token: 'token',
        revoked: true,
        save: jest.fn(),
      };
      mockRefreshTokenFindOne.mockResolvedValue(mockExisting);
      mockDeviceRepo.deactivateByRefreshToken.mockResolvedValue(undefined);

      await authService.logoutUser('token');

      expect(mockExisting.save).not.toHaveBeenCalled();
      expect(mockDeviceRepo.deactivateByRefreshToken).toHaveBeenCalledWith('rt-id');
    });
  });

  describe('logoutAllDevices', () => {
    it('should revoke all refresh tokens and deactivate all devices', async () => {
      mockRefreshTokenUpdateMany.mockResolvedValue({ modifiedCount: 3 });
      mockDeviceRepo.deactivateByUser.mockResolvedValue(undefined);

      await authService.logoutAllDevices('user-id');

      expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith(
        { user: 'user-id', revoked: false },
        expect.objectContaining({ revoked: true }),
      );
      expect(mockDeviceRepo.deactivateByUser).toHaveBeenCalledWith('user-id');
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is correct', async () => {
      const mockUser = {
        _id: 'user-id',
        password: 'old-hash',
        comparePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserRepo.findById.mockResolvedValue(mockUser);

      await authService.changePassword('user-id', {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
      });

      expect(mockUser.password).toBe('NewPass123');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw 400 when current password is wrong', async () => {
      mockUserRepo.findById.mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      await expect(
        authService.changePassword('user-id', {
          currentPassword: 'Wrong123',
          newPassword: 'NewPass123',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email if user exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        _id: { toString: () => 'user-id' },
        email: 'test@example.com',
        name: 'Test',
      });
      mockUserRepo.updateById.mockResolvedValue({});
      mockQueueEmail.mockResolvedValue(undefined);

      await authService.forgotPassword({ email: 'test@example.com' });

      expect(mockUserRepo.updateById).toHaveBeenCalled();
      expect(mockQueueEmail).toHaveBeenCalledTimes(1);
    });

    it('should not throw if user does not exist', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.forgotPassword({ email: 'none@example.com' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getMe', () => {
    it('should return user with role populated', async () => {
      const mockUser = { _id: 'user-id', email: 'test@example.com', name: 'Test' };
      mockUserRepo.findWithRole.mockResolvedValue(mockUser);

      const result = await authService.getMe('user-id');
      expect(result).toEqual(mockUser);
    });

    it('should throw 404 if user not found', async () => {
      mockUserRepo.findWithRole.mockResolvedValue(null);

      await expect(authService.getMe('invalid-id')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('socialLoginUser', () => {
    const dto = { idToken: 'firebase-id-token' };
    const firebaseDecoded = {
      uid: 'firebase-uid-123',
      email: 'social@example.com',
      name: 'Social User',
      picture: 'https://example.com/avatar.jpg',
      firebase: { sign_in_provider: 'google.com' },
    };

    it('should create new user on first social login', async () => {
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockRoleRepo.findByName.mockResolvedValue({ _id: 'role-id', name: 'user' });
      mockUserRepo.create.mockResolvedValue({
        _id: { toString: () => 'new-user-id' },
        email: firebaseDecoded.email,
        name: firebaseDecoded.name,
      });
      mockUserRepo.findWithRole.mockResolvedValue({
        _id: { toString: () => 'new-user-id' },
        email: firebaseDecoded.email,
        name: firebaseDecoded.name,
        role: { name: 'user' },
      });
      mockQueueEmail.mockResolvedValue(undefined);

      const result = await authService.socialLoginUser(dto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(firebaseDecoded.email);
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: firebaseDecoded.email,
          authProvider: 'google.com',
          firebaseUid: firebaseDecoded.uid,
          isEmailVerified: true,
        }),
      );
      expect(mockQueueEmail).toHaveBeenCalledTimes(1); // welcome email
    });

    it('should login existing user by Firebase UID', async () => {
      const existingUser = {
        _id: { toString: () => 'existing-id' },
        email: firebaseDecoded.email,
        name: 'Existing User',
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockUserRepo.findByFirebaseUid.mockResolvedValue(existingUser);
      mockUserRepo.findWithRole.mockResolvedValue({
        ...existingUser,
        role: { name: 'user' },
      });

      const result = await authService.socialLoginUser(dto);

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(firebaseDecoded.email);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should link existing local user by email', async () => {
      const localUser = {
        _id: { toString: () => 'local-user-id' },
        email: firebaseDecoded.email,
        name: 'Local User',
        avatar: null,
      };
      mockVerifyIdToken.mockResolvedValue(firebaseDecoded);
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(localUser);
      mockUserRepo.updateById.mockResolvedValue({});
      mockUserRepo.findWithRole.mockResolvedValue({
        ...localUser,
        role: { name: 'user' },
      });

      const result = await authService.socialLoginUser(dto);

      expect(result.accessToken).toBeDefined();
      expect(mockUserRepo.updateById).toHaveBeenCalledWith(
        'local-user-id',
        expect.objectContaining({
          firebaseUid: firebaseDecoded.uid,
          authProvider: 'google.com',
        }),
      );
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should throw 401 for invalid Firebase token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(authService.socialLoginUser(dto)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid or expired Firebase token',
      });
    });

    it('should throw 400 if email is missing from Firebase token', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid', firebase: {} });

      await expect(authService.socialLoginUser(dto)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Email is required for social login',
      });
    });
  });

  describe('setup2FA', () => {
    it('should return secret and QR code', async () => {
      mockUserRepo.findById.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
        twoFactorEnabled: false,
      });
      mockUserRepo.updateById.mockResolvedValue({});

      const result = await authService.setup2FA('user-id');

      expect(result.secret).toBeDefined();
      expect(result.qrCode).toContain('data:image/png');
      expect(mockUserRepo.updateById).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ twoFactorSecret: expect.any(String) }),
      );
    });

    it('should throw 400 if 2FA already enabled', async () => {
      mockUserRepo.findById.mockResolvedValue({
        _id: 'user-id',
        twoFactorEnabled: true,
      });

      await expect(authService.setup2FA('user-id')).rejects.toMatchObject({
        statusCode: 400,
        message: '2FA is already enabled',
      });
    });
  });

  describe('verify2FA', () => {
    it('should enable 2FA and return backup codes', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
        twoFactorEnabled: false,
        twoFactorSecret: 'MOCKSECRET',
      });
      mockTotpValidate.mockReturnValue(0); // valid
      mockUserRepo.updateById.mockResolvedValue({});

      const result = await authService.verify2FA('user-id', '123456');

      expect(result.backupCodes).toHaveLength(8);
      expect(mockUserRepo.updateById).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ twoFactorEnabled: true }),
      );
    });

    it('should throw 400 for invalid code', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
        twoFactorEnabled: false,
        twoFactorSecret: 'MOCKSECRET',
      });
      mockTotpValidate.mockReturnValue(null); // invalid

      await expect(authService.verify2FA('user-id', '000000')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid 2FA code',
      });
    });
  });

  describe('validate2FALogin', () => {
    const dto2fa = { email: 'test@example.com', password: 'password123', code: '123456' };

    it('should complete login with valid TOTP code', async () => {
      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: dto2fa.email,
        name: 'Test',
        failedLoginAttempts: 0,
        twoFactorEnabled: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
      };
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSecret: 'MOCKSECRET',
        twoFactorBackupCodes: [],
      });
      mockUserRepo.findWithRole.mockResolvedValue({
        ...mockUser,
        role: { name: 'user' },
      });
      mockTotpValidate.mockReturnValue(0); // valid

      const result = await authService.validate2FALogin(dto2fa);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(dto2fa.email);
    });

    it('should throw 401 for invalid TOTP and no backup match', async () => {
      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: dto2fa.email,
        failedLoginAttempts: 0,
        twoFactorEnabled: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
      };
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.findOne.mockResolvedValue({
        ...mockUser,
        twoFactorSecret: 'MOCKSECRET',
        twoFactorBackupCodes: [],
      });
      mockTotpValidate.mockReturnValue(null); // invalid

      await expect(authService.validate2FALogin(dto2fa)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid 2FA code',
      });
    });

    it('should throw 400 if 2FA is not enabled', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        _id: { toString: () => 'user-id' },
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        comparePassword: jest.fn().mockResolvedValue(true),
        isLocked: jest.fn().mockReturnValue(false),
      });

      await expect(authService.validate2FALogin(dto2fa)).rejects.toMatchObject({
        statusCode: 400,
        message: '2FA is not enabled on this account',
      });
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA with valid password and code', async () => {
      mockUserRepo.findById.mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
        twoFactorEnabled: true,
        comparePassword: jest.fn().mockResolvedValue(true),
      });
      mockUserRepo.findOne.mockResolvedValue({
        _id: 'user-id',
        twoFactorSecret: 'MOCKSECRET',
        twoFactorBackupCodes: [],
      });
      mockTotpValidate.mockReturnValue(0); // valid
      mockUserRepo.updateById.mockResolvedValue({});

      await authService.disable2FA('user-id', { password: 'Pass123', code: '123456' });

      expect(mockUserRepo.updateById).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          twoFactorEnabled: false,
          twoFactorSecret: null,
        }),
      );
    });

    it('should throw 400 for wrong password', async () => {
      mockUserRepo.findById.mockResolvedValue({
        _id: 'user-id',
        twoFactorEnabled: true,
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      await expect(
        authService.disable2FA('user-id', { password: 'Wrong', code: '123456' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid password',
      });
    });

    it('should throw 400 if 2FA is not enabled', async () => {
      mockUserRepo.findById.mockResolvedValue({
        _id: 'user-id',
        twoFactorEnabled: false,
        comparePassword: jest.fn(),
      });

      await expect(
        authService.disable2FA('user-id', { password: 'Pass123', code: '123456' }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: '2FA is not enabled',
      });
    });
  });
});
