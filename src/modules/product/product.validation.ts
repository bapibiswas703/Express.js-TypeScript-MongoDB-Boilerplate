import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).allow(''),
  price: Joi.number().min(0).required(),
  category: Joi.string().hex().length(24).required(),
  stock: Joi.number().integer().min(0),
  image: Joi.string().uri().allow(''),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(2000).allow(''),
  price: Joi.number().min(0),
  category: Joi.string().hex().length(24),
  stock: Joi.number().integer().min(0),
  image: Joi.string().uri().allow(''),
  isActive: Joi.boolean(),
}).min(1);
