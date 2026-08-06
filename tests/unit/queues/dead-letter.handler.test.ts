const mockMoveToDeadLetter = jest.fn();
const mockGetMaxRetries = jest.fn().mockReturnValue(3);
const mockRemove = jest.fn();

jest.mock('../../../src/common/queues/dead-letter.service', () => ({
  moveToDeadLetter: (...args: unknown[]) => mockMoveToDeadLetter(...args),
  getMaxRetries: () => mockGetMaxRetries(),
}));

jest.mock('../../../src/common/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Capture the 'fail' event handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let failHandler: ((err: Error, job: any) => Promise<void>) | null = null;

jest.mock('../../../src/common/queues/queue.service', () => ({
  agenda: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on: jest.fn((event: string, handler: any) => {
      if (event === 'fail') failHandler = handler;
    }),
  },
}));

import { registerDeadLetterHandler } from '../../../src/common/queues/dead-letter.handler';

describe('DeadLetterHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    failHandler = null;
  });

  it('should register a fail event handler on agenda', () => {
    registerDeadLetterHandler();
    expect(failHandler).toBeInstanceOf(Function);
  });

  it('should move job to DLQ when failCount >= maxRetries', async () => {
    registerDeadLetterHandler();
    mockMoveToDeadLetter.mockResolvedValue({});

    const job = {
      attrs: {
        name: 'send-email',
        _id: 'job123',
        failCount: 3,
        data: { to: 'test@example.com' },
        lastRunAt: new Date(),
      },
      remove: mockRemove.mockResolvedValue(undefined),
    };

    await failHandler!(new Error('SMTP error'), job);

    expect(mockMoveToDeadLetter).toHaveBeenCalledWith(
      'send-email',
      'job123',
      { to: 'test@example.com' },
      'SMTP error',
      3,
      expect.any(Date),
    );
    expect(mockRemove).toHaveBeenCalled();
  });

  it('should not move job to DLQ when failCount < maxRetries', async () => {
    registerDeadLetterHandler();

    const job = {
      attrs: {
        name: 'send-email',
        _id: 'job123',
        failCount: 1,
        data: { to: 'test@example.com' },
      },
      remove: mockRemove,
    };

    await failHandler!(new Error('Temporary error'), job);

    expect(mockMoveToDeadLetter).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('should handle DLQ move errors gracefully', async () => {
    registerDeadLetterHandler();
    mockMoveToDeadLetter.mockRejectedValue(new Error('DB error'));

    const job = {
      attrs: {
        name: 'send-email',
        _id: 'job123',
        failCount: 3,
        data: {},
        lastRunAt: undefined,
      },
      remove: mockRemove,
    };

    await expect(failHandler!(new Error('SMTP error'), job)).resolves.toBeUndefined();
  });
});
