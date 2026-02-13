/**
 * API Routes Index
 * Combines all API routes
 */

const express = require('express');
const router = express.Router();

// Import route modules
const subscriptionRoutes = require('./subscriptions');
const referralRoutes = require('./referrals');
const storeRoutes = require('./store');
const marketplaceRoutes = require('./marketplace');
const giftRoutes = require('./gifts');
const loyaltyRoutes = require('./loyalty');
const adsRoutes = require('./ads');
const revenueRoutes = require('./revenue');
const authRoutes = require('./auth');
const featureFlagRoutes = require('./feature-flags');
const dailyActivityRoutes = require('./daily-activity');
const firstTimeBonusesRoutes = require('./first-time-bonuses');
const engagementRoutes = require('./engagement');

const dataAccess = require('../models/data-access');
const cacheService = require('../services/cacheService');
const postgres = require('../models/postgres');
const { appendAuditEvent, makeId } = require('../services/economyMutationService');
const { createRateLimiter } = require('../middleware/rateLimit');
const { apiVersionMiddleware } = require('../middleware/apiVersion');

function mountDomainRoutes(targetRouter) {
    targetRouter.use('/subscriptions', subscriptionRoutes);
    targetRouter.use('/referrals', referralRoutes);
    targetRouter.use('/store', storeRoutes);
    targetRouter.use('/marketplace', marketplaceRoutes);
    targetRouter.use('/gifts', giftRoutes);
    targetRouter.use('/loyalty', loyaltyRoutes);
    targetRouter.use('/ads', adsRoutes);
    targetRouter.use('/revenue', revenueRoutes);
    targetRouter.use('/auth', authRoutes);
    targetRouter.use('/feature-flags', featureFlagRoutes);
    targetRouter.use('/daily-activity', dailyActivityRoutes);
    targetRouter.use('/first-time-bonuses', firstTimeBonusesRoutes);
    targetRouter.use('/engagement', engagementRoutes);
}

async function safeAppendAuditEvent(payload) {
    if (!postgres.isEnabled()) return;
    try {
        await appendAuditEvent(payload);
    } catch (error) {
        console.error('[stripe-webhook] WEBHOOK_AUDIT_APPEND_FAILED', {
            eventId: payload?.entityId || null,
            message: error.message
        });
    }
}

const shouldSkipRateLimit = (req) => req.method === 'GET' && req.path === '/health';

const defaultApiLimiter = createRateLimiter({
    scope: 'api-default',
    limit: parseInt(process.env.RATE_LIMIT_API_PER_MINUTE || '240', 10),
    windowSeconds: 60,
    includeUser: true,
    skip: shouldSkipRateLimit
});

router.use(defaultApiLimiter);
router.use(apiVersionMiddleware);
mountDomainRoutes(router);

const v1Router = express.Router();
v1Router.use(apiVersionMiddleware);
v1Router.use(createRateLimiter({
    scope: 'api-v1',
    limit: parseInt(process.env.RATE_LIMIT_API_V1_PER_MINUTE || '180', 10),
    windowSeconds: 60,
    includeUser: true,
    skip: shouldSkipRateLimit
}));
mountDomainRoutes(v1Router);
router.use('/v1', v1Router);

const v2Router = express.Router();
v2Router.use(apiVersionMiddleware);
v2Router.use(createRateLimiter({
    scope: 'api-v2',
    limit: parseInt(process.env.RATE_LIMIT_API_V2_PER_MINUTE || '300', 10),
    windowSeconds: 60,
    includeUser: true,
    skip: shouldSkipRateLimit
}));
mountDomainRoutes(v2Router);
router.use('/v2', v2Router);

// Health check
router.get('/health', async (req, res) => {
    try {
        const dataHealth = await dataAccess.health();
        const cacheHealth = cacheService.status();

        const ok = dataHealth.postgres.ok || !dataHealth.postgres.enabled;

        res.status(ok ? 200 : 503).json({
            status: ok ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            data: dataHealth,
            cache: cacheHealth
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            error: error.message
        });
    }
});

async function acquireWebhookEventLock(eventId) {
    if (!eventId) return { accepted: false, reason: 'MISSING_EVENT_ID' };

    if (!postgres.isEnabled()) {
        global.__stripeWebhookEventsSeen = global.__stripeWebhookEventsSeen || new Map();
        const seenMap = global.__stripeWebhookEventsSeen;
        const now = Date.now();
        const ttlMs = 48 * 60 * 60 * 1000;

        for (const [id, ts] of seenMap.entries()) {
            if (now - ts > ttlMs) seenMap.delete(id);
        }

        if (seenMap.has(eventId)) {
            return { accepted: false, reason: 'DUPLICATE_EVENT' };
        }

        seenMap.set(eventId, now);
        return { accepted: true, reason: 'NEW_EVENT' };
    }

    try {
        const record = await dataAccess.createIdempotencyKey({
            id: makeId('whk'),
            scope: 'stripe.webhook.event',
            key: String(eventId),
            requestHash: null,
            status: 'in_progress',
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        });

        if (!record) return { accepted: false, reason: 'IDEMPOTENCY_ERROR' };
        return { accepted: !!record.inserted, reason: record.inserted ? 'NEW_EVENT' : 'DUPLICATE_EVENT' };
    } catch (error) {
        return { accepted: false, reason: 'IDEMPOTENCY_ERROR', error };
    }
}

