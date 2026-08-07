import type { Logger, LoggerOptions } from 'pino';
import pino from 'pino';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import os from 'os';
import { config } from '../../config';
import { trace, isSpanContextValid } from '@opentelemetry/api';

const logDir = config.log.dir;
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.body.password',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'req.body.otp',
  'req.body.creditCard',
  'req.body.cardNumber',
  'req.body.cvv',
  'req.body.ssn',
  'req.body.apiKey',
  'req.body.secret',
  'req.body.privateKey',
  'res.headers["set-cookie"]',
];

const traceContextMixin = () => {
  const span = trace.getActiveSpan();
  if (!span) return {};
  const ctx = span.spanContext();
  if (!isSpanContextValid(ctx)) return {};
  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    traceFlags: ctx.traceFlags,
  };
};

const baseOptions: LoggerOptions = {
  level: config.log.level,
  mixin: traceContextMixin,
  redact: {
    paths: REDACT_PATHS,
    censor: '********',
  },
  base: {
    service: config.log.serviceName,
    environment: config.nodeEnv,
    hostname: os.hostname(),
    pid: process.pid,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
};

const isDev = config.nodeEnv === 'development';

const buildTransportTargets = (): pino.TransportMultiOptions => {
  const targets: pino.TransportTargetOptions[] = [];

  if (isDev) {
    targets.push({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
      },
      level: config.log.level,
    });
  } else {
    // Production: JSON to stdout
    targets.push({
      target: 'pino/file',
      options: { destination: 1 }, // stdout
      level: config.log.level,
    });
  }

  // File transports (both environments)
  targets.push(
    {
      target: 'pino-roll',
      options: {
        file: join(logDir, 'app.log'),
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        limit: { count: config.log.retentionDays },
        mkdir: true,
      },
      level: config.log.level,
    },
    {
      target: 'pino-roll',
      options: {
        file: join(logDir, 'error.log'),
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        limit: { count: config.log.retentionDays },
        mkdir: true,
      },
      level: 'error',
    },
    {
      target: 'pino-roll',
      options: {
        file: join(logDir, 'combined.log'),
        frequency: 'daily',
        dateFormat: 'yyyy-MM-dd',
        limit: { count: config.log.retentionDays },
        mkdir: true,
      },
      level: 'trace',
    },
  );

  return { targets };
};

const logger: Logger = pino(baseOptions, pino.transport(buildTransportTargets()));

export { logger };
