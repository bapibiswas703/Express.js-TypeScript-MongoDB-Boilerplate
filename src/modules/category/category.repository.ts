import { BaseRepository } from '../../common/repositories/base.repository';
import type { ICategory } from './category.model';
import Category from './category.model';

class CategoryRepository extends BaseRepository<ICategory> {
  constructor() {
    super(Category);
  }

  async findByName(name: string): Promise<ICategory | null> {
    return this.model.findOne({ name: new RegExp(`^${name}$`, 'i') }).exec();
  }

  async findActive(): Promise<ICategory[]> {
    return this.find({ isActive: true });
  }
}

export default new CategoryRepository();
