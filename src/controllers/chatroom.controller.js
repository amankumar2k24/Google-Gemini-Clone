import prisma from '../config/database.js';
import { getRedisClient } from '../config/redis.js';
import { getMessageQueue } from '../config/queue.js';

const CACHE_TTL = 300; // 5 minutes

export const createChatroom = async (req, res, next) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;

    const chatroom = await prisma.chatroom.create({
      data: {
        title,
        userId
      }
    });

    // Invalidate cache
    const redis = getRedisClient();
    await redis.del(`chatrooms:${userId}`);

    res.status(201).json({
      message: 'Chatroom created successfully',
      chatroom
    });
  } catch (error) {
    next(error);
  }
};

export const getChatrooms = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const redis = getRedisClient();
    
    // Check cache first
    const cached = await redis.get(`chatrooms:${userId}`);
    if (cached) {
      return res.json({
        chatrooms: JSON.parse(cached),
        cached: true
      });
    }

    // Fetch from database
    const chatrooms = await prisma.chatroom.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    // Cache the result
    await redis.setEx(
      `chatrooms:${userId}`,
      CACHE_TTL,
      JSON.stringify(chatrooms)
    );

    res.json({
      chatrooms,
      cached: false
    });
  } catch (error) {
    next(error);
  }
};

export const getChatroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const chatroom = await prisma.chatroom.findFirst({
      where: {
        id,
        userId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!chatroom) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    res.json({ chatroom });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { id: chatroomId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Verify chatroom ownership
    const chatroom = await prisma.chatroom.findFirst({
      where: { id: chatroomId, userId }
    });

    if (!chatroom) {
      return res.status(404).json({ error: 'Chatroom not found' });
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        chatroomId,
        content,
        role: 'USER'
      }
    });

    // Update usage stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageStats.upsert({
      where: {
        userId_date: {
          userId,
          date: today
        }
      },
      update: {
        promptCount: { increment: 1 }
      },
      create: {
        userId,
        date: today,
        promptCount: 1
      }
    });

    // Queue message for Gemini processing
    const queue = getMessageQueue();
    await queue.add({
      chatroomId,
      messageId: userMessage.id,
      content
    });

    res.status(202).json({
      message: 'Message queued for processing',
      userMessage
    });
  } catch (error) {
    next(error);
  }
};
