import type { Request } from 'express';
import type { PaginationQuery, CursorPaginationQuery } from '../types';

export const parsePagination = (req: Request, maxLimit = 100): PaginationQuery => {
  const parsedPage = parseInt(req.query.page as string);
  const parsedLimit = parseInt(req.query.limit as string);
  return {
    page: Math.max(Number.isNaN(parsedPage) ? 1 : parsedPage, 1),
    limit: Math.min(Math.max(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 1), maxLimit),
  };
};

export const parseCursorPagination = (req: Request, maxLimit = 100): CursorPaginationQuery => {
  const cursor = req.query.cursor as string | undefined;
  const parsedLimit = parseInt(req.query.limit as string);
  return {
    cursor: cursor || undefined,
    limit: Math.min(Math.max(Number.isNaN(parsedLimit) ? 10 : parsedLimit, 1), maxLimit),
  };
};

export const isCursorPagination = (req: Request): boolean => {
  return req.query.cursor !== undefined;
};

export const encodeCursor = (id: string): string => {
  return Buffer.from(id).toString('base64');
};

export const decodeCursor = (cursor: string): string => {
  return Buffer.from(cursor, 'base64').toString('utf8');
};

export const parseSort = (
  req: Request,
  allowedFields: string[],
): Record<string, 1 | -1> | undefined => {
  const sortBy = req.query.sortBy as string;
  if (!sortBy || !allowedFields.includes(sortBy)) return undefined;
  const order = req.query.order === 'asc' ? 1 : -1;
  return { [sortBy]: order };
};
