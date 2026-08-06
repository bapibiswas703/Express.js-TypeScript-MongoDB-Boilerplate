import { getClientIp, isIpInCidr, isIpBlocked } from '../../../src/common/utils/ip';
import type { Request } from 'express';

describe('getClientIp', () => {
  const mockReq = (ip?: string, remoteAddress?: string): Request =>
    ({
      ip,
      socket: { remoteAddress: remoteAddress || '' },
    }) as unknown as Request;

  it('should return req.ip when available', () => {
    expect(getClientIp(mockReq('1.2.3.4'))).toBe('1.2.3.4');
  });

  it('should strip IPv6-mapped prefix', () => {
    expect(getClientIp(mockReq('::ffff:192.168.1.1'))).toBe('192.168.1.1');
  });

  it('should fall back to socket.remoteAddress', () => {
    expect(getClientIp(mockReq(undefined, '10.0.0.1'))).toBe('10.0.0.1');
  });

  it('should return empty string when nothing available', () => {
    expect(getClientIp(mockReq())).toBe('');
  });
});

describe('isIpInCidr', () => {
  it('should match IP within /24 range', () => {
    expect(isIpInCidr('192.168.1.50', '192.168.1.0/24')).toBe(true);
  });

  it('should not match IP outside /24 range', () => {
    expect(isIpInCidr('192.168.2.1', '192.168.1.0/24')).toBe(false);
  });

  it('should match IP within /16 range', () => {
    expect(isIpInCidr('10.0.5.100', '10.0.0.0/16')).toBe(true);
  });

  it('should not match IP outside /16 range', () => {
    expect(isIpInCidr('10.1.0.1', '10.0.0.0/16')).toBe(false);
  });

  it('should match /32 as exact IP', () => {
    expect(isIpInCidr('1.2.3.4', '1.2.3.4/32')).toBe(true);
    expect(isIpInCidr('1.2.3.5', '1.2.3.4/32')).toBe(false);
  });

  it('should match /0 as all IPs', () => {
    expect(isIpInCidr('99.99.99.99', '0.0.0.0/0')).toBe(true);
  });

  it('should return false for invalid CIDR bits', () => {
    expect(isIpInCidr('1.2.3.4', '1.2.3.0/abc')).toBe(false);
    expect(isIpInCidr('1.2.3.4', '1.2.3.0/33')).toBe(false);
  });
});

describe('isIpBlocked', () => {
  const blocklist = ['1.2.3.4', '10.0.0.0/24', '192.168.5.5'];

  it('should match exact IP', () => {
    expect(isIpBlocked('1.2.3.4', blocklist)).toBe(true);
  });

  it('should match IP within CIDR range', () => {
    expect(isIpBlocked('10.0.0.50', blocklist)).toBe(true);
  });

  it('should not match IP not in blocklist', () => {
    expect(isIpBlocked('8.8.8.8', blocklist)).toBe(false);
  });

  it('should return false for empty blocklist', () => {
    expect(isIpBlocked('1.2.3.4', [])).toBe(false);
  });
});
