import { BaseRepository } from '../../common/repositories/base.repository';
import type { IRole } from './role.model';
import Role from './role.model';

class RoleRepository extends BaseRepository<IRole> {
  constructor() {
    super(Role);
  }

  async findByName(name: string): Promise<IRole | null> {
    return this.model.findOne({ name: name.toLowerCase() }).exec();
  }

  async findActive(): Promise<IRole[]> {
    return this.find({ isActive: true });
  }
}

export default new RoleRepository();
