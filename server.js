/**
 * ScaryGamesAI Enhanced Server
 * Supports static file serving and REST API
 */

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('./middleware/rate-limiter');
const { validateEnvironment } = require('./config/env');
const observability = require('./services/observability');

// Load .env automatically in development so OAuth vars (client_id/redirect_uri) work out of the box.
// In production, the environment should be injected by the host and .env loading is typically disabled.
if (process.env.NODE_ENV !== 'production') {
    try {
        // eslint-disable-next-line global-require
        require('dotenv').config();
    } catch {
        // dotenv is optional; if not installed, dev can still use shell env vars.
    }
}

validateEnvironment();
observability.init();

// Initialize express
const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '9999', 10);

// Middleware
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
);

const corsOptions = {
    origin(origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.size === 0) {
            if (!isProduction) return callback(null, true);
            return callback(new Error('CORS origin not allowed'));
        }

        if (allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204
};

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression({ threshold: 1024 }));

// Stripe webhooks must receive raw body for signature verification.
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply tiered rate limiting to all API routes
app.use('/api', rateLimit.tiered);

// Apply strict rate limiting to auth endpoints
app.use('/api/auth', rateLimit.strict);

// Apply search rate limiting to search endpoints
app.use('/api/search', rateLimit.search);

app.use('/api', observability.httpMetricsMiddleware());

// API cache policy alignment for origin and edge behavior.
app.use('/api', (req, res, next) => {
    if (req.method === 'GET' && req.path === '/health') {
        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
    } else {
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
});

// API Routes
const apiRoutes = require('./api');
app.use('/api', apiRoutes);

// Phase 1 & 2 AI Features - API Routes
const recommendationsRoutes = require('./api/recommendations');
const abTestingRoutes = require('./api/ab-testing');
const anticheatRoutes = require('./api/anticheat');
const dynamicInventoryRoutes = require('./api/dynamic-inventory');
const engagementRoutes = require('./api/engagement');
const smartBundlesRoutes = require('./api/smart-bundles');
const dynamicChallengesRoutes = require('./api/dynamic-challenges');

// Phase 2: Social Commerce & Competitive Economy
const marketplaceRoutes = require('./api/marketplace');
const limitedEditionRoutes = require('./api/limited-edition');
const guildsRoutes = require('./api/guilds');
const socialGiftingRoutes = require('./api/social-gifting');

app.use('/api/v1/recommendations', recommendationsRoutes);
app.use('/api/v1/ab', abTestingRoutes);
app.use('/api/v1/anticheat', anticheatRoutes);
app.use('/api/v1/inventory', dynamicInventoryRoutes);
app.use('/api/v1/engagement', engagementRoutes);
app.use('/api/v1/bundles', smartBundlesRoutes);
app.use('/api/v1/challenges', dynamicChallengesRoutes);

// Phase 2 Routes
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/drops', limitedEditionRoutes);
app.use('/api/v1/guilds', guildsRoutes);
app.use('/api/v1/gifting', socialGiftingRoutes);

// Phase 3: Battle Pass Evolution & Crafting
const battlePassRoutes = require('./api/battle-pass');
const craftingSystemRoutes = require('./api/crafting-system');
const accelerationRoutes = require('./api/acceleration');

// Phase 4: Cross-Platform Progression
const universalProgressionRoutes = require('./api/universal-progression');
const currencyConversionRoutes = require('./api/currency-conversion');
const mobileCompanionRoutes = require('./api/mobile-companion');

app.use('/api/v1/battle-pass', battlePassRoutes);
app.use('/api/v1/crafting', craftingSystemRoutes);
app.use('/api/v1/acceleration', accelerationRoutes);

// Phase 4 Routes
app.use('/api/v1/progression', universalProgressionRoutes);
app.use('/api/v1/currency', currencyConversionRoutes);
app.use('/api/v1/mobile', mobileCompanionRoutes);

// Phase 1: Cross-Game Meta-Progression (NEW)
const universalProfileRoutes = require('./api/universal-profile');
const matchmakingRoutes = require('./api/matchmaking');

// Phase 2: Interconnected Narrative (NEW)
const loreSystemRoutes = require('./api/lore-system');
const crossGameEventsRoutes = require('./api/cross-game-events');

// Phase 1 Routes
app.use('/api/v1/profile', universalProfileRoutes);
app.use('/api/v1/matchmaking', matchmakingRoutes);

// Phase 2 Routes
app.use('/api/v1/lore', loreSystemRoutes);
app.use('/api/v1/events', crossGameEventsRoutes);

// Static file serving
const cacheableAssetExts = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp3', '.wav', '.ogg', '.woff', '.woff2', '.mp4', '.webm', '.json', '.webp', '.avif']);
const hashedAssetNameRe = /-[A-Za-z0-9_-]{8,}\./;

function setStaticCacheHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    const isHashedAsset = hashedAssetNameRe.test(basename);

    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (cacheableAssetExts.has(ext)) {
        if (isHashedAsset) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=120');
        }
        return;
    }

    if (ext === '.html' || !ext) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        return;
    }

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
}

app.use(express.static(__dirname, {
    setHeaders: setStaticCacheHeaders,
    fallthrough: true
}));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();

    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) next(err);
    });
});

// Error handling
app.use((err, req, res, next) => {
    observability.captureException(err, {
        tags: {
            surface: 'server-express'
        },
        extra: {
            path: req?.path,
            method: req?.method
        }
    });

    console.error('Server error:', err?.message || 'Unknown error');
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize demo user and data
function initializeDemoData() {
    const db = require('./models/database');
    
	// Create demo user if not exists
	const demoUser = db.findOne('users', { id: 'demo-user' });
	if (!demoUser) {
		db.create('users', {
			id: 'demo-user',
			username: 'DemoUser',
			email: 'demo@scarygames.ai',
			authToken: process.env.NODE_ENV !== 'production' ? 'demo-token' : null,
			createdAt: new Date().toISOString()
		});
		console.log('✅ Demo user created');
	}

    // Initialize community goals if not exists
    const goals = db.findAll('communityGoals');
    if (goals.length === 0) {
        const defaultGoals = [
            { target: 1000, reward: 'New Horror Theme', description: 'Unlock the Blood Moon theme for all users' },
            { target: 5000, reward: 'Exclusive Mini-Game', description: 'Unlock the Secret Laboratory mini-game' },
            { target: 10000, reward: 'Community-Designed Boss', description: 'Vote on and fight a community-created boss' },
            { target: 50000, reward: 'Full New Game', description: 'Unlock an entirely new horror game' }
        ];
        defaultGoals.forEach(g => db.create('communityGoals', g));
        console.log('✅ Community goals initialized');
    }
}

let shuttingDown = false;
async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
        try {
            await observability.shutdown();
        } finally {
            process.exit(0);
        }
    });

    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
    console.log(`
🎃 =========================================
   ScaryGamesAI Enhanced Server v2.0
   Running at http://localhost:${PORT}
=========================================
`);
    
    // Initialize data
    try {
        initializeDemoData();
    } catch (e) {
        console.error('Failed to initialize demo data:', e.message);
    }
});

module.exports = app;
