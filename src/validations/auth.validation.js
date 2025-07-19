import Joi from 'joi';

export const authValidation = {
  signup: Joi.object({
    mobileNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
    name: Joi.string().min(2).max(50).optional(),
    password: Joi.string().min(6).optional()
  }),

  sendOTP: Joi.object({
    mobileNumber: Joi.string().pattern(/^[0-9]{10}$/).required()
  }),

  verifyOTP: Joi.object({
    mobileNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
    otp: Joi.string().length(6).required()
  }),

  forgotPassword: Joi.object({
    mobileNumber: Joi.string().pattern(/^[0-9]{10}$/).required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().optional(),
    newPassword: Joi.string().min(6).required()
  })
};
