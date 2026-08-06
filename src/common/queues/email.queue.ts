import type { Job } from 'agenda';
import { agenda } from './queue.service';
import type { EmailPayload } from '../services/email.service';
import { sendEmail } from '../services/email.service';

const JOB_NAME = 'send-email';

agenda.define(JOB_NAME, async (job: Job) => {
  const payload = job.attrs.data as EmailPayload;
  await sendEmail(payload);
});

export const queueEmail = async (payload: EmailPayload, delay?: number): Promise<void> => {
  if (delay) {
    await agenda.schedule(new Date(Date.now() + delay), JOB_NAME, payload);
  } else {
    await agenda.now(JOB_NAME, payload);
  }
};

export const queueBulkEmail = async (payloads: EmailPayload[]): Promise<void> => {
  for (const payload of payloads) {
    await agenda.now(JOB_NAME, payload);
  }
};
