import type { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { getClientIp, isIpBlocked } from '../utils/ip';
import { logger } from '../logger';

// Static blocklist from env var (parsed once at startup)
const staticBlocklist: string[] = config.security.ipBlocklist
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

// Dynamic blocklist from MongoDB (cached in memory)
let dynamicBlocklist: string[] = [];
let cacheTimer: ReturnType<typeof setInterval> | null = null;

export const refreshBlocklistCache = async (): Promise<void> => {
  try {
    // Dynamic import to avoid circular dependency
    const { default: blockedIpRepository } =
      await import('../../modules/ip-blocklist/ip-blocklist.repository');
    const entries = await blockedIpRepository.getAllActive();
    dynamicBlocklist = entries.map((e) => e.ip);
  } catch {
    // Silently fail — collection may not exist yet during first startup
  }
};

export const startBlocklistCacheRefresh = (intervalMs = 5 * 60 * 1000): void => {
  refreshBlocklistCache();
  cacheTimer = setInterval(refreshBlocklistCache, intervalMs);
};

export const stopBlocklistCacheRefresh = (): void => {
  if (cacheTimer) {
    clearInterval(cacheTimer);
    cacheTimer = null;
  }
};

export const ipBlocklistMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = getClientIp(req);

  if (isIpBlocked(clientIp, staticBlocklist) || isIpBlocked(clientIp, dynamicBlocklist)) {
    logger.warn({ ip: clientIp, url: req.originalUrl }, `Blocked request from IP: ${clientIp}`);
    res.status(403).json({
      success: false,
      statusCode: 403,
      code: 'IP_BLOCKED',
      message: 'Access denied',
      errors: [],
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};
