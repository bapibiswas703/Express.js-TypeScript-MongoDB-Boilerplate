import productRepository from './product.repository';
import type { CreateProductDto, UpdateProductDto, ProductFilterQuery } from './product.types';
import { categoryRepository } from '../category';
import { ApiError } from '../../common/utils/ApiError';
import type { IProduct } from './product.model';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';

interface PaginatedProducts {
  docs: IProduct[];
  pagination: PaginationMeta;
}

interface CursorPaginatedProducts {
  docs: IProduct[];
  pagination: CursorPaginationMeta;
}

export const createProduct = async (dto: CreateProductDto): Promise<IProduct> => {
  const category = await categoryRepository.findById(dto.category);
  if (!category) throw new ApiError(400, 'Category not found');
  return productRepository.create(dto as unknown as Partial<IProduct>);
};

export const getAllProducts = async (
  page: number,
  limit: number,
  filterQuery: ProductFilterQuery,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedProducts> => {
  const filter = productRepository.buildFilter(filterQuery);
  const { docs, ...pagination } = await productRepository.paginate(filter, page, limit, sort);
  return { docs, pagination };
};

export const getAllProductsCursor = async (
  cursor: string | undefined,
  limit: number,
  filterQuery: ProductFilterQuery,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedProducts> => {
  const filter = productRepository.buildFilter(filterQuery);
  return productRepository.cursorPaginate(filter, cursor, limit, sort);
};

export const getProductById = async (id: string): Promise<IProduct> => {
  const product = await productRepository.findWithCategory(id);
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

export const updateProductById = async (id: string, dto: UpdateProductDto): Promise<IProduct> => {
  if (dto.category) {
    const category = await categoryRepository.findById(dto.category);
    if (!category) throw new ApiError(400, 'Category not found');
  }
  const product = await productRepository.updateById(id, dto);
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
};

export const deleteProductById = async (id: string): Promise<void> => {
  const product = await productRepository.deleteById(id);
  if (!product) throw new ApiError(404, 'Product not found');
};
