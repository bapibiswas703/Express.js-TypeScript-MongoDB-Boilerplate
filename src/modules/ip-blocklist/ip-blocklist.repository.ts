import { BaseRepository } from '../../common/repositories/base.repository';
import type { IBlockedIp } from './ip-blocklist.model';
import BlockedIp from './ip-blocklist.model';

class BlockedIpRepository extends BaseRepository<IBlockedIp> {
  constructor() {
    super(BlockedIp);
  }

  async findByIp(ip: string): Promise<IBlockedIp | null> {
    return this.model.findOne({ ip }).exec();
  }

  async getAllActive(): Promise<IBlockedIp[]> {
    return this.model
      .find({
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
      .exec();
  }

  async deleteByIp(ip: string): Promise<IBlockedIp | null> {
    return this.model.findOneAndDelete({ ip }).exec();
  }
}

export default new BlockedIpRepository();
