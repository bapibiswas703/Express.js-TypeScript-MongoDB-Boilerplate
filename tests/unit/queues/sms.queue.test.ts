const mockNow = jest.fn().mockResolvedValue(undefined);
const mockSchedule = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../src/common/queues/queue.service', () => ({
  agenda: {
    define: jest.fn(),
    now: mockNow,
    schedule: mockSchedule,
  },
}));

jest.mock('../../../src/common/services/sms.service', () => ({
  sendSms: jest.fn(),
  sendBulkSms: jest.fn(),
}));

import { queueSms, queueBulkSms } from '../../../src/common/queues/sms.queue';

describe('SmsQueue', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('queueSms', () => {
    it('should queue an SMS job immediately', async () => {
      await queueSms({ to: '+11234567890', body: 'Test' });

      expect(mockNow).toHaveBeenCalledWith('send-sms', { to: '+11234567890', body: 'Test' });
    });

    it('should schedule an SMS job with delay', async () => {
      const before = Date.now();
      await queueSms({ to: '+11234567890', body: 'Delayed' }, 5000);

      expect(mockSchedule).toHaveBeenCalledWith(expect.any(Date), 'send-sms', {
        to: '+11234567890',
        body: 'Delayed',
      });

      const scheduledDate: Date = mockSchedule.mock.calls[0][0];
      expect(scheduledDate.getTime()).toBeGreaterThanOrEqual(before + 5000);
    });
  });

  describe('queueBulkSms', () => {
    it('should queue a bulk SMS job', async () => {
      const payload = { recipients: ['+11111111111', '+12222222222'], body: 'Bulk' };
      await queueBulkSms(payload);

      expect(mockNow).toHaveBeenCalledWith('send-bulk-sms', payload);
    });
  });
});
