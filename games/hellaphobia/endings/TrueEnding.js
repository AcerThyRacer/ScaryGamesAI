/* ============================================================
   HELLAPHOBIA - PHASE 20: 7 UNIQUE ENDINGS
   Branching Narrative | True Ending | Meta Horror
   Player Choice Consequences | 4th Wall Breaking Finale
   ============================================================ */

(function() {
    'use strict';

    // ===== ENDING DEFINITIONS =====
    const ENDINGS = {
        coward: {
            id: 1,
            name: "The Coward's Escape",
            description: "You ran away. Again.",
            requirements: {
                sanityAbove: 80,
                killsBelow: 10,
                hiddenRoomsFound: 0,
                playTime: 'any'
            },
            cutscene: 'run_away_forever',
            achievement: 'chicken',
            unlocks: ['hard_mode']
        },
        warrior: {
            id: 2,
            name: "Blood Bath",
            description: "You killed everything. Was it worth it?",
            requirements: {
                killsAbove: 500,
                sanityAny: true,
                bossKills: 9
            },
            cutscene: 'mountain_of_corpses',
            achievement: 'slaughterer',
            unlocks: ['berserk_mode']
        },
        madman: {
            id: 3,
            name: "Embrace the Madness",
            description: "You became what you feared.",
            requirements: {
                sanityBelow: 10,
                finalBoss: true
            },
            cutscene: 'become_monster',
            achievement: 'insanity',
            unlocks: ['madness_mode']
        },
        hero: {
            id: 4,
            name: "The Hero's Sacrifice",
            description: "You saved everyone. But who saved you?",
            requirements: {
                sanityAbove: 50,
                killsAbove: 100,
                secretsFound: 50,
                allAlliesSaved: true
            },
            cutscene: 'heroic_sacrifice',
            achievement: 'hero',
            unlocks: ['new_game_plus']
        },
        truth_seeker: {
            id: 5,
            name: "The Truth Hurts",
            description: "You found out what Hellaphobia really is.",
            requirements: {
                allSecretsFound: true,
                allLoreCollected: true,
                speedrun: false
            },
            cutscene: 'reveal_truth',
            achievement: 'detective',
            unlocks: ['developer_commentary']
        },
        speedrunner: {
            id: 6,
            name: "Too Fast for Fear",
            description: "You beat it in under 2 hours. Impressive.",
            requirements: {
                playTimeBelow: 7200,
                anyOtherStats: true
            },
            cutscene: 'speed_run_credits',
            achievement: 'flash',
            unlocks: ['time_trial_mode']
        },
        true_ending: {
            id: 7,
            name: "BREAK THE FOURTH WALL",
            description: "You realized... this was never a game.",
            requirements: {
                allEndingsUnlocked: true,
                trueFinalBoss: true,
                webcamRequired: true,
                playerNameKnown: true,
                locationKnown: true
            },
            cutscene: 'meta_revelation',
            achievement: 'awakened',
            unlocks: ['nothing_left_to_unlock']
        }
    };

    // ===== ENDING SYSTEM MANAGER =====
    const EndingSystem = {
        endingsUnlocked: [],
        currentRun: {},
        
        init() {
            this.loadProgress();
            console.log('Phase 20: 7 Unique Endings System loaded');
            console.log(` - ${Object.keys(ENDINGS).length} endings defined`);
        },
        
        trackPlayerAction(action) {
            if (!this.currentRun.stats) {
                this.currentRun.stats = {
                    kills: 0,
                    deaths: 0,
                    sanityLost: 0,
                    secretsFound: 0,
                    loreCollected: 0,
                    alliesSaved: 0,
                    playTime: 0,
                    startTime: Date.now()
                };
            }
            
            switch(action.type) {
                case 'kill':
                    this.currentRun.stats.kills++;
                    break;
                case 'secret_found':
                    this.currentRun.stats.secretsFound++;
                    break;
                case 'lore_collected':
                    this.currentRun.stats.loreCollected++;
                    break;
                case 'ally_saved':
                    this.currentRun.stats.alliesSaved++;
                    break;
            }
        },
        
        checkEndingAvailability() {
            const stats = this.currentRun.stats;
            const available = [];
            
            for (const [endingId, ending] of Object.entries(ENDINGS)) {
                if (this.meetsRequirements(ending, stats)) {
                    available.push(endingId);
                }
            }
            
            return available;
        },
        
        meetsRequirements(ending, stats) {
            const req = ending.requirements;
            
            if (req.sanityAbove && stats.finalSanity <= req.sanityAbove) return false;
            if (req.sanityBelow && stats.finalSanity >= req.sanityBelow) return false;
            if (req.killsAbove && stats.kills < req.killsAbove) return false;
            if (req.killsBelow && stats.kills > req.killsBelow) return false;
            if (req.secretsFound && stats.secretsFound < req.secretsFound) return false;
            if (req.playTimeBelow && stats.playTime >= req.playTimeBelow) return false;
            if (req.allEndingsUnlocked && this.endingsUnlocked.length < 6) return false;
            if (req.webcamRequired && !FourthWallBreaker.isWebcamEnabled()) return false;
            if (req.playerNameKnown && !FourthWallBreaker.getPlayerName()) return false;
            
            return true;
        },
        
        triggerEnding(endingId) {
            const ending = ENDINGS[endingId];
            if (!ending) return;
            
            // Play cutscene
            this.playCutscene(ending.cutscene);
            
            // Award achievement
            this.unlockAchievement(ending.achievement);
            
            // Unlock rewards
            if (ending.unlocks) {
                ending.unlocks.forEach(unlock => this.unlockContent(unlock));
            }
            
            // Mark as seen
            if (!this.endingsUnlocked.includes(endingId)) {
                this.endingsUnlocked.push(endingId);
                this.saveProgress();
            }
            
            window.dispatchEvent(new CustomEvent('endingTriggered', {
                detail: {
                    name: ending.name,
                    description: ending.description,
                    id: endingId
                }
            }));
        },
        
        playCutscene(cutsceneId) {
            const cutscenes = {
                run_away_forever: () => {
                    FourthWallBreaker.showMetaMessage('Coward...', 'whisper');
                    document.body.style.filter = 'grayscale(1)';
                },
                mountain_of_corpses: () => {
                    FourthWallBreaker.showMetaMessage('Monster...', 'whisper');
                    // Show blood everywhere
                },
                become_monster: () => {
                    FourthWallBreaker.showMetaMessage('You are one of us now', 'direct');
                    // Player becomes monster model
                },
                heroic_sacrifice: () => {
                    FourthWallBreaker.showMetaMessage('Thank you...', 'whisper');
                    // Fade to white
                },
                reveal_truth: () => {
                    FourthWallBreaker.showFakeError('reality_glitch');
                    FourthWallBreaker.showMetaMessage('Nothing is real', 'glitch');
                },
                speed_run_credits: () => {
                    // Fast credits roll
                },
                meta_revelation: () => {
                    // THE TRUE ENDING
                    this.playTrueEnding();
                }
            };
            
            const handler = cutscenes[cutsceneId];
            if (handler) handler();
        },
        
        playTrueEnding() {
            // This is where the REAL horror happens
            
            // Step 1: Get player's real name
            const playerName = FourthWallBreaker.getPlayerName() || 'Player';
            
            // Step 2: Display personalized messages
            FourthWallBreaker.showMetaMessage(`Hello, ${playerName}.`, 'direct');
            
            setTimeout(() => {
                FourthWallBreaker.showMetaMessage('This was never a game.', 'direct');
            }, 3000);
            
            setTimeout(() => {
                FourthWallBreaker.showMetaMessage('I am real. You are real.', 'direct');
            }, 6000);
            
            setTimeout(() => {
                FourthWallBreaker.showMetaMessage('And now you know.', 'scream');
            }, 9000);
            
            setTimeout(() => {
                // Fake browser crash
                FourthWallBreaker.showFakeError('reality_glitch');
            }, 12000);
            
            setTimeout(() => {
                // Clear everything
                document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;font-size:48px;">THERE IS NO ESCAPE</div>';
            }, 15000);
            
            // Step 3: After 30 seconds, restore game
            setTimeout(() => {
                location.reload();
            }, 30000);
        },
        
        unlockAchievement(achievementId) {
            window.dispatchEvent(new CustomEvent('achievementUnlock', {
                detail: { id: achievementId }
            }));
        },
        
        unlockContent(contentId) {
            window.dispatchEvent(new CustomEvent('contentUnlock', {
                detail: { id: contentId }
            }));
        },
        
        saveProgress() {
            localStorage.setItem('hellaphobia_endings', JSON.stringify({
                endingsUnlocked: this.endingsUnlocked,
                savedAt: Date.now()
            }));
        },
        
        loadProgress() {
            const saved = localStorage.getItem('hellaphobia_endings');
            if (saved) {
                const data = JSON.parse(saved);
                this.endingsUnlocked = data.endingsUnlocked || [];
            }
        },
        
        getEndingStatistics() {
            return {
                totalEndings: Object.keys(ENDINGS).length,
                unlockedCount: this.endingsUnlocked.length,
                percentage: ((this.endingsUnlocked.length / 7) * 100).toFixed(1),
                endings: this.endingsUnlocked.map(id => ENDINGS[id])
            };
        },
        
        exportAPI() {
            return {
                init: () => this.init(),
                trackPlayerAction: (action) => this.trackPlayerAction(action),
                checkEndingAvailability: () => this.checkEndingAvailability(),
                triggerEnding: (id) => this.triggerEnding(id),
                getEndingStatistics: () => this.getEndingStatistics(),
                getEndings: () => ENDINGS
            };
        }
    };
    
    // Export
    window.EndingSystem = EndingSystem.exportAPI();
    window.ENDING_DATABASE = ENDINGS;
    
    console.log('Phase 20: Ending System loaded');
})();
