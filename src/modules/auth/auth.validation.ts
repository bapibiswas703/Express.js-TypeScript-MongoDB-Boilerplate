import Joi from 'joi';

const passwordRules = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/\d/, 'digit')
  .messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.name': 'Password must contain at least one {#name}',
  });

export const registerSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: passwordRules.required(),
  name: Joi.string().min(2).max(50).trim().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().max(128).required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().max(128).required(),
  newPassword: passwordRules.required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRules.required(),
});

export const socialLoginSchema = Joi.object({
  idToken: Joi.string().required(),
});

export const twoFactorVerifySchema = Joi.object({
  code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'Code must be exactly 6 digits',
    'string.pattern.base': 'Code must contain only digits',
  }),
});

export const twoFactorValidateSchema = Joi.object({
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().max(128).required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': 'Code must be exactly 6 digits',
    'string.pattern.base': 'Code must contain only digits',
  }),
});

export const twoFactorDisableSchema = Joi.object({
  password: Joi.string().max(128).required(),
  code: Joi.string().min(6).max(8).required(),
});
