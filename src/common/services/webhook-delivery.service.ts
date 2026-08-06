import { logger } from '../logger';

export interface WebhookDeliveryPayload {
  webhookId: string;
  url: string;
  event: string;
  data: Record<string, unknown>;
  signature: string;
}

export const deliverWebhook = async (payload: WebhookDeliveryPayload): Promise<void> => {
  const body = JSON.stringify({ event: payload.event, data: payload.data });

  const response = await fetch(payload.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': payload.signature,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Id': payload.webhookId,
    },
    body,
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
  }

  logger.info(
    { webhookId: payload.webhookId, event: payload.event, url: payload.url },
    `Webhook delivered: ${payload.event} → ${payload.url}`,
  );
};
