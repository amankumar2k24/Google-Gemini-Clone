import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCurrentUser } from '../controllers/user.controller.js';

const router = express.Router();

router.get('/me', authenticate, getCurrentUser);

export default router;
