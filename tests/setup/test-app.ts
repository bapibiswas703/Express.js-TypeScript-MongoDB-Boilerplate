import express from 'express';
import setupExpressApp from '../../src/services/ExpressApp';

export const createTestApp = (): express.Application => {
  const app = express();
  setupExpressApp(app);
  return app;
};
