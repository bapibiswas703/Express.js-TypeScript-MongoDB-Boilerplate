import type { Request, Response, NextFunction } from 'express';
import * as productService from './product.service';
import type { CreateProductDto, UpdateProductDto, ProductFilterQuery } from './product.types';
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

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: CreateProductDto = req.body;
    const product = await productService.createProduct(dto);
    auditLogger.log(req, {
      action: AuditAction.PRODUCT_CREATE,
      module: 'product',
      description: `Product created: ${dto.name}`,
      targetId: String(product._id),
      targetType: 'Product',
    });
    sendCreated(res, { product }, 'Product created');
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sort = parseSort(req, ['name', 'price', 'createdAt']);
    const filterQuery: ProductFilterQuery = {
      category: req.query.category as string,
      search: req.query.search as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    };

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await productService.getAllProductsCursor(
        cursor,
        limit,
        filterQuery,
        sort,
      );
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await productService.getAllProducts(
        page,
        limit,
        filterQuery,
        sort,
      );
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const product = await productService.getProductById(req.params.id as string);
    sendSuccess(res, { product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: UpdateProductDto = req.body;
    const product = await productService.updateProductById(req.params.id as string, dto);
    auditLogger.log(req, {
      action: AuditAction.PRODUCT_UPDATE,
      module: 'product',
      description: `Product updated: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Product',
    });
    sendSuccess(res, { product }, 'Product updated');
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await productService.deleteProductById(req.params.id as string);
    auditLogger.log(req, {
      action: AuditAction.PRODUCT_DELETE,
      module: 'product',
      description: `Product deleted: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Product',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
