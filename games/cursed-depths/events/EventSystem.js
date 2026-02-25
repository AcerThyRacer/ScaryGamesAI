/* ============================================================
   CURSED DEPTHS — Events & Invasions System
   Phase 9: 10+ major events with waves, bosses, and unique loot
   ============================================================ */

class EventSystem {
    constructor() {
        // Event Definitions
        this.EVENTS = {
            // ========== NIGHTLY EVENTS ==========
            BLOOD_MOON: {
                id: 'blood_moon',
                name: 'Blood Moon',
                type: 'nightly',
                duration: 5400, // 90 minutes at 60 FPS
                chance: 0.08, // 8% per night
                requirements: {
                    playerHP: 120,
                    defeatedBosses: ['eye_of_cthulhu'],
                    notDuringOtherEvent: true
                },
                effects: {
                    spawnRateMultiplier: 3.0,
                    zombiesOpenDoors: true,
                    bunniesTurnCorrupt: true,
                    npcsCanDie: false,
                    fishingExclusive: true,
                    enemyDropsExclusive: true
                },
                specialEnemies: [
                    'blood_zombie',
                    'drippler',
                    'corrupt_bunny',
                    'vile_ghoul'
                ],
                exclusiveDrops: [
                    { item: 'bloody_tear', chance: 0.01 },
                    { item: 'meatball', chance: 0.015 },
                    { item: 'bandage', chance: 0.02 }
                ],
                musicTrack: 'boss_goblin_army',
                backgroundColor: '#AA2222',
                message: 'The Blood Moon rises...'
            },

            FULL_MOON: {
                id: 'full_moon',
                name: 'Full Moon',
                type: 'nightly',
                duration: 5400,
                chance: 0.15,
                requirements: {
                    moonPhase: 0, // Full moon only
                    notDuringOtherEvent: true
                },
                effects: {
                    spawnRateMultiplier: 1.5,
                    werewolfSpawns: true,
                    lycanthropyDebuff: true
                },
                specialEnemies: ['werewolf', 'wolf'],
                exclusiveDrops: [
                    { item: 'moon_charm', chance: 0.005 },
                    { item: 'lunar_tablet_fragment', chance: 0.01 }
                ],
                musicTrack: 'overworld_night',
                backgroundColor: '#CCCCFF',
                message: 'The full moon shines brightly...'
            },

            // ========== INVASION EVENTS ==========
            GOBLIN_ARMY: {
                id: 'goblin_army',
                name: 'Goblin Army',
                type: 'invasion',
                duration: 7200, // 2 hours
                chance: 0.05, // 5% per dawn if conditions met
                requirements: {
                    playerHP: 200,
                    defeatedBosses: ['eye_of_cthulhu'],
                    shadowOrbsBroken: 1,
                    notDuringOtherEvent: true,
                    time: 'dawn'
                },
                waves: {
                    total: 7,
                    enemiesPerWave: [15, 20, 25, 30, 35, 40, 50],
                    bossWave: 7
                },
                enemies: [
                    'goblin_warrior',
                    'goblin_thief',
                    'goblin_sorcerer',
                    'goblin_archer',
                    'goblin_peon'
                ],
                boss: 'goblin_summoner',
                exclusiveDrops: [
                    { item: 'harpoon', chance: 0.05, from: 'goblin_thief' },
                    { item: 'spiky_ball', chance: 0.1, from: 'goblin_warrior' },
                    { item: 'shadowflame_set', chance: 0.02, from: 'goblin_summoner' }
                ],
                completionRewards: [
                    { item: 'goblin_tinkerer_npc', condition: 'empty_house' }
                ],
                musicTrack: 'boss_goblin_army',
                backgroundColor: '#AA6622',
                startMessage: 'A Goblin Army is approaching from the west!',
                warningMessage: 'Goblins are approaching!',
                completeMessage: 'The Goblin Army has been defeated!'
            },

            PIRATE_INVASION: {
                id: 'pirate_invasion',
                name: 'Pirate Invasion',
                type: 'invasion',
                duration: 7200,
                chance: 0.03,
                requirements: {
                    playerHP: 300,
                    defeatedBosses: ['wall_of_flesh'],
                    hardmode: true,
                    notDuringOtherEvent: true,
                    time: 'dawn'
                },
                waves: {
                    total: 9,
                    enemiesPerWave: [20, 25, 30, 35, 40, 45, 50, 55, 60],
                    bossWave: 9
                },
                enemies: [
                    'pirate_corsair',
                    'pirate_deadeye',
                    'pirate_crossbower',
                    'pirate_captain',
                    'parrot'
                ],
                boss: 'pirate_ship',
                exclusiveDrops: [
                    { item: 'coin_gun', chance: 0.001, from: 'pirate_captain' },
                    { item: 'lucky_coin', chance: 0.01, from: 'pirate_captain' },
                    { item: 'gold_ring', chance: 0.02, from: 'pirate_corsair' },
                    { item: 'cutlass', chance: 0.05, from: 'pirate_deadeye' }
                ],
                completionRewards: [
                    { item: 'pirate_staff_npc', condition: 'empty_house' }
                ],
                musicTrack: 'boss_pirate',
                backgroundColor: '#2244AA',
                startMessage: 'A Pirate Invasion is approaching from the east!',
                warningMessage: 'Pirates are approaching!',
                completeMessage: 'The Pirate Invasion has been defeated!'
            },

            FROST_LEGION: {
                id: 'frost_legion',
                name: 'Frost Legion',
                type: 'invasion',
                duration: 7200,
                chance: 0.02,
                requirements: {
                    playerHP: 300,
                    defeatedBosses: ['mechanical_twins'],
                    hardmode: true,
                    winterSeason: true,
                    notDuringOtherEvent: true
                },
                waves: {
                    total: 8,
                    enemiesPerWave: [18, 24, 30, 36, 42, 48, 54, 60],
                    bossWave: 8
                },
                enemies: [
                    'snowman_gangsta',
                    'yeti',
                    'ice_queen_minion',
                    'gingerbread_man',
                    'present_mimic'
                ],
                boss: 'ice_queen',
                exclusiveDrops: [
                    { item: 'christmas_tree_sword', chance: 0.015, from: 'yeti' },
                    { item: 'razorpine', chance: 0.02, from: 'ice_queen' },
                    { item: 'blizzard_staff', chance: 0.02, from: 'ice_queen' }
                ],
                musicTrack: 'boss_frost_moon',
                backgroundColor: '#88CCFF',
                startMessage: 'The Frost Legion is descending from the sky!',
                warningMessage: 'Snowmen are falling from the sky!',
                completeMessage: 'The Frost Legion has been defeated!'
            },

            // ========== APOCALYPTIC EVENTS ==========
            SOLAR_ECLIPSE: {
                id: 'solar_eclipse',
                name: 'Solar Eclipse',
                type: 'apocalyptic',
                duration: 4800, // 80 minutes
                chance: 0.01, // 1% per dawn after mechanical bosses
                requirements: {
                    defeatedMechanicalBosses: true,
                    hardmode: true,
                    time: 'dawn',
                    notDuringOtherEvent: true
                },
                effects: {
                    spawnRateMultiplier: 5.0,
                    sunBlocked: true,
                    vampiresSpawn: true,
                   蛾 ronSpawns: true,
                    daytimeEnemies: true
                },
                specialEnemies: [
                    'mothron',
                    'vampire',
                    'frankenstein',
                    'swamp_thing',
                    'eyeball_flutterfly',
                    'death_character'
                ],
                exclusiveDrops: [
                    { item: 'broken_hero_sword', chance: 0.05, from: 'mothron' },
                    { item: 'death_sickle', chance: 0.02, from: 'reaper' },
                    { item: 'psychic_knife', chance: 0.02, from: 'psycho' },
                    { item: 'vampire_knife', chance: 0.015, from: 'vampire' }
                ],
                musicTrack: 'boss_eclipse',
                backgroundColor: '#222222',
                startMessage: 'A Solar Eclipse is happening!',
                completeMessage: 'The Solar Eclipse has ended...'
            },

            MARTIAN_MADNESS: {
                id: 'martian_madness',
                name: 'Martian Madness',
                type: 'invasion',
                duration: 9000, // 2.5 hours
                triggerItem: 'martian_probe',
                requirements: {
                    defeatedGolem: true,
                    hardmode: true,
                    inSpaceLayer: true // Triggered by probe in space
                },
                waves: {
                    total: 12,
                    enemiesPerWave: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
                    bossWave: 12
                },
                enemies: [
                    'martian_officer',
                    'martian_engineer',
                    'martian_tesla_turret',
                    'martian_drone',
                    'gray_grunt',
                    'brain_suckler',
                    'gigazapper',
                    'ray_gunner'
                ],
                boss: 'martian_saucer',
                exclusiveDrops: [
                    { item: 'influx_waver', chance: 0.02, from: 'martian_saucer' },
                    { item: 'xenopopper', chance: 0.03, from: 'martian_saucer' },
                    { item: 'laser_rifle', chance: 0.04, from: 'martian_officer' },
                    { item: 'cosmic_car_key', chance: 0.01, from: 'martian_saucer' }
                ],
                musicTrack: 'boss_martian',
                backgroundColor: '#88FF88',
                startMessage: 'Martians are invading!',
                warningMessage: 'A Martian Probe is scanning the area!',
                completeMessage: 'The Martians have been defeated!'
            },

            // ========== SEASONAL EVENTS ==========
            PUMPKIN_MOON: {
                id: 'pumpkin_moon',
                name: 'Pumpkin Moon',
                type: 'seasonal_event',
                duration: 7200,
                triggerItem: 'pumpkin_moon_medallion',
                requirements: {
                    defeatedPlantera: true,
                    hardmode: true,
                    time: 'night',
                    autumnSeason: true
                },
                waves: {
                    total: 15,
                    enemiesPerWave: [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
                    bossWaves: [5, 10, 15]
                },
                enemies: [
                    'scarecrow',
                    'splinterling',
                    'hellhound',
                    'poltergeist',
                    'headless_horseman'
                ],
                bosses: ['pumpking', 'mourning_wood'],
                exclusiveDrops: [
                    { item: 'horseman_blade', chance: 0.015, from: 'pumpking' },
                    { item: 'jack_o_lantern_launcher', chance: 0.02, from: 'pumpking' },
                    { item: 'cursed_sapling', chance: 0.02, from: 'mourning_wood' },
                    { item: 'spooky_hook', chance: 0.02, from: 'mourning_wood' }
                ],
                musicTrack: 'boss_pumpkin_moon',
                backgroundColor: '#FF6600',
                startMessage: 'The Pumpkin Moon has risen!',
                waveMessage: 'Wave {wave} begins!',
                completeMessage: 'The Pumpkin Moon has set...'
            },

            FROST_MOON: {
                id: 'frost_moon',
                name: 'Frost Moon',
                type: 'seasonal_event',
                duration: 7200,
                triggerItem: 'naughty_present',
                requirements: {
                    defeatedGolem: true,
                    hardmode: true,
                    time: 'night',
                    winterSeason: true
                },
                waves: {
                    total: 20,
                    enemiesPerWave: [12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102, 108, 114, 120, 126],
                    bossWaves: [5, 10, 15, 20]
                },
                enemies: [
                    'gingerbread_man',
                    'yeti',
                    'elf_copter',
                    'nutcracker',
                    'flocko',
                    'present_mimic',
                    'grinch_fighter'
                ],
                bosses: ['ice_queen', 'santa_nk1'],
                exclusiveDrops: [
                    { item: 'razorpine', chance: 0.015, from: 'ice_queen' },
                    { item: 'blizzard_staff', chance: 0.015, from: 'ice_queen' },
                    { item: 'north_pole', chance: 0.02, from: 'santa_nk1' },
                    { item: 'chain_gun', chance: 0.02, from: 'santa_nk1' }
                ],
                musicTrack: 'boss_frost_moon',
                backgroundColor: '#88DDFF',
                startMessage: 'The Frost Moon has risen!',
                waveMessage: 'Wave {wave} begins!',
                completeMessage: 'The Frost Moon has set...'
            },

            OLD_ONES_ARMY: {
                id: 'old_ones_army',
                name: 'Old One\'s Army',
                type: 'tower_defense',
                duration: 6000,
                triggerItem: 'etherian_crystal',
                requirements: {
                    defeatedEaterOrBrain: true,
                    crystalPlaced: true,
                    nearEtherianStand: true
                },
                waves: {
                    total: 7, // Tier 1, more in higher tiers
                    enemiesPerWave: [20, 30, 40, 50, 60, 70, 80],
                    protectObjective: 'etherian_crystal'
                },
                enemies: [
                    'etherian_goblin',
                    'etherian_goblin_bomber',
                    'etherian_javelin_thrower',
                    'etherian_lightning_bug',
                    'wither_beast',
                    'drakin',
                    'kobold',
                    'ogre'
                ],
                boss: 'eternia_crystal_boss',
                exclusiveDrops: [
                    { item: 'sky_guard', chance: 0.05 },
                    { item: 'ale_tossing', chance: 0.1 },
                    { item: 'phantom_phoenix', chance: 0.02 }
                ],
                musicTrack: 'boss_old_ones',
                backgroundColor: '#8844FF',
                startMessage: 'The Old One\'s Army is approaching!',
                crystalWarning: 'Protect the Eternia Crystal!',
                completeMessage: 'The Old One\'s Army has been defeated!'
            }
        };

        // Active event state
        this.activeEvent = null;
        this.eventTimer = 0;
        this.currentWave = 0;
        this.enemiesDefeatedInWave = 0;
        this.eventProgress = 0;

        // Event tracking
        this.eventsCompleted = {};
        this.bestWaveReached = {};
        this.totalEventsParticipated = 0;

        // Invasion progress
        this.invasionProgress = {
            goblinArmy: 0,
            pirateInvasion: 0,
            frostLegion: 0,
            martianMadness: 0
        };
    }

    init() {
        console.log(`[EventSystem] Initialized ${Object.keys(this.EVENTS).length} events`);
    }

    update() {
        // Check for event start conditions
        if (!this.activeEvent) {
            this.checkForEventStart();
        } else {
            // Update active event
            this.updateActiveEvent();
        }
    }

    checkForEventStart() {
        const time = this.getTimeOfDay();
        const isDawn = time >= 0.2 && time <= 0.25;
        const isNight = time >= 0.5 || time <= 0.2;

        // Check each event's chance
        for (const [eventId, eventData] of Object.entries(this.EVENTS)) {
            if (!this.meetsRequirements(eventData)) {
                continue;
            }

            // Roll for event start
            let shouldStart = false;

            if (eventData.type === 'nightly' && isNight) {
                shouldStart = Math.random() < eventData.chance;
            } else if (eventData.type === 'invasion' && isDawn) {
                shouldStart = Math.random() < eventData.chance;
            } else if (eventData.type === 'apocalyptic' && isDawn) {
                shouldStart = Math.random() < eventData.chance;
            }

            if (shouldStart) {
                this.startEvent(eventId);
                break; // Only one event at a time
            }
        }
    }

    meetsRequirements(eventData) {
        const reqs = eventData.requirements;

        // HP requirement
        if (reqs.playerHP && player.hp < reqs.playerHP) {
            return false;
        }

        // Boss defeat requirements
        if (reqs.defeatedBosses) {
            for (const boss of reqs.defeatedBosses) {
                if (!BossSummon.bossesDefeated[boss]) {
                    return false;
                }
            }
        }

        // Hardmode requirement
        if (reqs.hardmode && !Progression.isHardmode()) {
            return false;
        }

        // Time requirement
        if (reqs.time) {
            const time = this.getTimeOfDay();
            if (reqs.time === 'dawn' && (time < 0.2 || time > 0.25)) {
                return false;
            }
            if (reqs.time === 'night' && (time < 0.5 && time > 0.75)) {
                return false;
            }
        }

        // Seasonal requirements
        if (reqs.winterSeason && Weather.season !== 'winter') {
            return false;
        }
        if (reqs.autumnSeason && Weather.season !== 'autumn') {
            return false;
        }

        return true;
    }

    startEvent(eventId) {
        const eventData = this.EVENTS[eventId];
        
        this.activeEvent = eventId;
        this.eventTimer = eventData.duration;
        this.currentWave = 0;
        this.enemiesDefeatedInWave = 0;
        this.eventProgress = 0;
        this.totalEventsParticipated++;

        // Show start message
        showMassiveMessage(eventData.startMessage);
        
        // Apply event effects
        this.applyEventEffects(eventData);

        // Change background color
        PostProcess.applyEffect({
            colorGrading: this.getEventColorGrading(eventId)
        }, eventData.duration);

        // Play event music
        if (typeof AudioManager !== 'undefined') {
            AudioManager.playMusic(eventData.musicTrack);
        }

        console.log(`[EventSystem] Started event: ${eventId}`);
    }

    updateActiveEvent() {
        const eventData = this.EVENTS[this.activeEvent];
        
        // Decrease timer
        this.eventTimer--;

        // Handle waves for invasion events
        if (eventData.type === 'invasion' || eventData.type === 'seasonal_event') {
            this.updateInvasionWaves(eventData);
        }

        // Spawn enemies continuously
        this.spawnEventEnemies(eventData);

        // Check for completion
        if (this.eventTimer <= 0) {
            this.endEvent();
        }
    }

    updateInvasionWaves(eventData) {
        const waves = eventData.waves;
        
        // Check if current wave is complete
        if (this.enemiesDefeatedInWave >= waves.enemiesPerWave[this.currentWave]) {
            this.currentWave++;
            this.enemiesDefeatedInWave = 0;

            if (this.currentWave >= waves.total) {
                // Event complete!
                this.completeEvent();
                return;
            }

            // Announce new wave
            const waveMessage = eventData.waveMessage.replace('{wave}', this.currentWave + 1);
            showStatusMessage(waveMessage);

            // Spawn boss on boss wave
            if (waves.bossWave && this.currentWave + 1 === waves.bossWave && eventData.boss) {
                setTimeout(() => {
                    BossSummon.spawnBoss(eventData.boss, player.x + 400, player.y);
                }, 2000);
            }
        }
    }

    spawnEventEnemies(eventData) {
        const maxEnemies = 10;
        const currentEnemies = EnemySystem.activeEnemies.length;

        if (currentEnemies >= maxEnemies) {
            return;
        }

        // Spawn based on event type
        const spawnChance = 0.05 * (eventData.effects?.spawnRateMultiplier || 1);

        if (Math.random() < spawnChance) {
            const enemyList = eventData.specialEnemies || eventData.enemies || [];
            const enemyType = enemyList[Math.floor(Math.random() * enemyList.length)];

            // Spawn away from player
            const angle = Math.random() * Math.PI * 2;
            const distance = 400 + Math.random() * 200;
            const x = player.x + Math.cos(angle) * distance;
            const y = player.y + Math.sin(angle) * distance - 200;

            EnemySystem.spawnEnemy(enemyType, x, y);
        }
    }

    registerEnemyKill(enemyType) {
        if (!this.activeEvent) return;

        const eventData = this.EVENTS[this.activeEvent];

        if (eventData.type === 'invasion' || eventData.type === 'seasonal_event') {
            this.enemiesDefeatedInWave++;
        }

        // Check for exclusive drops
        if (eventData.exclusiveDrops) {
            for (const drop of eventData.exclusiveDrops) {
                if (drop.from === enemyType && Math.random() < drop.chance) {
                    this.dropLoot(drop.item);
                }
            }
        }
    }

    endEvent() {
        const eventData = this.EVENTS[this.activeEvent];
        
        showStatusMessage(eventData.completeMessage);
        
        // Remove event effects
        this.removeEventEffects();

        // Reset
        this.activeEvent = null;
        this.eventTimer = 0;
        this.currentWave = 0;
    }

    completeEvent() {
        const eventData = this.EVENTS[this.activeEvent];
        
        showMassiveMessage(eventData.completeMessage);
        
        // Mark as completed
        this.eventsCompleted[this.activeEvent] = true;
        
        // Give completion rewards
        if (eventData.completionRewards) {
            for (const reward of eventData.completionRewards) {
                if (reward.condition === 'empty_house') {
                    // Spawn NPC if house available
                    showStatusMessage(`${reward.item} will arrive soon!`);
                } else {
                    this.dropLoot(reward.item);
                }
            }
        }

        // Reset
        this.activeEvent = null;
        this.eventTimer = 0;
        this.currentWave = 0;
    }

    applyEventEffects(eventData) {
        const effects = eventData.effects;
        
        if (effects) {
            // Global spawn rate multiplier
            if (effects.spawnRateMultiplier) {
                EnemySystem.spawnConfig.spawnRate *= effects.spawnRateMultiplier;
            }
            
            // Special effect flags
            if (effects.zombiesOpenDoors) {
                worldFlags.zombiesOpenDoors = true;
            }
            if (effects.vampiresSpawn) {
                worldFlags.vampiresSpawn = true;
            }
        }
    }

    removeEventEffects() {
        // Reset spawn rate
        EnemySystem.spawnConfig.spawnRate = 0.02;
        
        // Reset flags
        worldFlags.zombiesOpenDoors = false;
        worldFlags.vampiresSpawn = false;
        
        // Reset post-processing
        PostProcess.resetToNormal();
    }

    getEventColorGrading(eventId) {
        const grading = {
            'blood_moon': [1.2, 0.7, 0.7],
            'solar_eclipse': [0.5, 0.5, 0.5],
            'frost_moon': [0.8, 0.9, 1.1],
            'pumpkin_moon': [1.1, 0.8, 0.6],
            'martian_madness': [0.8, 1.1, 0.8]
        };
        
        return grading[eventId] || [1, 1, 1];
    }

    dropLoot(itemId) {
        // Drop item near player
        const x = player.x + (Math.random() - 0.5) * 60;
        const y = player.y - 40;
        
        addItem(itemId, 1);
        Particles.spawnEnvironmentalParticle(x, y, 'spark');
        
        showStatusMessage(`Received ${itemId}!`);
    }

    getTimeOfDay() {
        return typeof dayTime !== 'undefined' ? dayTime : 0.5;
    }

    isActive() {
        return this.activeEvent !== null;
    }

    getCurrentEvent() {
        return this.activeEvent ? this.EVENTS[this.activeEvent] : null;
    }

    getWaveInfo() {
        if (!this.activeEvent) return null;
        
        const eventData = this.EVENTS[this.activeEvent];
        
        return {
            currentWave: this.currentWave + 1,
            totalWaves: eventData.waves?.total || 0,
            enemiesDefeated: this.enemiesDefeatedInWave,
            enemiesNeeded: eventData.waves?.enemiesPerWave?.[this.currentWave] || 0
        };
    }
}

// Global event system instance
const GameEvents = new EventSystem();

// Initialize on game start
function initEvents() {
    GameEvents.init();
}

// Utility functions
function showStatusMessage(text) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = text;
        eventBannerTimer = 180;
    }
}

function showMassiveMessage(text) {
    if (typeof eventBannerText !== 'undefined') {
        eventBannerText = text;
        eventBannerTimer = 420;
    }
}

function addItem(itemId, count) {
    console.log(`Adding ${count}x ${itemId}`);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventSystem, GameEvents, initEvents };
}
