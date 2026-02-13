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
const { validateEnvironment } = require('./config/env');
const observability = require('./services/observability');

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
            authToken: 'demo-token',
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
