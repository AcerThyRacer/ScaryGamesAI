// Caribbean Conquest - Difficulty Manager System
// Phase 3: Adaptive difficulty scaling based on player skill assessment

class DifficultyManager {
    constructor(game) {
        this.game = game;
        
        // Difficulty levels
        this.difficultyLevels = {
            'very_easy': {
                name: 'Very Easy',
                enemyHealthMultiplier: 0.5,
                enemyDamageMultiplier: 0.3,
                enemyAccuracy: 0.3,
                enemyAggression: 0.2,
                playerHealthMultiplier: 2.0,
                playerDamageMultiplier: 1.5,
                assistiveFeatures: ['auto_aim', 'navigation_hints', 'damage_reduction'],
                description: 'For new players - enemies are weak and you have extra health'
            },
            'easy': {
                name: 'Easy',
                enemyHealthMultiplier: 0.7,
                enemyDamageMultiplier: 0.5,
                enemyAccuracy: 0.5,
                enemyAggression: 0.4,
                playerHealthMultiplier: 1.5,
                playerDamageMultiplier: 1.2,
                assistiveFeatures: ['navigation_hints', 'damage_reduction'],
                description: 'For casual players - enemies are manageable'
            },
            'normal': {
                name: 'Normal',
                enemyHealthMultiplier: 1.0,
                enemyDamageMultiplier: 1.0,
                enemyAccuracy: 0.7,
                enemyAggression: 0.6,
                playerHealthMultiplier: 1.0,
                playerDamageMultiplier: 1.0,
                assistiveFeatures: [],
                description: 'Balanced challenge - enemies are competent'
            },
            'hard': {
                name: 'Hard',
                enemyHealthMultiplier: 1.3,
                enemyDamageMultiplier: 1.5,
                enemyAccuracy: 0.8,
                enemyAggression: 0.8,
                playerHealthMultiplier: 0.8,
                playerDamageMultiplier: 0.8,
                assistiveFeatures: [],
                description: 'For experienced players - enemies are tough'
            },
            'very_hard': {
                name: 'Very Hard',
                enemyHealthMultiplier: 1.7,
                enemyDamageMultiplier: 2.0,
                enemyAccuracy: 0.9,
                enemyAggression: 1.0,
                playerHealthMultiplier: 0.6,
                playerDamageMultiplier: 0.6,
                assistiveFeatures: [],
                description: 'For expert players - enemies are relentless'
            },
            'legendary': {
                name: 'Legendary',
                enemyHealthMultiplier: 2.0,
                enemyDamageMultiplier: 2.5,
                enemyAccuracy: 1.0,
                enemyAggression: 1.2,
                playerHealthMultiplier: 0.5,
                playerDamageMultiplier: 0.5,
                assistiveFeatures: [],
                description: 'Ultimate challenge - enemies are elite'
            }
        };
        
        // Current difficulty
        this.currentDifficulty = 'normal';
        this.adaptiveMode = true;
        
        // Player skill assessment
        this.playerSkill = {
            combat: 0.5, // 0-1 scale
            sailing: 0.5,
            navigation: 0.5,
            survival: 0.5,
            overall: 0.5
        };
        
        // Performance tracking
        this.performanceMetrics = {
            combatAccuracy: [],
            sailingEfficiency: [],
            survivalTime: [],
            damageTaken: [],
            questCompletionRate: []
        };
        
        // Assistive features
        this.activeAssists = [];
        
        // Update interval
        this.updateTimer = 0;
        this.updateInterval = 30; // Seconds between difficulty adjustments
    }
    
    init() {
        console.log('Difficulty Manager initialized');
        
        // Load saved difficulty preference
        this.loadPreferences();
        
        // Initialize cheat detection integration
        this.initCheatDetection();
        
        // Start performance tracking
        this.startPerformanceTracking();
    }
    
    initCheatDetection() {
        // Check if CheatDetectionService is available
        if (typeof CheatDetectionService !== 'undefined') {
            this.cheatDetection = CheatDetectionService.getInstance();
            console.log('Cheat detection service integrated');
        } else {
            console.log('Cheat detection service not available');
        }
    }
    
    startPerformanceTracking() {
        // Start tracking player performance metrics
        setInterval(() => {
            this.trackPerformance();
        }, 10000); // Every 10 seconds
    }
    
