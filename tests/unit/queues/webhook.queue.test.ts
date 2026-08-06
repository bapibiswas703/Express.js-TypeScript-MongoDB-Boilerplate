const mockNow = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/common/queues/queue.service', () => ({
  agenda: {
    define: jest.fn(),
    now: mockNow,
  },
}));

jest.mock('../../../src/common/services/webhook-delivery.service', () => ({
  deliverWebhook: jest.fn(),
}));

import { queueWebhookDelivery } from '../../../src/common/queues/webhook.queue';

describe('WebhookQueue', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should queue a webhook delivery job', async () => {
    const payload = {
      webhookId: 'wh1',
      url: 'https://example.com/hook',
      event: 'user.created',
      data: { userId: '123' },
      signature: 'sig',
    };

    await queueWebhookDelivery(payload);

    expect(mockNow).toHaveBeenCalledWith('deliver-webhook', payload);
  });
});
