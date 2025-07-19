import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { checkDailyLimit } from '../middleware/rateLimiter.js';
import {
  createChatroom,
  getChatrooms,
  getChatroom,
  sendMessage
} from '../controllers/chatroom.controller.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createChatroom);
router.get('/', getChatrooms);
router.get('/:id', getChatroom);
router.post('/:id/message', checkDailyLimit, sendMessage);

export default router;
