import express from 'express';
import { signup, sendOTP, verifyOTP, forgotPassword, changePassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authValidation } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/signup', validate(authValidation.signup), signup);
router.post('/send-otp', validate(authValidation.sendOTP), sendOTP);
router.post('/verify-otp', validate(authValidation.verifyOTP), verifyOTP);
router.post('/forgot-password', validate(authValidation.forgotPassword), forgotPassword);
router.post('/change-password', authenticate, validate(authValidation.changePassword), changePassword);

export default router;
