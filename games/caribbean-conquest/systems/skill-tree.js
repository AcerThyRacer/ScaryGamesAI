// Caribbean Conquest - Skill Tree System
// Phase 1: Player progression with skill trees for combat, sailing, and leadership

class SkillTreeSystem {
    constructor(game) {
        this.game = game;
        
        // Skill categories
        this.categories = {
            COMBAT: 'combat',
            SAILING: 'sailing',
            LEADERSHIP: 'leadership',
            CRAFTING: 'crafting',
            EXPLORATION: 'exploration'
        };
        
        // Player skill data
        this.playerSkills = {
            points: 0,
            unlocked: [],
            active: {},
            categoryLevels: {
                combat: 0,
                sailing: 0,
                leadership: 0,
                crafting: 0,
                exploration: 0
            }
        };
        
        // Skill definitions
        this.skills = this.defineSkills();
        
        // Reputation with factions
        this.reputation = {
            pirates: 0,
            navy: 0,
            merchants: 0,
            natives: 0,
            smugglers: 0
        };
    }
    
    defineSkills() {
        return {
            // Combat skills
            'cannon_mastery': {
                id: 'cannon_mastery',
                name: 'Cannon Mastery',
                category: this.categories.COMBAT,
                description: 'Increase cannon accuracy and reload speed by 15%',
                maxLevel: 5,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    cannonAccuracy: 0.15,
                    reloadSpeed: 0.15
                }
            },
            'boarding_expert': {
                id: 'boarding_expert',
                name: 'Boarding Expert',
                category: this.categories.COMBAT,
                description: 'Increase boarding success chance and crew combat effectiveness by 20%',
                maxLevel: 3,
                costPerLevel: 3,
                requirements: ['cannon_mastery'],
                effects: {
                    boardingSuccess: 0.20,
                    crewCombat: 0.20
                }
            },
            'ship_ramming': {
                id: 'ship_ramming',
                name: 'Ship Ramming',
                category: this.categories.COMBAT,
                description: 'Increase ramming damage and reduce self-damage from ramming',
                maxLevel: 4,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    ramDamage: 0.25,
                    ramSelfDamageReduction: 0.30
                }
            },
            
