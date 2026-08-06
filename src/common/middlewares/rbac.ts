import type { Request, Response, NextFunction } from 'express';
import User from '../../modules/user/user.model';
import type { IRole } from '../../modules/role/role.model';
import { ApiError } from '../utils/ApiError';
import type { Permission } from '../constants/permissions';

export const authorize = (...requiredPermissions: Permission[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new ApiError(401, 'Authentication required');

      const user = await User.findById(req.userId).populate<{ role: IRole }>('role');
      if (!user) throw new ApiError(401, 'User not found');
      if (!user.role) throw new ApiError(403, 'No role assigned');

      const role = user.role as IRole;
      if (!role.isActive) throw new ApiError(403, 'Role is inactive');

      const hasAll = requiredPermissions.every((p) => role.permissions.includes(p));
      if (!hasAll) throw new ApiError(403, 'Insufficient permissions');

      req.userRole = role.name;
      req.userPermissions = role.permissions;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export const authorizeRoles = (...allowedRoles: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) throw new ApiError(401, 'Authentication required');

      const user = await User.findById(req.userId).populate<{ role: IRole }>('role');
      if (!user) throw new ApiError(401, 'User not found');
      if (!user.role) throw new ApiError(403, 'No role assigned');

      const role = user.role as IRole;
      if (!role.isActive) throw new ApiError(403, 'Role is inactive');
      if (!allowedRoles.includes(role.name)) throw new ApiError(403, 'Insufficient role');

      req.userRole = role.name;
      req.userPermissions = role.permissions;
      next();
    } catch (err) {
      next(err);
    }
  };
};
