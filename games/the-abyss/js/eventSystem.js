/* ============================================
   The Abyss - Dynamic Event System
   Phase 2 Implementation
   ============================================ */

const EventSystem = (function() {
    'use strict';

    // Event types
    const EVENTS = {
        // Random encounters
        CREATURE_AMBUSH: {
            id: 'creature_ambush',
            name: 'Creature Ambush',
            description: 'Creatures have detected you!',
            type: 'combat',
            weight: 10,
            conditions: ['danger_level_1_plus', 'not_in_safe_zone'],
            duration: 30,
            cooldown: 120
        },
        
        SCHOOL_OF_FISH: {
            id: 'school_of_fish',
            name: 'School of Fish',
            description: 'A massive school of fish passes by, obscuring vision.',
            type: 'environmental',
            weight: 15,
            conditions: ['depth_under_50'],
            duration: 20,
            cooldown: 60
        },
        
        UNDERWATER_CURRENT: {
            id: 'underwater_current',
            name: 'Strong Current',
            description: 'A powerful current pushes you off course!',
            type: 'environmental',
            weight: 12,
            conditions: ['any_depth'],
            duration: 15,
            cooldown: 90
        },
        
        BIO_LUMINESCENCE_BURST: {
            id: 'bio_burst',
            name: 'Bioluminescent Burst',
            description: 'The water lights up with bioluminescent plankton!',
            type: 'environmental',
            weight: 8,
            conditions: ['depth_over_20'],
            duration: 25,
            cooldown: 180
        },
        
        SINKING_DEBRIS: {
            id: 'sinking_debris',
            name: 'Sinking Debris',
            description: 'Debris from above drifts down. Could contain supplies.',
            type: 'opportunity',
            weight: 10,
            conditions: ['any_depth'],
            duration: 45,
            cooldown: 150
        },
        
        DISTRESS_SIGNAL: {
            id: 'distress_signal',
            name: 'Distress Signal',
            description: 'You detect a weak emergency beacon nearby.',
            type: 'choice',
            weight: 5,
            conditions: ['danger_level_1_plus'],
            duration: 60,
            cooldown: 300
        },
        
        LEVIATHAN_PASSING: {
            id: 'leviathan_passing',
            name: 'Leviathan Passing',
            description: 'Something MASSIVE is moving in the distance...',
            type: 'scripted',
            weight: 3,
            conditions: ['depth_over_80', 'danger_level_3_plus'],
            duration: 40,
            cooldown: 600,
            oncePerRun: true
        },
        
        WHALE_FALL: {
            id: 'whale_fall',
            name: 'Whale Fall',
            description: 'You discover a recently deceased whale - a new ecosystem.',
            type: 'discovery',
            weight: 4,
            conditions: ['depth_over_50'],
            duration: 0, // Permanent POI
            cooldown: 0,
            oncePerRun: true
        },
        
        CAVE_COLLAPSE: {
            id: 'cave_collapse',
            name: 'Cave Collapse',
            description: 'The tunnel ahead is collapsing!',
            type: 'emergency',
            weight: 6,
            conditions: ['in_cave'],
            duration: 10,
            cooldown: 200
        },
        
        OXYGEN_RICH_VENT: {
            id: 'oxygen_vent',
            name: 'Oxygen-Rich Vent',
            description: 'You found a natural oxygen vent!',
            type: 'opportunity',
            weight: 8,
            conditions: ['oxygen_under_50'],
            duration: 30,
            cooldown: 240
        },
        
        CREATURE_HUNT: {
            id: 'creature_hunt',
            name: 'Predator Hunt',
            description: 'A creature is hunting you! Stay quiet and hidden.',
            type: 'stealth',
            weight: 8,
            conditions: ['danger_level_2_plus', 'not_in_safe_zone'],
            duration: 45,
            cooldown: 180
        },
        
        ANCIENT_RUINS_DISCOVERY: {
            id: 'ruins_discovery',
            name: 'Ancient Ruins',
            description: 'You discover structures that should not exist...',
            type: 'discovery',
            weight: 5,
            conditions: ['depth_over_60'],
            duration: 0,
            cooldown: 0,
            oncePerRun: true
        },
        
        EQUIPMENT_MALFUNCTION: {
            id: 'equipment_fail',
            name: 'Equipment Malfunction',
            description: 'Your flashlight flickers and dies!',
            type: 'emergency',
            weight: 7,
            conditions: ['any_depth'],
            duration: 20,
            cooldown: 300
        },
        
        MIRRORS_SURFACE: {
            id: 'mirrors_surface',
            name: 'Mirror Surface',
            description: 'The water surface creates a mirror effect, disorienting you.',
            type: 'environmental',
            weight: 6,
            conditions: ['depth_under_30'],
            duration: 15,
            cooldown: 120
        }
    };

    // Event state
    let activeEvents = [];
    let eventHistory = [];
    let lastEventTime = 0;
    let eventCooldowns = {};
    let eventWeights = {};
    let listeners = {};
    let triggeredOncePerRun = [];

    // Event check interval (seconds)
    const EVENT_CHECK_INTERVAL = 30;
    let timeSinceLastCheck = 0;

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        activeEvents = [];
        eventHistory = [];
        lastEventTime = 0;
        eventCooldowns = {};
        triggeredOncePerRun = [];
        
        // Initialize weights
        for (const key in EVENTS) {
            eventWeights[EVENTS[key].id] = EVENTS[key].weight;
        }
        
        console.log('Event System initialized');
    }

    function reset() {
        triggeredOncePerRun = [];
        eventCooldowns = {};
        activeEvents = [];
    }

    // ============================================
    // EVENT UPDATE LOOP
    // ============================================
    function update(deltaTime, gameState) {
        // Update active events
        updateActiveEvents(deltaTime);
        
        // Update cooldowns
        updateCooldowns(deltaTime);
        
        // Check for new events
        timeSinceLastCheck += deltaTime;
        if (timeSinceLastCheck >= EVENT_CHECK_INTERVAL) {
            timeSinceLastCheck = 0;
            checkForNewEvent(gameState);
        }
    }

    function updateActiveEvents(deltaTime) {
        for (let i = activeEvents.length - 1; i >= 0; i--) {
            const event = activeEvents[i];
            event.timeRemaining -= deltaTime;
            
            // Update event logic
            if (event.onUpdate) {
                event.onUpdate(deltaTime);
            }
            
            // Check if event should end
            if (event.timeRemaining <= 0) {
                endEvent(event);
                activeEvents.splice(i, 1);
            }
        }
    }

    function updateCooldowns(deltaTime) {
        for (const eventId in eventCooldowns) {
            eventCooldowns[eventId] -= deltaTime;
            if (eventCooldowns[eventId] <= 0) {
                delete eventCooldowns[eventId];
            }
        }
    }

    // ============================================
    // EVENT TRIGGERING
    // ============================================
    function checkForNewEvent(gameState) {
        // Don't trigger if already have too many active events
        if (activeEvents.length >= 2) return;
        
        // Don't trigger during tutorial or menus
        if (gameState.isPaused || gameState.isInMenu) return;
        
        // Get eligible events
        const eligible = getEligibleEvents(gameState);
        if (eligible.length === 0) return;
        
        // Calculate total weight
        let totalWeight = 0;
        for (const event of eligible) {
            totalWeight += eventWeights[event.id] || event.weight;
        }
        
        // Roll for event
        const roll = Math.random() * totalWeight;
        let currentWeight = 0;
        
        for (const event of eligible) {
            currentWeight += eventWeights[event.id] || event.weight;
            if (roll <= currentWeight) {
                triggerEvent(event, gameState);
                break;
            }
        }
    }

    function getEligibleEvents(gameState) {
        const eligible = [];
        
        for (const key in EVENTS) {
            const event = EVENTS[key];
            
            // Check cooldown
            if (eventCooldowns[event.id] > 0) continue;
            
            // Check once per run
            if (event.oncePerRun && triggeredOncePerRun.includes(event.id)) continue;
            
            // Check conditions
            if (!checkConditions(event.conditions, gameState)) continue;
            
            eligible.push(event);
        }
        
        return eligible;
    }

    function checkConditions(conditions, gameState) {
        if (!conditions || conditions.length === 0) return true;
        
        for (const condition of conditions) {
            switch(condition) {
                case 'any_depth':
                    return true;
                    
                case 'depth_under_50':
                    if (gameState.depth >= 50) return false;
                    break;
                    
                case 'depth_over_20':
                    if (gameState.depth < 20) return false;
                    break;
                    
                case 'depth_over_50':
                    if (gameState.depth < 50) return false;
                    break;
                    
                case 'depth_over_60':
                    if (gameState.depth < 60) return false;
                    break;
                    
                case 'depth_over_80':
                    if (gameState.depth < 80) return false;
                    break;
                    
                case 'danger_level_1_plus':
                    if (gameState.dangerLevel < 1) return false;
                    break;
                    
                case 'danger_level_2_plus':
                    if (gameState.dangerLevel < 2) return false;
                    break;
                    
                case 'danger_level_3_plus':
                    if (gameState.dangerLevel < 3) return false;
                    break;
                    
                case 'oxygen_under_50':
                    if (gameState.oxygen >= 50) return false;
                    break;
                    
                case 'not_in_safe_zone':
                    if (gameState.isInSafeZone) return false;
                    break;
                    
                case 'in_cave':
                    if (!gameState.isInCave) return false;
                    break;
                    
                default:
                    return false;
            }
        }
        
        return true;
    }

    function triggerEvent(eventData, gameState) {
        console.log(`Triggering event: ${eventData.name}`);
        
        // Set cooldown
        eventCooldowns[eventData.id] = eventData.cooldown;
        
        // Mark once per run
        if (eventData.oncePerRun) {
            triggeredOncePerRun.push(eventData.id);
        }
        
        // Create active event
        const activeEvent = {
            ...eventData,
            timeRemaining: eventData.duration,
            startTime: Date.now(),
            data: {}
        };
        
        // Initialize event-specific data
        initializeEventData(activeEvent, gameState);
        
        activeEvents.push(activeEvent);
        eventHistory.push({
            id: eventData.id,
            name: eventData.name,
            time: Date.now()
        });
        
        // Show notification
        showEventStartNotification(activeEvent);
        
        // Call listeners
        trigger('event_start', { event: activeEvent });
        
        return activeEvent;
    }

    function initializeEventData(event, gameState) {
        switch(event.id) {
            case 'creature_ambush':
                event.data.creatures = generateAmbushCreatures(gameState.dangerLevel);
                break;
                
            case 'underwater_current':
                event.data.direction = Math.random() * Math.PI * 2;
                event.data.strength = 0.5 + Math.random() * 0.5;
                break;
                
            case 'school_of_fish':
                event.data.visibilityReduction = 0.7;
                break;
                
            case 'sinking_debris':
                event.data.loot = generateDebrisLoot();
                event.data.position = generateEventPosition(gameState);
                break;
                
            case 'creature_hunt':
                event.data.hunter = generateHunterCreature(gameState.dangerLevel);
                event.data.huntPhase = 'stalking'; // stalking, chasing, lost
                break;
                
            case 'equipment_fail':
                event.data.originalBattery = gameState.flashlightBattery;
                // Turn off flashlight
                if (window.player) {
                    window.player.flashlightBattery = 0;
                }
                break;
        }
    }

    function endEvent(event) {
        console.log(`Ending event: ${event.name}`);
        
        // Cleanup event-specific effects
        switch(event.id) {
            case 'equipment_fail':
                // Restore flashlight
                if (window.player && event.data.originalBattery) {
                    window.player.flashlightBattery = event.data.originalBattery;
                }
                break;
                
            case 'creature_hunt':
                // Hunter gives up
                showNotification('The predator has lost interest.', 'success');
                break;
        }
        
        showEventEndNotification(event);
        trigger('event_end', { event: event });
    }

    // ============================================
    // EVENT EFFECTS
    // ============================================
    function getActiveEventEffects() {
        const effects = {
            visibilityMultiplier: 1,
            oxygenConsumptionMultiplier: 1,
            movementSpeedMultiplier: 1,
            creatureAggressionMultiplier: 1,
            forceDirections: [],
            blockedActions: []
        };
        
        for (const event of activeEvents) {
            switch(event.id) {
                case 'school_of_fish':
                    effects.visibilityMultiplier *= event.data.visibilityReduction || 0.7;
                    break;
                    
                case 'underwater_current':
                    effects.forceDirections.push({
                        angle: event.data.direction,
                        strength: event.data.strength
                    });
                    break;
                    
                case 'bio_burst':
                    effects.visibilityMultiplier *= 1.3;
                    effects.creatureAggressionMultiplier *= 1.2;
                    break;
                    
                case 'mirrors_surface':
                    effects.movementSpeedMultiplier *= 0.8;
                    break;
                    
                case 'creature_hunt':
                    if (event.data.huntPhase === 'chasing') {
                        effects.creatureAggressionMultiplier *= 2;
                    }
                    break;
            }
        }
        
        return effects;
    }

    // ============================================
    // EVENT-SPECIFIC LOGIC
    // ============================================
    function generateAmbushCreatures(dangerLevel) {
        const count = Math.floor(Math.random() * dangerLevel) + 1;
        const creatures = [];
        
        for (let i = 0; i < count; i++) {
            creatures.push({
                type: dangerLevel >= 3 ? 'stalker' : 'angler',
                position: randomPositionAroundPlayer(20)
            });
        }
        
        return creatures;
    }

    function generateHunterCreature(dangerLevel) {
        return {
            type: dangerLevel >= 3 ? 'stalker' : 'angler',
            position: randomPositionAroundPlayer(30),
            awareness: 0,
            lastKnownPlayerPos: null
        };
    }

    function generateDebrisLoot() {
        const lootTable = ['metal_scrap', 'battery', 'flare', 'oxygen_tank'];
        const loot = [];
        const count = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < count; i++) {
            loot.push(lootTable[Math.floor(Math.random() * lootTable.length)]);
        }
        
        return loot;
    }

    function generateEventPosition(gameState) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 20;
        
        return {
            x: gameState.playerX + Math.cos(angle) * distance,
            y: gameState.playerY + (Math.random() - 0.5) * 10,
            z: gameState.playerZ + Math.sin(angle) * distance
        };
    }

    function randomPositionAroundPlayer(radius) {
        if (!window.player) return { x: 0, y: 0, z: 0 };
        
        const angle = Math.random() * Math.PI * 2;
        const r = radius + Math.random() * 10;
        
        return {
            x: window.player.position.x + Math.cos(angle) * r,
            y: window.player.position.y + (Math.random() - 0.5) * 5,
            z: window.player.position.z + Math.sin(angle) * r
        };
    }

    // ============================================
    // MANUAL EVENT TRIGGERING
    // ============================================
    function trigger(eventId, gameState = {}) {
        const event = Object.values(EVENTS).find(e => e.id === eventId);
        if (event) {
            return triggerEvent(event, gameState);
        }
        return null;
    }

    function forceEvent(eventId, gameState = {}) {
        // Bypass all checks and cooldowns
        const event = Object.values(EVENTS).find(e => e.id === eventId);
        if (event) {
            return triggerEvent(event, gameState);
        }
        return null;
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    function on(eventName, callback) {
        if (!listeners[eventName]) {
            listeners[eventName] = [];
        }
        listeners[eventName].push(callback);
    }

    function off(eventName, callback) {
        if (listeners[eventName]) {
            listeners[eventName] = listeners[eventName].filter(cb => cb !== callback);
        }
    }

    function trigger(eventName, data) {
        if (listeners[eventName]) {
            listeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error('Event listener error:', e);
                }
            });
        }
    }

    // ============================================
    // UI NOTIFICATIONS
    // ============================================
    function showEventStartNotification(event) {
        if (window.showNotification) {
            const type = event.type === 'emergency' ? 'danger' : 
                        event.type === 'opportunity' ? 'success' : 'info';
            
            showNotification(`📢 ${event.name}: ${event.description}`, type);
        }
    }

    function showEventEndNotification(event) {
        // Only show for significant events
        if (event.type === 'emergency' || event.type === 'combat') {
            if (window.showNotification) {
                showNotification(`${event.name} has ended.`);
            }
        }
    }

    function showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }

    // ============================================
    // GETTERS
    // ============================================
    function getActiveEvents() {
        return [...activeEvents];
    }

    function getEventHistory() {
        return [...eventHistory];
    }

    function isEventActive(eventId) {
        return activeEvents.some(e => e.id === eventId);
    }

    function getEventData(eventId) {
        const event = activeEvents.find(e => e.id === eventId);
        return event ? event.data : null;
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        EVENTS,
        
        init,
        reset,
        update,
        
        trigger,
        forceEvent,
        endEvent,
        
        getActiveEvents,
        getEventHistory,
        isEventActive,
        getEventData,
        getActiveEventEffects,
        
        on,
        off,
        trigger
    };
})();

// Global access
window.EventSystem = EventSystem;
