import type { Request, Response, NextFunction } from 'express';
import * as deadLetterService from '../../common/queues/dead-letter.service';
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

export const getDeadLetterJobs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sort = parseSort(req, ['failedAt', 'jobName', 'failCount', 'createdAt']);

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await deadLetterService.getAllDeadLetterJobsCursor(
        cursor,
        limit,
        sort,
      );
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await deadLetterService.getAllDeadLetterJobs(page, limit, sort);
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const retryDeadLetterJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const dlj = await deadLetterService.retryDeadLetterJob(id);
    auditLogger.log(req, {
      action: AuditAction.DLQ_RETRY,
      module: 'dead-letter',
      description: `Dead letter job retried: ${dlj.jobName}`,
      targetId: id,
      targetType: 'DeadLetterJob',
    });
    sendSuccess(res, { deadLetterJob: dlj }, 'Job re-queued for retry');
  } catch (err) {
    next(err);
  }
};

export const deleteDeadLetterJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    await deadLetterService.deleteDeadLetterJob(id);
    auditLogger.log(req, {
      action: AuditAction.DLQ_DELETE,
      module: 'dead-letter',
      description: `Dead letter job deleted: ${id}`,
      targetId: id,
      targetType: 'DeadLetterJob',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
