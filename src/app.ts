import './instrumentation'; // Must be first — initializes OpenTelemetry before other imports
import express from 'express';
import setupExpressApp from './services/ExpressApp';
import connectDatabase from './services/Database';
import { seedRoles } from './services/seed';
import {
  startAgenda,
  shutdownQueues,
  scheduleCleanupJobs,
  registerDeadLetterHandler,
} from './common/queues';
import { config } from './config';
import { logger } from './common/logger';

const startServer = async () => {
  const app = express();

  await connectDatabase();
  await seedRoles();
  await startAgenda();
  registerDeadLetterHandler();
  await scheduleCleanupJobs();
  setupExpressApp(app);

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, environment: config.nodeEnv },
      `${config.appName} running on port ${config.port} [${config.nodeEnv}]`,
    );
  });

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    await shutdownQueues();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
};

startServer();
