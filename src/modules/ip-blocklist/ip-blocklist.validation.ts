import Joi from 'joi';

const ipOrCidr = Joi.string()
  .trim()
  .pattern(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/)
  .required()
  .messages({
    'string.pattern.base': 'Must be a valid IPv4 address or CIDR (e.g., 1.2.3.4 or 10.0.0.0/24)',
  });

export const blockIpSchema = Joi.object({
  ip: ipOrCidr,
  reason: Joi.string().trim().max(500).optional(),
  expiresAt: Joi.string().isoDate().optional(),
});
