import DeadLetterJob, { type IDeadLetterJob } from './dead-letter.model';
import { agenda } from './queue.service';
import { logger } from '../logger';
import type { CursorPaginationMeta } from '../types';
import { encodeCursor, decodeCursor } from '../utils/pagination';
import { ApiError } from '../utils/ApiError';

const MAX_RETRIES = parseInt(process.env.DLQ_MAX_RETRIES || '3', 10);

export const moveToDeadLetter = async (
  jobName: string,
  jobId: string,
  data: Record<string, unknown>,
  failReason: string,
  failCount: number,
  lastRunAt?: Date,
): Promise<IDeadLetterJob> => {
  const dlj = await DeadLetterJob.create({
    jobName,
    originalJobId: jobId,
    data,
    failReason,
    failCount,
    failedAt: new Date(),
    lastRunAt,
  });

  logger.error(
    { jobName, jobId, failReason, failCount },
    `Job moved to dead letter queue: ${jobName} (${jobId})`,
  );

  return dlj;
};

export const getMaxRetries = (): number => MAX_RETRIES;

export const getAllDeadLetterJobs = async (
  page: number,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<{
  docs: IDeadLetterJob[];
  pagination: { total: number; page: number; limit: number; pages: number };
}> => {
  const effectiveSort = sort || { failedAt: -1 };
  const total = await DeadLetterJob.countDocuments();
  const pages = Math.ceil(total / limit);
  const docs = await DeadLetterJob.find()
    .sort(effectiveSort)
    .skip((page - 1) * limit)
    .limit(limit);

  return { docs, pagination: { total, page, limit, pages } };
};

export const getAllDeadLetterJobsCursor = async (
  cursor: string | undefined,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<{ docs: IDeadLetterJob[]; pagination: CursorPaginationMeta }> => {
  const effectiveSort = sort || { _id: -1 as const };
  const isAscending = Object.values(effectiveSort)[0] === 1;
  const filter: Record<string, unknown> = {};

  if (cursor) {
    const decodedId = decodeCursor(cursor);
    filter._id = isAscending ? { $gt: decodedId } : { $lt: decodedId };
  }

  const docs = await DeadLetterJob.find(filter)
    .sort(effectiveSort)
    .limit(limit + 1);

  const hasMore = docs.length > limit;
  if (hasMore) docs.pop();

  const nextCursor =
    hasMore && docs.length > 0 ? encodeCursor(String(docs[docs.length - 1]._id)) : null;

  return { docs, pagination: { limit, hasMore, nextCursor } };
};

export const retryDeadLetterJob = async (id: string): Promise<IDeadLetterJob> => {
  const dlj = await DeadLetterJob.findById(id);
  if (!dlj) {
    throw new ApiError(404, 'Dead letter job not found');
  }
  if (dlj.retriedAt) {
    throw new ApiError(409, 'Job has already been retried');
  }

  await agenda.now(dlj.jobName, dlj.data);
  dlj.retriedAt = new Date();
  await dlj.save();

  logger.info(
    { jobName: dlj.jobName, originalJobId: dlj.originalJobId, deadLetterId: id },
    `Dead letter job retried: ${dlj.jobName}`,
  );

  return dlj;
};

export const deleteDeadLetterJob = async (id: string): Promise<void> => {
  const dlj = await DeadLetterJob.findByIdAndDelete(id);
  if (!dlj) {
    throw new ApiError(404, 'Dead letter job not found');
  }
};
