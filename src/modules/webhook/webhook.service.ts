import crypto from 'crypto';
import webhookRepository from './webhook.repository';
import type { IWebhook, WebhookEvent } from './webhook.model';
import type { CreateWebhookDto, UpdateWebhookDto } from './webhook.types';
import { ApiError } from '../../common/utils/ApiError';
import type { PaginationMeta, CursorPaginationMeta } from '../../common/types';

interface PaginatedWebhooks {
  docs: IWebhook[];
  pagination: PaginationMeta;
}

interface CursorPaginatedWebhooks {
  docs: IWebhook[];
  pagination: CursorPaginationMeta;
}

const generateSecret = (): string => crypto.randomBytes(32).toString('hex');

export const createWebhook = async (dto: CreateWebhookDto, userId: string): Promise<IWebhook> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {
    url: dto.url,
    events: dto.events,
    description: dto.description,
    secret: generateSecret(),
    createdBy: userId,
  };
  return webhookRepository.create(data);
};

export const getWebhookById = async (id: string, userId: string): Promise<IWebhook> => {
  const webhook = await webhookRepository.findById(id);
  if (!webhook) throw new ApiError(404, 'Webhook not found');
  if (String(webhook.createdBy) !== userId) throw new ApiError(404, 'Webhook not found');
  return webhook;
};

export const getAllWebhooks = async (
  userId: string,
  page: number,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<PaginatedWebhooks> => {
  const { docs, ...pagination } = await webhookRepository.paginate(
    { createdBy: userId },
    page,
    limit,
    sort,
  );
  return { docs, pagination };
};

export const getAllWebhooksCursor = async (
  userId: string,
  cursor: string | undefined,
  limit: number,
  sort?: Record<string, 1 | -1>,
): Promise<CursorPaginatedWebhooks> => {
  return webhookRepository.cursorPaginate({ createdBy: userId }, cursor, limit, sort);
};

export const updateWebhook = async (
  id: string,
  dto: UpdateWebhookDto,
  userId: string,
): Promise<IWebhook> => {
  const webhook = await webhookRepository.findById(id);
  if (!webhook) throw new ApiError(404, 'Webhook not found');
  if (String(webhook.createdBy) !== userId) throw new ApiError(404, 'Webhook not found');

  const updated = await webhookRepository.updateById(id, dto);
  if (!updated) throw new ApiError(404, 'Webhook not found');
  return updated;
};

export const deleteWebhook = async (id: string, userId: string): Promise<void> => {
  const webhook = await webhookRepository.findById(id);
  if (!webhook) throw new ApiError(404, 'Webhook not found');
  if (String(webhook.createdBy) !== userId) throw new ApiError(404, 'Webhook not found');
  await webhookRepository.deleteById(id);
};

export const signPayload = (payload: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

export const getActiveWebhooksForEvent = async (event: WebhookEvent): Promise<IWebhook[]> => {
  return webhookRepository.findActiveByEvent(event);
};
