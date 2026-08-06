import type { Request, Response, NextFunction } from 'express';
import * as mediaService from './media.service';
import {
  sendCreated,
  sendSuccess,
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
import { ApiError } from '../../common/utils/ApiError';
import { auditLogger, AuditAction } from '../../common/logger';

export const uploadMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) throw new ApiError(400, 'No file uploaded');
    const folder = (req.body.folder as string) || 'general';
    const media = await mediaService.uploadFile(req.file, req.userId!, folder);
    auditLogger.log(req, {
      action: AuditAction.MEDIA_UPLOAD,
      module: 'media',
      description: `File uploaded: ${media.originalName}`,
      targetId: String(media._id),
      targetType: 'Media',
    });
    sendCreated(res, { media }, 'File uploaded');
  } catch (err) {
    next(err);
  }
};

export const getMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const media = await mediaService.getMediaById(req.params.id as string);
    sendSuccess(res, { media });
  } catch (err) {
    next(err);
  }
};

export const getMyMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sort = parseSort(req, ['createdAt', 'originalName', 'size']);
    const folder = req.query.folder as string | undefined;

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await mediaService.getMediaByUserCursor(
        req.userId!,
        cursor,
        limit,
        folder,
        sort,
      );
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await mediaService.getMediaByUser(
        req.userId!,
        page,
        limit,
        folder,
        sort,
      );
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const deleteMediaById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await mediaService.deleteMedia(req.params.id as string, req.userId!);
    auditLogger.log(req, {
      action: AuditAction.MEDIA_DELETE,
      module: 'media',
      description: `File deleted: ${req.params.id}`,
      targetId: req.params.id as string,
      targetType: 'Media',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
