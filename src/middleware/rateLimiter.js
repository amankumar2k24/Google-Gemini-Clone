import rateLimit from 'express-rate-limit';
import prisma from '../config/database.js';

export const checkDailyLimit = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (user.subscriptionTier === 'PRO') {
      return next();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.usageStats.findFirst({
      where: {
        userId: user.id,
        date: today
      }
    });

    const dailyLimit = parseInt(process.env.BASIC_DAILY_LIMIT || '5');
    
    if (usage && usage.promptCount >= dailyLimit) {
      return res.status(429).json({
        error: 'Daily limit exceeded',
        message: `Basic tier limited to ${dailyLimit} prompts per day`
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
});
