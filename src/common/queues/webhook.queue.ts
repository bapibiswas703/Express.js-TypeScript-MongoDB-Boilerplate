import type { Job } from 'agenda';
import { agenda } from './queue.service';
import type { WebhookDeliveryPayload } from '../services/webhook-delivery.service';
import { deliverWebhook } from '../services/webhook-delivery.service';

const JOB_NAME = 'deliver-webhook';

agenda.define(JOB_NAME, async (job: Job) => {
  await deliverWebhook(job.attrs.data as WebhookDeliveryPayload);
});

export const queueWebhookDelivery = async (payload: WebhookDeliveryPayload): Promise<void> => {
  await agenda.now(JOB_NAME, payload);
};
