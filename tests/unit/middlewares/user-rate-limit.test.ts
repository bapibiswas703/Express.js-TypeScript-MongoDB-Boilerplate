import type { Request, Response, NextFunction } from 'express';

// Mock express-rate-limit before import
let capturedOptions: Record<string, unknown> = {};
jest.mock('express-rate-limit', () => {
  return jest.fn((options: Record<string, unknown>) => {
    capturedOptions = options;
    return (_req: Request, _res: Response, next: NextFunction) => next();
  });
});

jest.mock('../../../src/config', () => ({
  config: {
    rateLimit: {
      userWindowMs: 900000,
      userMax: 200,
    },
  },
}));

import { userRateLimiter } from '../../../src/common/middlewares/user-rate-limit';

describe('userRateLimiter', () => {
  it('should be a middleware function', () => {
    expect(typeof userRateLimiter).toBe('function');
  });

  it('should configure rate limiter with user config values', () => {
    expect(capturedOptions.windowMs).toBe(900000);
    expect(capturedOptions.max).toBe(200);
    expect(capturedOptions.standardHeaders).toBe(true);
    expect(capturedOptions.legacyHeaders).toBe(false);
  });

  it('should use userId as key', () => {
    const keyGenerator = capturedOptions.keyGenerator as (req: Partial<Request>) => string;
    const req = { userId: 'user-123' } as Partial<Request>;
    expect(keyGenerator(req)).toBe('user-123');
  });

  it('should return undefined when userId is not set', () => {
    const keyGenerator = capturedOptions.keyGenerator as (
      req: Partial<Request>,
    ) => string | undefined;
    const req = {} as Partial<Request>;
    expect(keyGenerator(req)).toBeUndefined();
  });
});
