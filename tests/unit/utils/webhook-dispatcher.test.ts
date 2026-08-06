jest.mock('../../../src/common/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetActiveWebhooksForEvent = jest.fn();
const mockSignPayload = jest.fn().mockReturnValue('sig123');
const mockQueueWebhookDelivery = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/modules/webhook/webhook.service', () => ({
  getActiveWebhooksForEvent: (...args: unknown[]) => mockGetActiveWebhooksForEvent(...args),
  signPayload: (...args: unknown[]) => mockSignPayload(...args),
}));

jest.mock('../../../src/common/queues/webhook.queue', () => ({
  queueWebhookDelivery: (...args: unknown[]) => mockQueueWebhookDelivery(...args),
}));

import { dispatchWebhookEvent } from '../../../src/common/utils/webhook-dispatcher';

describe('dispatchWebhookEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should queue deliveries for all active webhooks', async () => {
    mockGetActiveWebhooksForEvent.mockResolvedValue([
      { _id: 'wh1', url: 'https://a.com/hook', secret: 'sec1' },
      { _id: 'wh2', url: 'https://b.com/hook', secret: 'sec2' },
    ]);

    await dispatchWebhookEvent('user.created', { userId: '123' });

    expect(mockGetActiveWebhooksForEvent).toHaveBeenCalledWith('user.created');
    expect(mockQueueWebhookDelivery).toHaveBeenCalledTimes(2);
    expect(mockQueueWebhookDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        webhookId: 'wh1',
        url: 'https://a.com/hook',
        event: 'user.created',
      }),
    );
  });

  it('should do nothing if no webhooks are active', async () => {
    mockGetActiveWebhooksForEvent.mockResolvedValue([]);

    await dispatchWebhookEvent('user.created', { userId: '123' });

    expect(mockQueueWebhookDelivery).not.toHaveBeenCalled();
  });

  it('should not throw on errors', async () => {
    mockGetActiveWebhooksForEvent.mockRejectedValue(new Error('DB error'));

    await expect(dispatchWebhookEvent('user.created', { userId: '123' })).resolves.toBeUndefined();
  });
});
