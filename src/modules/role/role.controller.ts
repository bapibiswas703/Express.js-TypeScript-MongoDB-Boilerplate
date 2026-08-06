import type { Request, Response, NextFunction } from 'express';
import * as roleService from './role.service';
import type { CreateRoleDto, UpdateRoleDto } from './role.types';
import {
  sendSuccess,
  sendCreated,
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

export const createRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: CreateRoleDto = req.body;
    const role = await roleService.createRole(dto);
    auditLogger.log(req, {
      action: AuditAction.ROLE_CREATE,
      module: 'role',
      description: `Role created: ${dto.name}`,
      targetId: String(role._id),
      targetType: 'Role',
    });
    sendCreated(res, { role }, 'Role created');
  } catch (err) {
    next(err);
  }
};

export const getRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sort = parseSort(req, ['name', 'createdAt']);

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await roleService.getAllRolesCursor(cursor, limit, sort);
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await roleService.getAllRoles(page, limit, sort);
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const getRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const role = await roleService.getRoleById(req.params.id as string);
    sendSuccess(res, { role });
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: UpdateRoleDto = req.body;
    const role = await roleService.updateRoleById(req.params.id as string, dto);
    auditLogger.log(req, {
      action: AuditAction.ROLE_UPDATE,
      module: 'role',
      description: `Role updated: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Role',
      metadata: { permissions: dto.permissions },
    });
    sendSuccess(res, { role }, 'Role updated');
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await roleService.deleteRoleById(req.params.id as string);
    auditLogger.log(req, {
      action: AuditAction.ROLE_DELETE,
      module: 'role',
      description: `Role deleted: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Role',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const getPermissions = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const permissions = roleService.getAllPermissions();
    sendSuccess(res, { permissions });
  } catch (err) {
    next(err);
  }
};
