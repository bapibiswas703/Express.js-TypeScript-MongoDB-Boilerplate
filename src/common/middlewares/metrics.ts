import type { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestsInFlight,
} from '../services/metrics.service';

const normalizeRoute = (req: Request): string => {
  // Use the matched route pattern if available, else fall back to path
  if (req.route?.path) {
    return req.baseUrl + req.route.path;
  }
  // Normalize dynamic segments (ObjectIds, UUIDs) to :id
  return req.path.replace(/\/[0-9a-f]{24}\b/gi, '/:id');
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip /metrics and /health to avoid self-instrumentation noise
  if (req.path === '/metrics' || req.path === '/health') {
    next();
    return;
  }

  httpRequestsInFlight.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
    httpRequestsInFlight.dec();
  });

  next();
};
