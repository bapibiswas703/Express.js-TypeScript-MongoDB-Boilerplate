import categoryRepository from './category.repository';
import type { CreateCategoryDto, UpdateCategoryDto } from './category.types';
import { ApiError } from '../../common/utils/ApiError';
import type { ICategory } from './category.model';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';

interface PaginatedCategories {
  docs: ICategory[];
  pagination: PaginationMeta;
}

interface CursorPaginatedCategories {
  docs: ICategory[];
  pagination: CursorPaginationMeta;
}

export const createCategory = async (dto: CreateCategoryDto): Promise<ICategory> => {
  const existing = await categoryRepository.findByName(dto.name);
  if (existing) throw new ApiError(409, 'Category already exists');
  return categoryRepository.create(dto);
};

export const getAllCategories = async (
  page: number,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedCategories> => {
  const { docs, ...pagination } = await categoryRepository.paginate({}, page, limit, sort);
  return { docs, pagination };
};

export const getAllCategoriesCursor = async (
  cursor: string | undefined,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedCategories> => {
  return categoryRepository.cursorPaginate({}, cursor, limit, sort);
};

export const getCategoryById = async (id: string): Promise<ICategory> => {
  const category = await categoryRepository.findById(id);
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
};

export const updateCategoryById = async (
  id: string,
  dto: UpdateCategoryDto,
): Promise<ICategory> => {
  const category = await categoryRepository.updateById(id, dto);
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
};

export const deleteCategoryById = async (id: string): Promise<void> => {
  const category = await categoryRepository.deleteById(id);
  if (!category) throw new ApiError(404, 'Category not found');
};
