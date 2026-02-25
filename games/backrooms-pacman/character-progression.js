/**
 * Character Progression - Custom characters with unlocks
 */

var CharacterProgression = (function() {
    'use strict';

    var characters = [
        {
            id: 'default',
            name: 'Lost Soul',
            description: 'A regular person trapped in the Backrooms',
            unlocked: true,
            color: '#888888',
            bonuses: {},
            cost: { souls: 0, gems: 0 }
        },
        {
            id: 'explorer',
            name: 'Explorer',
            description: 'Experienced in navigation',
            unlocked: false,
            color: '#44aa44',
            bonuses: {
                speed: 0.05,
                minimap: true
            },
            cost: { souls: 500, gems: 0 }
        },
        {
            id: 'survivor',
            name: 'Survivor',
            description: 'Hardened by countless escapes',
            unlocked: false,
            color: '#aa4444',
            bonuses: {
                sanity: 20,
                stamina: 15
            },
            cost: { souls: 1000, gems: 10 }
        },
        {
            id: 'psychic',
            name: 'Psychic',
            description: 'Sensitive to the Backrooms energy',
            unlocked: false,
            color: '#aa44aa',
            bonuses: {
                enemyDetection: true,
                sanityRegen: 0.5
            },
            cost: { souls: 1500, gems: 25 }
        },
        {
            id: 'engineer',
            name: 'Engineer',
            description: 'Expert with gadgets and traps',
            unlocked: false,
            color: '#4444aa',
            bonuses: {
                crafting: 0.2,
                trapCapacity: 2
            },
            cost: { souls: 2000, gems: 50 }
        },
        {
            id: 'ghost',
            name: 'Half-Ghost',
            description: 'Partially phased into the Backrooms',
            unlocked: false,
            color: '#88ffff',
            bonuses: {
                invisibility: 2,
                phaseChance: 0.05
            },
            cost: { souls: 5000, gems: 100 }
        }
    ];

    var state = {
        selectedCharacter: 'default',
        unlockedCharacters: ['default'],
        characterLevels: {},
        totalXP: 0,
        level: 1
    };

    function init() {
        loadProgress();
        console.log('[CharacterProgression] Initialized with', characters.length, 'characters');
    }

    function selectCharacter(charId) {
        var character = characters.find(function(c) { return c.id === charId; });
        if (!character) return false;

        if (!state.unlockedCharacters.includes(charId)) {
            console.log('[CharacterProgression] Character not unlocked');
            return false;
        }

        state.selectedCharacter = charId;
        console.log('[CharacterProgression] Selected character:', charId);
        saveProgress();
        return true;
    }

    function unlockCharacter(charId) {
        var character = characters.find(function(c) { return c.id === charId; });
        if (!character) return false;

        if (state.unlockedCharacters.includes(charId)) {
            console.log('[CharacterProgression] Already unlocked');
            return false;
        }

        // Check if player has enough currency
        if (typeof CrossGameMechanics !== 'undefined') {
            var balances = CrossGameMechanics.currency.getAllBalances();

            if (balances.souls >= character.cost.souls && balances.gems >= character.cost.gems) {
                CrossGameMechanics.currency.addSouls(-character.cost.souls);
                CrossGameMechanics.currency.addBloodGems(-character.cost.gems);

                state.unlockedCharacters.push(charId);
                console.log('[CharacterProgression] Unlocked character:', charId);
                saveProgress();
                return true;
            } else {
                console.log('[CharacterProgression] Not enough currency');
                return false;
            }
        }

        return false;
    }

    function getCharacterBonuses(charId) {
        var character = characters.find(function(c) { return c.id === charId; });
        if (!character) return {};

        return character.bonuses || {};
    }

    function getActiveBonuses() {
        return getCharacterBonuses(state.selectedCharacter);
    }

    function addXP(amount) {
        state.totalXP += amount;
        var oldLevel = state.level;
        state.level = Math.floor(Math.sqrt(state.totalXP / 100)) + 1;

        if (state.level > oldLevel) {
            console.log('[CharacterProgression] Level up!', oldLevel, '->', state.level);
            onLevelUp(state.level);
        }

        saveProgress();
    }

    function onLevelUp(newLevel) {
        // Award unlock at certain levels
        if (newLevel === 5 && !state.unlockedCharacters.includes('explorer')) {
            unlockCharacter('explorer');
        }
        if (newLevel === 10 && !state.unlockedCharacters.includes('survivor')) {
            unlockCharacter('survivor');
        }
        if (newLevel === 20 && !state.unlockedCharacters.includes('psychic')) {
            unlockCharacter('psychic');
        }
    }

    function levelUpCharacter(charId) {
        if (!state.characterLevels[charId]) {
            state.characterLevels[charId] = 1;
        }

        if (state.characterLevels[charId] < 10) {
            state.characterLevels[charId]++;
            console.log('[CharacterProgression] Character', charId, 'leveled up to', state.characterLevels[charId]);
            saveProgress();
            return true;
        }
        return false;
    }

    function getCharacter(charId) {
        return characters.find(function(c) { return c.id === charId; });
    }

    function getAllCharacters() {
        return characters.map(function(c) {
            return {
                character: c,
                unlocked: state.unlockedCharacters.includes(c.id),
                selected: state.selectedCharacter === c.id,
                level: state.characterLevels[c.id] || 1
            };
        });
    }

    function getSelectedCharacter() {
        return getCharacter(state.selectedCharacter);
    }

    function getProgress() {
        return {
            level: state.level,
            totalXP: state.totalXP,
            unlockedCount: state.unlockedCharacters.length,
            totalCount: characters.length
        };
    }

    function saveProgress() {
        try {
            localStorage.setItem('character_progress', JSON.stringify({
                selectedCharacter: state.selectedCharacter,
                unlockedCharacters: state.unlockedCharacters,
                characterLevels: state.characterLevels,
                totalXP: state.totalXP,
                level: state.level
            }));
        } catch (e) {
            console.error('[CharacterProgression] Failed to save');
        }
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem('character_progress');
            if (saved) {
                var data = JSON.parse(saved);
                state.selectedCharacter = data.selectedCharacter || 'default';
                state.unlockedCharacters = data.unlockedCharacters || ['default'];
                state.characterLevels = data.characterLevels || {};
                state.totalXP = data.totalXP || 0;
                state.level = data.level || 1;
            }
        } catch (e) {
            console.error('[CharacterProgression] Failed to load');
        }
    }

    function reset() {
        state = {
            selectedCharacter: 'default',
            unlockedCharacters: ['default'],
            characterLevels: {},
            totalXP: 0,
            level: 1
        };
        localStorage.removeItem('character_progress');
    }

    return {
        init: init,
        selectCharacter: selectCharacter,
        unlockCharacter: unlockCharacter,
        getCharacterBonuses: getCharacterBonuses,
        getActiveBonuses: getActiveBonuses,
        addXP: addXP,
        levelUpCharacter: levelUpCharacter,
        getCharacter: getCharacter,
        getAllCharacters: getAllCharacters,
        getSelectedCharacter: getSelectedCharacter,
        getProgress: getProgress,
        reset: reset
    };
})();

if (typeof window !== 'undefined') {
    window.CharacterProgression = CharacterProgression;
}
