import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { createProSubscription, getSubscriptionStatus } from '../controllers/subscription.controller.js';

const router = express.Router();

router.post('/pro', authenticate, createProSubscription);
router.get('/status', authenticate, getSubscriptionStatus);

export default router;
