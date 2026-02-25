/* ============================================================
   CURSED DEPTHS - PHASE 11: SKILL TREE SYSTEM
   RPG Progression | Multiple Paths | Passive Bonuses
   ============================================================ */

// ===== SKILL TREE DATABASE =====
const SkillTreeSystem = {
    skillPoints: 0,
    totalSkillPoints: 0,
    unlockedSkills: new Set(),
    activeBuild: 'balanced',
    
    // Skill tree definitions
    trees: {
        warrior: {
            name: 'Warrior',
            icon: '⚔️',
            color: '#FF4444',
            description: 'Master of melee combat',
            skills: [
                {
                    id: 'warrior_1',
                    name: 'Brute Strength',
                    tier: 1,
                    maxLevel: 5,
                    description: '+10% melee damage per level',
                    effect: (level) => ({ meleeDamage: 0.1 * level }),
                    icon: '💪'
                },
                {
                    id: 'warrior_2',
                    name: 'Critical Strike',
                    tier: 1,
                    maxLevel: 5,
                    description: '+5% crit chance per level',
                    effect: (level) => ({ critChance: 0.05 * level }),
                    icon: '🎯'
                },
                {
                    id: 'warrior_3',
                    name: 'Life Steal',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Heal for 2% of damage dealt per level',
                    effect: (level) => ({ lifeSteal: 0.02 * level }),
                    icon: '🩸',
                    prerequisites: ['warrior_1']
                },
                {
                    id: 'warrior_4',
                    name: 'Berserker Rage',
                    tier: 2,
                    maxLevel: 3,
                    description: '+15% damage when below 50% HP per level',
                    effect: (level) => ({ berserkDamage: 0.15 * level }),
                    icon: '😡',
                    prerequisites: ['warrior_2']
                },
                {
                    id: 'warrior_5',
                    name: 'Whirlwind',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Spin attack hitting all nearby enemies',
                    effect: () => ({ whirlwind: true }),
                    icon: '🌪️',
                    prerequisites: ['warrior_3', 'warrior_4']
                },
                {
                    id: 'warrior_6',
                    name: 'Unstoppable Force',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Immune to knockback and +20% attack speed',
                    effect: () => ({ knockbackImmune: true, attackSpeed: 0.2 }),
                    icon: '🚂',
                    prerequisites: ['warrior_5']
                }
            ]
        },
        
        ranger: {
            name: 'Ranger',
            icon: '🏹',
            color: '#44FF44',
            description: 'Master of ranged combat',
            skills: [
                {
                    id: 'ranger_1',
                    name: 'Eagle Eye',
                    tier: 1,
                    maxLevel: 5,
                    description: '+10% range per level',
                    effect: (level) => ({ range: 0.1 * level }),
                    icon: '🦅'
                },
                {
                    id: 'ranger_2',
                    name: 'Quick Reload',
                    tier: 1,
                    maxLevel: 5,
                    description: '+8% fire rate per level',
                    effect: (level) => ({ fireRate: 0.08 * level }),
                    icon: '⚡'
                },
                {
                    id: 'ranger_3',
                    name: 'Piercing Shots',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Projectiles pierce 1 enemy per level',
                    effect: (level) => ({ pierce: level }),
                    icon: '🏹',
                    prerequisites: ['ranger_1']
                },
                {
                    id: 'ranger_4',
                    name: 'Explosive Ammo',
                    tier: 2,
                    maxLevel: 3,
                    description: '10% chance for explosive shots per level',
                    effect: (level) => ({ explosiveChance: 0.1 * level }),
                    icon: '💥',
                    prerequisites: ['ranger_2']
                },
                {
                    id: 'ranger_5',
                    name: 'Multishot',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Fire 2 additional projectiles',
                    effect: () => ({ multishot: 2 }),
                    icon: '🔱',
                    prerequisites: ['ranger_3', 'ranger_4']
                },
                {
                    id: 'ranger_6',
                    name: 'Dead Eye',
                    tier: 3,
                    maxLevel: 1,
                    description: '+50% damage to enemies above 80% HP',
                    effect: () => ({ executeDamage: 0.5 }),
                    icon: '👁️',
                    prerequisites: ['ranger_5']
                }
            ]
        },
        
        mage: {
            name: 'Mage',
            icon: '🔮',
            color: '#4444FF',
            description: 'Master of arcane magic',
            skills: [
                {
                    id: 'mage_1',
                    name: 'Arcane Power',
                    tier: 1,
                    maxLevel: 5,
                    description: '+12% magic damage per level',
                    effect: (level) => ({ magicDamage: 0.12 * level }),
                    icon: '✨'
                },
                {
                    id: 'mage_2',
                    name: 'Mana Efficiency',
                    tier: 1,
                    maxLevel: 5,
                    description: '-8% mana cost per level',
                    effect: (level) => ({ manaCost: -0.08 * level }),
                    icon: '💎'
                },
                {
                    id: 'mage_3',
                    name: 'Spell Echo',
                    tier: 2,
                    maxLevel: 3,
                    description: '15% chance to cast spell twice per level',
                    effect: (level) => ({ echoChance: 0.15 * level }),
                    icon: '🔊',
                    prerequisites: ['mage_1']
                },
                {
                    id: 'mage_4',
                    name: 'Elemental Mastery',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Add elemental effects to spells',
                    effect: (level) => ({ elementalDamage: level * 10 }),
                    icon: '🔥',
                    prerequisites: ['mage_2']
                },
                {
                    id: 'mage_5',
                    name: 'Archmage',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Reduce all cooldowns by 50%',
                    effect: () => ({ cooldownReduction: 0.5 }),
                    icon: '🧙‍♂️',
                    prerequisites: ['mage_3', 'mage_4']
                },
                {
                    id: 'mage_6',
                    name: 'Infinite Mana',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Spells cost no mana for 10 seconds after killing an enemy',
                    effect: () => ({ infiniteManaProc: true }),
                    icon: '∞',
                    prerequisites: ['mage_5']
                }
            ]
        },
        
        summoner: {
            name: 'Summoner',
            icon: '👻',
            color: '#FF44FF',
            description: 'Master of minion armies',
            skills: [
                {
                    id: 'summoner_1',
                    name: 'Minion Command',
                    tier: 1,
                    maxLevel: 5,
                    description: '+1 minion slot per 2 levels',
                    effect: (level) => ({ minionSlots: Math.floor(level / 2) }),
                    icon: '🎖️'
                },
                {
                    id: 'summoner_2',
                    name: 'Beast Boost',
                    tier: 1,
                    maxLevel: 5,
                    description: '+15% minion damage per level',
                    effect: (level) => ({ minionDamage: 0.15 * level }),
                    icon: '🐾'
                },
                {
                    id: 'summoner_3',
                    name: 'Hive Mind',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Minions attack 20% faster per level',
                    effect: (level) => ({ minionSpeed: 0.2 * level }),
                    icon: '🧠',
                    prerequisites: ['summoner_1']
                },
                {
                    id: 'summoner_4',
                    name: 'Shared Pain',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Minions absorb 10% of your damage per level',
                    effect: (level) => ({ damageShare: 0.1 * level }),
                    icon: '🔗',
                    prerequisites: ['summoner_2']
                },
                {
                    id: 'summoner_5',
                    name: 'Overlord',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Double all minion counts',
                    effect: () => ({ doubleMinions: true }),
                    icon: '👑',
                    prerequisites: ['summoner_3', 'summoner_4']
                },
                {
                    id: 'summoner_6',
                    name: 'Eternal Army',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Minions respawn instantly when killed',
                    effect: () => ({ instantRespawn: true }),
                    icon: '♾️',
                    prerequisites: ['summoner_5']
                }
            ]
        },
        
        tank: {
            name: 'Tank',
            icon: '🛡️',
            color: '#AAAAAA',
            description: 'Master of defense and survival',
            skills: [
                {
                    id: 'tank_1',
                    name: 'Iron Skin',
                    tier: 1,
                    maxLevel: 5,
                    description: '+8% defense per level',
                    effect: (level) => ({ defense: 0.08 * level }),
                    icon: '🪨'
                },
                {
                    id: 'tank_2',
                    name: 'Vitality',
                    tier: 1,
                    maxLevel: 5,
                    description: '+20 max HP per level',
                    effect: (level) => ({ maxHp: 20 * level }),
                    icon: '❤️'
                },
                {
                    id: 'tank_3',
                    name: 'Thorns',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Reflect 10% of damage taken per level',
                    effect: (level) => ({ thornDamage: 0.1 * level }),
                    icon: '🌵',
                    prerequisites: ['tank_1']
                },
                {
                    id: 'tank_4',
                    name: 'Second Wind',
                    tier: 2,
                    maxLevel: 3,
                    description: 'Regenerate 2% HP per second per level',
                    effect: (level) => ({ regen: 0.02 * level }),
                    icon: '💨',
                    prerequisites: ['tank_2']
                },
                {
                    id: 'tank_5',
                    name: 'Immortal',
                    tier: 3,
                    maxLevel: 1,
                    description: 'Survive fatal damage with 1 HP (5 min cooldown)',
                    effect: () => ({ immortal: true }),
                    icon: '☠️',
                    prerequisites: ['tank_3', 'tank_4']
                },
                {
                    id: 'tank_6',
                    name: 'Juggernaut',
                    tier: 3,
                    maxLevel: 1,
                    description: '+50% size and immunity to all debuffs',
                    effect: () => ({ size: 1.5, debuffImmune: true }),
                    icon: '🗿',
                    prerequisites: ['tank_5']
                }
            ]
        }
    },
    
    init() {
        console.log('🌟 Phase 11: Skill Tree System initialized');
        this.loadProgress();
        this.calculateBonuses();
    },
    
    loadProgress() {
        const saved = localStorage.getItem('cursed_depths_skills');
        if (saved) {
            const data = JSON.parse(saved);
            this.skillPoints = data.skillPoints || 0;
            this.totalSkillPoints = data.totalSkillPoints || 0;
            this.unlockedSkills = new Set(data.unlockedSkills || []);
            this.activeBuild = data.activeBuild || 'balanced';
        }
    },
    
    saveProgress() {
        const data = {
            skillPoints: this.skillPoints,
            totalSkillPoints: this.totalSkillPoints,
            unlockedSkills: [...this.unlockedSkills],
            activeBuild: this.activeBuild
        };
        localStorage.setItem('cursed_depths_skills', JSON.stringify(data));
    },
    
    awardSkillPoints(amount) {
        this.skillPoints += amount;
        this.totalSkillPoints += amount;
        this.saveProgress();
        
        showFloatingText(`+${amount} Skill Points`, window.innerWidth / 2, 100, '#44FF88');
    },
    
    unlockSkill(skillId) {
        const skill = this.getSkillById(skillId);
        if (!skill) return { success: false, error: 'Skill not found' };
        
        // Check if already unlocked
        if (this.unlockedSkills.has(skillId)) {
            const currentLevel = this.getSkillLevel(skillId);
            if (currentLevel >= skill.maxLevel) {
                return { success: false, error: 'Skill already maxed' };
            }
        }
        
        // Check prerequisites
        if (skill.prerequisites) {
            for (const prereq of skill.prerequisites) {
                if (!this.unlockedSkills.has(prereq)) {
                    return { success: false, error: 'Missing prerequisites' };
                }
            }
        }
        
        // Calculate cost
        const currentLevel = this.getSkillLevel(skillId);
        const cost = (skill.tier * 2) + currentLevel;
        
        // Check if enough points
        if (this.skillPoints < cost) {
            return { success: false, error: 'Not enough skill points' };
        }
        
        // Unlock skill
        this.skillPoints -= cost;
        this.unlockedSkills.add(skillId);
        this.calculateBonuses();
        this.saveProgress();
        
        return { success: true, cost, level: currentLevel + 1 };
    },
    
    getSkillById(skillId) {
        for (const tree of Object.values(this.trees)) {
            const skill = tree.skills.find(s => s.id === skillId);
            if (skill) return skill;
        }
        return null;
    },
    
    getSkillLevel(skillId) {
        let count = 0;
        this.unlockedSkills.forEach(id => {
            if (id === skillId) count++;
        });
        return count;
    },
    
    calculateBonuses() {
        player.bonuses = {
            meleeDamage: 1,
            magicDamage: 1,
            rangeDamage: 1,
            minionDamage: 1,
            defense: 1,
            maxHp: 0,
            critChance: 0,
            lifeSteal: 0,
            fireRate: 1,
            manaCost: 1,
            minionSlots: 1,
            // ... initialize all possible bonuses
        };
        
        // Apply all unlocked skills
        this.unlockedSkills.forEach(skillId => {
            const skill = this.getSkillById(skillId);
            if (skill) {
                const level = this.getSkillLevel(skillId);
                const bonuses = skill.effect(level);
                
                Object.entries(bonuses).forEach(([key, value]) => {
                    if (typeof player.bonuses[key] === 'number') {
                        player.bonuses[key] += value;
                    } else {
                        player.bonuses[key] = value;
                    }
                });
            }
        });
    },
    
    getTotalBonuses() {
        return player.bonuses || {};
    },
    
    renderUI(ctx) {
        // Draw skill point counter
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Inter';
        ctx.fillText(`Skill Points: ${this.skillPoints}`, 20, 40);
        
        // Draw skill trees
        let x = 20;
        let y = 60;
        
        Object.values(this.trees).forEach(tree => {
            this.renderSkillTree(ctx, tree, x, y);
            x += 220;
        });
    },
    
    renderSkillTree(ctx, tree, startX, startY) {
        // Draw tree header
        ctx.fillStyle = tree.color;
        ctx.font = 'bold 14px Inter';
        ctx.fillText(`${tree.icon} ${tree.name}`, startX, startY);
        
        // Draw skills
        let y = startY + 25;
        tree.skills.forEach(skill => {
            const isUnlocked = this.unlockedSkills.has(skill.id);
            const level = this.getSkillLevel(skill.id);
            const canAfford = this.skillPoints >= ((skill.tier * 2) + level);
            const hasPrereqs = !skill.prerequisites || 
                skill.prerequisites.every(p => this.unlockedSkills.has(p));
            
            // Background
            ctx.fillStyle = isUnlocked ? tree.color : '#333333';
            if (!hasPrereqs) ctx.fillStyle = '#222222';
            
            ctx.fillRect(startX, y, 200, 40);
            
            // Border
            ctx.strokeStyle = canAfford && hasPrereqs ? '#FFFFFF' : '#666666';
            ctx.lineWidth = 2;
            ctx.strokeRect(startX, y, 200, 40);
            
            // Icon and name
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Inter';
            ctx.fillText(`${skill.icon} ${skill.name} (${level}/${skill.maxLevel})`, startX + 5, y + 25);
            
            y += 45;
        });
    }
};

// Export globally
window.SkillTreeSystem = SkillTreeSystem;

console.log('🌟 Phase 11: Skill Tree System loaded - 6 trees, 36 skills');