async function finalizeWebhookEvent(eventId, status, responseBody) {
    if (!eventId || !postgres.isEnabled()) return;
    try {
        await dataAccess.updateIdempotencyKeyResult({
            scope: 'stripe.webhook.event',
            key: String(eventId),
            status,
            responseCode: status === 'succeeded' ? 200 : 500,
            responseBody
        });
    } catch (error) {
        console.error('[stripe-webhook] WEBHOOK_EVENT_FINALIZE_FAILED', {
            eventId,
            message: error.message
        });
    }
}

// Webhook handler for Stripe
router.post('/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
        console.error('[stripe-webhook] WEBHOOK_SIGNATURE_CONFIG_INVALID', {
            hasSignatureHeader: !!sig,
            hasEndpointSecret: !!endpointSecret
        });
        return res.status(400).json({
            success: false,
            error: { code: 'WEBHOOK_SIGNATURE_CONFIG_INVALID', message: 'Webhook signature verification is not configured' }
        });
    }

    let event;
    try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('[stripe-webhook] WEBHOOK_SIGNATURE_VERIFICATION_FAILED', {
            message: err.message
        });
        return res.status(400).json({
            success: false,
            error: { code: 'WEBHOOK_SIGNATURE_VERIFICATION_FAILED', message: 'Webhook signature verification failed' }
        });
    }

    const eventId = event?.id ? String(event.id) : null;
    const lock = await acquireWebhookEventLock(eventId);
    if (!lock.accepted) {
        if (lock.reason === 'DUPLICATE_EVENT') {
            return res.status(200).json({ success: true, duplicate: true, eventId });
        }

        console.error('[stripe-webhook] WEBHOOK_EVENT_LOCK_FAILED', {
            eventId,
            reason: lock.reason,
            message: lock.error?.message || null
        });
        return res.status(500).json({
            success: false,
            error: { code: 'WEBHOOK_EVENT_LOCK_FAILED', message: 'Unable to lock webhook event for processing' }
        });
    }

    const paymentService = require('../services/paymentService');

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await paymentService.handleCheckoutCompleted(event.data.object, {
                    source: 'stripe_webhook',
                    eventId,
                    requestId: req.header('x-request-id') || null
                });
                break;

            case 'invoice.payment_failed':
                console.error('[stripe-webhook] STRIPE_INVOICE_PAYMENT_FAILED', {
                    eventId,
                    invoiceId: event?.data?.object?.id || null,
                    customerId: event?.data?.object?.customer || null
                });
                break;

            case 'customer.subscription.deleted':
                console.log('[stripe-webhook] STRIPE_SUBSCRIPTION_DELETED', {
                    eventId,
                    subscriptionId: event?.data?.object?.id || null,
                    customerId: event?.data?.object?.customer || null
                });
                break;

            default:
                console.log('[stripe-webhook] STRIPE_EVENT_IGNORED', {
                    eventId,
                    eventType: event.type
                });
                break;
        }

        await safeAppendAuditEvent({
            actorUserId: null,
            targetUserId: null,
            entityType: 'stripe_webhook_event',
            entityId: eventId,
            eventType: 'stripe.webhook.processed',
            severity: 'info',
            requestId: req.header('x-request-id') || null,
            idempotencyKey: eventId,
            metadata: {
                eventType: event.type
            }
        });

        await finalizeWebhookEvent(eventId, 'succeeded', { eventType: event.type });
        return res.status(200).json({ success: true, received: true, eventId });
    } catch (error) {
        console.error('[stripe-webhook] WEBHOOK_PROCESSING_FAILED', {
            eventId,
            eventType: event?.type,
            code: error.code || 'WEBHOOK_PROCESSING_FAILED',
            message: error.message
        });

        await safeAppendAuditEvent({
            actorUserId: null,
            targetUserId: null,
            entityType: 'stripe_webhook_event',
            entityId: eventId,
            eventType: 'stripe.webhook.failed',
            severity: 'error',
            message: error.message,
            requestId: req.header('x-request-id') || null,
            idempotencyKey: eventId,
            metadata: {
                eventType: event?.type,
                errorCode: error.code || 'WEBHOOK_PROCESSING_FAILED'
            }
        });

        await finalizeWebhookEvent(eventId, 'failed', {
            code: error.code || 'WEBHOOK_PROCESSING_FAILED',
            message: error.message
        });

        return res.status(500).json({
            success: false,
            error: {
                code: 'WEBHOOK_PROCESSING_FAILED',
                message: 'Webhook processing failed'
            }
        });
    }
});

module.exports = router;
