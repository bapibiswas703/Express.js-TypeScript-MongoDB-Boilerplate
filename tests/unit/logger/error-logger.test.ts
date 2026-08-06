import type { Request, Response, NextFunction } from 'express';

jest.mock('../../../src/common/logger/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    child: jest.fn(() => ({ info: jest.fn() })),
  },
}));

import { errorLogger } from '../../../src/common/logger/middleware/error-logger';
import { logger } from '../../../src/common/logger/logger';
import { ApiError } from '../../../src/common/utils/ApiError';

const createMockReq = (): Request =>
  ({
    id: 'req-123',
    method: 'POST',
    originalUrl: '/api/test',
    ip: '127.0.0.1',
    userId: 'user-456',
    headers: { 'user-agent': 'TestAgent' },
  }) as unknown as Request;

const mockRes = {} as Response;
const mockNext = jest.fn() as NextFunction;

describe('errorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log 500 ApiErrors at error level', () => {
    const err = new ApiError(500, 'Internal server error');
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'req-123', statusCode: 500 }),
      expect.stringContaining('Server error'),
    );
    expect(mockNext).toHaveBeenCalledWith(err);
  });

  it('should log 401 ApiErrors at warn level', () => {
    const err = new ApiError(401, 'Unauthorized');
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401 }),
      expect.stringContaining('Auth failure'),
    );
    expect(mockNext).toHaveBeenCalledWith(err);
  });

  it('should log 403 ApiErrors at warn level', () => {
    const err = new ApiError(403, 'Forbidden');
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
      expect.stringContaining('Auth failure'),
    );
  });

  it('should log 400 ApiErrors at warn level', () => {
    const err = new ApiError(400, 'Bad request');
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
      expect.stringContaining('Client error'),
    );
  });

  it('should log JWT errors at warn level', () => {
    const err = new Error('jwt malformed');
    err.name = 'JsonWebTokenError';
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err }),
      expect.stringContaining('JWT error'),
    );
  });

  it('should log validation errors at warn level', () => {
    const err = new Error('validation failed');
    err.name = 'ValidationError';
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err }),
      expect.stringContaining('Validation error'),
    );
  });

  it('should log MongoDB errors at error level', () => {
    const err = new Error('connection refused');
    err.name = 'MongoServerError';
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err }),
      expect.stringContaining('Database error'),
    );
  });

  it('should log unknown errors at error level', () => {
    const err = new Error('something unexpected');
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err }),
      expect.stringContaining('Unhandled error'),
    );
  });

  it('should always call next with the error', () => {
    const err = new Error('any error');
    errorLogger(err, createMockReq(), mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(err);
  });

  it('should include request context in all log calls', () => {
    const err = new ApiError(404, 'Not found');
    errorLogger(err, createMockReq(), mockRes, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        method: 'POST',
        url: '/api/test',
        ip: '127.0.0.1',
        userId: 'user-456',
        userAgent: 'TestAgent',
      }),
      expect.any(String),
    );
  });
});