    trackPerformance() {
        if (!this.game.player) return;
        
        // Track combat accuracy
        if (this.game.combat) {
            const accuracy = this.game.combat.getPlayerAccuracy();
            if (accuracy !== undefined) {
                this.performanceMetrics.combatAccuracy.push(accuracy);
                if (this.performanceMetrics.combatAccuracy.length > 100) {
                    this.performanceMetrics.combatAccuracy.shift();
                }
            }
        }
        
        // Track sailing efficiency (speed vs wind)
        if (this.game.player.sailingState) {
            const windAngle = this.game.weather?.windDirection || 0;
            const sailAngle = this.game.player.sailingState.sailAngle || 0;
            const efficiency = 1 - Math.abs(windAngle - sailAngle) / 180;
            this.performanceMetrics.sailingEfficiency.push(efficiency);
            if (this.performanceMetrics.sailingEfficiency.length > 100) {
                this.performanceMetrics.sailingEfficiency.shift();
            }
        }
        
        // Track damage taken
        if (this.game.player.health) {
            const maxHealth = this.game.player.maxHealth || 100;
            const healthPercent = this.game.player.health / maxHealth;
            this.performanceMetrics.damageTaken.push(1 - healthPercent);
            if (this.performanceMetrics.damageTaken.length > 100) {
                this.performanceMetrics.damageTaken.shift();
            }
        }
        
        // Update skill assessment
        this.updateSkillAssessment();
    }
    
    updateSkillAssessment() {
        // Calculate average combat skill
        let combatSkill = 0.5;
        if (this.performanceMetrics.combatAccuracy.length > 0) {
            const avgAccuracy = this.performanceMetrics.combatAccuracy.reduce((a, b) => a + b, 0) / 
                               this.performanceMetrics.combatAccuracy.length;
            combatSkill = Math.min(1, avgAccuracy);
        }
        
        // Calculate sailing skill
        let sailingSkill = 0.5;
        if (this.performanceMetrics.sailingEfficiency.length > 0) {
            const avgEfficiency = this.performanceMetrics.sailingEfficiency.reduce((a, b) => a + b, 0) / 
                                 this.performanceMetrics.sailingEfficiency.length;
            sailingSkill = Math.min(1, avgEfficiency);
        }
        
        // Calculate survival skill (inverse of damage taken)
        let survivalSkill = 0.5;
        if (this.performanceMetrics.damageTaken.length > 0) {
            const avgDamage = this.performanceMetrics.damageTaken.reduce((a, b) => a + b, 0) / 
                             this.performanceMetrics.damageTaken.length;
            survivalSkill = Math.max(0.1, 1 - avgDamage);
        }
        
        // Update skill levels
        this.playerSkill.combat = this.smoothTransition(this.playerSkill.combat, combatSkill, 0.1);
        this.playerSkill.sailing = this.smoothTransition(this.playerSkill.sailing, sailingSkill, 0.1);
        this.playerSkill.survival = this.smoothTransition(this.playerSkill.survival, survivalSkill, 0.1);
        
        // Overall skill (weighted average)
        this.playerSkill.overall = (combatSkill * 0.4 + sailingSkill * 0.3 + survivalSkill * 0.3);
        
        // Adaptive difficulty adjustment
        if (this.adaptiveMode) {
            this.adaptiveDifficultyAdjustment();
        }
    }
    
    smoothTransition(current, target, rate) {
        return current + (target - current) * rate;
    }
    
    adaptiveDifficultyAdjustment() {
        const skill = this.playerSkill.overall;
        let targetDifficulty = this.currentDifficulty;
        
        // Map skill to difficulty
        if (skill < 0.3) {
            targetDifficulty = 'very_easy';
        } else if (skill < 0.5) {
            targetDifficulty = 'easy';
        } else if (skill < 0.7) {
            targetDifficulty = 'normal';
        } else if (skill < 0.85) {
            targetDifficulty = 'hard';
        } else if (skill < 0.95) {
            targetDifficulty = 'very_hard';
        } else {
            targetDifficulty = 'legendary';
        }
        
        // Apply difficulty change if needed
        if (targetDifficulty !== this.currentDifficulty) {
            this.setDifficulty(targetDifficulty, true);
        }
    }
    
