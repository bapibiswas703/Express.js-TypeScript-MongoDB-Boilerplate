import { BaseRepository } from '../../common/repositories/base.repository';
import type { IDevice } from './device.model';
import Device from './device.model';

class DeviceRepository extends BaseRepository<IDevice> {
  constructor() {
    super(Device);
  }

  async findByUser(userId: string, activeOnly = true): Promise<IDevice[]> {
    const filter: Record<string, unknown> = { user: userId };
    if (activeOnly) filter.isActive = true;
    return this.find(filter, { sort: { lastActive: -1 } });
  }

  async findByRefreshToken(refreshTokenId: string): Promise<IDevice | null> {
    return this.findOne({ refreshToken: refreshTokenId });
  }

  async deactivateByUser(userId: string): Promise<void> {
    await this.model.updateMany({ user: userId, isActive: true }, { isActive: false });
  }

  async deactivateByRefreshToken(refreshTokenId: string): Promise<void> {
    await this.model.updateMany(
      { refreshToken: refreshTokenId, isActive: true },
      { isActive: false },
    );
  }

  async deactivateByIds(deviceIds: string[]): Promise<void> {
    await this.model.updateMany({ _id: { $in: deviceIds } }, { isActive: false });
  }
}

export default new DeviceRepository();
