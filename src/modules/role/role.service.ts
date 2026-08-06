import roleRepository from './role.repository';
import type { CreateRoleDto, UpdateRoleDto } from './role.types';
import { ApiError } from '../../common/utils/ApiError';
import type { IRole } from './role.model';
import type { Permission } from '../../common/constants/permissions';
import { ALL_PERMISSIONS } from '../../common/constants/permissions';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';

interface PaginatedRoles {
  docs: IRole[];
  pagination: PaginationMeta;
}

interface CursorPaginatedRoles {
  docs: IRole[];
  pagination: CursorPaginationMeta;
}

export const createRole = async (dto: CreateRoleDto): Promise<IRole> => {
  const existing = await roleRepository.findByName(dto.name);
  if (existing) throw new ApiError(409, 'Role already exists');
  return roleRepository.create(dto);
};

export const getAllRoles = async (
  page: number,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedRoles> => {
  const { docs, ...pagination } = await roleRepository.paginate({}, page, limit, sort);
  return { docs, pagination };
};

export const getAllRolesCursor = async (
  cursor: string | undefined,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedRoles> => {
  return roleRepository.cursorPaginate({}, cursor, limit, sort);
};

export const getRoleById = async (id: string): Promise<IRole> => {
  const role = await roleRepository.findById(id);
  if (!role) throw new ApiError(404, 'Role not found');
  return role;
};

export const updateRoleById = async (id: string, dto: UpdateRoleDto): Promise<IRole> => {
  const role = await roleRepository.updateById(id, dto);
  if (!role) throw new ApiError(404, 'Role not found');
  return role;
};

export const deleteRoleById = async (id: string): Promise<void> => {
  const role = await roleRepository.deleteById(id);
  if (!role) throw new ApiError(404, 'Role not found');
};

export const getAllPermissions = (): Permission[] => {
  return ALL_PERMISSIONS;
};
