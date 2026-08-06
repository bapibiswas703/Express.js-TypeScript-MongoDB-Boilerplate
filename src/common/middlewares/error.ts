import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { sendError } from '../utils/ApiResponse';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ApiError) {
    sendError(res, err.message, err.statusCode, 'API_ERROR');
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => e.message);
    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', errors);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    sendError(res, `Invalid ${err.path}: ${err.value}`, 400, 'CAST_ERROR');
    return;
  }

  if ((err as Error & { code?: number }).code === 11000) {
    sendError(res, 'Duplicate field value', 409, 'DUPLICATE_ERROR');
    return;
  }

  sendError(res);
};
