/**
 * ============================================
 * SGAI Combat Framework - Phase 15: Frame-Perfect Hitboxes
 * ============================================
 * Precise collision detection and combat feedback.
 * 
 * Key Benefits:
 * - Oriented bounding boxes
 * - Frame-perfect damage
 * - Hitstop and impact feedback
 */

(function(global) {
    'use strict';

    // ============================================
    // ORIENTED BOUNDING BOX
    // ============================================

    /**
     * OBB (Oriented Bounding Box) for weapon hitboxes
     */
    class OBB {
        constructor(options = {}) {
            this.center = new THREE.Vector3(
                options.x || 0,
                options.y || 0,
                options.z || 0
            );
            
            this.halfExtents = new THREE.Vector3(
                options.halfWidth || 0.5,
                options.halfHeight || 0.5,
                options.halfDepth || 0.5
            );
            
            this.rotation = new THREE.Quaternion();
            
            if (options.rotation) {
                this.rotation.copy(options.rotation);
            }
        }

        /**
         * Set from bone transform
         */
        setFromBone(bone, halfExtents) {
            this.center.copy(bone.getWorldPosition(new THREE.Vector3()));
            
            if (bone.rotation) {
                this.rotation.copy(bone.getWorldQuaternion(new THREE.Quaternion()));
            }
            
            if (halfExtents) {
                this.halfExtents.copy(halfExtents);
            }
        }

        /**
         * Get corners of OBB
         */
        getCorners() {
            const corners = [];
            const axes = [
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 0, 1)
            ];
            
            // Transform axes by rotation
            for (let i = 0; i < 3; i++) {
                axes[i].applyQuaternion(this.rotation);
            }
            
            // Generate 8 corners
            for (let i = 0; i < 8; i++) {
                const corner = this.center.clone();
                
                if (i & 1) corner.add(axes[0].clone().multiplyScalar(this.halfExtents.x));
                else corner.add(axes[0].clone().multiplyScalar(-this.halfExtents.x));
                
                if (i & 2) corner.add(axes[1].clone().multiplyScalar(this.halfExtents.y));
                else corner.add(axes[1].clone().multiplyScalar(-this.halfExtents.y));
                
                if (i & 4) corner.add(axes[2].clone().multiplyScalar(this.halfExtents.z));
                else corner.add(axes[2].clone().multiplyScalar(-this.halfExtents.z));
                
                corners.push(corner);
            }
            
            return corners;
        }

        /**
         * Check intersection with sphere
         */
        intersectsSphere(sphere) {
            // Find closest point on OBB to sphere center
            const localPoint = sphere.center.clone().sub(this.center);
            
            // Transform to OBB local space
            const invRotation = this.rotation.clone().invert();
            localPoint.applyQuaternion(invRotation);
            
            // Clamp to box extents
            const closest = new THREE.Vector3(
                Math.max(-this.halfExtents.x, Math.min(this.halfExtents.x, localPoint.x)),
                Math.max(-this.halfExtents.y, Math.min(this.halfExtents.y, localPoint.y)),
                Math.max(-this.halfExtents.z, Math.min(this.halfExtents.z, localPoint.z))
            );
            
            // Check distance
            const distance = closest.distanceTo(localPoint);
            return distance < sphere.radius;
        }

        /**
         * Check intersection with another OBB
         */
        intersectsOBB(other) {
            // SAT (Separating Axis Theorem)
            const axes = this._getAxes();
            const otherAxes = other._getAxes();
            
            for (const axis of [...axes, ...otherAxes]) {
                if (!this._overlapOnAxis(other, axis)) {
                    return false;
                }
            }
            
            return true;
        }

        /**
         * Get local axes
         */
        _getAxes() {
            return [
                new THREE.Vector3(1, 0, 0).applyQuaternion(this.rotation),
                new THREE.Vector3(0, 1, 0).applyQuaternion(this.rotation),
                new THREE.Vector3(0, 0, 1).applyQuaternion(this.rotation)
            ];
        }

        /**
         * Check overlap on axis
         */
        _overlapOnAxis(other, axis) {
            const proj1 = this._project(axis);
            const proj2 = other._project(axis);
            
            return !(proj1.max < proj2.min || proj2.max < proj1.min);
        }

        /**
         * Project onto axis
         */
        _project(axis) {
            const corners = this.getCorners();
            let min = Infinity, max = -Infinity;
            
            for (const corner of corners) {
                const dot = corner.dot(axis);
                min = Math.min(min, dot);
                max = Math.max(max, dot);
            }
            
            return { min, max };
        }
    }

    // ============================================
    // COMBAT SYSTEM
    // ============================================

    /**
     * Combat hitbox system
     */
    class CombatSystem {
        constructor(options = {}) {
            this.attacks = new Map();
            this.hitboxes = new Map();
            this.hurtboxes = new Map();
            
            // Hitstop
            this.hitstopActive = false;
            this.hitstopTimer = 0;
            this.hitstopDuration = options.hitstopDuration || 0.05;
            
            // Damage
            this.damageMultiplier = 1;
            
            // Callbacks
            this.onHit = options.onHit || (() => {});
            this.onBlock = options.onBlock || (() => {});
            this.onDodge = options.onDodge || (() => {});
        }

        /**
         * Register attack
         */
        registerAttack(attackId, options = {}) {
            this.attacks.set(attackId, {
                damage: options.damage || 10,
                knockback: options.knockback || 0,
                hitstop: options.hitstop !== undefined ? options.hitstop : this.hitstopDuration,
                element: options.element || 'physical',
                statusEffects: options.statusEffects || [],
                hitbox: options.hitbox, // { offset, size }
                activeFrames: options.activeFrames || { start: 0.1, end: 0.3 },
                chainable: options.chainable || false
            });
        }

        /**
         * Create weapon hitbox
         */
        createHitbox(entityId, boneName, halfExtents) {
            const hitbox = new OBB({
                x: 0, y: 0, z: 0,
                halfWidth: halfExtents.x,
                halfHeight: halfExtents.y,
                halfDepth: halfExtents.z
            });
            
            this.hitboxes.set(`${entityId}_${boneName}`, {
                hitbox,
                entityId,
                boneName,
                enabled: false
            });
            
            return hitbox;
        }

        /**
         * Create hurtbox (target)
         */
        createHurtbox(entityId, options = {}) {
            const hurtbox = new OBB({
                x: options.x || 0,
                y: options.y || 0,
                z: options.z || 0,
                halfWidth: options.width || 0.5,
                halfHeight: options.height || 1,
                halfDepth: options.depth || 0.5
            });
            
            this.hurtboxes.set(entityId, {
                hitbox: hurtbox,
                entityId,
                health: options.health || 100,
                maxHealth: options.maxHealth || 100,
                team: options.team || 0,
                canBlock: options.canBlock !== false,
                canDodge: options.canDodge !== false,
                isInvulnerable: false
            });
            
            return hurtbox;
        }

        /**
         * Update hitbox position from bone
         */
        updateHitbox(entityId, boneName, bone) {
            const key = `${entityId}_${boneName}`;
            const hitboxData = this.hitboxes.get(key);
            
            if (hitboxData && bone) {
                hitboxData.hitbox.setFromBone(bone, hitboxData.hitbox.halfExtents);
            }
        }

        /**
         * Enable/disable hitbox
         */
        setHitboxEnabled(entityId, boneName, enabled) {
            const key = `${entityId}_${boneName}`;
            const hitboxData = this.hitboxes.get(key);
            
            if (hitboxData) {
                hitboxData.enabled = enabled;
            }
        }

        /**
         * Check for hits during attack frame
         */
        checkHits(attackerId, attackId) {
            const attack = this.attacks.get(attackId);
            if (!attack) return [];
            
            const hits = [];
            const attackerHitboxes = [];
            
            // Get all active hitboxes for attacker
            for (const [key, data] of this.hitboxes) {
                if (data.entityId === attackerId && data.enabled) {
                    attackerHitboxes.push(data.hitbox);
                }
            }
            
            // Check against all hurtboxes
            for (const [entityId, data] of this.hurtboxes) {
                if (data.entityId === attackerId) continue;
                if (data.isInvulnerable) continue;
                
                for (const hitbox of attackerHitboxes) {
                    if (hitbox.intersectsOBB(data.hitbox)) {
                        // Check if blocked
                        if (data.canBlock && this._isBlocking(data)) {
                            this.onBlock({
                                attacker: attackerId,
                                defender: entityId,
                                attack: attack
                            });
                            continue;
                        }
                        
                        // Check if dodged
                        if (data.canDodge && this._isDodging(data)) {
                            this.onDodge({
                                attacker: attackerId,
                                defender: entityId,
                                attack: attack
                            });
                            continue;
                        }
                        
                        // Hit!
                        const damage = attack.damage * this.damageMultiplier;
                        
                        hits.push({
                            attacker: attackerId,
                            defender: entityId,
                            damage,
                            attack,
                            position: data.hitbox.center.clone()
                        });
                        
                        // Apply damage
                        data.health -= damage;
                        
                        // Apply hitstop
                        this._triggerHitstop(attack.hitstop);
                        
                        // Apply status effects
                        for (const effect of attack.statusEffects) {
                            this._applyStatusEffect(data, effect);
                        }
                        
                        // Check death
                        if (data.health <= 0) {
                            this._onEntityDeath(data);
                        }
                    }
                }
            }
            
            // Trigger callbacks
            for (const hit of hits) {
                this.onHit(hit);
            }
            
            return hits;
        }

        /**
         * Check if entity is blocking
         */
        _isBlocking(hurtboxData) {
            // Simplified: check if entity has blocking state
            return hurtboxData.isBlocking === true;
        }

        /**
         * Check if entity is dodging
         */
        _isDodging(hurtboxData) {
            return hurtboxData.isDodging === true;
        }

        /**
         * Trigger hitstop
         */
        _triggerHitstop(duration) {
            this.hitstopActive = true;
            this.hitstopTimer = duration || this.hitstopDuration;
        }

        /**
         * Update hitstop
         */
        updateHitstop(dt) {
            if (this.hitstopActive) {
                this.hitstopTimer -= dt;
                
                if (this.hitstopTimer <= 0) {
                    this.hitstopActive = false;
                }
                
                return this.hitstopActive;
            }
            
            return false;
        }

        /**
         * Apply status effect
         */
        _applyStatusEffect(hurtboxData, effect) {
            switch (effect.type) {
                case 'burn':
                    hurtboxData.burning = effect.duration;
                    break;
                case 'poison':
                    hurtboxData.poisoned = effect.duration;
                    break;
                case 'stun':
                    hurtboxData.stunned = effect.duration;
                    break;
                case 'freeze':
                    hurtboxData.frozen = effect.duration;
                    break;
            }
        }

        /**
         * Handle entity death
         */
        _onEntityDeath(hurtboxData) {
            // Remove from hurtboxes
            this.hurtboxes.delete(hurtboxData.entityId);
            
            // Trigger death callback
            if (hurtboxData.onDeath) {
                hurtboxData.onDeath();
            }
        }

        /**
         * Set invulnerability
         */
        setInvulnerable(entityId, invulnerable) {
            const data = this.hurtboxes.get(entityId);
            if (data) {
                data.isInvulnerable = invulnerable;
            }
        }

        /**
         * Set blocking state
         */
        setBlocking(entityId, blocking) {
            const data = this.hurtboxes.get(entityId);
            if (data) {
                data.isBlocking = blocking;
            }
        }

        /**
         * Set dodging state
         */
        setDodging(entityId, dodging) {
            const data = this.hurtboxes.get(entityId);
            if (data) {
                data.isDodging = dodging;
            }
        }
    }

    // ============================================
    // COMBAT MANAGER
    // ============================================

    /**
     * Combat manager for game
     */
    class CombatManager {
        constructor() {
            this.combat = new CombatSystem({
                hitstopDuration: 0.05,
                onHit: (hit) => this._handleHit(hit),
                onBlock: (block) => this._handleBlock(block),
                onDodge: (dodge) => this._handleDodge(dodge)
            });
            
            this.screenShake = null;
            this.particles = null;
        }

        /**
         * Handle hit
         */
        _handleHit(hit) {
            // Screen shake
            if (this.screenShake) {
                this.screenShake(hit.damage / 10, 0.1);
            }
            
            // Particles
            if (this.particles) {
                this.particles.emitBlood(hit.position);
            }
            
            // Camera shake on heavy hits
            if (hit.damage > 20) {
                // Additional heavy hit effect
            }
        }

        /**
         * Handle block
         */
        _handleBlock(block) {
            // Play block sound
            // Show block effect
        }

        /**
         * Handle dodge
         */
        _handleDodge(dodge) {
            // Play whoosh sound
        }

        /**
         * Update
         */
        update(dt) {
            this.combat.updateHitstop(dt);
        }

        /**
         * Get hitstop state
         */
        isInHitstop() {
            return this.combat.hitstopActive;
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    const SGAI = global.SGAI || {};
    SGAI.OBB = OBB;
    SGAI.CombatSystem = CombatSystem;
    SGAI.CombatManager = CombatManager;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            OBB,
            CombatSystem,
            CombatManager
        };
    } else {
        global.SGAI = SGAI;
    }

})(typeof window !== 'undefined' ? window : this);
