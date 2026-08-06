import type { Job } from 'agenda';
import { agenda } from './queue.service';
import type { FcmPayload, FcmMulticastPayload } from '../services/notification.service';
import { sendPushNotification, sendMulticastNotification } from '../services/notification.service';

const PUSH_JOB = 'send-push';
const MULTICAST_JOB = 'send-multicast';

agenda.define(PUSH_JOB, async (job: Job) => {
  await sendPushNotification(job.attrs.data as FcmPayload);
});

agenda.define(MULTICAST_JOB, async (job: Job) => {
  await sendMulticastNotification(job.attrs.data as FcmMulticastPayload);
});

export const queuePushNotification = async (payload: FcmPayload): Promise<void> => {
  await agenda.now(PUSH_JOB, payload);
};

export const queueMulticastNotification = async (payload: FcmMulticastPayload): Promise<void> => {
  await agenda.now(MULTICAST_JOB, payload);
};
