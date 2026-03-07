/**
 * LEADERBOARD API SERVER
 * RESTful API for score submission and leaderboard retrieval
 * 
 * Usage: node leaderboard-api.js
 * Requires: npm install express cors
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.LEADERBOARD_PORT || 3001;
const DATA_FILE = path.join(__dirname, 'leaderboard-data.json');

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (replace with real database in production)
let leaderboardData = {
    speedrun: [],
    score: [],
    survival: []
};

// Load existing data
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            leaderboardData = JSON.parse(data);
            console.log('[LeaderboardAPI] Loaded existing data');
        }
    } catch (error) {
        console.error('[LeaderboardAPI] Failed to load data:', error);
    }
}

// Save data to disk
function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(leaderboardData, null, 2));
    } catch (error) {
        console.error('[LeaderboardAPI] Failed to save data:', error);
    }
}

// Initialize
loadData();

/**
 * Validate score (anti-cheat)
 */
function validateScore(scoreData) {
    const { score, time, category } = scoreData;
    
    // Basic validation
    if (typeof score !== 'number' || score < 0) {
        return { valid: false, reason: 'Invalid score value' };
    }
    
    if (typeof time !== 'string' || !time.match(/^\d+:\d{2}\.\d{2}$/)) {
        return { valid: false, reason: 'Invalid time format' };
    }
    
    // Check for impossible scores (basic anti-cheat)
    const maxScores = {
        speedrun: 100000,
        score: 1000000,
        survival: 500000
    };
    
    const maxScore = maxScores[category] || 0;
    if (score > maxScore) {
        return { valid: false, reason: 'Score exceeds maximum possible value' };
    }
    
    // Parse time and check if reasonable
    const timeParts = time.split(':');
    const minutes = parseInt(timeParts[0]);
    const seconds = parseFloat(timeParts[1]);
    const totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds < 30) {
        return { valid: false, reason: 'Time too fast to be legitimate' };
    }
    
    return { valid: true };
}

/**
 * GET /api/leaderboard/:category
 * Get leaderboard for category
 */
app.get('/api/leaderboard/:category', (req, res) => {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    if (!leaderboardData[category]) {
        return res.status(400).json({
            error: 'Invalid category',
            validCategories: Object.keys(leaderboardData)
        });
    }
    
    // Sort by score descending
    const sorted = [...leaderboardData[category]]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    
    // Add ranks
    const ranked = sorted.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));
    
    res.json(ranked);
});

/**
 * POST /api/leaderboard/submit
 * Submit new score
 */
app.post('/api/leaderboard/submit', (req, res) => {
    const { player, score, time, category } = req.body;
    
    // Validate required fields
    if (!player || score === undefined || !time) {
        return res.status(400).json({
            error: 'Missing required fields',
            required: ['player', 'score', 'time']
        });
    }
    
    const validCategory = category || 'speedrun';
    
    if (!leaderboardData[validCategory]) {
        return res.status(400).json({
            error: 'Invalid category',
            validCategories: Object.keys(leaderboardData)
        });
    }
    
    // Validate score
    const validation = validateScore({
        player,
        score,
        time,
        category: validCategory
    });
    
    if (!validation.valid) {
        return res.status(403).json({
            error: 'Score validation failed',
            reason: validation.reason
        });
    }
    
    // Create score entry
    const entry = {
        player,
        score,
        time,
        category: validCategory,
        timestamp: Date.now(),
        verified: true
    };
    
    // Add to leaderboard
    leaderboardData[validCategory].push(entry);
    
    // Sort and keep top 1000
    leaderboardData[validCategory] = leaderboardData[validCategory]
        .sort((a, b) => b.score - a.score)
        .slice(0, 1000);
    
    // Save to disk
    saveData();
    
    // Calculate player rank
    const rank = leaderboardData[validCategory].findIndex(e => 
        e.player === player && e.score === score && e.time === time
    ) + 1;
    
    console.log('[LeaderboardAPI] New score:', player, score, 'in', validCategory);
    
    res.json({
        success: true,
        rank: rank,
        total: leaderboardData[validCategory].length
    });
});

/**
 * GET /api/leaderboard/player/:playerId
 * Get player's best scores
 */
app.get('/api/leaderboard/player/:playerId', (req, res) => {
    const { playerId } = req.params;
    
    const playerScores = {};
    
    Object.keys(leaderboardData).forEach(category => {
        const scores = leaderboardData[category]
            .filter(entry => entry.player === playerId)
            .sort((a, b) => b.score - a.score);
        
        if (scores.length > 0) {
            playerScores[category] = {
                best: scores[0],
                total: scores.length,
                recent: scores.slice(0, 5)
            };
        }
    });
    
    if (Object.keys(playerScores).length === 0) {
        return res.json({
            player: playerId,
            scores: [],
            message: 'No scores found for this player'
        });
    }
    
    res.json({
        player: playerId,
        scores: playerScores
    });
});

/**
 * DELETE /api/leaderboard/clear
 * Clear leaderboard (admin only - add auth in production)
 */
app.delete('/api/leaderboard/clear', (req, res) => {
    // In production, add authentication here
    
    const { category } = req.query;
    
    if (category) {
        if (leaderboardData[category]) {
            leaderboardData[category] = [];
            console.log('[LeaderboardAPI] Cleared category:', category);
        } else {
            return res.status(400).json({ error: 'Invalid category' });
        }
    } else {
        Object.keys(leaderboardData).forEach(cat => {
            leaderboardData[cat] = [];
        });
        console.log('[LeaderboardAPI] Cleared all leaderboards');
    }
    
    saveData();
    
    res.json({ success: true });
});

/**
 * GET /api/stats
 * Get leaderboard statistics
 */
app.get('/api/stats', (req, res) => {
    const stats = {
        totalScores: 0,
        totalPlayers: new Set(),
        byCategory: {}
    };
    
    Object.keys(leaderboardData).forEach(category => {
        const scores = leaderboardData[category];
        stats.byCategory[category] = {
            total: scores.length,
            topScore: scores.length > 0 ? scores[0].score : 0,
            topPlayer: scores.length > 0 ? scores[0].player : null,
            averageScore: scores.length > 0 ? 
                Math.round(scores.reduce((sum, e) => sum + e.score, 0) / scores.length) : 0
        };
        
        stats.totalScores += scores.length;
        scores.forEach(entry => stats.totalPlayers.add(entry.player));
    });
    
    stats.totalPlayers = stats.totalPlayers.size;
    
    res.json(stats);
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, () => {
    console.log('==========================================');
    console.log('Leaderboard API Server Started');
    console.log('==========================================');
    console.log('HTTP API: http://localhost:' + PORT);
    console.log('Data file:', DATA_FILE);
    console.log('==========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[LeaderboardAPI] Shutting down...');
    saveData();
    process.exit(0);
});
