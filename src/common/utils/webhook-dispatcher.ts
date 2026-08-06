import type { WebhookEvent } from '../../modules/webhook/webhook.model';
import { logger } from '../logger';

export const dispatchWebhookEvent = async (
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> => {
  try {
    const { getActiveWebhooksForEvent, signPayload } =
      await import('../../modules/webhook/webhook.service');
    const { queueWebhookDelivery } = await import('../queues/webhook.queue');

    const webhooks = await getActiveWebhooksForEvent(event);

    for (const webhook of webhooks) {
      const body = JSON.stringify({ event, data });
      const signature = signPayload(body, webhook.secret);

      await queueWebhookDelivery({
        webhookId: String(webhook._id),
        url: webhook.url,
        event,
        data,
        signature,
      });
    }

    if (webhooks.length > 0) {
      logger.debug(
        { event, count: webhooks.length },
        `Queued ${webhooks.length} webhook(s) for ${event}`,
      );
    }
  } catch (err) {
    logger.error({ err, event }, `Failed to dispatch webhook event: ${event}`);
  }
};
