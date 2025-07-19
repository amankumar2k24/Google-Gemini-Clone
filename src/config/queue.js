import Bull from 'bull';
import { processGeminiMessage } from '../services/gemini.service.js';

let messageQueue = null;

export const initializeQueue = async () => {
  try {
    const redisConfig = {
      redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 3) {
            return null;
          }
          return Math.min(times * 100, 3000);
        }
      }
    };

    messageQueue = new Bull('gemini-messages', redisConfig);

    // Process messages
    messageQueue.process(async (job) => {
      const { chatroomId, messageId, content } = job.data;
      return await processGeminiMessage(chatroomId, messageId, content);
    });

    messageQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed`);
    });

    messageQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err.message);
    });

    messageQueue.on('error', (error) => {
      console.error('Queue error:', error.message);
    });

    // Test the connection
    await messageQueue.isReady();
    console.log('✅ Message queue initialized');
  } catch (error) {
    console.error('Queue initialization error:', error.message);
    throw error;
  }
};

export const getMessageQueue = () => {
  if (!messageQueue) {
    console.warn('Message queue not available');
    return null;
  }
  return messageQueue;
};


