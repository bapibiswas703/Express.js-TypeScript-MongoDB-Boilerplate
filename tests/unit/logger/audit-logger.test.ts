import type { Request } from 'express';

const mockInfo = jest.fn();

jest.mock('../../../src/common/logger/logger', () => ({
  logger: {
    child: jest.fn(() => ({ info: mockInfo })),
    info: jest.fn(),
  },
}));

import { auditLogger, AuditAction } from '../../../src/common/logger/middleware/audit-logger';

const mockReq = {
  userId: 'user-123',
  id: 'req-456',
  ip: '192.168.1.100',
  method: 'POST',
  originalUrl: '/api/auth/login',
  headers: { 'user-agent': 'TestAgent/1.0' },
} as unknown as Request;

describe('auditLogger', () => {
  beforeEach(() => {
    mockInfo.mockClear();
  });

  it('should log audit events with request context', () => {
    auditLogger.log(mockReq, {
      action: AuditAction.LOGIN,
      module: 'auth',
      description: 'User logged in: admin@test.com',
      targetId: 'user-123',
      targetType: 'User',
    });

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          action: 'LOGIN',
          module: 'auth',
          description: 'User logged in: admin@test.com',
          targetId: 'user-123',
          targetType: 'User',
        }),
        userId: 'user-123',
        requestId: 'req-456',
        ip: '192.168.1.100',
      }),
      expect.stringContaining('AUDIT: LOGIN'),
    );
  });

  it('should log system audit events without request', () => {
    auditLogger.logSystem({
      action: AuditAction.SETTINGS_CHANGE,
      module: 'system',
      description: 'Default roles seeded',
    });

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          action: 'SETTINGS_CHANGE',
          module: 'system',
        }),
      }),
      expect.stringContaining('AUDIT: SETTINGS_CHANGE'),
    );
  });

  it('should include metadata when provided', () => {
    auditLogger.log(mockReq, {
      action: AuditAction.ROLE_UPDATE,
      module: 'role',
      description: 'Role updated',
      targetId: 'role-789',
      targetType: 'Role',
      metadata: { permissions: ['user:read', 'user:write'] },
    });

    expect(mockInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        audit: expect.objectContaining({
          metadata: { permissions: ['user:read', 'user:write'] },
        }),
      }),
      expect.any(String),
    );
  });

  it('should have all expected audit actions', () => {
    expect(AuditAction.LOGIN).toBe('LOGIN');
    expect(AuditAction.LOGOUT).toBe('LOGOUT');
    expect(AuditAction.REGISTER).toBe('REGISTER');
    expect(AuditAction.USER_CREATE).toBe('USER_CREATE');
    expect(AuditAction.USER_DELETE).toBe('USER_DELETE');
    expect(AuditAction.ROLE_UPDATE).toBe('ROLE_UPDATE');
    expect(AuditAction.PASSWORD_CHANGE).toBe('PASSWORD_CHANGE');
    expect(AuditAction.EXPORT_REPORT).toBe('EXPORT_REPORT');
  });
});
