import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import chatroomRoutes from './routes/chatroom.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import { handleStripeWebhook } from './controllers/webhook.controller.js';
import { initializeRedis } from './config/redis.js';
import { initializeQueue } from './config/queue.js';

// Load environment variables first
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Gemini Backend Clone API',
    timestamp: new Date().toISOString() 
  });
});

// IMPORTANT: Stripe webhook route MUST come before express.json() middleware
// This preserves the raw body for signature verification
app.post('/webhook/stripe', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);

// JSON middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (excluding webhooks)
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/chatroom', chatroomRoutes);
app.use('/subscribe', subscriptionRoutes);
app.use('/subscription', subscriptionRoutes);

// 404 handler
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services
const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Initialize Redis (but don't fail if it's not available)
    try {
      await initializeRedis();
    } catch (error) {
      console.error('Redis initialization failed:', error.message);
      console.log('Continuing without Redis...');
    }
    
    // Initialize Queue (but don't fail if it's not available)
    try {
      await initializeQueue();
    } catch (error) {
      console.error('Queue initialization failed:', error.message);
      console.log('Continuing without queue...');
    }
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('\nAvailable routes:');
      console.log('  POST /auth/signup');
      console.log('  POST /auth/send-otp');
      console.log('  POST /auth/verify-otp');
      console.log('  POST /auth/forgot-password');
      console.log('  POST /auth/change-password');
      console.log('  GET  /user/me');
      console.log('  POST /chatroom');
      console.log('  GET  /chatroom');
      console.log('  GET  /chatroom/:id');
      console.log('  POST /chatroom/:id/message');
      console.log('  POST /subscribe/pro');
      console.log('  GET  /subscription/status');
      console.log('  POST /webhook/stripe');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
