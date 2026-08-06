import { BaseRepository } from '../../common/repositories/base.repository';
import type { IProduct } from './product.model';
import Product from './product.model';
import type { ProductFilterQuery } from './product.types';

class ProductRepository extends BaseRepository<IProduct> {
  constructor() {
    super(Product);
  }

  buildFilter(query: ProductFilterQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (query.category) filter.category = query.category;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: { $gte?: number; $lte?: number } = {};
      if (query.minPrice !== undefined) priceFilter.$gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.$lte = query.maxPrice;
      filter.price = priceFilter;
    }
    if (query.search) filter.$text = { $search: query.search };
    return filter;
  }

  async findWithCategory(id: string): Promise<IProduct | null> {
    return this.model.findById(id).populate('category', 'name').exec();
  }

  async findByCategory(categoryId: string): Promise<IProduct[]> {
    return this.find({ category: categoryId, isActive: true });
  }
}

export default new ProductRepository();
