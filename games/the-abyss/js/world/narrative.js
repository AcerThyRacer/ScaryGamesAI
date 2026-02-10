/* ============================================
   The Abyss - Narrative System
   Story, lore, data logs, and environmental storytelling
   Phase 2 Implementation
   ============================================ */

const NarrativeSystem = (function() {
    'use strict';

    // Story chapters
    const STORY = {
        prologue: {
            title: 'The Descent',
            entries: [
                {
                    id: 'intro_1',
                    title: 'Mission Briefing',
                    text: 'Day 1: We\'ve reached the drop point. The trench is deeper than any recorded dive. Dr. Chen believes there are structures down there - structures that predate human civilization. I\'m not sure what to believe, but the data doesn\'t lie. Something is generating energy at the bottom.',
                    unlockCondition: 'start_game'
                },
                {
                    id: 'intro_2',
                    title: 'First Dive',
                    text: 'Day 3: First descent complete. The water changes at 50 meters - it gets warmer, which makes no sense. The pressure should be dropping the temperature. And the sounds... I keep hearing things in the hydrophone data that my equipment can\'t identify.',
                    unlockCondition: 'depth_50'
                }
            ]
        },

        act1: {
            title: 'Into the Dark',
            entries: [
                {
                    id: 'act1_1',
                    title: 'Lost Contact',
                    text: 'Day 7: Lost contact with Station Beta. Their last transmission mentioned "movement in the silt" and then static. We\'re alone out here now. The surface team refuses to pull us out - they want answers about the energy readings. They don\'t understand what we\'re dealing with.',
                    unlockCondition: 'depth_100'
                },
                {
                    id: 'act1_2',
                    title: 'The Artifact',
                    text: 'Day 9: Found it. A structure that shouldn\'t exist - metallic but clearly grown, not built. The surface is covered in symbols that seem to shift when you\'re not looking directly at them. I took samples. God help me, I touched it.',
                    unlockCondition: 'find_ancient_ruins'
                }
            ]
        },

        act2: {
            title: 'Awakening',
            entries: [
                {
                    id: 'act2_1',
                    title: 'They Know We\'re Here',
                    text: 'Day 12: The creatures are getting bolder. They\'re not just animals - they\'re organized. I saw one watching me from the darkness, and when I turned my light on it, it didn\'t flee. It tilted its head, like it was studying me. Then it disappeared into the silt.',
                    unlockCondition: 'depth_150'
                },
                {
                    id: 'act2_2',
                    title: 'The Truth',
                    text: 'Day 15: I understand now. The energy readings aren\'t geological. They\'re biological. Something massive is down here - something that has been sleeping for millions of years. And our equipment, our presence, our noise... we\'re waking it up.',
                    unlockCondition: 'depth_200'
                }
            ]
        },

        finale: {
            title: 'The Abyss Stares Back',
            entries: [
                {
                    id: 'finale_1',
                    title: 'No Escape',
                    text: 'Day ???: The surface is gone. Not cut off - gone. The ascent line leads to a wall of stone that wasn\'t there yesterday. Something is rearranging the trench. Something intelligent. The only way is down. The only way is through.',
                    unlockCondition: 'depth_250'
                },
                {
                    id: 'finale_2',
                    title: 'The Heart',
                    text: 'I can hear it now. Not with my ears - in my mind. It\'s calling to me. The artifacts, the structures, they\'re all part of it. It\'s been waiting for someone to find it. To wake it. To join it. I\'m going to find the source. I have to know.',
                    unlockCondition: 'depth_300'
                }
            ]
        }
    };

    // Data logs scattered throughout
    const DATA_LOGS = [
        {
            id: 'log_1',
            title: 'Engineer\'s Note',
            author: 'Marcus Webb',
            text: 'The pressure seals are holding, but barely. At these depths, any failure is catastrophic. I\'ve modified the suits to provide an extra 10% safety margin, but it comes at the cost of mobility. Don\'t get caught in a tight space.',
            location: 'shallows',
            voiceLine: null
        },
        {
            id: 'log_2',
            title: 'Biologist\'s Discovery',
            author: 'Dr. Sarah Chen',
            text: 'The creatures here aren\'t just adapted to the pressure - they\'re enhanced by it. Their cell structures incorporate minerals from the water in ways that shouldn\'t be possible. And their bioluminescence... it\'s not for mating or hunting. It\'s communication.',
            location: 'twilight',
            voiceLine: null
        },
        {
            id: 'log_3',
            title: 'Last Transmission',
            author: 'Capt. Rodriguez',
            text: 'If anyone finds this, turn back. The things down here aren\'t animals. They\'re guardians. Protecting something ancient and hungry. I\'m going to try to collapse the passage behind me. Tell my family I love them. Tell them I\'m sorry.',
            location: 'midnight',
            voiceLine: null
        },
        {
            id: 'log_4',
            title: 'The Symbols',
            author: 'Dr. Yuki Tanaka',
            text: 'I\'ve catalogued over 300 unique symbols on the ruin walls. They appear to be a form of writing, but the grammar is three-dimensional - the meaning changes based on viewing angle. At certain angles, they describe mathematics far beyond human development. At others... they describe hunger.',
            location: 'abyssal',
            voiceLine: null
        },
        {
            id: 'log_secret',
            title: 'Personal Log',
            author: 'Unknown',
            text: 'It\'s beautiful down here. The darkness isn\'t empty - it\'s full. Full of light we can\'t see, songs we can\'t hear, thoughts we can\'t understand. I\'m going to stay. I\'m going to learn. I\'m going to become part of the deep. Join me. The water is warm.',
            location: 'hadal',
            voiceLine: null
        }
    ];

    // Environmental storytelling - object descriptions
    const ENVIRONMENTAL_STORIES = {
        skeleton_diver: {
            title: 'Previous Expedition',
            text: 'A diver from a previous mission. Their equipment is outdated - at least 20 years old. The bones are picked clean, but the suit is intact. Whatever killed them didn\'t eat them. It just... opened the suit.',
            requiresProximity: 5
        },
        strange_machinery: {
            title: 'Unknown Device',
            text: 'Metal that shouldn\'t exist. It hums with energy that makes your teeth hurt. The design is organic - grown, not built. Touching it gives you visions of vast dark spaces and something moving within them.',
            requiresProximity: 3
        },
        creature_eggs: {
            title: 'Egg Cluster',
            text: 'Translucent eggs the size of basketballs. You can see shadows moving inside. The shells are warm to the touch, and they pulse with bioluminescent light that syncs with your heartbeat.',
            requiresProximity: 5
        },
        ancient_mural: {
            title: 'Ancient Mural',
            text: 'Carved into the rock face, the mural depicts a massive creature surrounded by smaller figures. The figures appear to be worshipping it - or feeding it. The carving style predates any known civilization by millions of years.',
            requiresProximity: 8
        }
    };

    // State
    let unlockedEntries = new Set();
    let collectedLogs = new Set();
    let currentChapter = 'prologue';
    let storyProgress = 0;

    function init(savedData) {
        if (savedData) {
            unlockedEntries = new Set(savedData.unlockedEntries);
            collectedLogs = new Set(savedData.collectedLogs);
            currentChapter = savedData.currentChapter || 'prologue';
            storyProgress = savedData.storyProgress || 0;
        }
    }

    function update(gameState) {
        // Check unlock conditions
        checkUnlockConditions(gameState);
        
        // Update story progress
        updateStoryProgress(gameState);
    }

    function checkUnlockConditions(gameState) {
        const conditions = {
            start_game: () => true,
            depth_50: () => gameState.depth >= 50,
            depth_100: () => gameState.depth >= 100,
            depth_150: () => gameState.depth >= 150,
            depth_200: () => gameState.depth >= 200,
            depth_250: () => gameState.depth >= 250,
            depth_300: () => gameState.depth >= 300,
            find_ancient_ruins: () => gameState.discoveredRuins,
            collect_5_artifacts: () => gameState.artifacts >= 5
        };

        // Check all story entries
        for (const [chapterKey, chapter] of Object.entries(STORY)) {
            for (const entry of chapter.entries) {
                if (!unlockedEntries.has(entry.id)) {
                    const condition = conditions[entry.unlockCondition];
                    if (condition && condition()) {
                        unlockEntry(entry.id, chapterKey);
                    }
                }
            }
        }
    }

    function unlockEntry(entryId, chapterKey) {
        unlockedEntries.add(entryId);
        
        // Find entry details
        let entry = null;
        for (const chapter of Object.values(STORY)) {
            entry = chapter.entries.find(e => e.id === entryId);
            if (entry) break;
        }
        
        if (entry && window.showNotification) {
            showNotification(`📖 New Log Entry: ${entry.title}`, 'info');
        }

        if (window.SaveSystem) {
            SaveSystem.unlockAchievement('story_progress');
        }
    }

    function updateStoryProgress(gameState) {
        const oldProgress = storyProgress;
        
        // Calculate progress based on unlocked entries
        let totalEntries = 0;
        let unlockedCount = 0;
        
        for (const chapter of Object.values(STORY)) {
            totalEntries += chapter.entries.length;
            for (const entry of chapter.entries) {
                if (unlockedEntries.has(entry.id)) {
                    unlockedCount++;
                }
            }
        }
        
        storyProgress = unlockedCount / totalEntries;
        
        // Check for chapter progression
        if (storyProgress >= 0.25 && currentChapter === 'prologue') {
            currentChapter = 'act1';
            triggerChapterTransition('Into the Dark');
        } else if (storyProgress >= 0.5 && currentChapter === 'act1') {
            currentChapter = 'act2';
            triggerChapterTransition('Awakening');
        } else if (storyProgress >= 0.75 && currentChapter === 'act2') {
            currentChapter = 'finale';
            triggerChapterTransition('The Abyss Stares Back');
        }
    }

    function triggerChapterTransition(chapterTitle) {
        if (window.showNotification) {
            showNotification(`📚 Chapter Unlocked: ${chapterTitle}`, 'success');
        }
        
        // Dramatic effect
        if (window.cameraEffects) {
            window.cameraEffects.shake = 0.5;
        }
    }

    function collectLog(logId) {
        if (collectedLogs.has(logId)) return false;
        
        collectedLogs.add(logId);
        
        const log = DATA_LOGS.find(l => l.id === logId);
        if (log) {
            if (window.showNotification) {
                showNotification(`📄 Data Log Found: ${log.title}`, 'success');
            }
            
            // Achievement
            if (collectedLogs.size >= 5 && window.SaveSystem) {
                SaveSystem.unlockAchievement('historian');
            }
            
            return log;
        }
        return null;
    }

    function getLogForBiome(biomeId) {
        const available = DATA_LOGS.filter(log => 
            log.location === biomeId && !collectedLogs.has(log.id)
        );
        
        return available.length > 0 ? 
            available[Math.floor(Math.random() * available.length)] : null;
    }

    function getStorySummary() {
        const chapters = [];
        
        for (const [key, chapter] of Object.entries(STORY)) {
            const chapterEntries = chapter.entries.map(entry => ({
                ...entry,
                unlocked: unlockedEntries.has(entry.id)
            }));
            
            chapters.push({
                key,
                title: chapter.title,
                entries: chapterEntries,
                progress: chapterEntries.filter(e => e.unlocked).length / chapterEntries.length
            });
        }
        
        return {
            chapters,
            currentChapter,
            overallProgress: storyProgress,
            logsCollected: collectedLogs.size,
            totalLogs: DATA_LOGS.length
        };
    }

    function getUnlockedEntries() {
        const entries = [];
        
        for (const chapter of Object.values(STORY)) {
            for (const entry of chapter.entries) {
                if (unlockedEntries.has(entry.id)) {
                    entries.push({
                        ...entry,
                        chapter: chapter.title
                    });
                }
            }
        }
        
        return entries;
    }

    function getCollectedLogs() {
        return Array.from(collectedLogs).map(id => 
            DATA_LOGS.find(log => log.id === id)
        ).filter(Boolean);
    }

    function checkEnvironmentalStory(objectId, playerPosition, objectPosition) {
        const story = ENVIRONMENTAL_STORIES[objectId];
        if (!story) return null;
        
        const distance = playerPosition.distanceTo(objectPosition);
        if (distance > story.requiresProximity) return null;
        
        return story;
    }

    function save() {
        return {
            unlockedEntries: Array.from(unlockedEntries),
            collectedLogs: Array.from(collectedLogs),
            currentChapter,
            storyProgress
        };
    }

    return {
        STORY,
        DATA_LOGS,
        init,
        update,
        unlockEntry,
        collectLog,
        getLogForBiome,
        getStorySummary,
        getUnlockedEntries,
        getCollectedLogs,
        checkEnvironmentalStory,
        save,
        getProgress: () => storyProgress
    };
})();

window.NarrativeSystem = NarrativeSystem;
