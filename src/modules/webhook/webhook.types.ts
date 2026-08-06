import type { WebhookEvent } from './webhook.model';

export interface CreateWebhookDto {
  url: string;
  events: WebhookEvent[];
  description?: string;
}

export interface UpdateWebhookDto {
  url?: string;
  events?: WebhookEvent[];
  description?: string;
  isActive?: boolean;
}
