import userRepository from './user.repository';
import type { UpdateUserDto } from './user.types';
import { ApiError } from '../../common/utils/ApiError';
import type { IUser } from './user.model';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';
import RefreshToken from '../auth/refresh-token.model';
import { deviceRepository } from '../device';
import * as mediaService from '../media/media.service';

interface PaginatedUsers {
  docs: IUser[];
  pagination: PaginationMeta;
}

interface CursorPaginatedUsers {
  docs: IUser[];
  pagination: CursorPaginationMeta;
}

export const getAllUsers = async (
  page: number,
  limit: number,
  search?: string,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedUsers> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const { docs, ...pagination } = await userRepository.search(filter, page, limit, sort);
  return { docs, pagination };
};

export const getAllUsersCursor = async (
  cursor: string | undefined,
  limit: number,
  search?: string,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedUsers> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  return userRepository.cursorPaginate(filter, cursor, limit, sort);
};

export const getUserById = async (id: string): Promise<IUser> => {
  const user = await userRepository.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const updateUserById = async (id: string, dto: UpdateUserDto): Promise<IUser> => {
  const user = await userRepository.updateById(id, dto);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const updateAvatar = async (userId: string, file: Express.Multer.File): Promise<IUser> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Upload via media service to track the file
  const media = await mediaService.uploadFile(file, userId, 'avatars');

  // Update user avatar field with the URL
  const updated = await userRepository.updateById(userId, { avatar: media.url });
  if (!updated) throw new ApiError(404, 'User not found');
  return updated;
};

export const deleteUserById = async (id: string): Promise<void> => {
  const user = await userRepository.softDelete(id);
  if (!user) throw new ApiError(404, 'User not found');

  // Cascade: revoke all refresh tokens and deactivate all devices
  await RefreshToken.updateMany(
    { user: id, revoked: false },
    { revoked: true, revokedAt: new Date() },
  );
  await deviceRepository.deactivateByUser(id);
};
