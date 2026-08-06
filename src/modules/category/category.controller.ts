import type { Request, Response, NextFunction } from 'express';
import * as categoryService from './category.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './category.types';
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendCursorPaginated,
  sendNoContent,
} from '../../common/utils/ApiResponse';
import {
  parsePagination,
  parseCursorPagination,
  isCursorPagination,
  parseSort,
} from '../../common/utils/pagination';
import { auditLogger, AuditAction } from '../../common/logger';

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: CreateCategoryDto = req.body;
    const category = await categoryService.createCategory(dto);
    auditLogger.log(req, {
      action: AuditAction.CATEGORY_CREATE,
      module: 'category',
      description: `Category created: ${dto.name}`,
      targetId: String(category._id),
      targetType: 'Category',
    });
    sendCreated(res, { category }, 'Category created');
  } catch (err) {
    next(err);
  }
};

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sort = parseSort(req, ['name', 'createdAt']);

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await categoryService.getAllCategoriesCursor(
        cursor,
        limit,
        sort,
      );
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await categoryService.getAllCategories(page, limit, sort);
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const category = await categoryService.getCategoryById(req.params.id as string);
    sendSuccess(res, { category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: UpdateCategoryDto = req.body;
    const category = await categoryService.updateCategoryById(req.params.id as string, dto);
    auditLogger.log(req, {
      action: AuditAction.CATEGORY_UPDATE,
      module: 'category',
      description: `Category updated: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Category',
    });
    sendSuccess(res, { category }, 'Category updated');
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await categoryService.deleteCategoryById(req.params.id as string);
    auditLogger.log(req, {
      action: AuditAction.CATEGORY_DELETE,
      module: 'category',
      description: `Category deleted: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Category',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