            // Sailing skills
            'wind_reading': {
                id: 'wind_reading',
                name: 'Wind Reading',
                category: this.categories.SAILING,
                description: 'Increase sailing efficiency by 20% and reduce tacking time',
                maxLevel: 5,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    sailingEfficiency: 0.20,
                    tackTimeReduction: 0.25
                }
            },
            'storm_navigation': {
                id: 'storm_navigation',
                name: 'Storm Navigation',
                category: this.categories.SAILING,
                description: 'Reduce storm damage and maintain better control in rough seas',
                maxLevel: 3,
                costPerLevel: 3,
                requirements: ['wind_reading'],
                effects: {
                    stormDamageReduction: 0.30,
                    roughSeasControl: 0.25
                }
            },
            'anchor_mastery': {
                id: 'anchor_mastery',
                name: 'Anchor Mastery',
                category: this.categories.SAILING,
                description: 'Faster anchor deployment/retrieval and better holding power',
                maxLevel: 4,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    anchorSpeed: 0.40,
                    anchorHold: 0.35
                }
            },
            
            // Leadership skills
            'crew_morale': {
                id: 'crew_morale',
                name: 'Crew Morale',
                category: this.categories.LEADERSHIP,
                description: 'Increase crew morale and reduce mutiny chance',
                maxLevel: 5,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    moraleBoost: 0.20,
                    mutinyReduction: 0.25
                }
            },
            'captain_authority': {
                id: 'captain_authority',
                name: 'Captain Authority',
                category: this.categories.LEADERSHIP,
                description: 'Increase command radius and crew obedience',
                maxLevel: 3,
                costPerLevel: 3,
                requirements: ['crew_morale'],
                effects: {
                    commandRadius: 0.50,
                    crewObedience: 0.30
                }
            },
            'loot_distribution': {
                id: 'loot_distribution',
                name: 'Loot Distribution',
                category: this.categories.LEADERSHIP,
                description: 'Increase loot value from raids and improve crew satisfaction',
                maxLevel: 4,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    lootValue: 0.25,
                    crewSatisfaction: 0.20
                }
            },
            
            // Crafting skills
            'ship_repair': {
                id: 'ship_repair',
                name: 'Ship Repair',
                category: this.categories.CRAFTING,
                description: 'Faster and more efficient ship repairs',
                maxLevel: 5,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    repairSpeed: 0.30,
                    repairEfficiency: 0.25
                }
            },
            'cannon_crafting': {
                id: 'cannon_crafting',
                name: 'Cannon Crafting',
                category: this.categories.CRAFTING,
                description: 'Craft better cannons and ammunition',
                maxLevel: 3,
                costPerLevel: 3,
                requirements: ['ship_repair'],
                effects: {
                    cannonQuality: 0.20,
                    ammoCrafting: 0.25
                }
            },
            
            // Exploration skills
            'treasure_hunting': {
                id: 'treasure_hunting',
                name: 'Treasure Hunting',
                category: this.categories.EXPLORATION,
                description: 'Better treasure detection and map reading',
                maxLevel: 5,
                costPerLevel: 2,
                requirements: [],
                effects: {
                    treasureDetection: 0.30,
                    mapReading: 0.25
                }
            },
            'island_knowledge': {
                id: 'island_knowledge',
                name: 'Island Knowledge',
                category: this.categories.EXPLORATION,
                description: 'Better navigation around islands and hidden location discovery',
                maxLevel: 3,
                costPerLevel: 3,
                requirements: ['treasure_hunting'],
                effects: {
                    islandNavigation: 0.40,
                    hiddenLocationDiscovery: 0.35
                }
            }
        };
    }
    
    init() {
        console.log('Skill Tree System initialized');
        
        // Load saved skill data if available
        this.loadFromStorage();
        
        return true;
    }
    
    update(dt) {
        // Update skill cooldowns and effects
        // This can be expanded for timed skills or effects
    }
    
    // Award skill points
    awardPoints(amount) {
        this.playerSkills.points += amount;
        this.saveToStorage();
        
        // Notify HUD
        if (this.game.hud) {
            this.game.hud.showNotification(`Skill Points +${amount}`, `You now have ${this.playerSkills.points} skill points`);
        }
    }
    
    // Unlock a skill
    unlockSkill(skillId, level = 1) {
        const skill = this.skills[skillId];
        if (!skill) {
            console.error(`Skill ${skillId} not found`);
            return false;
        }
        
        // Check requirements
        if (!this.checkRequirements(skillId)) {
            console.error(`Requirements not met for ${skillId}`);
            return false;
        }
        
        // Check if player has enough points
        const cost = skill.costPerLevel * level;
        if (this.playerSkills.points < cost) {
            console.error(`Not enough skill points: ${this.playerSkills.points}/${cost}`);
            return false;
        }
        
        // Check max level
        const currentLevel = this.playerSkills.active[skillId] || 0;
        if (currentLevel + level > skill.maxLevel) {
            console.error(`Cannot exceed max level ${skill.maxLevel}`);
            return false;
        }
        
        // Deduct points and unlock
        this.playerSkills.points -= cost;
        this.playerSkills.active[skillId] = currentLevel + level;
        
        if (!this.playerSkills.unlocked.includes(skillId)) {
            this.playerSkills.unlocked.push(skillId);
        }
        
        // Update category level
        this.playerSkills.categoryLevels[skill.category]++;
        
        // Apply skill effects
        this.applySkillEffects(skillId, level);
        
        // Save to storage
        this.saveToStorage();
        
        // Notify
        if (this.game.hud) {
            this.game.hud.showNotification('Skill Unlocked', `${skill.name} Level ${this.playerSkills.active[skillId]}`);
        }
        
        console.log(`Skill unlocked: ${skillId} level ${this.playerSkills.active[skillId]}`);
        return true;
    }
    
    // Check skill requirements
    checkRequirements(skillId) {
        const skill = this.skills[skillId];
        if (!skill.requirements || skill.requirements.length === 0) {
            return true;
        }
        
        for (const reqId of skill.requirements) {
            if (!this.playerSkills.unlocked.includes(reqId)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Apply skill effects to game systems
    applySkillEffects(skillId, level) {
        const skill = this.skills[skillId];
        if (!skill || !skill.effects) return;
        
        // Apply effects based on skill category
        switch (skill.category) {
            case this.categories.COMBAT:
                this.applyCombatEffects(skill, level);
                break;
            case this.categories.SAILING:
                this.applySailingEffects(skill, level);
                break;
            case this.categories.LEADERSHIP:
                this.applyLeadershipEffects(skill, level);
                break;
            case this.categories.CRAFTING:
                this.applyCraftingEffects(skill, level);
                break;
            case this.categories.EXPLORATION:
                this.applyExplorationEffects(skill, level);
                break;
        }
    }
    
    applyCombatEffects(skill, level) {
        // Apply to combat system
        if (this.game.combat) {
            // This would modify combat system parameters
            console.log(`Applied combat skill: ${skill.name} level ${level}`);
        }
    }
    
    applySailingEffects(skill, level) {
        // Apply to ship sailing mechanics
        if (this.game.player && this.game.player.sailingState) {
            // This would modify sailing parameters
            console.log(`Applied sailing skill: ${skill.name} level ${level}`);
        }
    }
    
    applyLeadershipEffects(skill, level) {
        // Apply to crew management
        console.log(`Applied leadership skill: ${skill.name} level ${level}`);
    }
    
    applyCraftingEffects(skill, level) {
        // Apply to crafting system
        console.log(`Applied crafting skill: ${skill.name} level ${level}`);
    }
    
    applyExplorationEffects(skill, level) {
        // Apply to exploration systems
        console.log(`Applied exploration skill: ${skill.name} level ${level}`);
    }
    
    // Reputation system
    modifyReputation(faction, amount) {
        if (this.reputation[faction] !== undefined) {
            this.reputation[faction] += amount;
            
            // Clamp between -100 and 100
            this.reputation[faction] = Math.max(-100, Math.min(100, this.reputation[faction]));
            
            this.saveToStorage();
            
            // Check for reputation milestones
            this.checkReputationMilestones(faction);
            
            return true;
        }
        return false;
    }
    
    checkReputationMilestones(faction) {
        const rep = this.reputation[faction];
        
        // Check for significant thresholds
        const thresholds = [-100, -75, -50, -25, 0, 25, 50, 75, 100];
        for (const threshold of thresholds) {
            if (Math.abs(rep - threshold) < 5) {
                // Notify player of reputation change
                if (this.game.hud) {
                    let status = 'Neutral';
                    if (rep >= 75) status = 'Ally';
                    else if (rep >= 25) status = 'Friendly';
                    else if (rep <= -75) status = 'Enemy';
                    else if (rep <= -25) status = 'Hostile';
                    
                    this.game.hud.showNotification(
                        `${faction.charAt(0).toUpperCase() + faction.slice(1)} Reputation`, 
                        `${status} (${rep})`
                    );
                }
                break;
            }
        }
    }
    
    // Get reputation status
    getReputationStatus(faction) {
        const rep = this.reputation[faction] || 0;
        if (rep >= 75) return 'ally';
        if (rep >= 25) return 'friendly';
        if (rep >= -25) return 'neutral';
        if (rep >= -75) return 'hostile';
        return 'enemy';
    }
    
    // Save/load from localStorage
    saveToStorage() {
        try {
            const data = {
                playerSkills: this.playerSkills,
                reputation: this.reputation
            };
            localStorage.setItem('caribbean_conquest_skills', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save skill data:', e);
        }
    }
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem('caribbean_conquest_skills');
            if (data) {
                const parsed = JSON.parse(data);
                this.playerSkills = { ...this.playerSkills, ...parsed.playerSkills };
                this.reputation = { ...this.reputation, ...parsed.reputation };
                console.log('Skill data loaded from storage');
            }
        } catch (e) {
            console.error('Failed to load skill data:', e);
        }
    }
    
    // Get skill information for UI
    getSkillInfo(skillId) {
        const skill = this.skills[skillId];
        if (!skill) return null;
        
        const currentLevel = this.playerSkills.active[skillId] || 0;
        const isUnlocked = this.playerSkills.unlocked.includes(skillId);
        const canUnlock = this.checkRequirements(skillId) && 
                         (this.playerSkills.points >= skill.costPerLevel) && 
                         (currentLevel < skill.maxLevel);
        
        return {
            ...skill,
            currentLevel,
            isUnlocked,
            canUnlock,
            nextLevelCost: skill.costPerLevel
        };
    }
    
    // Get all skills by category
    getSkillsByCategory(category) {
        return Object.values(this.skills).filter(skill => skill.category === category);
    }
    
    // Reset all skills (for testing)
    resetSkills() {
        this.playerSkills = {
            points: 0,
            unlocked: [],
            active: {},
            categoryLevels: {
                combat: 0,
                sailing: 0,
                leadership: 0,
                crafting: 0,
                exploration: 0
            }
        };
        this.saveToStorage();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillTreeSystem;
}