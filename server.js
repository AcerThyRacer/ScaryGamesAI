/**
 * ScaryGamesAI Enhanced Server
 * Supports static file serving and REST API
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// Initialize express
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 9999;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
const apiRoutes = require('./api');
app.use('/api', apiRoutes);

// Static file serving
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
};

// Serve static files with proper MIME types
app.use((req, res, next) => {
    // Skip API routes
    if (req.url.startsWith('/api')) return next();

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // If path is a directory, try index.html inside it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Try to serve index.html for SPA routing
                const indexPath = path.join(__dirname, 'index.html');
                fs.readFile(indexPath, (err2, indexContent) => {
                    if (err2) {
                        res.status(404).send('<h1>404 - Not Found</h1>');
                    } else {
                        res.setHeader('Content-Type', 'text/html');
                        res.send(indexContent);
                    }
                });
            } else {
                res.status(500).send(`Server Error: ${err.code}`);
            }
        } else {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.send(content);
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
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
