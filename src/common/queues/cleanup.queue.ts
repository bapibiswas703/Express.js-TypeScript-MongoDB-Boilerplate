import type { Job } from 'agenda';
import { agenda } from './queue.service';
import { logger } from '../logger';

const CLEANUP_JOB = 'cleanup-expired-tokens';

agenda.define(CLEANUP_JOB, async (_job: Job) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RefreshToken = require('../../modules/auth/refresh-token.model').default;

  const cutoff = new Date();
  const result = await RefreshToken.deleteMany({
    $or: [
      { expiresAt: { $lt: cutoff }, revoked: true },
      { expiresAt: { $lt: new Date(cutoff.getTime() - 7 * 24 * 60 * 60 * 1000) } },
    ],
  });

  logger.info(
    { deletedCount: result.deletedCount },
    `Cleanup: removed ${result.deletedCount} expired/revoked refresh tokens`,
  );
});

export const scheduleCleanupJobs = async (): Promise<void> => {
  await agenda.every('0 3 * * *', CLEANUP_JOB); // Daily at 3 AM
  logger.info('Scheduled daily token cleanup job');
};
