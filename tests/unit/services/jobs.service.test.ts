const mockQueryJobs = jest.fn();
const mockCancel = jest.fn();
const mockNow = jest.fn();

jest.mock('../../../src/common/queues/queue.service', () => ({
  agenda: {
    queryJobs: (...args: unknown[]) => mockQueryJobs(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    now: (...args: unknown[]) => mockNow(...args),
  },
}));

import {
  getJobs,
  getJobById,
  cancelJob,
  requeueJob,
  getJobStats,
} from '../../../src/modules/jobs/jobs.service';

describe('JobsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getJobs', () => {
    it('should return paginated jobs', async () => {
      mockQueryJobs.mockResolvedValue({
        jobs: [{ _id: 'j1', name: 'send-email', state: 'completed', data: {}, priority: 0 }],
        total: 1,
      });

      const result = await getJobs(1, 10, {});

      expect(mockQueryJobs).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 10 }));
      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].name).toBe('send-email');
      expect(result.pagination).toEqual({ total: 1, page: 1, limit: 10, pages: 1 });
    });

    it('should pass name and state filters', async () => {
      mockQueryJobs.mockResolvedValue({ jobs: [], total: 0 });

      await getJobs(1, 10, { name: 'send-email', state: 'failed' });

      expect(mockQueryJobs).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'send-email', state: 'failed' }),
      );
    });
  });

  describe('getJobById', () => {
    it('should return a job by ID', async () => {
      mockQueryJobs.mockResolvedValue({
        jobs: [{ _id: 'j1', name: 'send-email', data: { to: 'test@test.com' } }],
        total: 1,
      });

      const result = await getJobById('j1');

      expect(result).not.toBeNull();
      expect(result!.name).toBe('send-email');
    });

    it('should return null if not found', async () => {
      mockQueryJobs.mockResolvedValue({ jobs: [], total: 0 });

      const result = await getJobById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('cancelJob', () => {
    it('should cancel a job by ID', async () => {
      mockCancel.mockResolvedValue(1);

      const result = await cancelJob('j1');
      expect(mockCancel).toHaveBeenCalledWith({ id: 'j1' });
      expect(result).toBe(1);
    });
  });

  describe('requeueJob', () => {
    it('should requeue a job with same name and data', async () => {
      mockQueryJobs.mockResolvedValue({
        jobs: [{ _id: 'j1', name: 'send-email', data: { to: 'a@b.com' } }],
        total: 1,
      });
      mockNow.mockResolvedValue(undefined);

      const result = await requeueJob('j1');

      expect(mockNow).toHaveBeenCalledWith('send-email', { to: 'a@b.com' });
      expect(result).toEqual({ name: 'send-email' });
    });

    it('should return null if job not found', async () => {
      mockQueryJobs.mockResolvedValue({ jobs: [], total: 0 });

      const result = await requeueJob('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getJobStats', () => {
    it('should return counts by state', async () => {
      mockQueryJobs
        .mockResolvedValueOnce({ jobs: [], total: 5 }) // scheduled
        .mockResolvedValueOnce({ jobs: [], total: 2 }) // queued
        .mockResolvedValueOnce({ jobs: [], total: 1 }) // running
        .mockResolvedValueOnce({ jobs: [], total: 10 }) // completed
        .mockResolvedValueOnce({ jobs: [], total: 3 }) // failed
        .mockResolvedValueOnce({ jobs: [], total: 1 }); // repeating

      const stats = await getJobStats();

      expect(stats).toEqual({
        scheduled: 5,
        queued: 2,
        running: 1,
        completed: 10,
        failed: 3,
        repeating: 1,
        total: 22,
      });
    });
  });
});
