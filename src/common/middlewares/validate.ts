import type { Request, Response, NextFunction } from 'express';
import type Joi from 'joi';
import { ApiError } from '../utils/ApiError';

export const validate =
  (schema: Joi.ObjectSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new ApiError(400, message));
    }
    req.body = value;
    next();
  };
