/* ============================================
   The Abyss - Stealth System
   Phase 3 Implementation
   ============================================ */

const StealthSystem = (function() {
    'use strict';

    // Stealth states
    const STEALTH_STATES = {
        HIDDEN: 'hidden',       // Creature cannot detect you
        SUSPICIOUS: 'suspicious', // Creatures may investigate
        DETECTED: 'detected',   // Creatures are actively hunting
        ALERT: 'alert'          // All creatures in area alerted
    };

    // Visibility modifiers
    const VISIBILITY_FACTORS = {
        BASE: 1.0,
        MOVEMENT: {
            still: 0.1,
            walking: 0.5,
            swimming: 0.3,
            sprinting: 1.0
        },
        LIGHT: {
            flashlight_off: 0.3,
            flashlight_on: 1.0,
            flare_nearby: 1.5,
            bioluminescent: 0.8
        },
        ENVIRONMENT: {
            open_water: 1.0,
            kelp_forest: 0.3,
            cave: 0.4,
            wreck_interior: 0.2,
            dark_corner: 0.1
        },
        ACTIONS: {
            breathing_normal: 0.2,
            holding_breath: 0.0,
            using_equipment: 0.4,
            taking_damage: 0.8
        }
    };

    // Noise levels
    const NOISE_LEVELS = {
        SILENT: 0,
        QUIET: 0.2,
        NORMAL: 0.5,
        LOUD: 0.8,
        VERY_LOUD: 1.0
    };

    // Player stealth state
    let playerState = {
        visibility: 0,
        noise: 0,
        lightLevel: 0,
        isHiding: false,
        isHoldingBreath: false,
        hidingSpot: null,
        detectionLevel: 0, // 0-100
        lastNoiseTime: 0,
        tracks: [], // Trail of recent positions
        bloodTrail: false
    };

    // Hiding spots
    let hidingSpots = [];
    let globalAlertLevel = 0;

    // ============================================
    // INITIALIZATION
    // ============================================
    function init() {
        playerState = {
            visibility: 0,
            noise: 0,
            lightLevel: 0.5,
            isHiding: false,
            isHoldingBreath: false,
            hidingSpot: null,
            detectionLevel: 0,
            lastNoiseTime: 0,
            tracks: [],
            bloodTrail: false
        };
        hidingSpots = [];
        globalAlertLevel = 0;
    }

    // ============================================
    // MAIN UPDATE LOOP
    // ============================================
    function update(deltaTime, player, gameState) {
        updateVisibility(player, gameState);
        updateNoise(player, gameState);
        updateTracks(player, deltaTime);
        updateDetection(deltaTime);
        updateHiding(player, gameState);
        
        // Update global alert decay
        globalAlertLevel = Math.max(0, globalAlertLevel - deltaTime * 5);
        
        // Return current stealth state
        return getStealthState();
    }

    // ============================================
    // VISIBILITY CALCULATION
    // ============================================
    function updateVisibility(player, gameState) {
        let visibility = VISIBILITY_FACTORS.BASE;
        
        // Movement factor
        const speed = player.velocity ? Math.sqrt(
            player.velocity.x**2 + 
            player.velocity.y**2 + 
            player.velocity.z**2
        ) : 0;
        
        let movementState = 'still';
        if (speed > 10) movementState = 'sprinting';
        else if (speed > 5) movementState = 'swimming';
        else if (speed > 0.5) movementState = 'walking';
        
        visibility *= VISIBILITY_FACTORS.MOVEMENT[movementState] || 0.5;
        
        // Light factor
        let lightState = 'flashlight_off';
        if (player.flashlightOn) lightState = 'flashlight_on';
        if (gameState.nearFlare) lightState = 'flare_nearby';
        if (gameState.inBioluminescentArea) lightState = 'bioluminescent';
        
        visibility *= VISIBILITY_FACTORS.LIGHT[lightState] || 1.0;
        playerState.lightLevel = VISIBILITY_FACTORS.LIGHT[lightState] || 0.5;
        
        // Environment factor
        const environmentState = gameState.environment || 'open_water';
        visibility *= VISIBILITY_FACTORS.ENVIRONMENT[environmentState] || 1.0;
        
        // Action factor
        let actionState = 'breathing_normal';
        if (playerState.isHoldingBreath) actionState = 'holding_breath';
        if (gameState.usingEquipment) actionState = 'using_equipment';
        if (gameState.takingDamage) actionState = 'taking_damage';
        
        visibility *= VISIBILITY_FACTORS.ACTIONS[actionState] || 0.5;
        
        // Hiding bonus
        if (playerState.isHiding && playerState.hidingSpot) {
            visibility *= 0.1;
        }
        
        // Blood trail increases visibility
        if (playerState.bloodTrail) {
            visibility *= 1.5;
        }
        
        // Camera shake from damage increases visibility
        if (gameState.cameraShake > 0.2) {
            visibility *= 1.3;
        }
        
        playerState.visibility = Math.min(1, Math.max(0, visibility));
    }

    // ============================================
    // NOISE SYSTEM
    // ============================================
    function updateNoise(player, gameState) {
        let noiseLevel = NOISE_LEVELS.SILENT;
        
        // Movement noise
        if (player.velocity) {
            const speed = Math.sqrt(
                player.velocity.x**2 + 
                player.velocity.z**2
            );
            
            if (speed > 12) noiseLevel = NOISE_LEVELS.VERY_LOUD;
            else if (speed > 8) noiseLevel = NOISE_LEVELS.LOUD;
            else if (speed > 4) noiseLevel = NOISE_LEVELS.NORMAL;
            else if (speed > 1) noiseLevel = NOISE_LEVELS.QUIET;
        }
        
        // Equipment noise
        if (gameState.usingEquipment) {
            noiseLevel = Math.max(noiseLevel, NOISE_LEVELS.NORMAL);
        }
        
        // Taking damage
        if (gameState.takingDamage) {
            noiseLevel = NOISE_LEVELS.VERY_LOUD;
        }
        
        // Flare noise
        if (gameState.throwingFlare) {
            noiseLevel = NOISE_LEVELS.LOUD;
        }
        
        // Breathing (if low oxygen)
        if (gameState.oxygen < 30 && !playerState.isHoldingBreath) {
            noiseLevel = Math.max(noiseLevel, NOISE_LEVELS.QUIET);
        }
        
        playerState.noise = noiseLevel;
        
        // Emit noise event if loud enough
        if (noiseLevel >= NOISE_LEVELS.LOUD) {
            playerState.lastNoiseTime = Date.now();
            emitNoise(player.position, noiseLevel * 30); // Range based on volume
        }
    }

    function emitNoise(position, range, type = 'generic') {
        // Notify AI system of noise
        if (window.AISystem) {
            // This would be used by the AI to investigate
            const noiseEvent = new CustomEvent('player_noise', {
                detail: { position, range, type }
            });
            window.dispatchEvent(noiseEvent);
        }
    }

    // ============================================
    // TRACKING SYSTEM
    // ============================================
    function updateTracks(player, deltaTime) {
        // Add current position to tracks
        if (player.position) {
            playerState.tracks.push({
                position: { ...player.position },
                time: Date.now(),
                visibility: playerState.visibility,
                isBlood: playerState.bloodTrail
            });
        }
        
        // Remove old tracks
        const trackLifetime = 60000; // 1 minute
        playerState.tracks = playerState.tracks.filter(
            track => Date.now() - track.time < trackLifetime
        );
        
        // Limit track count
        if (playerState.tracks.length > 50) {
            playerState.tracks.shift();
        }
        
        // Blood trail decay
        if (playerState.bloodTrail && player.health > 50) {
            // Heal enough to stop bleeding
            playerState.bloodTrail = false;
        }
    }

    function getTracksForCreature(creaturePosition, detectionRange) {
        return playerState.tracks.filter(track => {
            const dist = Math.sqrt(
                (track.position.x - creaturePosition.x)**2 +
                (track.position.y - creaturePosition.y)**2 +
                (track.position.z - creaturePosition.z)**2
            );
            return dist < detectionRange;
        });
    }

    // ============================================
    // HIDING SYSTEM
    // ============================================
    function updateHiding(player, gameState) {
        // Check if player is in a hiding spot
        const nearbyHidingSpots = getNearbyHidingSpots(player.position, 3);
        
        if (nearbyHidingSpots.length > 0) {
            // Can hide
            if (!playerState.isHiding && playerState.visibility < 0.3) {
                // Auto-hide or manual?
                // For now, require manual activation
            }
        } else {
            playerState.isHiding = false;
            playerState.hidingSpot = null;
        }
    }

    function registerHidingSpot(position, type, size = 'small') {
        const spot = {
            id: generateId(),
            position: { ...position },
            type: type, // 'kelp', 'cave', 'wreck', 'shadow'
            size: size,
            occupied: false,
            effectiveness: type === 'cave' ? 0.9 : type === 'kelp' ? 0.7 : 0.5
        };
        
        hidingSpots.push(spot);
        return spot.id;
    }

    function getNearbyHidingSpots(position, radius) {
        return hidingSpots.filter(spot => {
            const dist = Math.sqrt(
                (spot.position.x - position.x)**2 +
                (spot.position.y - position.y)**2 +
                (spot.position.z - position.z)**2
            );
            return dist < radius && !spot.occupied;
        });
    }

    function enterHidingSpot(spotId) {
        const spot = hidingSpots.find(s => s.id === spotId);
        if (spot && !spot.occupied) {
            playerState.isHiding = true;
            playerState.hidingSpot = spot;
            spot.occupied = true;
            
            if (window.showNotification) {
                window.showNotification('🌿 You are hiding', 'success');
            }
            
            return true;
        }
        return false;
    }

    function exitHidingSpot() {
        if (playerState.hidingSpot) {
            playerState.hidingSpot.occupied = false;
            playerState.hidingSpot = null;
            playerState.isHiding = false;
            
            if (window.showNotification) {
                window.showNotification('You left your hiding spot');
            }
        }
    }

    // ============================================
    // DETECTION SYSTEM
    // ============================================
    function updateDetection(deltaTime) {
        // Detection builds up based on visibility
        if (playerState.visibility > 0.5) {
            playerState.detectionLevel += deltaTime * 20 * playerState.visibility;
        } else {
            playerState.detectionLevel -= deltaTime * 10;
        }
        
        playerState.detectionLevel = Math.max(0, Math.min(100, playerState.detectionLevel));
        
        // Alert all creatures if fully detected
        if (playerState.detectionLevel >= 100) {
            globalAlertLevel = 100;
        }
    }

    function onPlayerDetected(byCreature) {
        playerState.detectionLevel = 100;
        globalAlertLevel = Math.min(100, globalAlertLevel + 30);
        
        // Trigger detected event
        if (window.EventSystem) {
            window.EventSystem.trigger('player_detected', { creature: byCreature });
        }
    }

    function onPlayerEscaped() {
        playerState.detectionLevel = 0;
        
        if (window.showNotification) {
            window.showNotification('👻 You escaped detection', 'success');
        }
        
        // Achievement check
        if (window.SaveSystem) {
            window.SaveSystem.unlockAchievement('ghost');
        }
    }

    // ============================================
    // BREATH HOLDING
    // ============================================
    function startHoldingBreath() {
        if (playerState.isHoldingBreath) return false;
        
        playerState.isHoldingBreath = true;
        
        // Can only hold breath for so long
        const maxHoldTime = 10000; // 10 seconds
        
        setTimeout(() => {
            if (playerState.isHoldingBreath) {
                stopHoldingBreath();
                
                // Gasping makes noise
                emitNoise(player.position, 15, 'gasp');
                
                if (window.showNotification) {
                    window.showNotification('💨 Gasping for air!', 'warning');
                }
            }
        }, maxHoldTime);
        
        return true;
    }

    function stopHoldingBreath() {
        playerState.isHoldingBreath = false;
    }

    // ============================================
    // DISTRACTION SYSTEM
    // ============================================
    function throwRock(position, direction) {
        // Create a noise at target position
        const targetPos = {
            x: position.x + direction.x * 20,
            y: position.y,
            z: position.z + direction.z * 20
        };
        
        emitNoise(targetPos, 25, 'rock');
        
        if (window.showNotification) {
            window.showNotification('🪨 Threw rock to create distraction');
        }
        
        return targetPos;
    }

    // ============================================
    // STEALTH ACTIONS
    // ============================================
    function performStealthKill(creature) {
        // Only possible if creature hasn't detected you
        if (playerState.visibility < 0.2 && playerState.detectionLevel < 20) {
            // Instant kill
            if (window.AISystem) {
                window.AISystem.killCreature(creature.id);
            }
            
            if (window.showNotification) {
                window.showNotification('💀 Silent takedown', 'success');
            }
            
            return true;
        }
        
        return false;
    }

    // ============================================
    // GETTERS
    // ============================================
    function getStealthState() {
        if (globalAlertLevel >= 80 || playerState.detectionLevel >= 100) {
            return STEALTH_STATES.ALERT;
        } else if (playerState.detectionLevel >= 50) {
            return STEALTH_STATES.DETECTED;
        } else if (playerState.detectionLevel >= 20) {
            return STEALTH_STATES.SUSPICIOUS;
        } else {
            return STEALTH_STATES.HIDDEN;
        }
    }

    function getPlayerState() {
        return { ...playerState };
    }

    function getVisibility() {
        return playerState.visibility;
    }

    function getNoiseLevel() {
        return playerState.noise;
    }

    function isPlayerHidden() {
        return playerState.isHiding || playerState.visibility < 0.2;
    }

    function canCreatureDetectPlayer(creature) {
        // Calculate actual detection chance
        const distance = Math.sqrt(
            (creature.position.x - player.position.x)**2 +
            (creature.position.y - player.position.y)**2 +
            (creature.position.z - player.position.z)**2
        );
        
        if (distance > creature.type.detectionRange) return false;
        
        // Visibility vs detection
        const detectionThreshold = (1 - distance / creature.type.detectionRange) * 
                                   (playerState.visibility * playerState.lightLevel);
        
        return detectionThreshold > 0.3;
    }

    // ============================================
    // HELPERS
    // ============================================
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        STEALTH_STATES,
        VISIBILITY_FACTORS,
        NOISE_LEVELS,
        
        init,
        update,
        
        // Hiding
        registerHidingSpot,
        enterHidingSpot,
        exitHidingSpot,
        getNearbyHidingSpots,
        
        // Breathing
        startHoldingBreath,
        stopHoldingBreath,
        
        // Distractions
        throwRock,
        emitNoise,
        
        // Actions
        performStealthKill,
        onPlayerDetected,
        onPlayerEscaped,
        
        // Getters
        getStealthState,
        getPlayerState,
        getVisibility,
        getNoiseLevel,
        isPlayerHidden,
        canCreatureDetectPlayer,
        getTracksForCreature,
        
        // State modifiers
        setBloodTrail: (active) => { playerState.bloodTrail = active; }
    };
})();

// Global access
window.StealthSystem = StealthSystem;
