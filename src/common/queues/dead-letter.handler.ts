import type { Job } from 'agenda';
import { agenda } from './queue.service';
import { moveToDeadLetter, getMaxRetries } from './dead-letter.service';
import { logger } from '../logger';

export const registerDeadLetterHandler = (): void => {
  agenda.on('fail', async (err: Error, job: Job) => {
    const jobName = job.attrs.name;
    const jobId = String(job.attrs._id);
    const failCount = job.attrs.failCount ?? 1;
    const maxRetries = getMaxRetries();

    if (failCount >= maxRetries) {
      try {
        await moveToDeadLetter(
          jobName,
          jobId,
          (job.attrs.data as Record<string, unknown>) || {},
          err.message,
          failCount,
          job.attrs.lastRunAt ?? undefined,
        );

        await job.remove();
      } catch (dlqErr) {
        logger.error(
          { err: dlqErr, jobName, jobId },
          `Failed to move job to dead letter queue: ${jobName}`,
        );
      }
    } else {
      logger.warn(
        { jobName, jobId, failCount, maxRetries, error: err.message },
        `Job failed (${failCount}/${maxRetries}), will retry: ${jobName}`,
      );
    }
  });

  logger.info(`Dead letter handler registered (maxRetries: ${getMaxRetries()})`);
};
