import type { Response } from 'express';
import type { PaginationMeta, CursorPaginationMeta } from '../types';

export interface ISuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  code: string;
  message: string;
  data: T;
  timestamp: string;
}

export interface IErrorResponse {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  errors: string[];
  timestamp: string;
}

export interface IAckResponse {
  success: true;
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export interface IPaginatedData<T> {
  docs: T[];
  pagination: PaginationMeta;
}

export interface ICursorPaginatedData<T> {
  docs: T[];
  pagination: CursorPaginationMeta;
}

export class ApiResponse {
  static success<T = unknown>(
    data: T = null as T,
    message = 'Success',
    statusCode = 200,
  ): ISuccessResponse<T> {
    return {
      success: true,
      statusCode,
      code: 'SUCCESS',
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    message = 'Internal Server Error',
    statusCode = 500,
    code = 'INTERNAL_SERVER_ERROR',
    errors: string[] = [],
  ): IErrorResponse {
    return {
      success: false,
      statusCode,
      code,
      message,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated<T>(
    docs: T[],
    pagination: PaginationMeta,
    message = 'Success',
  ): ISuccessResponse<IPaginatedData<T>> {
    return this.success({ docs, pagination }, message);
  }

  static created<T = unknown>(data: T, message = 'Created'): ISuccessResponse<T> {
    return this.success(data, message, 201);
  }

  static cursorPaginated<T>(
    docs: T[],
    pagination: CursorPaginationMeta,
    message = 'Success',
  ): ISuccessResponse<ICursorPaginatedData<T>> {
    return this.success({ docs, pagination }, message);
  }

  static ack(message = 'Request Accepted', requestId = '', statusCode = 202): IAckResponse {
    return {
      success: true,
      statusCode,
      code: 'ACKNOWLEDGED',
      message,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }
}

export const sendSuccess = <T>(res: Response, data: T, message = 'Success'): Response =>
  res.json(ApiResponse.success(data, message));

export const sendCreated = <T>(res: Response, data: T, message = 'Created'): Response =>
  res.status(201).json(ApiResponse.created(data, message));

export const sendPaginated = <T>(
  res: Response,
  docs: T[],
  pagination: PaginationMeta,
  message = 'Success',
): Response => res.json(ApiResponse.paginated(docs, pagination, message));

export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};

export const sendCursorPaginated = <T>(
  res: Response,
  docs: T[],
  pagination: CursorPaginationMeta,
  message = 'Success',
): Response => res.json(ApiResponse.cursorPaginated(docs, pagination, message));

export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  code = 'INTERNAL_SERVER_ERROR',
  errors: string[] = [],
): Response => res.status(statusCode).json(ApiResponse.error(message, statusCode, code, errors));
