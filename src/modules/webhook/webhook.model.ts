import mongoose, { Schema, type Document } from 'mongoose';

export const WEBHOOK_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'product.created',
  'product.updated',
  'product.deleted',
  'category.created',
  'category.updated',
  'category.deleted',
  'order.created',
  'order.updated',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface IWebhook extends Document {
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    url: { type: String, required: true },
    events: { type: [String], required: true, index: true },
    secret: { type: String, required: true },
    isActive: { type: Boolean, default: true, index: true },
    description: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

webhookSchema.index({ createdBy: 1 });

export default mongoose.model<IWebhook>('Webhook', webhookSchema);
