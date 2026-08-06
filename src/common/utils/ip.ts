import type { Request } from 'express';

export const getClientIp = (req: Request): string => {
  const raw = req.ip || req.socket.remoteAddress || '';
  // Strip IPv6-mapped IPv4 prefix
  return raw.replace(/^::ffff:/, '');
};

const ipToLong = (ip: string): number => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

export const isIpInCidr = (ip: string, cidr: string): boolean => {
  const [network, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(network) & mask);
};

export const isIpBlocked = (ip: string, blocklist: string[]): boolean => {
  for (const entry of blocklist) {
    if (entry.includes('/')) {
      if (isIpInCidr(ip, entry)) return true;
    } else if (ip === entry) {
      return true;
    }
  }
  return false;
};
