import Joi from 'joi';
import { WEBHOOK_EVENTS } from './webhook.model';

export const createWebhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array()
    .items(Joi.string().valid(...WEBHOOK_EVENTS))
    .min(1)
    .required(),
  description: Joi.string().trim().max(500).optional(),
});

export const updateWebhookSchema = Joi.object({
  url: Joi.string().uri().optional(),
  events: Joi.array()
    .items(Joi.string().valid(...WEBHOOK_EVENTS))
    .min(1)
    .optional(),
  description: Joi.string().trim().max(500).optional().allow(''),
  isActive: Joi.boolean().optional(),
}).min(1);
