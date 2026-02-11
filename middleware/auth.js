/**
 * Authentication Middleware
 * Handles JWT validation and user extraction
 * For demo: uses simple session/token approach
 */

const db = require('../models/database');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            // For development: allow demo user
            if (process.env.NODE_ENV === 'development') {
                req.user = { id: 'demo-user', username: 'DemoUser', email: 'demo@scarygames.ai' };
                return next();
            }
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1]; // Bearer TOKEN

        // Verify token (simplified - in production use JWT)
        if (token === 'demo-token') {
            req.user = { id: 'demo-user', username: 'DemoUser', email: 'demo@scarygames.ai' };
            return next();
        }

        // Try to find user by token (simplified)
        // In production: jwt.verify(token, process.env.JWT_SECRET)
        const user = db.findOne('users', { authToken: token });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = authMiddleware;
