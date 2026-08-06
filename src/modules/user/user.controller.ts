import type { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import type { UpdateUserDto } from './user.types';
import {
  sendSuccess,
  sendPaginated,
  sendCursorPaginated,
  sendNoContent,
} from '../../common/utils/ApiResponse';
import {
  parsePagination,
  parseCursorPagination,
  isCursorPagination,
  parseSort,
} from '../../common/utils/pagination';
import { auditLogger, AuditAction } from '../../common/logger';
import { ApiError } from '../../common/utils/ApiError';

export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sort = parseSort(req, ['name', 'email', 'createdAt']);
    const search = req.query.search as string | undefined;

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await userService.getAllUsersCursor(cursor, limit, search, sort);
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await userService.getAllUsers(page, limit, search, sort);
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.id as string);
    sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: UpdateUserDto = req.body;
    const user = await userService.updateUserById(req.params.id as string, dto);
    auditLogger.log(req, {
      action: AuditAction.USER_UPDATE,
      module: 'user',
      description: `User updated: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'User',
    });
    sendSuccess(res, { user }, 'User updated');
  } catch (err) {
    next(err);
  }
};

export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');
    const user = await userService.updateAvatar(req.params.id as string, req.file);
    auditLogger.log(req, {
      action: AuditAction.PROFILE_UPDATE,
      module: 'user',
      description: `Avatar updated for user: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'User',
    });
    sendSuccess(res, { user }, 'Avatar updated');
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await userService.deleteUserById(req.params.id as string);
    auditLogger.log(req, {
      action: AuditAction.USER_DELETE,
      module: 'user',
      description: `User deleted: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'User',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
