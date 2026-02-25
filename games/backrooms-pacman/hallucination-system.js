/**
 * PHASE 4: PSYCHOLOGICAL HORROR - HALLUCINATIONS & MENTAL BREAKDOWN
 * Advanced sanity system with visual/audio hallucinations and fear mechanics
 */

var HallucinationSystem = (function() {
    'use strict';

    var config = {
        // Hallucination types
        types: {
            VISUAL: 'visual',
            AUDIO: 'audio',
            PERIPHERAL: 'peripheral',
            ENVIRONMENTAL: 'environmental'
        },
        
        // Triggers
        triggers: {
            LOW_SANITY: 50,
            HIGH_STRESS: 70,
            DARKNESS: 0.3,
            ENEMY_PROXIMITY: 8,
            ISOLATION_TIME: 60
        },
        
        // Frequencies
        baseFrequency: 0.1, // Base chance per second
        sanityMultiplier: 3.0, // Multiplier when sanity is low
        stressMultiplier: 2.0 // Multiplier when stressed
    };

    var state = {
        scene: null,
        camera: null,
        activeHallucinations: [],
        hallucinationHistory: [],
        playerSanity: 100,
        playerStress: 0,
        lastHallucinationTime: 0,
        enabled: true
    };

    /**
     * Initialize hallucination system
     */
    function init(scene, camera) {
        state.scene = scene;
        state.camera = camera;
        console.log('[HallucinationSystem] Initialized');
    }

    /**
     * Update hallucination system
     */
    function update(deltaTime, playerPos, pacmanPos, sanity, stress) {
        if (!state.enabled) return;
        
        state.playerSanity = sanity;
        state.playerStress = stress;
        
        // Check for new hallucinations
        checkHallucinationTrigger(playerPos, pacmanPos);
        
        // Update active hallucinations
        updateActiveHallucinations(deltaTime);
    }

    /**
     * Check if hallucination should trigger
     */
    function checkHallucinationTrigger(playerPos, pacmanPos) {
        var now = Date.now();
        
        // Cooldown between hallucinations
        if (now - state.lastHallucinationTime < 5000) return;
        
        // Calculate trigger chance
        var chance = calculateHallucinationChance(playerPos, pacmanPos);
        
        if (Math.random() < chance) {
            triggerHallucination(playerPos, pacmanPos);
            state.lastHallucinationTime = now;
        }
    }

    /**
     * Calculate hallucination trigger chance
     */
    function calculateHallucinationChance(playerPos, pacmanPos) {
        var chance = config.baseFrequency;
        
        // Sanity multiplier
        if (state.playerSanity < config.triggers.LOW_SANITY) {
            chance *= config.sanityMultiplier * (1 + (config.triggers.LOW_SANITY - state.playerSanity) / 100);
        }
        
        // Stress multiplier
        if (state.playerStress > config.triggers.HIGH_STRESS) {
            chance *= config.stressMultiplier * (1 + (state.playerStress - config.triggers.HIGH_STRESS) / 100);
        }
        
        // Enemy proximity
        if (pacmanPos && playerPos) {
            var distance = new THREE.Vector3()
                .subVectors(playerPos, pacmanPos)
                .length();
            
            if (distance < config.triggers.ENEMY_PROXIMITY) {
                chance *= 2.0;
            }
        }
        
        return Math.min(chance, 0.9); // Cap at 90%
    }

    /**
     * Trigger a hallucination
     */
    function triggerHallucination(playerPos, pacmanPos) {
        var type = selectHallucinationType();
        
        switch (type) {
            case config.types.VISUAL:
                triggerVisualHallucination(playerPos);
                break;
            case config.types.AUDIO:
                triggerAudioHallucination(playerPos);
                break;
            case config.types.PERIPHERAL:
                triggerPeripheralHallucination(playerPos);
                break;
            case config.types.ENVIRONMENTAL:
                triggerEnvironmentalHallucination(playerPos);
                break;
        }
    }

    /**
     * Select random hallucination type based on weights
     */
    function selectHallucinationType() {
        var rand = Math.random();
        
        if (rand < 0.4) return config.types.VISUAL;
        if (rand < 0.6) return config.types.AUDIO;
        if (rand < 0.8) return config.types.PERIPHERAL;
        return config.types.ENVIRONMENTAL;
    }

    /**
     * Visual hallucinations
     */
    function triggerVisualHallucination(playerPos) {
        var visualTypes = [
            'false_enemy',
            'wall_breathing',
            'floor_morphing',
            'shadow_figure',
            'blood_seeping'
        ];
        
        var selected = visualTypes[Math.floor(Math.random() * visualTypes.length)];
        
        console.log('[Hallucination] Visual:', selected);
        
        switch (selected) {
            case 'false_enemy':
                createFalseEnemy(playerPos);
                break;
            case 'wall_breathing':
                animateWallsBreathing();
                break;
            case 'floor_morphing':
                morphFloorTexture();
                break;
        }
    }

    /**
     * Create false enemy apparition
     */
    function createFalseEnemy(playerPos) {
        if (!state.scene) return;
        
        // Create ghostly Pac-Man that disappears
        var geometry = new THREE.SphereGeometry(0.6, 8, 8);
        var material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.4,
            depthWrite: false
        });
        
        var mesh = new THREE.Mesh(geometry, material);
        
        // Position in front of player
        var direction = new THREE.Vector3();
        state.camera.getWorldDirection(direction);
        
        var spawnPos = playerPos.clone().add(
            direction.multiplyScalar(8 + Math.random() * 4)
        );
        
        mesh.position.copy(spawnPos);
        state.scene.add(mesh);
        
        // Fade out after 2-4 seconds
        var duration = 2000 + Math.random() * 2000;
        
        setTimeout(function() {
            var fadeOut = setInterval(function() {
                material.opacity -= 0.05;
                if (material.opacity <= 0) {
                    clearInterval(fadeOut);
                    state.scene.remove(mesh);
                    geometry.dispose();
                    material.dispose();
                }
            }, 50);
        }, duration);
    }

    /**
     * Animate walls to appear breathing
     */
    function animateWallsBreathing() {
        if (!state.scene) return;
        
        // Find wall meshes and apply vertex displacement
        var walls = [];
        state.scene.traverse(function(object) {
            if (object.isMesh && object.name.includes('wall')) {
                walls.push(object);
            }
        });
        
        var startTime = Date.now();
        var duration = 5000;
        
        var breatheInterval = setInterval(function() {
            var elapsed = Date.now() - startTime;
            var progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(breatheInterval);
                // Reset vertices
                walls.forEach(function(wall) {
                    if (wall.geometry.attributes.position) {
                        wall.geometry.attributes.position.needsUpdate = true;
                    }
                });
                return;
            }
            
            // Displace vertices
            var amplitude = Math.sin(progress * Math.PI) * 0.2;
            
            walls.forEach(function(wall) {
                if (wall.geometry.attributes.position) {
                    var positions = wall.geometry.attributes.position.array;
                    
                    for (var i = 0; i < positions.length; i += 3) {
                        positions[i] += Math.sin(positions[i+1] * 10 + elapsed * 0.001) * amplitude;
                    }
                    
                    wall.geometry.attributes.position.needsUpdate = true;
                }
            });
        }, 50);
    }

    /**
     * Morph floor texture
     */
    function morphFloorTexture() {
        if (!state.scene) return;
        
        // Find floor meshes
        var floors = [];
        state.scene.traverse(function(object) {
            if (object.isMesh && object.name.includes('floor')) {
                floors.push(object);
            }
        });
        
        // Apply distortion shader or texture animation
        floors.forEach(function(floor) {
            if (floor.material) {
                var originalColor = floor.material.color.getHex();
                
                // Pulse color
                var pulseInterval = setInterval(function() {
                    var time = Date.now() * 0.002;
                    var r = ((originalColor >> 16) & 255) * (0.8 + Math.sin(time) * 0.2);
                    var g = ((originalColor >> 8) & 255) * (0.8 + Math.sin(time + 2) * 0.2);
                    var b = (originalColor & 255) * (0.8 + Math.sin(time + 4) * 0.2);
                    
                    floor.material.color.setRGB(r/255, g/255, b/255);
                }, 50);
                
                setTimeout(function() {
                    clearInterval(pulseInterval);
                    floor.material.color.setHex(originalColor);
                }, 4000);
            }
        });
    }

    /**
     * Audio hallucinations
     */
    function triggerAudioHallucination(playerPos) {
        var audioTypes = [
            'phantom_footsteps',
            'distant_screams',
            'whispers',
            'false_pellet_sound',
            'enemy_growth'
        ];
        
        var selected = audioTypes[Math.floor(Math.random() * audioTypes.length)];
        
        console.log('[Hallucination] Audio:', selected);
        
        // Play through audio system if available
        if (typeof HorrorAudio !== 'undefined') {
            switch (selected) {
                case 'phantom_footsteps':
                    HorrorAudio.playFootstep('stone');
                    break;
                case 'whispers':
                    if (typeof ProceduralAudio !== 'undefined') {
                        ProceduralAudio.generateWhisper();
                    }
                    break;
            }
        }
    }

    /**
     * Peripheral hallucinations (movement in corner of eye)
     */
    function triggerPeripheralHallucination(playerPos) {
        // Create brief shadow movement at edge of vision
        if (!state.scene) return;
        
        var shadowGeometry = new THREE.PlaneGeometry(1, 2);
        var shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        var shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        
        // Position at edge of camera view
        var direction = new THREE.Vector3();
        state.camera.getWorldDirection(direction);
        
        var perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        var side = Math.random() > 0.5 ? 1 : -1;
        
        var spawnPos = playerPos.clone()
            .add(direction.multiplyScalar(5))
            .add(perpendicular.multiplyScalar(side * 4));
        
        shadow.position.copy(spawnPos);
        shadow.lookAt(playerPos);
        
        state.scene.add(shadow);
        
        // Quick disappearance
        setTimeout(function() {
            var fadeOut = setInterval(function() {
                shadowMaterial.opacity -= 0.1;
                if (shadowMaterial.opacity <= 0) {
                    clearInterval(fadeOut);
                    state.scene.remove(shadow);
                    shadowGeometry.dispose();
                    shadowMaterial.dispose();
                }
            }, 30);
        }, 500 + Math.random() * 500);
    }

    /**
     * Environmental hallucinations
     */
    function triggerEnvironmentalHallucination(playerPos) {
        var envTypes = [
            'lights_flicker_rapidly',
            'corridor_stretch',
            'false_door',
            'temperature_drop'
        ];
        
        var selected = envTypes[Math.floor(Math.random() * envTypes.length)];
        
        console.log('[Hallucination] Environmental:', selected);
        
        switch (selected) {
            case 'lights_flicker_rapidly':
                flickerLightsIntensely();
                break;
            case 'corridor_stretch':
                stretchCorridorIllusion();
                break;
        }
    }

    /**
     * Intense light flickering
     */
    function flickerLightsIntensely() {
        if (!state.scene) return;
        
        var lights = [];
        state.scene.traverse(function(object) {
            if (object.isPointLight || object.isSpotLight) {
                lights.push(object);
            }
        });
        
        var flickers = 0;
        var maxFlickers = 10 + Math.floor(Math.random() * 10);
        
        var flickerInterval = setInterval(function() {
            lights.forEach(function(light) {
                light.intensity = Math.random() > 0.5 ? 0 : (light.userData.originalIntensity || 1);
            });
            
            flickers++;
            if (flickers >= maxFlickers) {
                clearInterval(flickerInterval);
                lights.forEach(function(light) {
                    light.intensity = light.userData.originalIntensity || 1;
                });
            }
        }, 100);
    }

    /**
     * Corridor stretching illusion
     */
    function stretchCorridorIllusion() {
        if (!state.camera) return;
        
        // Apply FOV change to simulate corridor stretching
        var originalFOV = state.camera.fov;
        var startTime = Date.now();
        var duration = 2000;
        
        var stretchInterval = setInterval(function() {
            var elapsed = Date.now() - startTime;
            var progress = elapsed / duration;
            
            if (progress >= 1) {
                clearInterval(stretchInterval);
                state.camera.fov = originalFOV;
                state.camera.updateProjectionMatrix();
                return;
            }
            
            // Increase FOV then decrease
            var stretch = Math.sin(progress * Math.PI) * 20;
            state.camera.fov = originalFOV + stretch;
            state.camera.updateProjectionMatrix();
        }, 50);
    }

    /**
     * Update active hallucinations
     */
    function updateActiveHallucinations(deltaTime) {
        // Remove expired hallucinations
        state.activeHallucinations = state.activeHallucinations.filter(function(h) {
            h.remainingTime -= deltaTime;
            return h.remainingTime > 0;
        });
    }

    /**
     * Enable/disable hallucinations
     */
    function setEnabled(enabled) {
        state.enabled = enabled;
        
        if (!enabled) {
            clearAllHallucinations();
        }
    }

    /**
     * Clear all active hallucinations
     */
    function clearAllHallucinations() {
        state.activeHallucinations.forEach(function(h) {
            if (h.mesh && state.scene) {
                state.scene.remove(h.mesh);
            }
        });
        state.activeHallucinations = [];
    }

    // Public API
    return {
        init: init,
        update: update,
        setEnabled: setEnabled,
        clearAllHallucinations: clearAllHallucinations,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.HallucinationSystem = HallucinationSystem;
}

console.log('[HallucinationSystem] Module loaded - Psychological horror ready');
