import Stripe from 'stripe';
import prisma from '../config/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createProSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get the origin from request headers or use a default
    const origin = req.get('origin') || req.get('referer') || `https://${req.get('host')}`;
    
    // Ensure the origin has a valid scheme
    const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_PRO_PRICE_ID || 'price_1QUT2z2a6i5gf1yhIgG4xDtf',
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancel`,
      metadata: {
        userId
      }
    });

    res.json({
      message: 'Checkout session created',
      checkoutUrl: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    next(error);
  }
};

export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const user = req.user;

    if (user.subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
        
        return res.json({
          tier: user.subscriptionTier,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        });
      } catch (stripeError) {
        console.error('Stripe subscription retrieval error:', stripeError);
        // If subscription not found in Stripe, reset user's subscription
        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionTier: 'BASIC',
            subscriptionId: null
          }
        });
      }
    }

    // Get usage for basic tier
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await prisma.usageStats.findFirst({
      where: {
        userId: user.id,
        date: today
      }
    });

    res.json({
      tier: 'BASIC',
      dailyLimit: parseInt(process.env.BASIC_DAILY_LIMIT || '5'),
      usedToday: usage?.promptCount || 0,
      remainingToday: Math.max(0, parseInt(process.env.BASIC_DAILY_LIMIT || '5') - (usage?.promptCount || 0))
    });
  } catch (error) {
    next(error);
  }
};
