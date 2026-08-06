import type { Job } from 'agenda';
import { agenda } from './queue.service';
import type { SmsPayload, BulkSmsPayload } from '../services/sms.service';
import { sendSms, sendBulkSms } from '../services/sms.service';

const SMS_JOB = 'send-sms';
const BULK_SMS_JOB = 'send-bulk-sms';

agenda.define(SMS_JOB, async (job: Job) => {
  await sendSms(job.attrs.data as SmsPayload);
});

agenda.define(BULK_SMS_JOB, async (job: Job) => {
  await sendBulkSms(job.attrs.data as BulkSmsPayload);
});

export const queueSms = async (payload: SmsPayload, delay?: number): Promise<void> => {
  if (delay) {
    await agenda.schedule(new Date(Date.now() + delay), SMS_JOB, payload);
  } else {
    await agenda.now(SMS_JOB, payload);
  }
};

export const queueBulkSms = async (payload: BulkSmsPayload): Promise<void> => {
  await agenda.now(BULK_SMS_JOB, payload);
};
