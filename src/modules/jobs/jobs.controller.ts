import type { Request, Response, NextFunction } from 'express';
import * as jobsService from './jobs.service';
import { sendSuccess, sendPaginated, sendNoContent } from '../../common/utils/ApiResponse';
import { parsePagination, parseSort } from '../../common/utils/pagination';
import { ApiError } from '../../common/utils/ApiError';
import { auditLogger, AuditAction } from '../../common/logger';

export const getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit } = parsePagination(req);
    const sort = parseSort(req, ['nextRunAt', 'lastRunAt', 'name', 'priority']);
    const query = {
      name: req.query.name as string | undefined,
      state: req.query.state as string | undefined,
    };

    const { docs, pagination } = await jobsService.getJobs(page, limit, query, sort);
    sendPaginated(res, docs, pagination);
  } catch (err) {
    next(err);
  }
};

export const getJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const job = await jobsService.getJobById(id);
    if (!job) throw new ApiError(404, 'Job not found');
    sendSuccess(res, { job });
  } catch (err) {
    next(err);
  }
};

export const cancelJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const removed = await jobsService.cancelJob(id);
    if (removed === 0) throw new ApiError(404, 'Job not found');
    auditLogger.log(req, {
      action: AuditAction.JOB_CANCEL,
      module: 'jobs',
      description: `Job cancelled: ${id}`,
      targetId: id,
      targetType: 'Job',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const requeueJob = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const result = await jobsService.requeueJob(id);
    if (!result) throw new ApiError(404, 'Job not found');
    auditLogger.log(req, {
      action: AuditAction.JOB_REQUEUE,
      module: 'jobs',
      description: `Job requeued: ${result.name} (${id})`,
      targetId: id,
      targetType: 'Job',
    });
    sendSuccess(res, result, 'Job requeued');
  } catch (err) {
    next(err);
  }
};

export const getJobStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await jobsService.getJobStats();
    sendSuccess(res, { stats });
  } catch (err) {
    next(err);
  }
};
