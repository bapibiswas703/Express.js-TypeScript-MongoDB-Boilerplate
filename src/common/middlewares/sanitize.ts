import type { Request, Response, NextFunction } from 'express';
import xss from 'xss';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeValue = (value: any): any => {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') return sanitizeObject(value);
  return value;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeObject = (obj: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    sanitized[key] = sanitizeValue(obj[key]);
  }
  return sanitized;
};

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};
