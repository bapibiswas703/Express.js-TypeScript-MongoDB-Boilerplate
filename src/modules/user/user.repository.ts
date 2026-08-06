import { BaseRepository } from '../../common/repositories/base.repository';
import type { IUser } from './user.model';
import User from './user.model';

class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string, withPassword = false): Promise<IUser | null> {
    const query = this.model.findOne({ email });
    if (withPassword) query.select('+password +failedLoginAttempts +lockUntil');
    return query.exec();
  }

  async findWithRole(id: string): Promise<IUser | null> {
    return this.model.findById(id).populate('role', 'name permissions').exec();
  }

  async search(
    filter: Record<string, unknown>,
    page: number,
    limit: number,
    sort?: Record<string, 1 | -1>,
  ): Promise<{ docs: IUser[]; total: number; page: number; limit: number; pages: number }> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);
    return { docs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findByFirebaseUid(uid: string): Promise<IUser | null> {
    return this.model.findOne({ firebaseUid: uid }).exec();
  }

  async softDelete(id: string): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).exec();
  }
}

export default new UserRepository();
