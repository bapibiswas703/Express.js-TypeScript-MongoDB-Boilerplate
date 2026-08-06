jest.mock('../../../src/modules/ip-blocklist/ip-blocklist.repository', () => ({
  __esModule: true,
  default: {
    findByIp: jest.fn(),
    create: jest.fn(),
    paginate: jest.fn(),
    cursorPaginate: jest.fn(),
    deleteByIp: jest.fn(),
  },
}));

jest.mock('../../../src/common/middlewares/ip-blocklist', () => ({
  refreshBlocklistCache: jest.fn().mockResolvedValue(undefined),
}));

import blockedIpRepository from '../../../src/modules/ip-blocklist/ip-blocklist.repository';
import * as ipBlocklistService from '../../../src/modules/ip-blocklist/ip-blocklist.service';
import { ApiError } from '../../../src/common/utils/ApiError';

const repo = blockedIpRepository as jest.Mocked<typeof blockedIpRepository>;

describe('IpBlocklistService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('blockIp', () => {
    it('should block a new IP', async () => {
      repo.findByIp.mockResolvedValue(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const created = { _id: 'id1', ip: '1.2.3.4', reason: 'spam' } as any;
      repo.create.mockResolvedValue(created);

      const result = await ipBlocklistService.blockIp({ ip: '1.2.3.4', reason: 'spam' }, 'user1');

      expect(result.ip).toBe('1.2.3.4');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '1.2.3.4', reason: 'spam', blockedBy: 'user1' }),
      );
    });

    it('should throw 409 if IP already blocked', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo.findByIp.mockResolvedValue({ ip: '1.2.3.4' } as any);

      await expect(ipBlocklistService.blockIp({ ip: '1.2.3.4' }, 'user1')).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe('getAllBlockedIps', () => {
    it('should return paginated blocked IPs', async () => {
      repo.paginate.mockResolvedValue({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        docs: [{ ip: '1.2.3.4' }] as any[],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      });

      const result = await ipBlocklistService.getAllBlockedIps(1, 10);
      expect(result.docs).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('unblockIp', () => {
    it('should delete a blocked IP', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      repo.deleteByIp.mockResolvedValue({ ip: '1.2.3.4' } as any);

      await expect(ipBlocklistService.unblockIp('1.2.3.4')).resolves.toBeUndefined();
      expect(repo.deleteByIp).toHaveBeenCalledWith('1.2.3.4');
    });

    it('should throw 404 if IP not found', async () => {
      repo.deleteByIp.mockResolvedValue(null);

      await expect(ipBlocklistService.unblockIp('9.9.9.9')).rejects.toThrow(ApiError);
    });
  });
});
