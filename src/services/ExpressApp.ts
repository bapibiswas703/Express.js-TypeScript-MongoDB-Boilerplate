import path from 'path';
import type { Application } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';
import { config } from '../config';
import modules from '../modules';
import { requestIdMiddleware, httpLogger, errorLogger } from '../common/logger';
import { errorHandler } from '../common/middlewares/error';
import { sanitizeBody } from '../common/middlewares/sanitize';
import {
  ipBlocklistMiddleware,
  startBlocklistCacheRefresh,
} from '../common/middlewares/ip-blocklist';
import { metricsMiddleware } from '../common/middlewares/metrics';

const setupExpressApp = (app: Application) => {
  app.use(helmet());
  app.use(cors());
  app.use(compression());

  // Request ID must come before HTTP logger
  app.use(requestIdMiddleware);
  app.use(httpLogger);

  // Prometheus metrics collection
  if (config.metrics.enabled) {
    app.use(metricsMiddleware);
  }

  // IP blocklist check (before body parsers and rate limiter)
  app.use(ipBlocklistMiddleware);
  startBlocklistCacheRefresh(config.security.ipBlocklistCacheInterval);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // XSS sanitization on all request bodies
  app.use(sanitizeBody);

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Serve local uploads as static files
  if (config.storage.disk === 'local') {
    app.use(
      `/${config.storage.localUploadDir}`,
      express.static(path.resolve(config.storage.localUploadDir)),
    );
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Prometheus metrics endpoint
  if (config.metrics.enabled) {
    app.get('/metrics', async (_req, res) => {
      try {
        const { register } = await import('../common/services/metrics.service');
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch {
        res.status(500).end();
      }
    });
  }

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use('/api', modules);

  // Error logger must come before error handler
  app.use(errorLogger);
  app.use(errorHandler);

  return app;
};

export default setupExpressApp;
