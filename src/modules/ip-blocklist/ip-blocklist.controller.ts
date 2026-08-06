import type { Request, Response, NextFunction } from 'express';
import * as ipBlocklistService from './ip-blocklist.service';
import type { BlockIpDto } from './ip-blocklist.types';
import {
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

export const blockIp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto: BlockIpDto = req.body;
    const blocked = await ipBlocklistService.blockIp(dto, req.userId!);
    auditLogger.log(req, {
      action: AuditAction.IP_BLOCK,
      module: 'ip-blocklist',
      description: `IP blocked: ${dto.ip}`,
      targetId: String(blocked._id),
      targetType: 'BlockedIp',
      metadata: { reason: dto.reason },
    });
    sendCreated(res, { blockedIp: blocked }, 'IP blocked');
  } catch (err) {
    next(err);
  }
};

export const getBlockedIps = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sort = parseSort(req, ['ip', 'createdAt']);

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await ipBlocklistService.getAllBlockedIpsCursor(
        cursor,
        limit,
        sort,
      );
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await ipBlocklistService.getAllBlockedIps(page, limit, sort);
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const unblockIp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ip = req.params.ip as string;
    await ipBlocklistService.unblockIp(ip);
    auditLogger.log(req, {
      action: AuditAction.IP_UNBLOCK,
      module: 'ip-blocklist',
      description: `IP unblocked: ${ip}`,
      targetType: 'BlockedIp',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
