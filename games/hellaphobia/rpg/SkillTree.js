/* ============================================================
   HELLAPHOBIA - PHASE 6: SKILL TREE & PROGRESSION SYSTEM
   5 Skill Trees | 50+ Skills | Weapon Crafting
   Character Classes | Combo Mastery
   ============================================================ */

(function() {
    'use strict';

    // ===== SKILL TREES DEFINITION =====
    const SKILL_TREES = {
        agility: {
            name: "Agility",
            icon: "⚡",
            color: "#00ff88",
            description: "Movement, dodging, speed",
            skills: [
                { id: 'agility_1', name: "Swift Feet", tier: 1, cost: 1, maxLevel: 3, description: "+10% movement speed", effect: { speed: 0.1 } },
                { id: 'agility_2', name: "Double Jump", tier: 1, cost: 1, maxLevel: 1, description: "Gain ability to double jump", effect: { jumps: 1 } },
                { id: 'agility_3', name: "Dash Master", tier: 2, cost: 2, maxLevel: 3, description: "-20% dash cooldown", effect: { dashCooldown: -0.2 } },
                { id: 'agility_4', name: "Wall Runner", tier: 2, cost: 2, maxLevel: 1, description: "Run on walls briefly", effect: { wallRun: true } },
                { id: 'agility_5', name: "Phantom Step", tier: 3, cost: 3, maxLevel: 1, description: "Brief invisibility when dashing", effect: { stealthDash: true } },
                { id: 'agility_6', name: "Air Dash", tier: 3, cost: 3, maxLevel: 1, description: "Dash in mid-air", effect: { airDash: true } },
                { id: 'agility_7', name: "Time Dilation", tier: 4, cost: 4, maxLevel: 1, description: "Slow time when dodging", effect: { slowMotion: 0.5 } },
                { id: 'agility_8', name: "Dimensional Shift", tier: 5, cost: 5, maxLevel: 1, description: "Teleport short distances", effect: { teleport: true } },
                { id: 'agility_9', name: "Infinite Momentum", tier: 5, cost: 5, maxLevel: 1, description: "Speed increases indefinitely", effect: { infiniteSpeed: true } }
            ]
        },
        
        combat: {
            name: "Combat",
            icon: "⚔️",
            color: "#ff4444",
            description: "Damage, combos, weapon mastery",
            skills: [
                { id: 'combat_1', name: "Sharp Blade", tier: 1, cost: 1, maxLevel: 3, description: "+15% melee damage", effect: { meleeDamage: 0.15 } },
                { id: 'combat_2', name: "Combo Master", tier: 1, cost: 1, maxLevel: 3, description: "+1 combo chain length", effect: { comboLength: 1 } },
                { id: 'combat_3', name: "Critical Eye", tier: 2, cost: 2, maxLevel: 3, description: "+10% crit chance", effect: { critChance: 0.1 } },
                { id: 'combat_4', name: "Executioner", tier: 2, cost: 2, maxLevel: 1, description: "Execute enemies below 20% HP", effect: { execute: 0.2 } },
                { id: 'combat_5', name: "Weapon Expert", tier: 3, cost: 3, maxLevel: 3, description: "All weapons +20% damage", effect: { allWeaponDamage: 0.2 } },
                { id: 'combat_6', name: "Berserker", tier: 3, cost: 3, maxLevel: 1, description: "+50% damage when low HP", effect: { berserk: true } },
                { id: 'combat_7', name: "Flurry", tier: 4, cost: 4, maxLevel: 1, description: "Rapid attack combo", effect: { flurryAttack: true } },
                { id: 'combat_8', name: "Devastation", tier: 4, cost: 4, maxLevel: 3, description: "+25% all damage", effect: { allDamage: 0.25 } },
                { id: 'combat_9', name: "One Man Army", tier: 5, cost: 5, maxLevel: 1, description: "No stagger from attacks", effect: { superArmor: true } }
            ]
        },
        
        psychic: {
            name: "Psychic",
            icon: "🔮",
            color: "#aa44ff",
            description: "Sanity abilities, hallucination control",
            skills: [
                { id: 'psychic_1', name: "Mind Blast", tier: 1, cost: 1, maxLevel: 3, description: "Sanity projectile +20% damage", effect: { mindBlastDamage: 0.2 } },
                { id: 'psychic_2', name: "Sanity Pool", tier: 1, cost: 1, maxLevel: 3, description: "+20 max sanity", effect: { maxSanity: 20 } },
                { id: 'psychic_3', name: "Hallucination Friend", tier: 2, cost: 2, maxLevel: 1, description: "Hallucinations fight for you", effect: { friendlyHallucinations: true } },
                { id: 'psychic_4', name: "Fear Aura", tier: 2, cost: 2, maxLevel: 3, description: "Enemies fear you", effect: { fearAura: 0.3 } },
                { id: 'psychic_5', name: "Psychic Shield", tier: 3, cost: 3, maxLevel: 3, description: "Block sanity damage", effect: { sanityShield: 0.5 } },
                { id: 'psychic_6', name: "Mind Control", tier: 3, cost: 3, maxLevel: 1, description: "Temporarily control enemies", effect: { mindControl: true } },
                { id: 'psychic_7', name: "Reality Warp", tier: 4, cost: 4, maxLevel: 1, description: "Bend reality around you", effect: { realityWarp: true } },
                { id: 'psychic_8', name: "Psychic Storm", tier: 4, cost: 4, maxLevel: 1, description: "AoE sanity damage", effect: { psychicStorm: true } },
                { id: 'psychic_9', name: "God Mind", tier: 5, cost: 5, maxLevel: 1, description: "Infinite sanity abilities", effect: { infiniteSanity: true } }
            ]
        },
        
        survival: {
            name: "Survival",
            icon: "❤️",
            color: "#44ff44",
            description: "Health, defense, resource management",
            skills: [
                { id: 'survival_1', name: "Thick Skin", tier: 1, cost: 1, maxLevel: 3, description: "+20 max HP", effect: { maxHp: 20 } },
                { id: 'survival_2', name: "Regeneration", tier: 1, cost: 1, maxLevel: 3, description: "+1 HP/sec regen", effect: { hpRegen: 1 } },
                { id: 'survival_3', name: "Iron Will", tier: 2, cost: 2, maxLevel: 3, description: "+15% sanity resistance", effect: { sanityResist: 0.15 } },
                { id: 'survival_4', name: "Scavenger", tier: 2, cost: 2, maxLevel: 3, description: "+30% item drops", effect: { itemDropRate: 0.3 } },
                { id: 'survival_5', name: "Toughness", tier: 3, cost: 3, maxLevel: 3, description: "-10% damage taken", effect: { damageReduction: 0.1 } },
                { id: 'survival_6', name: "Second Wind", tier: 3, cost: 3, maxLevel: 1, description: "Auto-revive once per level", effect: { autoRevive: true } },
                { id: 'survival_7', name: "Vampirism", tier: 4, cost: 4, maxLevel: 1, description: "Heal on kill", effect: { lifeSteal: 0.1 } },
                { id: 'survival_8', name: "Immortality", tier: 4, cost: 4, maxLevel: 1, description: "Cannot die from normal attacks", effect: { immortality: true } },
                { id: 'survival_9', name: "Phoenix", tier: 5, cost: 5, maxLevel: 1, description: "Revive with full HP/SP", effect: { phoenix: true } }
            ]
        },
        
        stealth: {
            name: "Stealth",
            icon: "👤",
            color: "#4444ff",
            description: "Hiding, silent movement, critical hits",
            skills: [
                { id: 'stealth_1', name: "Shadow Walk", tier: 1, cost: 1, maxLevel: 3, description: "-20% noise when moving", effect: { noiseReduction: 0.2 } },
                { id: 'stealth_2', name: "Night Vision", tier: 1, cost: 1, maxLevel: 1, description: "See in darkness", effect: { nightVision: true } },
                { id: 'stealth_3', name: "Assassin", tier: 2, cost: 2, maxLevel: 3, description: "+50% backstab damage", effect: { backstabDamage: 0.5 } },
                { id: 'stealth_4', name: "Cloak", tier: 2, cost: 2, maxLevel: 1, description: "Become invisible in shadows", effect: { shadowCloak: true } },
                { id: 'stealth_5', name: "Silent Killer", tier: 3, cost: 3, maxLevel: 3, description: "Kills don't alert others", effect: { silentKills: true } },
                { id: 'stealth_6', name: "Ghost", tier: 3, cost: 3, maxLevel: 1, description: "Pass through enemies", effect: { ghostForm: true } },
                { id: 'stealth_7', name: "Vanish", tier: 4, cost: 4, maxLevel: 1, description: "Disappear when detected", effect: { vanish: true } },
                { id: 'stealth_8', name: "Shadow Clone", tier: 4, cost: 4, maxLevel: 1, description: "Create decoy", effect: { shadowClone: true } },
                { id: 'stealth_9', name: "Perfect Assassin", tier: 5, cost: 5, maxLevel: 1, description: "One-hit kill from stealth", effect: { oneHitStealth: true } }
            ]
        }
    };

    // ===== CHARACTER CLASSES =====
    const CHARACTER_CLASSES = {
        wanderer: {
            name: "Wanderer",
            description: "Balanced starter class",
            icon: "🚶",
            startingSkills: ['agility_1', 'survival_1'],
            bonusStats: { hp: 100, sanity: 100, speed: 1.0 },
            unlockRequirement: null
        },
        warrior: {
            name: "Warrior",
            description: "Combat specialist",
            icon: "⚔️",
            startingSkills: ['combat_1', 'combat_2', 'survival_1'],
            bonusStats: { hp: 150, sanity: 80, speed: 0.9 },
            unlockRequirement: { kills: 100 }
        },
        rogue: {
            name: "Rogue",
            description: "Stealth expert",
            icon: "🗡️",
            startingSkills: ['stealth_1', 'stealth_2', 'agility_1'],
            bonusStats: { hp: 80, sanity: 100, speed: 1.2 },
            unlockRequirement: { stealthKills: 50 }
        },
        mage: {
            name: "Mage",
            description: "Psychic powers",
            icon: "🔮",
            startingSkills: ['psychic_1', 'psychic_2', 'survival_2'],
            bonusStats: { hp: 70, sanity: 150, speed: 0.95 },
            unlockRequirement: { sanityBlasts: 100 }
        },
        tank: {
            name: "Juggernaut",
            description: "Unstoppable force",
            icon: "🛡️",
            startingSkills: ['survival_1', 'survival_2', 'combat_1'],
            bonusStats: { hp: 200, sanity: 80, speed: 0.8 },
            unlockRequirement: { damageTaken: 5000 }
        },
        speedster: {
            name: "Speedster",
            description: "Lightning fast",
            icon: "⚡",
            startingSkills: ['agility_1', 'agility_2', 'agility_3'],
            bonusStats: { hp: 90, sanity: 90, speed: 1.3 },
            unlockRequirement: { distanceRun: 50000 }
        }
    };

    // ===== SKILL TREE MANAGER =====
    const SkillTreeManager = {
        unlockedClasses: ['wanderer'],
        currentClass: 'wanderer',
        skillPoints: 0,
        totalSkillPoints: 0,
        purchasedSkills: {},
        playerStats: {},
        
        init() {
            this.loadProgress();
            this.recalculateStats();
            console.log('Phase 6: Skill Tree & Progression System initialized');
            console.log(` - ${Object.keys(SKILL_TREES).length} skill trees`);
            console.log(` - ${this.getTotalSkills()} total skills`);
            console.log(` - ${Object.keys(CHARACTER_CLASSES).length} character classes`);
        },
        
        getTotalSkills() {
            return Object.values(SKILL_TREES).reduce((sum, tree) => sum + tree.skills.length, 0);
        },
        
        // Award skill points
        awardSkillPoints(amount) {
            this.skillPoints += amount;
            this.totalSkillPoints += amount;
            this.saveProgress();
            
            window.dispatchEvent(new CustomEvent('skillPointsGained', {
                detail: { amount, total: this.skillPoints }
            }));
        },
        
        // Purchase a skill
        purchaseSkill(skillId) {
            const skillInfo = this.getSkillInfo(skillId);
            if (!skillInfo) return { success: false, error: 'Skill not found' };
            
            const { tree, skill } = skillInfo;
            
            // Check prerequisites
            if (!this.canPurchaseSkill(skill)) {
                return { success: false, error: 'Prerequisites not met' };
            }
            
            // Check skill points
            const currentLevel = this.purchasedSkills[skillId] || 0;
            const cost = skill.cost * (currentLevel + 1);
            
            if (this.skillPoints < cost) {
                return { success: false, error: 'Not enough skill points' };
            }
            
            // Check max level
            if (currentLevel >= skill.maxLevel) {
                return { success: false, error: 'Skill already maxed' };
            }
            
            // Purchase skill
            this.skillPoints -= cost;
            this.purchasedSkills[skillId] = currentLevel + 1;
            
            this.recalculateStats();
            this.saveProgress();
            
            window.dispatchEvent(new CustomEvent('skillPurchased', {
                detail: { skillId, level: currentLevel + 1 }
            }));
            
            return { success: true, level: currentLevel + 1 };
        },
        
        canPurchaseSkill(skill) {
            // Check tier prerequisites
            const tree = SKILL_TREES[this.getSkillTreeForSkill(skill.id)];
            if (!tree) return false;
            
            const lowerTierSkills = tree.skills.filter(s => s.tier < skill.tier);
            for (const prereq of lowerTierSkills) {
                if (!this.purchasedSkills[prereq.id]) {
                    return false;
                }
            }
            
            return true;
        },
        
        getSkillInfo(skillId) {
            for (const [treeName, tree] of Object.entries(SKILL_TREES)) {
                const skill = tree.skills.find(s => s.id === skillId);
                if (skill) {
                    return { tree: treeName, skill };
                }
            }
            return null;
        },
        
        getSkillTreeForSkill(skillId) {
            for (const [treeName, tree] of Object.entries(SKILL_TREES)) {
                if (tree.skills.find(s => s.id === skillId)) {
                    return treeName;
                }
            }
            return null;
        },
        
        // Recalculate all stats from skills
        recalculateStats() {
            this.playerStats = {
                maxHp: 100,
                hpRegen: 0,
                maxSanity: 100,
                sanityResist: 0,
                speed: 1.0,
                damage: 1.0,
                meleeDamage: 1.0,
                allWeaponDamage: 1.0,
                critChance: 0,
                damageReduction: 0,
                jumps: 1,
                dashCooldown: 1.0,
                noiseReduction: 0,
                itemDropRate: 1.0
            };
            
            // Apply class bonuses
            const classData = CHARACTER_CLASSES[this.currentClass];
            if (classData) {
                if (classData.bonusStats.hp) this.playerStats.maxHp += classData.bonusStats.hp;
                if (classData.bonusStats.sanity) this.playerStats.maxSanity += classData.bonusStats.sanity;
                if (classData.bonusStats.speed) this.playerStats.speed *= classData.bonusStats.speed;
            }
            
            // Apply all purchased skills
            for (const [skillId, level] of Object.entries(this.purchasedSkills)) {
                const skillInfo = this.getSkillInfo(skillId);
                if (!skillInfo) continue;
                
                const { skill } = skillInfo;
                const multiplier = level / skill.maxLevel;
                
                for (const [stat, value] of Object.entries(skill.effect)) {
                    if (typeof value === 'number') {
                        this.playerStats[stat] = (this.playerStats[stat] || 1) + (value * multiplier);
                    } else if (typeof value === 'boolean') {
                        this.playerStats[stat] = value;
                    }
                }
            }
        },
        
        // Get current stats with all bonuses
        getCurrentStats() {
            return { ...this.playerStats };
        },
        
        // Class system
        selectClass(classId) {
            if (!this.unlockedClasses.includes(classId)) {
                return { success: false, error: 'Class not unlocked' };
            }
            
            this.currentClass = classId;
            this.recalculateStats();
            this.saveProgress();
            
            window.dispatchEvent(new CustomEvent('classChanged', {
                detail: { classId, className: CHARACTER_CLASSES[classId].name }
            }));
            
            return { success: true };
        },
        
        unlockClass(classId) {
            if (this.unlockedClasses.includes(classId)) {
                return { success: false, error: 'Already unlocked' };
            }
            
            const classData = CHARACTER_CLASSES[classId];
            if (!classData || !classData.unlockRequirement) {
                return { success: false, error: 'Invalid class' };
            }
            
            // Check unlock requirement
            const stats = this.getPlayerStats();
            const req = classData.unlockRequirement;
            
            let unlocked = false;
            if (req.kills && stats.kills >= req.kills) unlocked = true;
            if (req.stealthKills && stats.stealthKills >= req.stealthKills) unlocked = true;
            if (req.sanityBlasts && stats.sanityBlasts >= req.sanityBlasts) unlocked = true;
            if (req.damageTaken && stats.damageTaken >= req.damageTaken) unlocked = true;
            if (req.distanceRun && stats.distanceRun >= req.distanceRun) unlocked = true;
            
            if (unlocked) {
                this.unlockedClasses.push(classId);
                this.saveProgress();
                
                window.dispatchEvent(new CustomEvent('classUnlocked', {
                    detail: { classId, className: classData.name }
                }));
                
                return { success: true };
            }
            
            return { success: false, error: 'Requirements not met' };
        },
        
        getPlayerStats() {
            const saved = localStorage.getItem('hellaphobia_player_stats');
            return saved ? JSON.parse(saved) : {
                kills: 0,
                stealthKills: 0,
                sanityBlasts: 0,
                damageTaken: 0,
                distanceRun: 0
            };
        },
        
        updatePlayerStats(stat, value) {
            const stats = this.getPlayerStats();
            stats[stat] = (stats[stat] || 0) + value;
            localStorage.setItem('hellaphobia_player_stats', JSON.stringify(stats));
            
            // Check class unlocks
            for (const classId of Object.keys(CHARACTER_CLASSES)) {
                if (!this.unlockedClasses.includes(classId)) {
                    this.unlockClass(classId);
                }
            }
        },
        
        // Save/Load
        saveProgress() {
            const data = {
                unlockedClasses: this.unlockedClasses,
                currentClass: this.currentClass,
                skillPoints: this.skillPoints,
                totalSkillPoints: this.totalSkillPoints,
                purchasedSkills: this.purchasedSkills,
                savedAt: Date.now()
            };
            localStorage.setItem('hellaphobia_skills', JSON.stringify(data));
        },
        
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_skills');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedClasses = data.unlockedClasses || ['wanderer'];
                this.currentClass = data.currentClass || 'wanderer';
                this.skillPoints = data.skillPoints || 0;
                this.totalSkillPoints = data.totalSkillPoints || 0;
                this.purchasedSkills = data.purchasedSkills || {};
            }
        },
        
        // Get skill tree data
        getSkillTree(treeName) {
            return SKILL_TREES[treeName];
        },
        
        getAllSkillTrees() {
            return SKILL_TREES;
        },
        
        getCharacterClasses() {
            return CHARACTER_CLASSES;
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                awardSkillPoints: (amount) => this.awardSkillPoints(amount),
                purchaseSkill: (skillId) => this.purchaseSkill(skillId),
                getCurrentStats: () => this.getCurrentStats(),
                selectClass: (classId) => this.selectClass(classId),
                unlockClass: (classId) => this.unlockClass(classId),
                getSkillTree: (name) => this.getSkillTree(name),
                getAllSkillTrees: () => this.getAllSkillTrees(),
                getCharacterClasses: () => this.getCharacterClasses(),
                updatePlayerStats: (stat, value) => this.updatePlayerStats(stat, value)
            };
        }
    };
    
    // Export to window
    window.SkillTreeManager = SkillTreeManager.exportAPI();
    
    console.log('Phase 6: Skill Tree & Progression System loaded');
})();
