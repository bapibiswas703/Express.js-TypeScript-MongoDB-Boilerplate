jest.mock('../../../src/common/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

import { deliverWebhook } from '../../../src/common/services/webhook-delivery.service';

describe('WebhookDeliveryService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should deliver a webhook via POST', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await deliverWebhook({
      webhookId: 'wh1',
      url: 'https://example.com/hook',
      event: 'user.created',
      data: { userId: '123' },
      signature: 'sig123',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'sig123',
          'X-Webhook-Event': 'user.created',
          'X-Webhook-Id': 'wh1',
        }),
      }),
    );
  });

  it('should throw on non-ok response', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(
      deliverWebhook({
        webhookId: 'wh1',
        url: 'https://example.com/hook',
        event: 'user.created',
        data: {},
        signature: 'sig',
      }),
    ).rejects.toThrow('Webhook delivery failed: 500 Internal Server Error');
  });

  it('should throw on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(
      deliverWebhook({
        webhookId: 'wh1',
        url: 'https://example.com/hook',
        event: 'user.created',
        data: {},
        signature: 'sig',
      }),
    ).rejects.toThrow('Network error');
  });
});
