/**
 * Achievement System for The Abyss
 * Phase 1: Foundation & Player Experience
 * 
 * Features:
 * - 30+ achievements across categories
 * - Title system
 * - Profile customization
 * - Statistics tracking
 * - Steam/Platform integration ready
 */

export class AchievementSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.achievements = {};
        this.titles = {};
        this.statistics = {};
        
        // Achievement categories
        this.categories = {
            progression: 'Progression',
            exploration: 'Exploration',
            survival: 'Survival',
            collection: 'Collection',
            skill: 'Skill',
            secret: 'Secret'
        };
        
        // Initialize all achievements
        this.initializeAchievements();
        this.initializeTitles();
        this.initializeStatistics();
    }
    
    /**
     * Initialize achievement system
     */
    async initialize() {
        console.log('🏆 Initializing achievement system...');
        
        // Load saved achievements
        await this.loadAchievements();
        
        // Load statistics
        await this.loadStatistics();
        
        // Check for achievement unlocks
        this.checkAllAchievements();
        
        console.log('✓ Achievement system initialized');
    }
    
    /**
     * Initialize all achievements
     */
    initializeAchievements() {
        // PROGRESSION ACHIEVEMENTS
        this.registerAchievement({
            id: 'first_dive',
            name: 'First Dive',
            description: 'Complete the tutorial',
            category: this.categories.progression,
            difficulty: 'easy',
            points: 10,
            icon: 'tutorial_complete',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'treasure_hunter',
            name: 'Treasure Hunter',
            description: 'Collect your first artifact',
            category: this.categories.progression,
            difficulty: 'easy',
            points: 10,
            icon: 'artifact_first',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'archaeologist',
            name: 'Archaeologist',
            description: 'Collect all artifacts in Campaign mode',
            category: this.categories.progression,
            difficulty: 'hard',
            points: 50,
            icon: 'artifact_all',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'historian',
            name: 'Historian',
            description: 'Find all data logs',
            category: this.categories.progression,
            difficulty: 'hard',
            points: 50,
            icon: 'logs_all',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'survivor',
            name: 'Survivor',
            description: 'Complete campaign without dying',
            category: this.categories.progression,
            difficulty: 'extreme',
            points: 100,
            icon: 'no_death',
            hidden: false
        });
        
        // EXPLORATION ACHIEVEMENTS
        this.registerAchievement({
            id: 'shallow_explorer',
            name: 'Shallow Explorer',
            description: 'Explore all areas in the Shallows (0-20m)',
            category: this.categories.exploration,
            difficulty: 'medium',
            points: 20,
            icon: 'biome_shallows',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'twilight_diver',
            name: 'Twilight Diver',
            description: 'Reach 50m depth',
            category: this.categories.exploration,
            difficulty: 'medium',
            points: 25,
            icon: 'depth_50',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'midnight_explorer',
            name: 'Midnight Explorer',
            description: 'Explore all areas in the Midnight Zone (50-100m)',
            category: this.categories.exploration,
            difficulty: 'hard',
            points: 40,
            icon: 'biome_midnight',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'abyssal_pioneer',
            name: 'Abyssal Pioneer',
            description: 'Reach 150m depth',
            category: this.categories.exploration,
            difficulty: 'hard',
            points: 50,
            icon: 'depth_150',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'hadal_zone',
            name: 'Into the Hadal',
            description: 'Reach the maximum depth (200m+)',
            category: this.categories.exploration,
            difficulty: 'extreme',
            points: 75,
            icon: 'depth_max',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'secret_cave',
            name: 'Hidden Depths',
            description: 'Discover a secret cave',
            category: this.categories.exploration,
            difficulty: 'medium',
            points: 30,
            icon: 'secret_location',
            hidden: true
        });
        
        this.registerAchievement({
            id: 'all_biomes',
            name: 'Biome Master',
            description: 'Visit all biomes in a single dive',
            category: this.categories.exploration,
            difficulty: 'hard',
            points: 40,
            icon: 'all_biomes',
            hidden: false
        });
        
        // SURVIVAL ACHIEVEMENTS
        this.registerAchievement({
            id: 'close_call',
            name: 'Close Call',
            description: 'Escape from a creature with less than 10 health',
            category: this.categories.survival,
            difficulty: 'medium',
            points: 25,
            icon: 'low_health_escape',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'oxygen_master',
            name: 'Oxygen Master',
            description: 'Complete a dive with less than 10% oxygen remaining',
            category: this.categories.survival,
            difficulty: 'hard',
            points: 35,
            icon: 'low_oxygen',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'predator_avoidance',
            name: 'Ghost',
            description: 'Complete a dive without being seen by creatures',
            category: this.categories.survival,
            difficulty: 'extreme',
            points: 75,
            icon: 'undetected',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'iron_lungs',
            name: 'Iron Lungs',
            description: 'Complete a dive without using air pockets',
            category: this.categories.survival,
            difficulty: 'hard',
            points: 40,
            icon: 'no_air_pockets',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'flare_master',
            name: 'Flare Master',
            description: 'Distract 10 creatures with flares',
            category: this.categories.survival,
            difficulty: 'medium',
            points: 30,
            icon: 'flare_distractions',
            hidden: false
        });
        
        // COLLECTION ACHIEVEMENTS
        this.registerAchievement({
            id: 'collector',
            name: 'Collector',
            description: 'Collect 50 artifacts',
            category: this.categories.collection,
            difficulty: 'medium',
            points: 30,
            icon: 'artifacts_50',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'hoarder',
            name: 'Hoarder',
            description: 'Collect 100 artifacts',
            category: this.categories.collection,
            difficulty: 'hard',
            points: 50,
            icon: 'artifacts_100',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'resourceful',
            name: 'Resourceful',
            description: 'Collect all upgrade materials',
            category: this.categories.collection,
            difficulty: 'hard',
            points: 40,
            icon: 'all_upgrades',
            hidden: false
        });
        
        // SKILL ACHIEVEMENTS
        this.registerAchievement({
            id: 'speed_demon',
            name: 'Speed Demon',
            description: 'Complete campaign in under 2 hours',
            category: this.categories.skill,
            difficulty: 'extreme',
            points: 100,
            icon: 'speedrun',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'marathon_swimmer',
            name: 'Marathon Swimmer',
            description: 'Swim a total of 1000m',
            category: this.categories.skill,
            difficulty: 'medium',
            points: 25,
            icon: 'distance_1000',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'deep_diver',
            name: 'Deep Diver',
            description: 'Reach 100m depth in Endless mode',
            category: this.categories.skill,
            difficulty: 'hard',
            points: 40,
            icon: 'endless_100',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'daily_champion',
            name: 'Daily Champion',
            description: 'Complete 7 daily challenges',
            category: this.categories.skill,
            difficulty: 'hard',
            points: 50,
            icon: 'daily_streak',
            hidden: false
        });
        
        this.registerAchievement({
            id: 'hardcore_survivor',
            name: 'Hardcore Survivor',
            description: 'Win a game in Hardcore mode',
            category: this.categories.skill,
            difficulty: 'legendary',
            points: 200,
            icon: 'hardcore_win',
            hidden: false
        });
        
        // SECRET ACHIEVEMENTS
        this.registerAchievement({
            id: 'leviathan_witness',
            name: 'Leviathan Witness',
            description: 'Get within 50m of the leviathan and survive',
            category: this.categories.secret,
            difficulty: 'extreme',
            points: 75,
            icon: 'leviathan_close',
            hidden: true
        });
        
        this.registerAchievement({
            id: 'easter_egg',
            name: 'Easter Egg',
            description: 'Discover the developer message',
            category: this.categories.secret,
            difficulty: 'medium',
            points: 25,
            icon: 'secret_message',
            hidden: true
        });
        
        this.registerAchievement({
            id: 'whisperer',
            name: 'The Whisperer',
            description: '???',
            category: this.categories.secret,
            difficulty: 'legendary',
            points: 150,
            icon: 'mystery',
            hidden: true
        });
        
        this.registerAchievement({
            id: 'pacifist',
            name: 'Pacifist',
            description: 'Complete campaign without using flares',
            category: this.categories.secret,
            difficulty: 'extreme',
            points: 100,
            icon: 'no_flares',
            hidden: true
        });
        
        this.registerAchievement({
            id: 'completionist',
            name: 'Completionist',
            description: 'Unlock all other achievements',
            category: this.categories.secret,
            difficulty: 'legendary',
            points: 500,
            icon: 'all_achievements',
            hidden: false
        });
    }
    
    /**
     * Register an achievement
     */
    registerAchievement(achievement) {
        this.achievements[achievement.id] = {
            ...achievement,
            unlocked: false,
            unlockedDate: null,
            progress: 0,
            required: this.getRequiredAmount(achievement)
        };
    }
    
    /**
     * Get required amount for achievement
     */
    getRequiredAmount(achievement) {
        const requirements = {
            'artifacts_50': 50,
            'artifacts_100': 100,
            'distance_1000': 1000,
            'flare_distractions': 10,
            'daily_streak': 7
        };
        
        return requirements[achievement.icon] || 1;
    }
    
    /**
     * Initialize titles
     */
    initializeTitles() {
        this.titles = {
            'novice_diver': {
                id: 'novice_diver',
                name: 'Novice Diver',
                description: 'Complete your first dive',
                requirement: { type: 'dives', count: 1 },
                unlocked: false,
                color: '#888888'
            },
            'experienced_diver': {
                id: 'experienced_diver',
                name: 'Experienced Diver',
                description: 'Complete 50 dives',
                requirement: { type: 'dives', count: 50 },
                unlocked: false,
                color: '#4488ff'
            },
            'master_diver': {
                id: 'master_diver',
                name: 'Master Diver',
                description: 'Complete 200 dives',
                requirement: { type: 'dives', count: 200 },
                unlocked: false,
                color: '#ffaa00'
            },
            'deep_sea_explorer': {
                id: 'deep_sea_explorer',
                name: 'Deep Sea Explorer',
                description: 'Reach 150m depth',
                requirement: { type: 'depth', value: 150 },
                unlocked: false,
                color: '#aa44ff'
            },
            'treasure_seeker': {
                id: 'treasure_seeker',
                name: 'Treasure Seeker',
                description: 'Collect 100 artifacts',
                requirement: { type: 'artifacts', count: 100 },
                unlocked: false,
                color: '#ffdd44'
            },
            'shadow_walker': {
                id: 'shadow_walker',
                name: 'Shadow Walker',
                description: 'Complete 10 stealth dives',
                requirement: { type: 'stealth_dives', count: 10 },
                unlocked: false,
                color: '#444444'
            },
            'leviathan_hunter': {
                id: 'leviathan_hunter',
                name: 'Leviathan Hunter',
                description: 'Encounter all legendary creatures',
                requirement: { type: 'legendaries', count: 5 },
                unlocked: false,
                color: '#ff4444'
            },
            'the_abyssal': {
                id: 'the_abyssal',
                name: 'The Abyssal',
                description: 'Reach maximum depth and survive',
                requirement: { type: 'max_depth', value: 200 },
                unlocked: false,
                color: '#ff00ff'
            }
        };
    }
    
    /**
     * Initialize statistics tracking
     */
    initializeStatistics() {
        this.statistics = {
            // Basic stats
            totalDives: 0,
            totalTimePlayed: 0,
            totalDistance: 0,
            totalDeaths: 0,
            
            // Collection stats
            artifactsCollected: 0,
            logsFound: 0,
            upgradesObtained: 0,
            
            // Survival stats
            creaturesDodged: 0,
            flaresUsed: 0,
            airPocketsUsed: 0,
            closestCall: 100, // Lowest health survived
            
            // Depth stats
            maxDepthReached: 0,
            averageDepth: 0,
            timeAtMaxDepth: 0,
            
            // Skill stats
            speedrunBestTime: null,
            dailyChallengesCompleted: 0,
            dailyChallengeStreak: 0,
            hardcoreWins: 0,
            
            // Exploration stats
            biomesDiscovered: 0,
            secretsFound: 0,
            percentExplored: 0
        };
    }
    
    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        
        if (!achievement) {
            console.error(`❌ Unknown achievement: ${achievementId}`);
            return false;
        }
        
        if (achievement.unlocked) {
            return false; // Already unlocked
        }
        
        // Unlock it
        achievement.unlocked = true;
        achievement.unlockedDate = Date.now();
        
        console.log(`🏆 ACHIEVEMENT UNLOCKED: ${achievement.name}`);
        console.log(`   ${achievement.description}`);
        console.log(`   +${achievement.points} points`);
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Save immediately
        this.saveAchievements();
        
        // Check for title unlocks
        this.checkTitleUnlocks();
        
        // Check for completionist
        this.checkCompletionist();
        
        return true;
    }
    
    /**
     * Update achievement progress
     */
    updateAchievementProgress(achievementId, amount) {
        const achievement = this.achievements[achievementId];
        
        if (!achievement || achievement.unlocked) {
            return;
        }
        
        achievement.progress += amount;
        
        // Check if ready to unlock
        if (achievement.progress >= achievement.required) {
            this.unlockAchievement(achievementId);
        }
    }
    
    /**
     * Update statistic
     */
    updateStatistic(statName, value) {
        if (this.statistics.hasOwnProperty(statName)) {
            const oldValue = this.statistics[statName];
            this.statistics[statName] += value;
            
            // Handle special cases
            if (statName === 'maxDepthReached' && value > oldValue) {
                this.checkDepthAchievements(value);
            }
            
            // Check related achievements
            this.checkStatisticAchievements(statName, this.statistics[statName]);
        }
    }
    
    /**
     * Check depth-based achievements
     */
    checkDepthAchievements(depth) {
        if (depth >= 50) this.unlockAchievement('twilight_diver');
        if (depth >= 100) this.unlockAchievement('deep_diver');
        if (depth >= 150) this.unlockAchievement('abyssal_pioneer');
        if (depth >= 200) this.unlockAchievement('hadal_zone');
    }
    
    /**
     * Check statistic-based achievements
     */
    checkStatisticAchievements(statName, value) {
        const checks = {
            'artifactsCollected': [
                { threshold: 1, achievement: 'treasure_hunter' },
                { threshold: 50, achievement: 'collector' },
                { threshold: 100, achievement: 'hoarder' }
            ],
            'totalDistance': [
                { threshold: 1000, achievement: 'marathon_swimmer' }
            ],
            'flaresUsed': [
                { threshold: 10, achievement: 'flare_master' }
            ],
            'dailyChallengesCompleted': [
                { threshold: 7, achievement: 'daily_champion' }
            ]
        };
        
        if (checks[statName]) {
            checks[statName].forEach(check => {
                if (value >= check.threshold) {
                    this.unlockAchievement(check.achievement);
                }
            });
        }
    }
    
    /**
     * Check all achievements against current state
     */
    checkAllAchievements() {
        // Check each statistic against achievements
        Object.keys(this.statistics).forEach(stat => {
            this.checkStatisticAchievements(stat, this.statistics[stat]);
        });
        
        // Check depth
        this.checkDepthAchievements(this.statistics.maxDepthReached);
    }
    
    /**
     * Show achievement notification
     */
    showAchievementNotification(achievement) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">🏆 Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
                <div class="achievement-points">+${achievement.points} points</div>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: -400px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #ffd700;
            border-radius: 10px;
            padding: 15px;
            display: flex;
            gap: 15px;
            align-items: center;
            color: white;
            font-family: 'Arial', sans-serif;
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
            z-index: 10000;
            transition: right 0.5s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.right = '20px';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.right = '-400px';
            setTimeout(() => notification.remove(), 500);
        }, 5000);
        
        // Play sound
        this.playAchievementSound();
    }
    
    /**
     * Play achievement unlock sound
     */
    playAchievementSound() {
        // Simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 880; // A5
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
            // Second tone for harmony
            setTimeout(() => {
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                
                osc2.frequency.value = 1100; // C#6
                osc2.type = 'sine';
                
                gain2.gain.setValueAtTime(0.2, audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                osc2.start(audioContext.currentTime);
                osc2.stop(audioContext.currentTime + 0.3);
            }, 100);
            
        } catch (error) {
            console.warn('⚠️ Audio not available');
        }
    }
    
    /**
     * Check title unlocks
     */
    checkTitleUnlocks() {
        Object.values(this.titles).forEach(title => {
            if (title.unlocked) return;
            
            const req = title.requirement;
            let shouldUnlock = false;
            
            switch(req.type) {
                case 'dives':
                    shouldUnlock = this.statistics.totalDives >= req.count;
                    break;
                case 'depth':
                    shouldUnlock = this.statistics.maxDepthReached >= req.value;
                    break;
                case 'artifacts':
                    shouldUnlock = this.statistics.artifactsCollected >= req.count;
                    break;
                case 'stealth_dives':
                    shouldUnlock = this.getStealthDivesCount() >= req.count;
                    break;
                case 'legendaries':
                    shouldUnlock = this.getLegendaryCreaturesEncountered() >= req.count;
                    break;
                case 'max_depth':
                    shouldUnlock = this.statistics.maxDepthReached >= req.value;
                    break;
            }
            
            if (shouldUnlock) {
                title.unlocked = true;
                console.log(`🎖️ Title Unlocked: ${title.name}`);
            }
        });
    }
    
    /**
     * Check completionist achievement
     */
    checkCompletionist() {
        const totalAchievements = Object.keys(this.achievements).length;
        const unlockedAchievements = Object.values(this.achievements).filter(a => a.unlocked).length;
        
        if (unlockedAchievements === totalAchievements - 1) { // -1 because completionist itself doesn't count
            this.unlockAchievement('completionist');
        }
    }
    
    /**
     * Save achievements to storage
     */
    async saveAchievements() {
        const data = {
            achievements: this.achievements,
            titles: this.titles,
            statistics: this.statistics,
            lastSaved: Date.now()
        };
        
        localStorage.setItem('abyss_achievements', JSON.stringify(data));
    }
    
    /**
     * Load achievements from storage
     */
    async loadAchievements() {
        const data = localStorage.getItem('abyss_achievements');
        
        if (data) {
            const parsed = JSON.parse(data);
            
            // Merge with defaults
            if (parsed.achievements) {
                Object.assign(this.achievements, parsed.achievements);
            }
            
            if (parsed.titles) {
                Object.assign(this.titles, parsed.titles);
            }
        }
    }
    
    /**
     * Load statistics from storage
     */
    async loadStatistics() {
        const data = localStorage.getItem('abyss_statistics');
        
        if (data) {
            const parsed = JSON.parse(data);
            Object.assign(this.statistics, parsed);
        }
    }
    
    /**
     * Get achievement progress
     */
    getAchievementProgress() {
        const total = Object.keys(this.achievements).length;
        const unlocked = Object.values(this.achievements).filter(a => a.unlocked).length;
        const totalPoints = Object.values(this.achievements).reduce((sum, a) => sum + a.points, 0);
        const earnedPoints = Object.values(this.achievements)
            .filter(a => a.unlocked)
            .reduce((sum, a) => sum + a.points, 0);
        
        return {
            total,
            unlocked,
            percentage: ((unlocked / total) * 100).toFixed(1),
            totalPoints,
            earnedPoints,
            completion: `${unlocked}/${total}`
        };
    }
    
    /**
     * Get achievements by category
     */
    getAchievementsByCategory(category) {
        return Object.values(this.achievements).filter(a => a.category === category);
    }
    
    /**
     * Get unlocked achievements
     */
    getUnlockedAchievements() {
        return Object.values(this.achievements).filter(a => a.unlocked);
    }
    
    /**
     * Get locked achievements
     */
    getLockedAchievements() {
        return Object.values(this.achievements).filter(a => !a.unlocked);
    }
    
    /**
     * Helper methods (placeholders)
     */
    getStealthDivesCount() { return 0; }
    getLegendaryCreaturesEncountered() { return 0; }
}