    setDifficulty(level, adaptive = false) {
        if (!this.difficultyLevels[level]) {
            console.error(`Unknown difficulty level: ${level}`);
            return;
        }
        
        const previous = this.currentDifficulty;
        this.currentDifficulty = level;
        const config = this.difficultyLevels[level];
        
        // Apply difficulty multipliers to game systems
        this.applyDifficultyMultipliers(config);
        
        // Update assistive features
        this.updateAssistiveFeatures(config);
        
        // Notify player if difficulty changed significantly
        if (previous !== level && !adaptive) {
            this.game.hud?.showNotification(
                `Difficulty: ${config.name}`,
                config.description
            );
        }
        
        console.log(`Difficulty set to: ${config.name}`);
        
        // Save preference
        this.savePreferences();
    }
    
    applyDifficultyMultipliers(config) {
        // Apply to combat system
        if (this.game.combat) {
            this.game.combat.setDifficultyMultipliers({
                enemyHealth: config.enemyHealthMultiplier,
                enemyDamage: config.enemyDamageMultiplier,
                enemyAccuracy: config.enemyAccuracy
            });
        }
        
        // Apply to AI system
        if (this.game.ai) {
            this.game.ai.setAggressionMultiplier(config.enemyAggression);
        }
        
        // Apply to player
        if (this.game.player) {
            this.game.player.setDifficultyMultipliers({
                health: config.playerHealthMultiplier,
                damage: config.playerDamageMultiplier
            });
        }
    }
    
    updateAssistiveFeatures(config) {
        // Clear previous assists
        this.activeAssists = [];
        
        // Enable new assists
        for (const feature of config.assistiveFeatures) {
            this.enableAssistiveFeature(feature);
        }
    }
    
    enableAssistiveFeature(feature) {
        this.activeAssists.push(feature);
        
        switch (feature) {
            case 'auto_aim':
                if (this.game.combat) {
                    this.game.combat.enableAutoAim(0.3); // 30% aim assist
                }
                break;
            case 'navigation_hints':
                if (this.game.hud) {
                    this.game.hud.enableNavigationHints();
                }
                break;
            case 'damage_reduction':
                if (this.game.player) {
                    this.game.player.enableDamageReduction(0.5); // 50% damage reduction
                }
                break;
        }
    }
    
    disableAssistiveFeature(feature) {
        const index = this.activeAssists.indexOf(feature);
        if (index > -1) {
            this.activeAssists.splice(index, 1);
        }
        
        switch (feature) {
            case 'auto_aim':
                if (this.game.combat) {
                    this.game.combat.disableAutoAim();
                }
                break;
            case 'navigation_hints':
                if (this.game.hud) {
                    this.game.hud.disableNavigationHints();
                }
                break;
            case 'damage_reduction':
                if (this.game.player) {
                    this.game.player.disableDamageReduction();
                }
                break;
        }
    }
    
    update(dt) {
        this.updateTimer += dt;
        
        // Update difficulty periodically
        if (this.updateTimer >= this.updateInterval) {
            this.updateTimer = 0;
            
            if (this.adaptiveMode) {
                this.adaptiveDifficultyAdjustment();
            }
        }
    }
    
    getPlayerSkillReport() {
        return {
            combat: Math.round(this.playerSkill.combat * 100),
            sailing: Math.round(this.playerSkill.sailing * 100),
            survival: Math.round(this.playerSkill.survival * 100),
            overall: Math.round(this.playerSkill.overall * 100),
            difficulty: this.difficultyLevels[this.currentDifficulty].name,
            assists: this.activeAssists
        };
    }
    
    savePreferences() {
        try {
            localStorage.setItem('caribbean_difficulty', JSON.stringify({
                level: this.currentDifficulty,
                adaptive: this.adaptiveMode,
                skill: this.playerSkill
            }));
        } catch (e) {
            // LocalStorage might not be available
        }
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('caribbean_difficulty');
            if (saved) {
                const data = JSON.parse(saved);
                this.currentDifficulty = data.level || 'normal';
                this.adaptiveMode = data.adaptive !== false;
                if (data.skill) {
                    this.playerSkill = { ...this.playerSkill, ...data.skill };
                }
                
                // Apply loaded difficulty
                this.setDifficulty(this.currentDifficulty, true);
            }
        } catch (e) {
            // Use defaults
        }
    }
    
    toggleAdaptiveMode() {
        this.adaptiveMode = !this.adaptiveMode;
        
        this.game.hud?.showNotification(
            `Adaptive Difficulty ${this.adaptiveMode ? 'Enabled' : 'Disabled'}`,
            this.adaptiveMode ? 
                'Difficulty will adjust based on your performance' :
                'Difficulty is now fixed'
        );
        
        this.savePreferences();
        return this.adaptiveMode;
    }
}
