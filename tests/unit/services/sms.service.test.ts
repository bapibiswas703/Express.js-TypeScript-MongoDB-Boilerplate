const mockCreate = jest.fn().mockResolvedValue({ sid: 'SM123' });

jest.mock('twilio', () => {
  return jest.fn().mockReturnValue({
    messages: { create: mockCreate },
  });
});

jest.mock('../../../src/config', () => ({
  config: {
    twilio: {
      accountSid: 'AC_TEST',
      authToken: 'test_token',
      phoneNumber: '+10000000000',
    },
  },
}));

jest.mock('../../../src/common/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

import { sendSms, sendBulkSms } from '../../../src/common/services/sms.service';

describe('SmsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sendSms', () => {
    it('should send an SMS via Twilio', async () => {
      await sendSms({ to: '+11234567890', body: 'Hello' });

      expect(mockCreate).toHaveBeenCalledWith({
        to: '+11234567890',
        from: '+10000000000',
        body: 'Hello',
      });
    });

    it('should throw when Twilio API fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Twilio error'));

      await expect(sendSms({ to: '+11234567890', body: 'Hello' })).rejects.toThrow('Twilio error');
    });
  });

  describe('sendBulkSms', () => {
    it('should send SMS to multiple recipients', async () => {
      await sendBulkSms({ recipients: ['+11111111111', '+12222222222'], body: 'Bulk msg' });

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+11111111111', body: 'Bulk msg' }),
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+12222222222', body: 'Bulk msg' }),
      );
    });

    it('should not throw if some recipients fail', async () => {
      mockCreate
        .mockResolvedValueOnce({ sid: 'SM1' })
        .mockRejectedValueOnce(new Error('Invalid number'));

      await expect(
        sendBulkSms({ recipients: ['+11111111111', '+12222222222'], body: 'msg' }),
      ).resolves.toBeUndefined();
    });
  });
});
