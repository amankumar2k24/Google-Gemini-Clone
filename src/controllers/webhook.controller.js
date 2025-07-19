import Stripe from 'stripe';
import prisma from '../config/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // Log incoming webhook for debugging
  console.log('Webhook received:', {
    hasSignature: !!sig,
    headers: req.headers,
    bodyType: typeof req.body
  });

  try {
    // Ensure we have the raw body
    if (!req.body || typeof req.body !== 'string' && !Buffer.isBuffer(req.body)) {
      console.error('Invalid body type:', typeof req.body);
      return res.status(400).send('Webhook Error: Invalid request body');
    }

    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log the event type
  console.log('Webhook event type:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error('No userId in session metadata');
          break;
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: 'PRO',
            subscriptionId: session.subscription
          }
        });
        
        console.log(`User ${userId} upgraded to PRO`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        await prisma.user.updateMany({
          where: { subscriptionId: subscription.id },
          data: {
            subscriptionTier: 'BASIC',
            subscriptionId: null
          }
        });
        
        console.log(`Subscription ${subscription.id} cancelled`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          await prisma.user.updateMany({
            where: { subscriptionId: subscription.id },
            data: {
              subscriptionTier: 'BASIC',
              subscriptionId: null
            }
          });
          
          console.log(`Subscription ${subscription.id} status changed to ${subscription.status}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
