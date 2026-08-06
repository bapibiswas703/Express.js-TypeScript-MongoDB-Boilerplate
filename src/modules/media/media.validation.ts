import Joi from 'joi';

export const uploadMediaSchema = Joi.object({
  folder: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});
