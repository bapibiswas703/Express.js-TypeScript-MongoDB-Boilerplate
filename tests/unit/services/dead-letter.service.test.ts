jest.mock('../../../src/common/queues/queue.service', () => ({
  agenda: { now: jest.fn() },
}));

jest.mock('../../../src/common/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import DeadLetterJob from '../../../src/common/queues/dead-letter.model';
import { agenda } from '../../../src/common/queues/queue.service';
import {
  moveToDeadLetter,
  getMaxRetries,
  getAllDeadLetterJobs,
  retryDeadLetterJob,
  deleteDeadLetterJob,
} from '../../../src/common/queues/dead-letter.service';

// Mock DeadLetterJob model
jest.mock('../../../src/common/queues/dead-letter.model');

const MockDeadLetterJob = DeadLetterJob as jest.Mocked<typeof DeadLetterJob>;

describe('DeadLetterService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('moveToDeadLetter', () => {
    it('should create a dead letter job record', async () => {
      const mockDoc = {
        _id: 'dlj1',
        jobName: 'send-email',
        originalJobId: 'job1',
        data: { to: 'test@example.com' },
        failReason: 'SMTP error',
        failCount: 3,
        failedAt: new Date(),
      };
      (MockDeadLetterJob.create as jest.Mock).mockResolvedValue(mockDoc);

      const result = await moveToDeadLetter(
        'send-email',
        'job1',
        { to: 'test@example.com' },
        'SMTP error',
        3,
      );

      expect(MockDeadLetterJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'send-email',
          originalJobId: 'job1',
          failReason: 'SMTP error',
          failCount: 3,
        }),
      );
      expect(result).toEqual(mockDoc);
    });
  });

  describe('getMaxRetries', () => {
    it('should return default max retries', () => {
      expect(getMaxRetries()).toBe(3);
    });
  });

  describe('getAllDeadLetterJobs', () => {
    it('should return paginated dead letter jobs', async () => {
      const mockDocs = [{ _id: 'dlj1', jobName: 'send-email' }];
      (MockDeadLetterJob.countDocuments as jest.Mock).mockResolvedValue(1);
      (MockDeadLetterJob.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockDocs),
          }),
        }),
      });

      const result = await getAllDeadLetterJobs(1, 10);

      expect(result.docs).toEqual(mockDocs);
      expect(result.pagination).toEqual({ total: 1, page: 1, limit: 10, pages: 1 });
    });
  });

  describe('retryDeadLetterJob', () => {
    it('should re-queue the job and mark as retried', async () => {
      const mockDlj = {
        _id: 'dlj1',
        jobName: 'send-email',
        data: { to: 'test@example.com' },
        originalJobId: 'job1',
        retriedAt: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      (MockDeadLetterJob.findById as jest.Mock).mockResolvedValue(mockDlj);

      const result = await retryDeadLetterJob('dlj1');

      expect(agenda.now).toHaveBeenCalledWith('send-email', { to: 'test@example.com' });
      expect(mockDlj.retriedAt).toBeInstanceOf(Date);
      expect(mockDlj.save).toHaveBeenCalled();
      expect(result).toEqual(mockDlj);
    });

    it('should throw 404 if dead letter job not found', async () => {
      (MockDeadLetterJob.findById as jest.Mock).mockResolvedValue(null);

      await expect(retryDeadLetterJob('nonexistent')).rejects.toThrow('Dead letter job not found');
    });

    it('should throw 409 if job already retried', async () => {
      (MockDeadLetterJob.findById as jest.Mock).mockResolvedValue({
        _id: 'dlj1',
        retriedAt: new Date(),
      });

      await expect(retryDeadLetterJob('dlj1')).rejects.toThrow('Job has already been retried');
    });
  });

  describe('deleteDeadLetterJob', () => {
    it('should delete the dead letter job', async () => {
      (MockDeadLetterJob.findByIdAndDelete as jest.Mock).mockResolvedValue({ _id: 'dlj1' });

      await expect(deleteDeadLetterJob('dlj1')).resolves.toBeUndefined();
      expect(MockDeadLetterJob.findByIdAndDelete).toHaveBeenCalledWith('dlj1');
    });

    it('should throw 404 if dead letter job not found', async () => {
      (MockDeadLetterJob.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(deleteDeadLetterJob('nonexistent')).rejects.toThrow('Dead letter job not found');
    });
  });
});
