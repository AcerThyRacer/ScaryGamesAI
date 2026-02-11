/**
 * Setup Script - Initialize ScaryGamesAI
 * Run with: npm run setup
 */

const fs = require('fs');
const path = require('path');

console.log('🎃 ScaryGamesAI Setup');
console.log('=====================\n');

// Check if .env exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
    console.log('📄 Creating .env file from template...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please edit it with your configuration.\n');
} else {
    console.log('✅ .env file already exists\n');
}

// Create data directory
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Data directory created');
}

// Initialize database files
const dbFiles = [
    'users.json',
    'subscriptions.json',
    'payments.json',
    'battlepass.json',
    'referrals.json',
    'achievements.json',
    'cults.json',
    'analytics.json',
    'community_goals.json'
];

dbFiles.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        console.log(`✅ Created ${file}`);
    }
});

// Initialize community goals
const goalsPath = path.join(dataDir, 'community_goals.json');
const goals = JSON.parse(fs.readFileSync(goalsPath, 'utf8'));

if (goals.length === 0) {
    const defaultGoals = [
        { 
            id: 'goal-1',
            target: 1000, 
            reward: 'New Horror Theme', 
            description: 'Unlock the Blood Moon theme for all users',
            current: 0,
            unlocked: false
        },
        { 
            id: 'goal-2',
            target: 5000, 
            reward: 'Exclusive Mini-Game', 
            description: 'Unlock the Secret Laboratory mini-game',
            current: 0,
            unlocked: false
        },
        { 
            id: 'goal-3',
            target: 10000, 
            reward: 'Community-Designed Boss', 
            description: 'Vote on and fight a community-created boss',
            current: 0,
            unlocked: false
        },
        { 
            id: 'goal-4',
            target: 50000, 
            reward: 'Full New Game', 
            description: 'Unlock an entirely new horror game',
            current: 0,
            unlocked: false
        }
    ];
    
    fs.writeFileSync(goalsPath, JSON.stringify(defaultGoals, null, 2));
    console.log('✅ Community goals initialized');
}

// Create demo user
const usersPath = path.join(dataDir, 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

const demoUserExists = users.find(u => u.id === 'demo-user');
if (!demoUserExists) {
    users.push({
        id: 'demo-user',
        username: 'DemoUser',
        email: 'demo@scarygames.ai',
        authToken: 'demo-token',
        createdAt: new Date().toISOString(),
        horrorCoins: 0,
        inventory: [],
        title: null,
        isEternal: false
    });
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    console.log('✅ Demo user created');
}

console.log('\n🚀 Setup complete!');
console.log('Run "npm start" to launch the server.');
console.log('\nDemo credentials:');
console.log('  Token: demo-token');
console.log('  User: DemoUser');
