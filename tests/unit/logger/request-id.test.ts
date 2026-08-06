import type { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from '../../../src/common/logger/middleware/request-id';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createMocks = (requestId?: string) => {
  const req = {
    headers: requestId ? { 'x-request-id': requestId } : {},
  } as unknown as Request;

  const res = {
    setHeader: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
};

describe('requestIdMiddleware', () => {
  it('should generate a UUID when no x-request-id header is present', () => {
    const { req, res, next } = createMocks();
    requestIdMiddleware(req, res, next);

    expect(req.id).toBeDefined();
    expect(req.id).toMatch(UUID_REGEX);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('should use the existing x-request-id header if provided', () => {
    const existingId = 'custom-request-id-123';
    const { req, res, next } = createMocks(existingId);
    requestIdMiddleware(req, res, next);

    expect(req.id).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
    expect(next).toHaveBeenCalled();
  });

  it('should set the response header', () => {
    const { req, res, next } = createMocks();
    requestIdMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
  });

  it('should call next()', () => {
    const { req, res, next } = createMocks();
    requestIdMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
