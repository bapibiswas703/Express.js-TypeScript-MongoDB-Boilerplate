jest.mock('../../../src/common/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockCreate = jest.fn();
const mockFindById = jest.fn();
const mockPaginate = jest.fn();
const mockCursorPaginate = jest.fn();
const mockUpdateById = jest.fn();
const mockDeleteById = jest.fn();
const mockFindActiveByEvent = jest.fn();

jest.mock('../../../src/modules/webhook/webhook.repository', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    paginate: (...args: unknown[]) => mockPaginate(...args),
    cursorPaginate: (...args: unknown[]) => mockCursorPaginate(...args),
    updateById: (...args: unknown[]) => mockUpdateById(...args),
    deleteById: (...args: unknown[]) => mockDeleteById(...args),
    findActiveByEvent: (...args: unknown[]) => mockFindActiveByEvent(...args),
  },
}));

import {
  createWebhook,
  getWebhookById,
  getAllWebhooks,
  updateWebhook,
  deleteWebhook,
  signPayload,
  getActiveWebhooksForEvent,
} from '../../../src/modules/webhook/webhook.service';

describe('WebhookService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createWebhook', () => {
    it('should create a webhook with a generated secret', async () => {
      const mockDoc = { _id: 'wh1', url: 'https://example.com/hook', events: ['user.created'] };
      mockCreate.mockResolvedValue(mockDoc);

      const result = await createWebhook(
        { url: 'https://example.com/hook', events: ['user.created'] },
        'user1',
      );

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/hook',
          events: ['user.created'],
          createdBy: 'user1',
          secret: expect.any(String),
        }),
      );
      expect(result).toEqual(mockDoc);
    });
  });

  describe('getWebhookById', () => {
    it('should return webhook if user owns it', async () => {
      mockFindById.mockResolvedValue({ _id: 'wh1', createdBy: 'user1' });
      const result = await getWebhookById('wh1', 'user1');
      expect(result._id).toBe('wh1');
    });

    it('should throw 404 if not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(getWebhookById('wh1', 'user1')).rejects.toThrow('Webhook not found');
    });

    it('should throw 404 if user does not own it', async () => {
      mockFindById.mockResolvedValue({ _id: 'wh1', createdBy: 'other-user' });
      await expect(getWebhookById('wh1', 'user1')).rejects.toThrow('Webhook not found');
    });
  });

  describe('getAllWebhooks', () => {
    it('should return paginated webhooks for user', async () => {
      mockPaginate.mockResolvedValue({
        docs: [{ _id: 'wh1' }],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });

      const result = await getAllWebhooks('user1', 1, 10);
      expect(mockPaginate).toHaveBeenCalledWith({ createdBy: 'user1' }, 1, 10, undefined);
      expect(result.docs).toHaveLength(1);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook if user owns it', async () => {
      mockFindById.mockResolvedValue({ _id: 'wh1', createdBy: 'user1' });
      mockUpdateById.mockResolvedValue({ _id: 'wh1', url: 'https://new.com/hook' });

      const result = await updateWebhook('wh1', { url: 'https://new.com/hook' }, 'user1');
      expect(mockUpdateById).toHaveBeenCalledWith('wh1', { url: 'https://new.com/hook' });
      expect(result.url).toBe('https://new.com/hook');
    });

    it('should throw 404 if not owned', async () => {
      mockFindById.mockResolvedValue({ _id: 'wh1', createdBy: 'other' });
      await expect(updateWebhook('wh1', { url: 'https://x.com' }, 'user1')).rejects.toThrow(
        'Webhook not found',
      );
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook if user owns it', async () => {
      mockFindById.mockResolvedValue({ _id: 'wh1', createdBy: 'user1' });
      mockDeleteById.mockResolvedValue({ _id: 'wh1' });

      await expect(deleteWebhook('wh1', 'user1')).resolves.toBeUndefined();
      expect(mockDeleteById).toHaveBeenCalledWith('wh1');
    });

    it('should throw 404 if not found', async () => {
      mockFindById.mockResolvedValue(null);
      await expect(deleteWebhook('wh1', 'user1')).rejects.toThrow('Webhook not found');
    });
  });

  describe('signPayload', () => {
    it('should produce a consistent HMAC-SHA256 signature', () => {
      const sig1 = signPayload('test-body', 'secret');
      const sig2 = signPayload('test-body', 'secret');
      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = signPayload('body', 'secret1');
      const sig2 = signPayload('body', 'secret2');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('getActiveWebhooksForEvent', () => {
    it('should return active webhooks for event', async () => {
      mockFindActiveByEvent.mockResolvedValue([{ _id: 'wh1' }]);
      const result = await getActiveWebhooksForEvent('user.created');
      expect(mockFindActiveByEvent).toHaveBeenCalledWith('user.created');
      expect(result).toHaveLength(1);
    });
  });
});
