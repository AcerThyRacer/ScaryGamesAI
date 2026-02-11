/**
 * Database Module - JSON-based with structure for future MongoDB/PostgreSQL migration
 * Handles all data persistence for subscriptions, users, and gamification
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILES = {
    users: path.join(DATA_DIR, 'users.json'),
    subscriptions: path.join(DATA_DIR, 'subscriptions.json'),
    payments: path.join(DATA_DIR, 'payments.json'),
    battlepass: path.join(DATA_DIR, 'battlepass.json'),
    referrals: path.join(DATA_DIR, 'referrals.json'),
    achievements: path.join(DATA_DIR, 'achievements.json'),
    cults: path.join(DATA_DIR, 'cults.json'),
    analytics: path.join(DATA_DIR, 'analytics.json'),
    communityGoals: path.join(DATA_DIR, 'community_goals.json')
};

// Initialize empty databases
Object.values(DB_FILES).forEach(file => {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2));
    }
});

class Database {
    constructor() {
        this.cache = new Map();
        this.initCache();
    }

    initCache() {
        Object.keys(DB_FILES).forEach(key => {
            this.cache.set(key, this.readFile(DB_FILES[key]));
        });
    }

    readFile(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    writeFile(filePath, data) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    // Generic CRUD operations
    findAll(collection) {
        return this.cache.get(collection) || [];
    }

    findById(collection, id) {
        const data = this.findAll(collection);
        return data.find(item => item.id === id);
    }

    findOne(collection, query) {
        const data = this.findAll(collection);
        return data.find(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    }

    find(collection, query) {
        const data = this.findAll(collection);
        return data.filter(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    }

    create(collection, data) {
        const items = this.findAll(collection);
        const newItem = {
            id: this.generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...data
        };
        items.push(newItem);
        this.cache.set(collection, items);
        this.writeFile(DB_FILES[collection], items);
        return newItem;
    }

    update(collection, id, updates) {
        const items = this.findAll(collection);
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        
        items[index] = {
            ...items[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        this.cache.set(collection, items);
        this.writeFile(DB_FILES[collection], items);
        return items[index];
    }

    delete(collection, id) {
        const items = this.findAll(collection);
        const filtered = items.filter(item => item.id !== id);
        this.cache.set(collection, filtered);
        this.writeFile(DB_FILES[collection], filtered);
        return true;
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    // Specialized queries
    async getUserByEmail(email) {
        return this.findOne('users', { email: email.toLowerCase() });
    }

    async getActiveSubscription(userId) {
        return this.findOne('subscriptions', { 
            userId, 
            status: 'active',
            expiresAt: { $gt: new Date().toISOString() }
        });
    }

    async getUserBattlePass(userId) {
        let bp = this.findOne('battlepass', { userId });
        if (!bp) {
            bp = this.create('battlepass', {
                userId,
                level: 1,
                xp: 0,
                rewardsClaimed: [],
                streakDays: 0,
                lastLogin: new Date().toISOString()
            });
        }
        return bp;
    }

    async getLeaderboard(limit = 100) {
        const subscriptions = this.findAll('subscriptions')
            .filter(s => s.status === 'active')
            .sort((a, b) => b.streakDays - a.streakDays)
            .slice(0, limit);
        
        return subscriptions.map(sub => {
            const user = this.findById('users', sub.userId);
            return {
                username: user?.username || 'Unknown',
                tier: sub.tier,
                streakDays: sub.streakDays,
                totalDays: sub.totalDays
            };
        });
    }

    async getCommunityGoals() {
        const goals = this.findAll('communityGoals');
        const totalSubscribers = this.findAll('subscriptions').filter(s => s.status === 'active').length;
        
        return goals.map(goal => ({
            ...goal,
            current: totalSubscribers,
            progress: Math.min((totalSubscribers / goal.target) * 100, 100),
            isUnlocked: totalSubscribers >= goal.target
        }));
    }

    async getReferralStats(userId) {
        const referrals = this.find('referrals', { referrerId: userId });
        const successful = referrals.filter(r => r.converted);
        
        return {
            total: referrals.length,
            converted: successful.length,
            pending: referrals.length - successful.length,
            rewardsEarned: successful.reduce((sum, r) => sum + (r.rewardValue || 0), 0)
        };
    }
}

module.exports = new Database();
