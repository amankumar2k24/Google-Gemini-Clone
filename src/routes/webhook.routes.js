// Webhook routes are now handled directly in server.js
// This file is kept for potential future webhook endpoints
import express from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Stripe webhook needs raw body
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

export default router;
