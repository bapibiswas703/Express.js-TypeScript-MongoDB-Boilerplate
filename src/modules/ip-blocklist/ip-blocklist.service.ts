import blockedIpRepository from './ip-blocklist.repository';
import type { BlockIpDto } from './ip-blocklist.types';
import type { IBlockedIp } from './ip-blocklist.model';
import { ApiError } from '../../common/utils/ApiError';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';
import { refreshBlocklistCache } from '../../common/middlewares/ip-blocklist';

interface PaginatedBlockedIps {
  docs: IBlockedIp[];
  pagination: PaginationMeta;
}

interface CursorPaginatedBlockedIps {
  docs: IBlockedIp[];
  pagination: CursorPaginationMeta;
}

export const blockIp = async (dto: BlockIpDto, userId: string): Promise<IBlockedIp> => {
  const existing = await blockedIpRepository.findByIp(dto.ip);
  if (existing) throw new ApiError(409, 'IP is already blocked');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    ip: dto.ip,
    reason: dto.reason,
    blockedBy: userId,
    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
  };

  const blocked = await blockedIpRepository.create(data);
  await refreshBlocklistCache();
  return blocked;
};

export const getAllBlockedIps = async (
  page: number,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedBlockedIps> => {
  const { docs, ...pagination } = await blockedIpRepository.paginate({}, page, limit, sort);
  return { docs, pagination };
};

export const getAllBlockedIpsCursor = async (
  cursor: string | undefined,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedBlockedIps> => {
  return blockedIpRepository.cursorPaginate({}, cursor, limit, sort);
};

export const unblockIp = async (ip: string): Promise<void> => {
  const deleted = await blockedIpRepository.deleteByIp(ip);
  if (!deleted) throw new ApiError(404, 'Blocked IP not found');
  await refreshBlocklistCache();
};
