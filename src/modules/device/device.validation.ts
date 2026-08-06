import Joi from 'joi';

export const updateDeviceSchema = Joi.object({
  deviceName: Joi.string().min(1).max(100).required(),
});
