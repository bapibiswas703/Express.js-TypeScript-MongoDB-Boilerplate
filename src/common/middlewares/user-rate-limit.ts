import rateLimit from 'express-rate-limit';
import { config } from '../../config';

/**
 * Per-user rate limiter for authenticated endpoints.
 * Uses `req.userId` (set by authenticate middleware) as the key.
 * This middleware is always placed after `authenticate`, so `req.userId` is guaranteed.
 */
export const userRateLimiter = rateLimit({
  windowMs: config.rateLimit.userWindowMs,
  max: config.rateLimit.userMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId!;
  },
  message: { success: false, message: 'Too many requests, please try again later' },
});
