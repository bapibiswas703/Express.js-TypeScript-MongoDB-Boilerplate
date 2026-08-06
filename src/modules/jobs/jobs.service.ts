import { agenda } from '../../common/queues/queue.service';

export interface JobListQuery {
  name?: string;
  state?: string;
}

export interface JobStats {
  scheduled: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  repeating: number;
  total: number;
}

const mapJob = (job: Record<string, unknown>) => ({
  _id: String(job._id),
  name: job.name,
  state: job.state,
  data: job.data,
  priority: job.priority,
  nextRunAt: job.nextRunAt,
  lastRunAt: job.lastRunAt,
  lastFinishedAt: job.lastFinishedAt,
  failCount: job.failCount,
  failReason: job.failReason,
  failedAt: job.failedAt,
  lockedAt: job.lockedAt,
  disabled: job.disabled,
  progress: job.progress,
  repeatInterval: job.repeatInterval,
  repeatTimezone: job.repeatTimezone,
});

export const getJobs = async (
  page: number,
  limit: number,
  query: JobListQuery,
  sort?: Record<string, 1 | -1>,
) => {
  const options: Record<string, unknown> = {
    skip: (page - 1) * limit,
    limit,
  };

  if (query.name) options.name = query.name;
  if (query.state) options.state = query.state;

  const sortField = sort ? Object.keys(sort)[0] : 'nextRunAt';
  const sortDir = sort ? (Object.values(sort)[0] === 1 ? 'asc' : 'desc') : 'desc';
  options.sort = { [sortField]: sortDir };

  const { jobs, total } = await agenda.queryJobs(options);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = jobs.map((job) => mapJob(job as any));
  const pages = Math.ceil(total / limit);

  return {
    docs,
    pagination: { total, page, limit, pages },
  };
};

export const getJobById = async (id: string) => {
  const { jobs } = await agenda.queryJobs({ id });
  if (jobs.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapJob(jobs[0] as any);
};

export const cancelJob = async (id: string): Promise<number> => {
  return agenda.cancel({ id });
};

export const requeueJob = async (id: string) => {
  const { jobs } = await agenda.queryJobs({ id });
  if (jobs.length === 0) return null;

  const job = jobs[0];
  await agenda.now(job.name, job.data as Record<string, unknown>);
  return { name: job.name };
};

export const getJobStats = async (): Promise<JobStats> => {
  const states = ['scheduled', 'queued', 'running', 'completed', 'failed', 'repeating'] as const;
  const stats: Record<string, number> = {};
  let total = 0;

  for (const state of states) {
    const { total: count } = await agenda.queryJobs({ state, limit: 0 });
    stats[state] = count;
    total += count;
  }

  return { ...stats, total } as JobStats;
};
