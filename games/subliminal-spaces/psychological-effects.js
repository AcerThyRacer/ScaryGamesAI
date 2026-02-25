/**
 * Psychological Effects System for Subliminal Spaces
 * Implements pareidolia engine, reality distortion, and sanity-based hallucinations
 */

export class PsychologicalEffects {
    constructor(options = {}) {
        this.playerSanity = options.playerSanity || 100;
        this.maxSanity = options.maxSanity || 100;
        this.timeInGame = options.timeInGame || 0;
        
        // Pareidolia configuration
        this.pareidoliaEngine = {
            enabled: true,
            instances: [],
            detectionRadius: 8,
            intensityMultiplier: 1.0,
            facePatterns: [
                'two_dots_line',      // Two eyes
                'three_dots_triangle', // Two eyes + mouth
                'arched_line',         // Mouth
                'shadow_outline',       // Full face outline
                'light_pattern'        // Face in lighting
            ]
        };
        
        // Reality distortion settings
        this.realityDistortion = {
            level: 0,
            targetLevel: 0,
            transitionSpeed: 0.1,
            effects: {
                geometry_shift: false,
                texture_crawl: false,
                color_desaturation: false,
                depth_inversion: false,
                non_euclidean: false
            }
        };
        
        // Hallucination triggers
        this.hallucinationTriggers = {
            low_sanity_threshold: 40,
            critical_sanity_threshold: 20,
            time_based_triggers: true,
            proximity_triggers: true
        };
        
        // Audio-visual synesthesia
        this.synesthesia = {
            enabled: false,
            sound_to_visual: true,
            visual_to_audio: false
        };
    }
    
    /**
     * Update psychological state
     */
    update(deltaTime, playerPosition) {
        this.timeInGame += deltaTime;
        
        // Update reality distortion level
        this.updateRealityDistortion(deltaTime);
        
        // Update pareidolia visibility
        this.updatePareidoliaVisibility(playerPosition);
        
        // Apply hallucination effects
        this.applyHallucinations(deltaTime);
        
        // Trigger random psychological events
        if (Math.random() < this.getEventChance()) {
            this.triggerPsychologicalEvent();
        }
    }
    
    /**
     * Add pareidolia instance
     */
    addPareidoliaInstance(pareidolia) {
        const instance = {
            id: Math.random().toString(36).substr(2, 9),
            ...pareidolia,
            visible: false,
            perceivedIntensity: 0,
            lastSeen: 0,
            recognitionPhase: 'hidden' // hidden → peripheral → recognized → staring
        };
        
        this.pareidoliaEngine.instances.push(instance);
        return instance;
    }
    
    /**
     * Update pareidolia visibility based on player position and sanity
     */
    updatePareidoliaVisibility(playerPosition) {
        const sanityRatio = this.playerSanity / this.maxSanity;
        
        for (const instance of this.pareidoliaEngine.instances) {
            const dx = playerPosition.x - instance.x;
            const dy = playerPosition.y - instance.y;
            const dz = playerPosition.z - instance.z;
            const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            // Check if in detection radius
            const inRange = distance < this.pareidoliaEngine.detectionRadius;
            
            // Lower sanity = detect from farther away
            const effectiveRadius = this.pareidoliaEngine.detectionRadius * (2 - sanityRatio);
            
            if (inRange && distance < effectiveRadius) {
                // Transition through recognition phases
                this.transitionPareidoliaPhase(instance, distance, sanityRatio);
            } else {
                // Fade out when out of range
                instance.perceivedIntensity = Math.max(0, instance.perceivedIntensity - 0.05);
                if (instance.perceivedIntensity < 0.1) {
                    instance.visible = false;
                    instance.recognitionPhase = 'hidden';
                }
            }
            
            instance.lastSeen = this.timeInGame;
        }
    }
    
    /**
     * Transition pareidolia through recognition phases
     */
    transitionPareidoliaPhase(instance, distance, sanityRatio) {
        const proximity = 1 - (distance / this.pareidoliaEngine.detectionRadius);
        const sanityModifier = 2 - sanityRatio; // Lower sanity = easier to see
        
        if (proximity > 0.8 && sanityRatio < 0.5) {
            // Very close + low sanity = full recognition
            instance.visible = true;
            instance.perceivedIntensity = Math.min(1, instance.intensity * sanityModifier);
            instance.recognitionPhase = 'staring';
        } else if (proximity > 0.5) {
            // Medium proximity = recognized but not clear
            instance.visible = true;
            instance.perceivedIntensity = Math.min(0.7, instance.intensity * 0.7);
            instance.recognitionPhase = 'recognized';
        } else if (proximity > 0.2) {
            // Peripheral vision
            instance.visible = true;
            instance.perceivedIntensity = Math.min(0.3, instance.intensity * 0.3);
            instance.recognitionPhase = 'peripheral';
        }
    }
    
    /**
     * Update reality distortion effects
     */
    updateRealityDistortion(deltaTime) {
        // Calculate target distortion based on sanity
        const sanityRatio = this.playerSanity / this.maxSanity;
        this.realityDistortion.targetLevel = 1 - sanityRatio;
        
        // Smoothly interpolate to target
        this.realityDistortion.level += (this.realityDistortion.targetLevel - this.realityDistortion.level) * 
            this.realityDistortion.transitionSpeed;
        
        // Enable/disable effects based on distortion level
        this.realityDistortion.effects.geometry_shift = this.realityDistortion.level > 0.3;
        this.realityDistortion.effects.texture_crawl = this.realityDistortion.level > 0.4;
        this.realityDistortion.effects.color_desaturation = this.realityDistortion.level > 0.5;
        this.realityDistortion.effects.depth_inversion = this.realityDistortion.level > 0.7;
        this.realityDistortion.effects.non_euclidean = this.realityDistortion.level > 0.9;
    }
    
