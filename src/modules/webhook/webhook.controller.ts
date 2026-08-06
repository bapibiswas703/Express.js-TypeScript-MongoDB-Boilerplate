import type { Request, Response, NextFunction } from 'express';
import * as webhookService from './webhook.service';
import { WEBHOOK_EVENTS } from './webhook.model';
import type { CreateWebhookDto, UpdateWebhookDto } from './webhook.types';
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

export const createWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const dto: CreateWebhookDto = req.body;
    const webhook = await webhookService.createWebhook(dto, req.userId!);
    auditLogger.log(req, {
      action: AuditAction.WEBHOOK_CREATE,
      module: 'webhook',
      description: `Webhook created for ${dto.events.join(', ')}`,
      targetId: String(webhook._id),
      targetType: 'Webhook',
    });
    sendCreated(res, { webhook }, 'Webhook created');
  } catch (err) {
    next(err);
  }
};

export const getWebhooks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sort = parseSort(req, ['createdAt', 'url']);

    if (isCursorPagination(req)) {
      const { cursor, limit } = parseCursorPagination(req);
      const { docs, pagination } = await webhookService.getAllWebhooksCursor(
        req.userId!,
        cursor,
        limit,
        sort,
      );
      sendCursorPaginated(res, docs, pagination);
    } else {
      const { page, limit } = parsePagination(req);
      const { docs, pagination } = await webhookService.getAllWebhooks(
        req.userId!,
        page,
        limit,
        sort,
      );
      sendPaginated(res, docs, pagination);
    }
  } catch (err) {
    next(err);
  }
};

export const getWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const webhook = await webhookService.getWebhookById(id, req.userId!);
    sendSuccess(res, { webhook });
  } catch (err) {
    next(err);
  }
};

export const updateWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const dto: UpdateWebhookDto = req.body;
    const webhook = await webhookService.updateWebhook(id, dto, req.userId!);
    auditLogger.log(req, {
      action: AuditAction.WEBHOOK_UPDATE,
      module: 'webhook',
      description: `Webhook updated: ${id}`,
      targetId: id,
      targetType: 'Webhook',
    });
    sendSuccess(res, { webhook }, 'Webhook updated');
  } catch (err) {
    next(err);
  }
};

export const deleteWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    await webhookService.deleteWebhook(id, req.userId!);
    auditLogger.log(req, {
      action: AuditAction.WEBHOOK_DELETE,
      module: 'webhook',
      description: `Webhook deleted: ${id}`,
      targetId: id,
      targetType: 'Webhook',
    });
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const getAvailableEvents = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    sendSuccess(res, { events: WEBHOOK_EVENTS });
  } catch (err) {
    next(err);
  }
};
