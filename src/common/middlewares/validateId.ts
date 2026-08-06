import type { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

export const validateId =
  (paramName = 'id') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const id = req.params[paramName] as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(new ApiError(400, `Invalid ${paramName}`));
    }
    next();
  };
