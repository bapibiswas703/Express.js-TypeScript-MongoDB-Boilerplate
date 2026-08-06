import { BaseRepository } from '../../common/repositories/base.repository';
import type { IWebhook, WebhookEvent } from './webhook.model';
import Webhook from './webhook.model';

class WebhookRepository extends BaseRepository<IWebhook> {
  constructor() {
    super(Webhook);
  }

  async findActiveByEvent(event: WebhookEvent): Promise<IWebhook[]> {
    return this.model.find({ events: event, isActive: true }).exec();
  }
}

export default new WebhookRepository();
