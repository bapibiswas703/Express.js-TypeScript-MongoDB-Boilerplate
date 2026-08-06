import client from 'prom-client';
import { config } from '../../config';

// Collect default Node.js metrics (CPU, memory, event loop, GC, etc.)
client.collectDefaultMetrics({
  prefix: config.metrics.prefix,
  labels: { service: config.log.serviceName },
});

// --- Custom HTTP metrics ---

export const httpRequestDuration = new client.Histogram({
  name: `${config.metrics.prefix}http_request_duration_seconds`,
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsTotal = new client.Counter({
  name: `${config.metrics.prefix}http_requests_total`,
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

export const httpRequestsInFlight = new client.Gauge({
  name: `${config.metrics.prefix}http_requests_in_flight`,
  help: 'Number of HTTP requests currently being processed',
});

// --- Custom business metrics ---

export const activeUsersGauge = new client.Gauge({
  name: `${config.metrics.prefix}active_users`,
  help: 'Number of currently active users (logged in within last 24h)',
});

export const authAttemptsTotal = new client.Counter({
  name: `${config.metrics.prefix}auth_attempts_total`,
  help: 'Total authentication attempts',
  labelNames: ['type', 'status'] as const,
});

export const register = client.register;
