/**
 * ============================================
 * SGAI Graphics Framework - Phase 7: Skeletal Animation
 * ============================================
 * Animation state machines and blending.
 * 
 * Key Benefits:
 * - Smooth animation transitions
 * - Procedural IK for foot placement
 * - Animation layering
 */

(function(global) {
    'use strict';

    // ============================================
    // ANIMATION STATE MACHINE
    // ============================================

    /**
     * Animation State Machine with blend trees
     */
    class AnimationStateMachine {
        constructor(model) {
            this.model = model;
            this.mixer = null;
            this.states = new Map();
            this.currentState = null;
            this.transitions = [];
            this.blendWeights = {};
            
            // Animation clips cache
            this.clips = {};
            this.activeActions = new Map();
            
            // Blend parameters
            this.crossFadeDuration = 0.3;
            this.blendWeight = 1.0;
            
            // Callbacks
            this.onStateChange = null;
            this.onAnimationEnd = null;
        }

        /**
         * Initialize with Three.js model
         */
        init(model) {
            this.model = model;
            this.mixer = new THREE.AnimationMixer(model);
            
            // Auto-discover animations
            if (model.animations) {
                for (const clip of model.animations) {
                    this.clips[clip.name] = clip;
                }
            }
            
            console.log(`[ASM] Initialized with ${Object.keys(this.clips).length} animations`);
        }

        /**
         * Add animation state
         */
        addState(name, clipName, options = {}) {
            const clip = this.clips[clipName];
            if (!clip) {
                console.warn(`[ASM] Clip not found: ${clipName}`);
                return;
            }

            const action = this.mixer.clipAction(clip);
            action.setLoop(options.loop !== false ? THREE.LoopRepeat : THREE.LoopOnce);
            action.clampWhenFinished = options.clampWhenFinished || false;
            action.enabled = true;
            action.setEffectiveTimeScale(1);
            action.setEffectiveWeight(1);

            this.states.set(name, {
                name,
                clip,
                action,
                speed: options.speed || 1,
                loop: options.loop !== false,
                onEntry: options.onEntry,
                onExit: options.onExit
            });

            return this;
        }

        /**
         * Add transition between states
         */
        addTransition(fromState, toState, options = {}) {
            this.transitions.push({
                from: fromState,
                to: toState,
                condition: options.condition || (() => true),
                duration: options.duration || this.crossFadeDuration,
                exitAction: options.exitAction
            });
        }

        /**
         * Set current state
         */
        setState(stateName, force = false) {
            const state = this.states.get(stateName);
            if (!state) {
                console.warn(`[ASM] State not found: ${stateName}`);
                return;
            }

            if (this.currentState === stateName && !force) return;

            // Exit current state
            if (this.currentState) {
                const current = this.states.get(this.currentState);
                if (current && current.onExit) {
                    current.onExit();
                }
            }

            const previousAction = this.activeActions.get(this.currentState);
            const newAction = state.action;

            // Crossfade
            if (previousAction && previousAction !== newAction) {
                previousAction.fadeOut(state.duration || this.crossFadeDuration);
                newAction.reset().fadeIn(state.duration || this.crossFadeDuration);
            }

            newAction.play();
            this.activeActions.set(stateName, newAction);

            // Entry callback
            if (state.onEntry) {
                state.onEntry();
            }

            this.currentState = stateName;

            if (this.onStateChange) {
                this.onStateChange(stateName);
            }
        }

        /**
         * Update animation mixer
         */
        update(dt) {
            if (this.mixer) {
                this.mixer.update(dt);
            }
        }

        /**
         * Set animation speed
         */
        setSpeed(speed) {
            for (const action of this.activeActions.values()) {
                action.setEffectiveTimeScale(speed);
            }
        }

        /**
         * Set blend weight
         */
        setWeight(weight) {
            this.blendWeight = weight;
            for (const action of this.activeActions.values()) {
                action.setEffectiveWeight(weight);
            }
        }

        /**
         * Get current animation time
         */
        getTime() {
            const action = this.activeActions.get(this.currentState);
            return action ? action.time : 0;
        }

        /**
         * Check if animation completed
         */
        isComplete() {
            const action = this.activeActions.get(this.currentState);
            if (!action) return true;
            
            const clip = action.getClip();
            return action.time >= clip.duration && !action.loop;
        }

        /**
         * Create default states for humanoid
         */
        createHumanoidDefaults() {
            // Common animation names
            const clips = ['idle', 'walk', 'run', 'attack', 'hit', 'die', 'jump'];
            
            for (const name of clips) {
                if (this.clips[name]) {
                    this.addState(name, name, { loop: name !== 'hit' && name !== 'die' });
                }
            }

            // Default transitions
            this.addTransition('idle', 'walk');
            this.addTransition('walk', 'idle');
            this.addTransition('idle', 'run', { condition: () => this.getSpeed() > 0 });
            this.addTransition('run', 'walk', { condition: () => this.getSpeed() === 0 });
            this.addTransition('walk', 'attack', { condition: () => this.shouldAttack() });
            this.addTransition('attack', 'idle', { condition: () => this.isComplete() });
        }
    }

    // ============================================
    // PROCEDURAL ANIMATION
    // ============================================

    /**
     * Procedural animation for creatures without rigged models
     */
    class ProceduralAnimator {
        constructor(mesh) {
            this.mesh = mesh;
            this.bones = {};
            this.animPhase = 0;
            
            // Animation parameters
            this.walkSpeed = 5;
            this.bobAmount = 0.1;
            this.swayAmount = 0.05;
            
            // Bone references (must be set up externally)
            this.boneConfig = {};
        }

        /**
         * Configure bone hierarchy
         */
        configureBones(config) {
            this.boneConfig = config;
            
            // Find bones by name
            if (this.mesh) {
                this.mesh.traverse((obj) => {
                    for (const [key, name] of Object.entries(config)) {
                        if (obj.name === name) {
                            this.bones[key] = obj;
                        }
                    }
                });
            }
        }

        /**
         * Play walk cycle
         */
        walk(dt, speed) {
            this.animPhase += dt * speed * this.walkSpeed;
            
            const phase = this.animPhase;
            
            // Body bob
            if (this.bones.body) {
                this.bones.body.position.y = Math.abs(Math.sin(phase * 2)) * this.bobAmount;
                this.bones.body.rotation.z = Math.sin(phase) * this.swayAmount;
            }
            
            // Head bob
            if (this.bones.head) {
                this.bones.head.rotation.x = Math.sin(phase * 2) * 0.1;
            }
            
            // Arm swing
            if (this.bones.rightArm) {
                this.bones.rightArm.rotation.x = Math.sin(phase) * 0.5;
            }
            if (this.bones.leftArm) {
                this.bones.leftArm.rotation.x = -Math.sin(phase) * 0.5;
            }
            
            // Leg swing
            if (this.bones.rightLeg) {
                this.bones.rightLeg.rotation.x = -Math.sin(phase) * 0.4;
            }
            if (this.bones.leftLeg) {
                this.bones.leftLeg.rotation.x = Math.sin(phase) * 0.4;
            }
        }

        /**
         * Play attack animation
         */
        attack(dt, progress) {
            // progress: 0-1
            const swing = Math.sin(progress * Math.PI);
            
            if (this.bones.rightArm) {
                this.bones.rightArm.rotation.x = -swing * 1.5;
                this.bones.rightArm.rotation.z = swing * 0.3;
            }
            
            // Body twist
            if (this.bones.body) {
                this.bones.body.rotation.y = swing * 0.3;
            }
        }

        /**
         * Play hit reaction
         */
        hit(dt, intensity) {
            const decay = Math.exp(-dt * 5);
            
            if (this.bones.body) {
                this.bones.body.rotation.x = intensity * 0.3 * decay;
                this.bones.body.position.y = Math.abs(Math.sin(Date.now() * 0.05)) * intensity * 0.2;
            }
        }

        /**
         * Idle breathing
         */
        idle(dt) {
            this.animPhase += dt * 2;
            
            if (this.bones.body) {
                this.bones.body.position.y = Math.sin(this.animPhase) * 0.02;
                this.bones.body.rotation.z = Math.sin(this.animPhase * 0.5) * 0.01;
            }
        }
    }

    // ============================================
    // INVERSE KINEMATICS
    // ============================================

    /**
     * Simple Two-Bone IK for legs
     */
    class TwoBoneIK {
        constructor(options = {}) {
            this.upperBone = options.upperBone;
            this.lowerBone = options.lowerBone;
            this.endBone = options.endBone;
            
            this.targetPosition = new THREE.Vector3();
            this.poleVector = new THREE.Vector3(0, 0, 1);
            
            this.upperLength = options.upperLength || 0.5;
            this.lowerLength = options.lowerLength || 0.5;
        }

        /**
         * Solve IK for target position
         */
        solve(target, poleTarget) {
            if (!this.upperBone || !this.lowerBone || !this.endBone) return;

            this.targetPosition.copy(target);
            
            // Calculate angles using law of cosines
            const totalLength = this.upperLength + this.lowerLength;
            const targetDist = Math.min(this.targetPosition.length(), totalLength * 0.999);
            
            // Upper bone angle
            const cosUpper = (this.upperLength * this.upperLength + targetDist * targetDist - 
                            this.lowerLength * this.lowerLength) / (2 * this.upperLength * targetDist);
            const upperAngle = Math.acos(Math.max(-1, Math.min(1, cosUpper)));
            
            // Lower bone angle  
            const cosLower = (this.upperLength * this.upperLength + this.lowerLength * this.lowerLength - 
                            targetDist * targetDist) / (2 * this.upperLength * this.lowerLength);
            const lowerAngle = Math.acos(Math.max(-1, Math.min(1, cosLower)));
            
            // Get direction to target
            const direction = this.targetPosition.clone().normalize();
            
            // Apply rotations
            const baseRotation = Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));
            
            // Set bone rotations (simplified)
            if (this.upperBone) {
                this.upperBone.rotation.x = baseRotation + upperAngle;
            }
            if (this.lowerBone) {
                this.lowerBone.rotation.x = Math.PI - lowerAngle;
            }
            
            // Pole adjustment
            if (poleTarget) {
                const poleDir = poleTarget.clone().sub(this.targetPosition);
                const sideAngle = Math.atan2(poleDir.x, poleDir.z);
                
                if (this.upperBone) {
                    this.upperBone.rotation.y = sideAngle;
                }
            }
        }
    }

    /**
     * Full Body IK for procedural foot placement
     */
    class FootIKSystem {
        constructor() {
            this.legs = [];
            this.groundOffset = 0;
            this.raycaster = new THREE.Raycaster();
        }

        /**
         * Add leg chain
         */
        addLeg(hipBone, upperBone, lowerBone, footBone, options = {}) {
            const ik = new TwoBoneIK({
                upperBone,
                lowerBone,
                endBone: footBone,
                upperLength: options.upperLength || 0.5,
                lowerLength: options.lowerLength || 0.5
            });
            
            this.legs.push({
                ik,
                hipBone,
                footBone,
                lastGroundY: 0,
                stepThreshold: options.stepThreshold || 0.3,
                stride: options.stride || 1
            });
        }

        /**
         * Update foot positions based on terrain
         */
        update(dt, bodyPosition, forwardDir, terrain) {
            for (let i = 0; i < this.legs.length; i++) {
                const leg = this.legs[i];
                
                // Get desired foot position
                const sideOffset = (i === 0 ? -0.3 : 0.3) * Math.sign(forwardDir.x || 1);
                const forwardOffset = Math.sin(Date.now() * 0.003 + i * Math.PI) * leg.stride;
                
                const targetX = bodyPosition.x + sideOffset;
                const targetZ = bodyPosition.z + forwardOffset;
                
                // Raycast to find ground
                this.raycaster.set(
                    new THREE.Vector3(targetX, bodyPosition.y + 1, targetZ),
                    new THREE.Vector3(0, -1, 0)
                );
                
                let groundY = 0;
                
                if (terrain) {
                    const hits = this.raycaster.intersectObject(terrain, true);
                    if (hits.length > 0) {
                        groundY = hits[0].point.y;
                    }
                }
                
                // Update IK target
                leg.ik.solve(
                    new THREE.Vector3(targetX, groundY + this.groundOffset, targetZ),
                    new THREE.Vector3(bodyPosition.x, bodyPosition.y, bodyPosition.z + 2)
                );
                
                leg.lastGroundY = groundY;
            }
        }
    }

    // ============================================
    // BLEND TREE
    // ============================================

    /**
     * Blend tree for complex animation mixing
     */
    class BlendTree {
        constructor() {
            this.nodes = [];
            this.root = null;
        }

        /**
         * Add blend node
         */
        addNode(node) {
            this.nodes.push(node);
            return node;
        }

        /**
         * Create additive blend node
         */
        createAdditive(name, sourceA, sourceB, weight = 0.5) {
            return {
                type: 'additive',
                name,
                sources: [sourceA, sourceB],
                weight,
                evaluate: (t) => {
                    const a = sourceA.evaluate ? sourceA.evaluate(t) : sourceA;
                    const b = sourceB.evaluate ? sourceB.evaluate(t) : sourceB;
                    return a + b * weight;
                }
            };
        }

        /**
         * Create directional blend
         */
        createDirectional(name, sources, directionX, directionY) {
            return {
                type: 'directional',
                name,
                sources,
                directionX,
                directionY,
                evaluate: (t) => {
                    // Blend based on direction
                    const x = Math.max(-1, Math.min(1, directionX));
                    const y = Math.max(-1, Math.min(1, directionY));
                    
                    const xIndex = x > 0 ? 1 : 0;
                    const yIndex = y > 0 ? 1 : 0;
                    
                    return sources[yIndex * 2 + xIndex] || sources[0];
                }
            };
        }

        /**
         * Evaluate blend tree
         */
        evaluate(t) {
            if (!this.root) return 0;
            return this.root.evaluate ? this.root.evaluate(t) : this.root;
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.AnimationStateMachine = AnimationStateMachine;
    SGAI.ProceduralAnimator = ProceduralAnimator;
    SGAI.TwoBoneIK = TwoBoneIK;
    SGAI.FootIKSystem = FootIKSystem;
    SGAI.BlendTree = BlendTree;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            AnimationStateMachine,
            ProceduralAnimator,
            TwoBoneIK,
            FootIKSystem,
            BlendTree
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