    /**
     * Apply hallucination effects based on sanity
     */
    applyHallucinations(deltaTime) {
        const sanityRatio = this.playerSanity / this.maxSanity;
        
        if (sanityRatio < 0.7) {
            // Mild hallucinations (peripheral movement)
            this.triggerPeripheralMovement();
        }
        
        if (sanityRatio < 0.5) {
            // Moderate hallucinations (whispers, shadows)
            this.triggerShadowFigures();
        }
        
        if (sanityRatio < 0.3) {
            // Severe hallucinations (reality breaks)
            this.triggerRealityBreak(deltaTime);
        }
        
        if (sanityRatio < 0.1) {
            // Critical hallucinations (complete dissociation)
            this.triggerDissociativeEpisode();
        }
    }
    
    /**
     * Trigger peripheral movement hallucination
     */
    triggerPeripheralMovement() {
        // In a full implementation, this would create subtle motion in peripheral vision
        // using shader effects or particle systems
        console.log('👁️ Peripheral movement detected');
    }
    
    /**
     * Trigger shadow figures
     */
    triggerShadowFigures() {
        // Create brief shadow figure appearances
        const shadowFigure = {
            type: 'shadow_person',
            duration: 0.1 + Math.random() * 0.2,
            distance: 5 + Math.random() * 10,
            angle: Math.random() * Math.PI * 2
        };
        
        console.log('👤 Shadow figure:', shadowFigure);
    }
    
    /**
     * Trigger reality break (severe hallucination)
     */
    triggerRealityBreak(deltaTime) {
        // Randomly invert colors or distort geometry
        const breakType = Math.random();
        
        if (breakType < 0.3) {
            console.log('⚡ Color inversion flash');
        } else if (breakType < 0.6) {
            console.log('⚡ Geometry warping');
        } else {
            console.log('⚡ Time dilation effect');
        }
    }
    
    /**
     * Trigger dissociative episode (critical sanity)
     */
    triggerDissociativeEpisode() {
        console.log('🌀 DISSOCIATIVE EPISODE - Reality fragmentation');
        // This would trigger severe visual and audio distortions
    }
    
    /**
     * Get chance for random psychological event
     */
    getEventChance() {
        const sanityRatio = this.playerSanity / this.maxSanity;
        const baseChance = 0.001; // Base 0.1% per frame
        
        // Increase chance as sanity decreases
        return baseChance * (1 + (1 - sanityRatio) * 10);
    }
    
    /**
     * Trigger random psychological event
     */
    triggerPsychologicalEvent() {
        const events = [
            'déjà_vu',
            'jamais_vu',
            'face_flash',
            'whisper',
            'touch_phantom',
            'time_skip'
        ];
        
        const eventIndex = Math.floor(Math.random() * events.length);
        const eventType = events[eventIndex];
        
        console.log(`🎭 Psychological event: ${eventType}`);
        
        switch(eventType) {
            case 'déjà_vu':
                this.triggerDejaVu();
                break;
            case 'jamais_vu':
                this.triggerJamaisVu();
                break;
            case 'face_flash':
                this.triggerFaceFlash();
                break;
            case 'whisper':
                this.triggerWhisper();
                break;
        }
    }
    
    /**
     * Trigger déjà vu sensation
     */
    triggerDejaVu() {
        console.log('💫 Déjà vu: "I\'ve been here before..."');
        // Could replay recent player movements as ghost echoes
    }
    
    /**
     * Trigger jamais vu (familiar becomes unfamiliar)
     */
    triggerJamaisVu() {
        console.log('💫 Jamais vu: "This place feels alien..."');
        // Could temporarily change textures or geometry to feel wrong
    }
    
    /**
     * Trigger subliminal face flash
     */
    triggerFaceFlash() {
        console.log('👁️ Face flash in peripheral vision');
        // Brief appearance of face pattern that disappears when looked at directly
    }
    
    /**
     * Trigger auditory whisper
     */
    triggerWhisper() {
        const whispers = [
            "...behind you...",
            "...don't look...",
            "...it sees you...",
            "...wake up...",
            "...not real..."
        ];
        
        const whisperIndex = Math.floor(Math.random() * whispers.length);
        console.log(`🔊 Whisper: "${whispers[whisperIndex]}"`);
    }
    
    /**
     * Set player sanity
     */
    setSanity(value) {
        this.playerSanity = Math.max(0, Math.min(this.maxSanity, value));
    }
    
    /**
     * Modify sanity by amount
     */
    modifySanity(amount) {
        this.setSanity(this.playerSanity + amount);
    }
    
    /**
     * Get current distortion level
     */
    getDistortionLevel() {
        return this.realityDistortion.level;
    }
    
    /**
     * Get active hallucinations
     */
    getActiveHallucinations() {
        const active = [];
        
        for (const instance of this.pareidoliaEngine.instances) {
            if (instance.visible && instance.perceivedIntensity > 0.3) {
                active.push({
                    ...instance,
                    currentIntensity: instance.perceivedIntensity,
                    phase: instance.recognitionPhase
                });
            }
        }
        
        return active;
    }
}
