/**
 * Skill Trees - 3 specialization paths with persistent unlocks
 */

var SkillTrees = (function() {
    'use strict';

    var trees = {
        survivor: {
            id: 'survivor',
            name: 'Survivor',
            icon: '🏃',
            description: 'Speed, stealth, and evasion',
            color: '#00ff88',
            skills: [
                {
                    id: 'sprinter',
                    name: 'Sprinter',
                    tier: 1,
                    cost: 1,
                    description: '+15% movement speed',
                    maxLevel: 3,
                    effect: { speed: 0.15 }
                },
                {
                    id: 'quiet_steps',
                    name: 'Quiet Steps',
                    tier: 1,
                    cost: 1,
                    description: '-30% noise generated',
                    maxLevel: 2,
                    effect: { noiseReduction: 0.3 }
                },
                {
                    id: 'marathon',
                    name: 'Marathon',
                    tier: 2,
                    cost: 2,
                    description: '+25% stamina',
                    maxLevel: 2,
                    effect: { stamina: 25 }
                },
                {
                    id: 'sixth_sense',
                    name: 'Sixth Sense',
                    tier: 2,
                    cost: 2,
                    description: 'Detect enemies through walls',
                    maxLevel: 1,
                    effect: { detection: true }
                },
                {
                    id: 'ghost',
                    name: 'Ghost',
                    tier: 3,
                    cost: 3,
                    description: 'Brief invisibility when damaged',
                    maxLevel: 1,
                    effect: { invisibility: true }
                }
            ]
        },
        engineer: {
            id: 'engineer',
            name: 'Engineer',
            icon: '🔧',
            description: 'Crafting, traps, and gadgets',
            color: '#ffaa00',
            skills: [
                {
                    id: 'scavenger',
                    name: 'Scavenger',
                    tier: 1,
                    cost: 1,
                    description: '+1 resource from nodes',
                    maxLevel: 3,
                    effect: { resourceBonus: 1 }
                },
                {
                    id: 'quick_craft',
                    name: 'Quick Craft',
                    tier: 1,
                    cost: 1,
                    description: '-20% craft time',
                    maxLevel: 2,
                    effect: { craftSpeed: 0.2 }
                },
                {
                    id: 'trap_master',
                    name: 'Trap Master',
                    tier: 2,
                    cost: 2,
                    description: '+2 max traps',
                    maxLevel: 2,
                    effect: { maxTraps: 2 }
                },
                {
                    id: 'improvisation',
                    name: 'Improvisation',
                    tier: 2,
                    cost: 2,
                    description: 'Craft with fewer resources',
                    maxLevel: 1,
                    effect: { resourceDiscount: 0.25 }
                },
                {
                    id: 'turret',
                    name: 'Auto Turret',
                    tier: 3,
                    cost: 3,
                    description: 'Automated defense system',
                    maxLevel: 1,
                    effect: { turret: true }
                }
            ]
        },
        psychic: {
            id: 'psychic',
            name: 'Psychic',
            icon: '🔮',
            description: 'Sanity, perception, and mental powers',
            color: '#aa88ff',
            skills: [
                {
                    id: 'mental_fortress',
                    name: 'Mental Fortress',
                    tier: 1,
                    cost: 1,
                    description: '+20 max sanity',
                    maxLevel: 3,
                    effect: { maxSanity: 20 }
                },
                {
                    id: 'calm_mind',
                    name: 'Calm Mind',
                    tier: 1,
                    cost: 1,
                    description: '-25% sanity drain',
                    maxLevel: 2,
                    effect: { sanityDrainReduction: 0.25 }
                },
                {
                    id: 'clairvoyance',
                    name: 'Clairvoyance',
                    tier: 2,
                    cost: 2,
                    description: 'See enemy positions on minimap',
                    maxLevel: 1,
                    effect: { enemyVision: true }
                },
                {
                    id: 'telepathy',
                    name: 'Telepathy',
                    tier: 2,
                    cost: 2,
                    description: 'Communicate with teammates mentally',
                    maxLevel: 1,
                    effect: { telepathy: true }
                },
                {
                    id: 'mind_control',
                    name: 'Mind Control',
                    tier: 3,
                    cost: 3,
                    description: 'Briefly control an enemy',
                    maxLevel: 1,
                    effect: { mindControl: true }
                }
            ]
        }
    };

    var playerSkills = {};
    var skillPoints = 0;
    var selectedTree = null;

    function init() {
        loadProgress();
        console.log('[SkillTrees] Initialized with', Object.keys(trees).length, 'trees');
    }

    function selectTree(treeId) {
        if (!trees[treeId]) {
            console.error('[SkillTrees] Unknown tree:', treeId);
            return false;
        }

        selectedTree = treeId;
        console.log('[SkillTrees] Selected tree:', treeId);
        return true;
    }

    function unlockSkill(skillId) {
        var skill = findSkill(skillId);
        if (!skill) {
            console.error('[SkillTrees] Unknown skill:', skillId);
            return false;
        }

        if (!selectedTree || skill.tier !== 1 && !hasSkillInTree(selectedTree, skill.tier - 1)) {
            console.log('[SkillTrees] Prerequisites not met');
            return false;
        }

        var currentLevel = playerSkills[skillId] || 0;
        if (currentLevel >= skill.maxLevel) {
            console.log('[SkillTrees] Skill already maxed');
            return false;
        }

        if (skillPoints < skill.cost) {
            console.log('[SkillTrees] Not enough skill points');
            return false;
        }

        skillPoints -= skill.cost;
        playerSkills[skillId] = currentLevel + 1;

        console.log('[SkillTrees] Unlocked', skillId, 'level', playerSkills[skillId]);
        saveProgress();

        return true;
    }

    function findSkill(skillId) {
        for (var treeId in trees) {
            var tree = trees[treeId];
            for (var i = 0; i < tree.skills.length; i++) {
                if (tree.skills[i].id === skillId) {
                    return tree.skills[i];
                }
            }
        }
        return null;
    }

    function hasSkillInTree(treeId, minTier) {
        var tree = trees[treeId];
        if (!tree) return false;

        for (var i = 0; i < tree.skills.length; i++) {
            var skill = tree.skills[i];
            if (skill.tier <= minTier && playerSkills[skill.id]) {
                return true;
            }
        }
        return false;
    }

    function getSkillEffect(skillId) {
        var level = playerSkills[skillId] || 0;
        if (level === 0) return null;

        var skill = findSkill(skillId);
        if (!skill) return null;

        var effect = {};
        for (var key in skill.effect) {
            effect[key] = skill.effect[key] * level;
        }

        return effect;
    }

    function getAllEffects() {
        var allEffects = {};

        for (var skillId in playerSkills) {
            var effect = getSkillEffect(skillId);
            if (effect) {
                Object.assign(allEffects, effect);
            }
        }

        return allEffects;
    }

    function addSkillPoints(amount) {
        skillPoints += amount;
        console.log('[SkillTrees] Added', amount, 'skill points (total:', skillPoints + ')');
        saveProgress();
    }

    function getSkillPoints() {
        return skillPoints;
    }

    function getTreeProgress(treeId) {
        var tree = trees[treeId];
        if (!tree) return null;

        var unlocked = 0;
        var total = tree.skills.length;

        tree.skills.forEach(function(skill) {
            if (playerSkills[skill.id]) {
                unlocked += playerSkills[skill.id];
            }
        });

        return {
            tree: treeId,
            unlocked: unlocked,
            total: total,
            percent: (unlocked / total) * 100
        };
    }

    function getUnlockedSkills() {
        return Object.assign({}, playerSkills);
    }

    function resetTree(treeId) {
        if (!trees[treeId]) return false;

        var tree = trees[treeId];
        var refunded = 0;

        tree.skills.forEach(function(skill) {
            if (playerSkills[skill.id]) {
                refunded += playerSkills[skill.id] * skill.cost;
                delete playerSkills[skill.id];
            }
        });

        skillPoints += refunded;

        if (selectedTree === treeId) {
            selectedTree = null;
        }

        console.log('[SkillTrees] Reset tree', treeId, 'refunded', refunded, 'points');
        saveProgress();

        return true;
    }

    function saveProgress() {
        try {
            localStorage.setItem('backrooms_skills', JSON.stringify({
                playerSkills: playerSkills,
                skillPoints: skillPoints,
                selectedTree: selectedTree
            }));
        } catch (e) {
            console.error('[SkillTrees] Failed to save');
        }
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem('backrooms_skills');
            if (saved) {
                var data = JSON.parse(saved);
                playerSkills = data.playerSkills || {};
                skillPoints = data.skillPoints || 0;
                selectedTree = data.selectedTree || null;
            }
        } catch (e) {
            console.error('[SkillTrees] Failed to load');
        }
    }

    function resetAll() {
        playerSkills = {};
        skillPoints = 0;
        selectedTree = null;
        localStorage.removeItem('backrooms_skills');
        console.log('[SkillTrees] Reset all progress');
    }

    function getTrees() {
        return Object.assign({}, trees);
    }

    function getSelectedTree() {
        return selectedTree;
    }

    return {
        init: init,
        selectTree: selectTree,
        unlockSkill: unlockSkill,
        getSkillEffect: getSkillEffect,
        getAllEffects: getAllEffects,
        addSkillPoints: addSkillPoints,
        getSkillPoints: getSkillPoints,
        getTreeProgress: getTreeProgress,
        getUnlockedSkills: getUnlockedSkills,
        resetTree: resetTree,
        resetAll: resetAll,
        getTrees: getTrees,
        getSelectedTree: getSelectedTree
    };
})();

if (typeof window !== 'undefined') {
    window.SkillTrees = SkillTrees;
}
