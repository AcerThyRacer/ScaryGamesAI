/**
 * Campaign Mode - 10-episode narrative story
 */

var CampaignMode = (function() {
    'use strict';

    var episodes = [
        {
            id: 1,
            title: 'The Descent',
            description: 'You first enter the Backrooms. Find your way out.',
            objective: 'Collect 50 pellets and escape',
            difficulty: 1.0,
            biome: 'yellow',
            mazeSize: 15,
            enemies: 1,
            cutscene: 'intro'
        },
        {
            id: 2,
            title: 'Whispers in the Dark',
            description: 'Strange sounds echo through the corridors.',
            objective: 'Survive 3 minutes',
            difficulty: 1.2,
            biome: 'yellow',
            mazeSize: 18,
            enemies: 2,
            cutscene: 'whispers'
        },
        {
            id: 3,
            title: 'The First Hunter',
            description: 'A new type of Pac-Man stalks you.',
            objective: 'Escape the Hunter variant',
            difficulty: 1.4,
            biome: 'mono',
            mazeSize: 20,
            enemies: 1,
            specialEnemy: 'hunter',
            cutscene: 'hunter_intro'
        },
        {
            id: 4,
            title: 'Flooded Depths',
            description: 'The corridors are flooding.',
            objective: 'Navigate the flooded section',
            difficulty: 1.5,
            biome: 'flooded',
            mazeSize: 22,
            enemies: 2,
            cutscene: 'flood'
        },
        {
            id: 5,
            title: 'The Swarm',
            description: 'They multiply in the darkness.',
            objective: 'Survive the swarm attack',
            difficulty: 1.6,
            biome: 'construction',
            mazeSize: 20,
            enemies: 5,
            specialEnemy: 'swarm',
            cutscene: 'swarm_attack'
        },
        {
            id: 6,
            title: 'Shadows of the Past',
            description: 'Ghostly figures appear.',
            objective: 'Discover the truth',
            difficulty: 1.7,
            biome: 'infinite',
            mazeSize: 25,
            enemies: 3,
            specialEnemy: 'shadow',
            cutscene: 'ghost_reveal'
        },
        {
            id: 7,
            title: 'The Sewers Below',
            description: 'Descend into the terrifying sewers.',
            objective: 'Find the ancient artifact',
            difficulty: 1.9,
            biome: 'sewers',
            mazeSize: 28,
            enemies: 4,
            cutscene: 'sewers_descent'
        },
        {
            id: 8,
            title: 'Berserker Rage',
            description: 'The most aggressive variant awakens.',
            objective: 'Defeat the Berserker',
            difficulty: 2.0,
            biome: 'construction',
            mazeSize: 25,
            enemies: 2,
            specialEnemy: 'berserker',
            cutscene: 'berserker_awakens'
        },
        {
            id: 9,
            title: 'The Truth Revealed',
            description: 'Everything becomes clear.',
            objective: 'Reach the core',
            difficulty: 2.2,
            biome: 'infinite',
            mazeSize: 30,
            enemies: 5,
            cutscene: 'truth_reveal'
        },
        {
            id: 10,
            title: 'Escape or Perish',
            description: 'The final confrontation.',
            objective: 'Defeat all variants and escape',
            difficulty: 2.5,
            biome: 'yellow',
            mazeSize: 35,
            enemies: 6,
            allVariants: true,
            cutscene: 'final_battle'
        }
    ];

    var state = {
        currentEpisode: 0,
        completedEpisodes: [],
        totalPlaytime: 0,
        deaths: 0,
        choices: {}
    };

    var activeEpisode = null;

    function init() {
        loadProgress();
        console.log('[CampaignMode] Initialized with', episodes.length, 'episodes');
    }

    function startEpisode(episodeNum) {
        if (episodeNum < 1 || episodeNum > episodes.length) {
            console.error('[CampaignMode] Invalid episode number');
            return null;
        }

        activeEpisode = episodes[episodeNum - 1];
        state.currentEpisode = episodeNum;

        console.log('[CampaignMode] Starting Episode', episodeNum, ':', activeEpisode.title);

        // Apply episode settings
        if (typeof BiomeSystem !== 'undefined') {
            BiomeSystem.setBiome(activeEpisode.biome);
        }

        if (typeof RoguelikeMode !== 'undefined') {
            RoguelikeMode.config.permadeathEnabled = false;
        }

        return activeEpisode;
    }

    function completeEpisode(objectives) {
        if (!activeEpisode) return false;

        state.completedEpisodes.push({
            episodeId: activeEpisode.id,
            completedAt: Date.now(),
            objectives: objectives,
            deaths: state.deaths
        });

        console.log('[CampaignMode] Episode', activeEpisode.id, 'completed');

        if (activeEpisode.id < episodes.length) {
            return {
                success: true,
                nextEpisode: activeEpisode.id + 1
            };
        } else {
            return {
                success: true,
                campaignComplete: true
            };
        }
    }

    function failEpisode(reason) {
        if (!activeEpisode) return;

        state.deaths++;
        console.log('[CampaignMode] Episode failed:', reason);

        return {
            success: false,
            canRetry: true,
            currentEpisode: state.currentEpisode
        };
    }

    function makeChoice(choiceId, episodeId) {
        if (!state.choices[episodeId]) {
            state.choices[episodeId] = [];
        }

        state.choices[episodeId].push({
            choiceId: choiceId,
            timestamp: Date.now()
        });

        console.log('[CampaignMode] Choice made:', choiceId, 'in episode', episodeId);
        saveProgress();
    }

    function getEpisodeProgress(episodeId) {
        var completed = state.completedEpisodes.find(function(e) {
            return e.episodeId === episodeId;
        });

        return completed || null;
    }

    function getAvailableEpisodes() {
        var available = [];

        for (var i = 0; i < episodes.length; i++) {
            var episode = episodes[i];
            var isUnlocked = i === 0 || state.completedEpisodes.length >= i;

            if (isUnlocked) {
                available.push({
                    episode: episode,
                    completed: !!getEpisodeProgress(episode.id),
                    canPlay: true
                });
            }
        }

        return available;
    }

    function getStats() {
        return {
            totalEpisodes: episodes.length,
            completedEpisodes: state.completedEpisodes.length,
            currentEpisode: state.currentEpisode,
            totalDeaths: state.deaths,
            completionPercent: (state.completedEpisodes.length / episodes.length) * 100
        };
    }

    function saveProgress() {
        try {
            localStorage.setItem('backrooms_campaign', JSON.stringify({
                currentEpisode: state.currentEpisode,
                completedEpisodes: state.completedEpisodes,
                deaths: state.deaths,
                choices: state.choices
            }));
        } catch (e) {
            console.error('[CampaignMode] Failed to save');
        }
    }

    function loadProgress() {
        try {
            var saved = localStorage.getItem('backrooms_campaign');
            if (saved) {
                var data = JSON.parse(saved);
                state.currentEpisode = data.currentEpisode || 0;
                state.completedEpisodes = data.completedEpisodes || [];
                state.deaths = data.deaths || 0;
                state.choices = data.choices || {};
            }
        } catch (e) {
            console.error('[CampaignMode] Failed to load');
        }
    }

    function resetProgress() {
        state = {
            currentEpisode: 0,
            completedEpisodes: [],
            totalPlaytime: 0,
            deaths: 0,
            choices: {}
        };
        localStorage.removeItem('backrooms_campaign');
        console.log('[CampaignMode] Progress reset');
    }

    function getEpisodes() {
        return episodes;
    }

    function getActiveEpisode() {
        return activeEpisode;
    }

    return {
        init: init,
        startEpisode: startEpisode,
        completeEpisode: completeEpisode,
        failEpisode: failEpisode,
        makeChoice: makeChoice,
        getEpisodeProgress: getEpisodeProgress,
        getAvailableEpisodes: getAvailableEpisodes,
        getStats: getStats,
        resetProgress: resetProgress,
        getEpisodes: getEpisodes,
        getActiveEpisode: getActiveEpisode
    };
})();

if (typeof window !== 'undefined') {
    window.CampaignMode = CampaignMode;
}
