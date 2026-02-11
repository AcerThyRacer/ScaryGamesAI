/**
 * API Routes Index
 * Combines all API routes
 */

const express = require('express');
const router = express.Router();

// Import route modules
const subscriptionRoutes = require('./subscriptions');
const referralRoutes = require('./referrals');

// Mount routes
router.use('/subscriptions', subscriptionRoutes);
router.use('/referrals', referralRoutes);

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Webhook handler for Stripe
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle events
    const paymentService = require('../services/paymentService');

    switch (event.type) {
        case 'checkout.session.completed':
            await paymentService.handleCheckoutCompleted(event.data.object);
            break;
        
        case 'invoice.payment_failed':
            // Handle failed payment
            console.error('Payment failed:', event.data.object);
            break;
        
        case 'customer.subscription.deleted':
            // Handle cancellation
            console.log('Subscription canceled:', event.data.object);
            break;
    }

    res.json({ received: true });
});

module.exports = router;
