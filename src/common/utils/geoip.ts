import geoip from 'geoip-lite';

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  ll?: [number, number];
  timezone?: string;
}

export const lookupIp = (ip?: string): GeoLocation | undefined => {
  if (!ip) return undefined;

  // Strip IPv6-mapped IPv4 prefix
  const cleanIp = ip.replace(/^::ffff:/, '');

  // Skip private/local IPs
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.')
  ) {
    return undefined;
  }

  const geo = geoip.lookup(cleanIp);
  if (!geo) return undefined;

  return {
    country: geo.country || undefined,
    region: geo.region || undefined,
    city: geo.city || undefined,
    ll: geo.ll && geo.ll[0] !== 0 ? geo.ll : undefined,
    timezone: geo.timezone || undefined,
  };
};
