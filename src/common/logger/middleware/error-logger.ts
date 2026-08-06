import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { ApiError } from '../../utils/ApiError';

export const errorLogger = (err: Error, req: Request, _res: Response, next: NextFunction): void => {
  const context = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.userId,
    userAgent: req.headers['user-agent'],
  };

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ ...context, err, statusCode: err.statusCode }, `Server error: ${err.message}`);
    } else if (err.statusCode === 401 || err.statusCode === 403) {
      logger.warn({ ...context, statusCode: err.statusCode }, `Auth failure: ${err.message}`);
    } else {
      logger.warn({ ...context, statusCode: err.statusCode }, `Client error: ${err.message}`);
    }
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn({ ...context, err }, `JWT error: ${err.message}`);
  } else if (err.name === 'ValidationError') {
    logger.warn({ ...context, err }, `Validation error: ${err.message}`);
  } else if (err.name === 'MongoServerError' || err.name === 'MongoError') {
    logger.error({ ...context, err }, `Database error: ${err.message}`);
  } else {
    logger.error({ ...context, err }, `Unhandled error: ${err.message}`);
  }

  next(err);
};
