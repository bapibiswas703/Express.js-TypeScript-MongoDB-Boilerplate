import Joi from 'joi';
import { ALL_PERMISSIONS } from '../../common/constants/permissions';

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(200).allow(''),
  permissions: Joi.array()
    .items(Joi.string().valid(...ALL_PERMISSIONS))
    .min(1)
    .required(),
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  description: Joi.string().max(200).allow(''),
  permissions: Joi.array()
    .items(Joi.string().valid(...ALL_PERMISSIONS))
    .min(1),
  isActive: Joi.boolean(),
}).min(1);
