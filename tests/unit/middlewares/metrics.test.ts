import type { Request, Response, NextFunction } from 'express';

// Mock metrics service
const mockStartTimer = jest.fn().mockReturnValue(jest.fn());
const mockInc = jest.fn();
const mockDec = jest.fn();

jest.mock('../../../src/common/services/metrics.service', () => ({
  httpRequestDuration: { startTimer: mockStartTimer },
  httpRequestsTotal: { inc: mockInc },
  httpRequestsInFlight: { inc: mockInc, dec: mockDec },
}));

import { metricsMiddleware } from '../../../src/common/middlewares/metrics';

const mockReq = (path: string, method = 'GET'): Request =>
  ({
    path,
    method,
    baseUrl: '',
    route: undefined,
  }) as unknown as Request;

const mockRes = (): Response => {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    statusCode: 200,
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    emit: (event: string) => {
      (listeners[event] || []).forEach((cb) => cb());
    },
  } as unknown as Response;
};

describe('metricsMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should call next for normal requests', () => {
    const next: NextFunction = jest.fn();
    metricsMiddleware(mockReq('/api/users'), mockRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('should skip /metrics path', () => {
    const next: NextFunction = jest.fn();
    metricsMiddleware(mockReq('/metrics'), mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(mockStartTimer).not.toHaveBeenCalled();
  });

  it('should skip /health path', () => {
    const next: NextFunction = jest.fn();
    metricsMiddleware(mockReq('/health'), mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(mockStartTimer).not.toHaveBeenCalled();
  });

  it('should increment in-flight gauge and start timer for tracked requests', () => {
    const next: NextFunction = jest.fn();
    metricsMiddleware(mockReq('/api/products'), mockRes(), next);
    expect(mockInc).toHaveBeenCalled();
    expect(mockStartTimer).toHaveBeenCalled();
  });

  it('should record metrics on response finish', () => {
    const next: NextFunction = jest.fn();
    const res = mockRes();
    metricsMiddleware(mockReq('/api/products', 'POST'), res, next);

    // Simulate response finishing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).emit('finish');

    const endTimer = mockStartTimer.mock.results[0].value;
    expect(endTimer).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', status_code: '200' }),
    );
    expect(mockDec).toHaveBeenCalled();
  });

  it('should normalize ObjectId segments to :id', () => {
    const next: NextFunction = jest.fn();
    const res = mockRes();
    metricsMiddleware(mockReq('/api/users/507f1f77bcf86cd799439011'), res, next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (res as any).emit('finish');

    const endTimer = mockStartTimer.mock.results[0].value;
    expect(endTimer).toHaveBeenCalledWith(expect.objectContaining({ route: '/api/users/:id' }));
  });
});
