import type { Request, Response, NextFunction } from 'express';

// Mock config before importing middleware
jest.mock('../../../src/config', () => ({
  config: {
    security: {
      ipBlocklist: '5.6.7.8,10.10.0.0/16',
      ipBlocklistCacheInterval: 300000,
    },
  },
}));

jest.mock('../../../src/common/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

import { ipBlocklistMiddleware } from '../../../src/common/middlewares/ip-blocklist';

const mockReq = (ip: string): Request =>
  ({
    ip,
    socket: { remoteAddress: '' },
    originalUrl: '/api/test',
  }) as unknown as Request;

const mockRes = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe('ipBlocklistMiddleware', () => {
  it('should block an IP in the static blocklist', () => {
    const req = mockReq('5.6.7.8');
    const res = mockRes();
    const next: NextFunction = jest.fn();

    ipBlocklistMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'IP_BLOCKED', success: false }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should block an IP matching a CIDR in the static blocklist', () => {
    const req = mockReq('10.10.5.100');
    const res = mockRes();
    const next: NextFunction = jest.fn();

    ipBlocklistMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow an IP not in the blocklist', () => {
    const req = mockReq('8.8.8.8');
    const res = mockRes();
    const next: NextFunction = jest.fn();

    ipBlocklistMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should strip IPv6-mapped prefix before checking', () => {
    const req = mockReq('::ffff:5.6.7.8');
    const res = mockRes();
    const next: NextFunction = jest.fn();

    ipBlocklistMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
