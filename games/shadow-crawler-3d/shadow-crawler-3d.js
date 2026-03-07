/* ============================================
   SHADOW CRAWLER 3D
   A Complete 3D Stealth Horror Experience
   ============================================ */

(function() {
    'use strict';

    // ==========================================
    // GAME CONFIGURATION & CONSTANTS
    // ==========================================
    const CONFIG = {
        // World Settings
        CELL_SIZE: 4,
        WALL_HEIGHT: 5,
        ROOM_MIN_SIZE: 3,
        ROOM_MAX_SIZE: 7,
        MAX_ROOMS: 12,
        
        // Player Settings
        PLAYER_HEIGHT: 1.7,
        PLAYER_RADIUS: 0.4,
        WALK_SPEED: 4,
        SPRINT_SPEED: 8,
        CROUCH_SPEED: 2,
        STAMINA_MAX: 100,
        STAMINA_REGEN: 15,
        STAMINA_DRAIN: 25,
        HEALTH_MAX: 100,
        SHADOW_POWER_MAX: 100,
        SHADOW_DRAIN: 8,
        SHADOW_REGEN: 5,
        
        // Stealth Settings
        NOISE_WALK: 2,
        NOISE_SPRINT: 8,
        NOISE_CROUCH: 0.5,
        VISION_CHECK_INTERVAL: 0.1,
        
        // Enemy Settings
        ENEMY_TYPES: {
            GUARD: { name: 'Guard', health: 30, damage: 15, speed: 2.5, vision: 12, fov: 100, color: 0x444444 },
            HUNTER: { name: 'Hunter', health: 45, damage: 25, speed: 4, vision: 15, fov: 120, color: 0x662222 },
            WRAITH: { name: 'Wraith', health: 25, damage: 20, speed: 3.5, vision: 18, fov: 140, color: 0x2266aa },
            BEAST: { name: 'Beast', health: 80, damage: 35, speed: 5, vision: 10, fov: 90, color: 0x662200 },
            SENTINEL: { name: 'Sentinel', health: 60, damage: 30, speed: 2, vision: 20, fov: 80, color: 0xaa4400 }
        },
        
        // Level Settings
        LEVELS: [
            { name: 'The Dungeon', rooms: 8, enemies: 5, shards: 3, type: 'normal' },
            { name: 'Cursed Halls', rooms: 10, enemies: 7, shards: 4, type: 'normal' },
            { name: 'Whispering Depths', rooms: 12, enemies: 9, shards: 5, type: 'normal' },
            { name: 'The Labyrinth', rooms: 15, enemies: 12, shards: 6, type: 'boss' },
            { name: 'Shadow Warren', rooms: 12, enemies: 10, shards: 5, type: 'normal' },
            { name: 'Blood Chambers', rooms: 14, enemies: 12, shards: 6, type: 'normal' },
            { name: 'The Forgotten', rooms: 16, enemies: 14, shards: 7, type: 'normal' },
            { name: 'Veil of Darkness', rooms: 18, enemies: 16, shards: 8, type: 'boss' },
            { name: 'Eternal Night', rooms: 20, enemies: 18, shards: 8, type: 'normal' },
            { name: 'The Abyss', rooms: 25, enemies: 25, shards: 10, type: 'final' }
        ],
        
        // Combat Settings
        STEALTH_KILL_RANGE: 2,
        ATTACK_RANGE: 2.5,
        ATTACK_DAMAGE: 25,
        SHADOW_BLADE_DAMAGE: 50,
        INVULNERABILITY_TIME: 1,
        
        // Upgrade Costs
        UPGRADE_COSTS: [5, 10, 15, 25, 40],
        
        // Audio Settings
        AUDIO_RANGE: 20,
        FOOTSTEP_INTERVAL: 0.4
    };

    // ==========================================
    // GLOBAL GAME STATE
    // ==========================================
    const GameState = {
        currentLevel: 0,
        isPlaying: false,
        isPaused: false,
        isGameOver: false,
        shards: 0,
        totalKills: 0,
        upgrades: {
            speed: 0,
            stealth: 0,
            health: 0
        },
        stats: {
            timePlayed: 0,
            damageDealt: 0,
            damageTaken: 0,
            stealthKills: 0,
            timesDetected: 0
        }
    };

    // ==========================================
    // THREE.JS CORE
    // ==========================================
    let scene, camera, renderer, clock;
    let player, dungeon, enemies = [], items = [], lights = [];
    let raycaster, mouse;
    
    // Input State
    const Input = {
        keys: {},
        mouseX: 0,
        mouseY: 0,
        isPointerLocked: false
    };

    // ==========================================
    // PLAYER CLASS
    // ==========================================
    class Player {
        constructor() {
            this.position = new THREE.Vector3(0, CONFIG.PLAYER_HEIGHT, 0);
            this.velocity = new THREE.Vector3();
            this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
            this.height = CONFIG.PLAYER_HEIGHT;
            this.radius = CONFIG.PLAYER_RADIUS;
            
            // Stats
            this.health = CONFIG.HEALTH_MAX + (GameState.upgrades.health * 20);
            this.maxHealth = this.health;
            this.stamina = CONFIG.STAMINA_MAX;
            this.shadowPower = CONFIG.SHADOW_POWER_MAX;
            
            // State
            this.isSprinting = false;
            this.isCrouching = false;
            this.isInShadows = false;
            this.isDetected = false;
            this.isAttacking = false;
            this.invulnerable = false;
            this.footstepTimer = 0;
            
            // Weapons
            this.weapon = 'dagger';
            this.inventory = {
                dagger: true,
                shadowBlade: false,
                smokeBombs: 0,
                healthPotions: 1
            };
            
            // Camera
            this.cameraHeight = CONFIG.PLAYER_HEIGHT;
            this.bobPhase = 0;
            
            // Detection
            this.noiseLevel = 0;
            this.visibility = 1;
            
            this.mesh = this.createMesh();
        }
        
        createMesh() {
            // Invisible capsule for collision
            const geometry = new THREE.CapsuleGeometry(this.radius, this.height - this.radius * 2, 4, 8);
            const material = new THREE.MeshBasicMaterial({ visible: false });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(this.position);
            scene.add(mesh);
            return mesh;
        }
        
        update(dt) {
            // Handle movement
            this.handleMovement(dt);
            
            // Handle stamina
            this.handleStamina(dt);
            
            // Handle shadow power
            this.handleShadowPower(dt);
            
            // Update camera
            this.updateCamera(dt);
            
            // Check visibility/light exposure
            this.updateVisibility();
            
            // Update footstep sounds
            this.updateFootsteps(dt);
            
            // Update mesh position
            this.mesh.position.copy(this.position);
            this.mesh.position.y = this.height / 2;
            
            // Decay noise
            this.noiseLevel = Math.max(0, this.noiseLevel - dt * 5);
            
            // Update UI
            this.updateUI();
        }
        
        handleMovement(dt) {
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
            const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
            
            forward.y = 0;
            right.y = 0;
            forward.normalize();
            right.normalize();
            
            let moveDir = new THREE.Vector3();
            
            if (Input.keys['KeyW'] || Input.keys['ArrowUp']) moveDir.add(forward);
            if (Input.keys['KeyS'] || Input.keys['ArrowDown']) moveDir.sub(forward);
            if (Input.keys['KeyD'] || Input.keys['ArrowRight']) moveDir.add(right);
            if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) moveDir.sub(right);
            
            if (moveDir.length() > 0) {
                moveDir.normalize();
                
                // Determine speed
                let speed = CONFIG.WALK_SPEED;
                
                if (this.isSprinting && this.stamina > 0) {
                    speed = CONFIG.SPRINT_SPEED + (GameState.upgrades.speed * 0.5);
                    this.stamina -= CONFIG.STAMINA_DRAIN * dt;
                    this.noiseLevel = Math.max(this.noiseLevel, CONFIG.NOISE_SPRINT);
                } else if (this.isCrouching) {
                    speed = CONFIG.CROUCH_SPEED;
                    this.noiseLevel = Math.max(this.noiseLevel, CONFIG.NOISE_CROUCH);
                } else {
                    this.noiseLevel = Math.max(this.noiseLevel, CONFIG.NOISE_WALK);
                }
                
                // Apply speed boost when in shadows
                if (this.isInShadows && GameState.upgrades.speed > 0) {
                    speed *= 1 + (GameState.upgrades.speed * 0.1);
                }
                
                // Calculate velocity
                const targetVel = moveDir.multiplyScalar(speed);
                this.velocity.x = targetVel.x;
                this.velocity.z = targetVel.z;
                
                // Camera bob
                this.bobPhase += dt * (this.isSprinting ? 15 : 10);
            } else {
                this.velocity.x *= 0.8;
                this.velocity.z *= 0.8;
                this.bobPhase = 0;
            }
            
            // Apply collision detection
            this.handleCollision(dt);
            
            // Apply velocity
            this.position.x += this.velocity.x * dt;
            this.position.z += this.velocity.z * dt;
            
            // Height adjustment for crouch
            const targetHeight = this.isCrouching ? CONFIG.PLAYER_HEIGHT * 0.5 : CONFIG.PLAYER_HEIGHT;
            this.cameraHeight += (targetHeight - this.cameraHeight) * dt * 5;
        }
        
        handleCollision(dt) {
            if (!dungeon) return;
            
            const testPos = this.position.clone();
            testPos.x += this.velocity.x * dt;
            testPos.z += this.velocity.z * dt;
            
            // Check wall collisions
            const cellX = Math.floor(testPos.x / CONFIG.CELL_SIZE);
            const cellZ = Math.floor(testPos.z / CONFIG.CELL_SIZE);
            
            // Simple collision with bounds
            for (const wall of dungeon.walls) {
                const dx = Math.abs(testPos.x - wall.position.x);
                const dz = Math.abs(testPos.z - wall.position.z);
                
                if (dx < CONFIG.CELL_SIZE / 2 + this.radius && 
                    dz < CONFIG.CELL_SIZE / 2 + this.radius) {
                    // Collision detected - slide along wall
                    if (dx > dz) {
                        this.velocity.x = 0;
                    } else {
                        this.velocity.z = 0;
                    }
                }
            }
        }
        
        handleStamina(dt) {
            if (!this.isSprinting && this.stamina < CONFIG.STAMINA_MAX) {
                this.stamina += CONFIG.STAMINA_REGEN * dt;
                this.stamina = Math.min(this.stamina, CONFIG.STAMINA_MAX);
            }
        }
        
        handleShadowPower(dt) {
            if (this.isInShadows && Input.keys['KeyF'] && this.shadowPower > 0) {
                // Using shadow power
                this.shadowPower -= CONFIG.SHADOW_DRAIN * dt;
                this.shadowPower = Math.max(0, this.shadowPower);
            } else if (!this.isInShadows && this.shadowPower < CONFIG.SHADOW_POWER_MAX) {
                this.shadowPower += CONFIG.SHADOW_REGEN * dt;
                this.shadowPower = Math.min(this.shadowPower, CONFIG.SHADOW_POWER_MAX);
            }
        }
        
        updateCamera(dt) {
            // Position camera at player position with bob
            const bobOffset = Math.sin(this.bobPhase) * 0.05 * (this.velocity.length() / CONFIG.WALK_SPEED);
            
            camera.position.x = this.position.x;
            camera.position.y = this.position.y + this.cameraHeight + bobOffset;
            camera.position.z = this.position.z;
            
            camera.rotation.copy(this.rotation);
        }
        
        updateVisibility() {
            let inLight = false;
            let lightIntensity = 0;
            
            // Check distance to all lights
            for (const light of lights) {
                const dist = this.position.distanceTo(light.position);
                const range = light.distance || 10;
                
                if (dist < range) {
                    const intensity = 1 - (dist / range);
                    lightIntensity = Math.max(lightIntensity, intensity);
                    inLight = true;
                }
            }
            
            // Ambient light contribution
            lightIntensity = Math.max(0.2, lightIntensity);
            
            // Determine shadow state
            if (inLight && lightIntensity > 0.4) {
                this.isInShadows = false;
                this.visibility = 1;
            } else {
                this.isInShadows = true;
                this.visibility = 0.2 + (lightIntensity * 0.3);
            }
            
            // Crouching reduces visibility
            if (this.isCrouching) {
                this.visibility *= 0.6;
            }
        }
        
        updateFootsteps(dt) {
            if (this.velocity.length() > 0.1) {
                this.footstepTimer -= dt;
                
                if (this.footstepTimer <= 0) {
                    this.footstepTimer = this.isSprinting ? CONFIG.FOOTSTEP_INTERVAL / 2 : 
                                         this.isCrouching ? CONFIG.FOOTSTEP_INTERVAL * 2 : CONFIG.FOOTSTEP_INTERVAL;
                    
                    // Play footstep sound
                    if (typeof HorrorAudio !== 'undefined') {
                        HorrorAudio.playFootstep('stone');
                    }
                }
            }
        }
        
        takeDamage(amount) {
            if (this.invulnerable || this.isGameOver) return;
            
            this.health -= amount;
            GameState.stats.damageTaken += amount;
            
            // Screen shake and damage effect
            showDamageEffect();
            
            // Invulnerability
            this.invulnerable = true;
            setTimeout(() => { this.invulnerable = false; }, CONFIG.INVULNERABILITY_TIME * 1000);
            
            if (this.health <= 0) {
                this.die();
            }
            
            // Audio feedback
            if (typeof HorrorAudio !== 'undefined') {
                HorrorAudio.playHit();
            }
        }
        
        heal(amount) {
            this.health = Math.min(this.health + amount, this.maxHealth);
        }
        
        die() {
            GameState.isGameOver = true;
            GameState.isPlaying = false;
            
            if (typeof HorrorAudio !== 'undefined') {
                HorrorAudio.playDeath();
            }
            
            showGameOver('You were consumed by the darkness...');
        }
        
        attack() {
            if (this.isAttacking) return;
            
            this.isAttacking = true;
            
            // Perform attack
            const damage = this.weapon === 'shadowBlade' ? CONFIG.SHADOW_BLADE_DAMAGE : CONFIG.ATTACK_DAMAGE;
            const range = CONFIG.ATTACK_RANGE;
            
            // Check for enemies in range
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                
                const dist = this.position.distanceTo(enemy.position);
                if (dist < range) {
                    // Check if in front of player
                    const toEnemy = enemy.position.clone().sub(this.position).normalize();
                    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
                    const angle = forward.angleTo(toEnemy);
                    
                    if (angle < Math.PI / 3) { // 60 degree cone
                        // Check for stealth kill
                        const isStealth = this.isInShadows && !enemy.isAlerted && dist < CONFIG.STEALTH_KILL_RANGE;
                        const finalDamage = isStealth ? damage * 3 : damage;
                        
                        enemy.takeDamage(finalDamage);
                        GameState.stats.damageDealt += finalDamage;
                        
                        if (isStealth && !enemy.alive) {
                            GameState.stats.stealthKills++;
                        }
                        
                        // Spawn hit effect
                        spawnHitEffect(enemy.position);
                    }
                }
            }
            
            setTimeout(() => { this.isAttacking = false; }, 300);
            
            // Audio
            if (typeof HorrorAudio !== 'undefined') {
                // Whoosh sound
            }
        }
        
        useSmokeBomb() {
            if (this.inventory.smokeBombs <= 0) return;
            
            this.inventory.smokeBombs--;
            
            // Create smoke effect
            spawnSmokeEffect(this.position);
            
            // Confuse nearby enemies
            for (const enemy of enemies) {
                if (enemy.alive && enemy.position.distanceTo(this.position) < 10) {
                    enemy.confuse();
                }
            }
            
            // Update UI
            updateInventoryUI();
        }
        
        useHealthPotion() {
            if (this.inventory.healthPotions <= 0 || this.health >= this.maxHealth) return;
            
            this.inventory.healthPotions--;
            this.heal(50);
            
            // Update UI
            updateInventoryUI();
        }
        
        updateUI() {
            // Update health bar
            const healthBar = document.getElementById('health-bar');
            if (healthBar) {
                healthBar.style.width = `${(this.health / this.maxHealth) * 100}%`;
            }
            
            // Update stamina bar
            const staminaBar = document.getElementById('stamina-bar');
            if (staminaBar) {
                staminaBar.style.width = `${(this.stamina / CONFIG.STAMINA_MAX) * 100}%`;
            }
            
            // Update shadow bar
            const shadowBar = document.getElementById('shadow-bar');
            if (shadowBar) {
                shadowBar.style.width = `${(this.shadowPower / CONFIG.SHADOW_POWER_MAX) * 100}%`;
            }
            
            // Update stealth indicator
            const stealthIndicator = document.getElementById('stealth-indicator');
            if (stealthIndicator) {
                if (this.isDetected) {
                    stealthIndicator.textContent = '⚠️ DETECTED!';
                    stealthIndicator.classList.add('detected');
                    stealthIndicator.classList.add('visible');
                } else if (this.isInShadows) {
                    stealthIndicator.textContent = '🌑 HIDDEN IN SHADOWS';
                    stealthIndicator.classList.remove('detected');
                    stealthIndicator.classList.add('visible');
                } else {
                    stealthIndicator.classList.remove('visible');
                }
            }
            
            // Update noise indicator
            const noiseIndicator = document.getElementById('noise-indicator');
            if (noiseIndicator) {
                if (this.noiseLevel > CONFIG.NOISE_WALK * 1.5) {
                    noiseIndicator.classList.add('visible');
                } else {
                    noiseIndicator.classList.remove('visible');
                }
            }
            
            // Update shadow overlay
            const shadowOverlay = document.getElementById('shadow-overlay');
            if (shadowOverlay) {
                if (this.isInShadows) {
                    shadowOverlay.classList.add('in-shadows');
                } else {
                    shadowOverlay.classList.remove('in-shadows');
                }
            }
        }
    }

    // ==========================================
    // ENEMY AI CLASS
    // ==========================================
    class Enemy {
        constructor(type, position) {
            this.type = type;
            this.config = CONFIG.ENEMY_TYPES[type];
            this.position = position.clone();
            this.rotation = 0;
            
            this.health = this.config.health;
            this.maxHealth = this.health;
            this.speed = this.config.speed;
            this.alive = true;
            
            // AI State
            this.state = 'patrol'; // patrol, investigate, chase, search, confused
            this.stateTimer = 0;
            this.patrolIndex = 0;
            this.patrolPath = [];
            this.targetPosition = null;
            this.lastKnownPlayerPos = null;
            
            // Vision
            this.visionRange = this.config.vision;
            this.visionAngle = this.config.fov * (Math.PI / 180);
            this.isAlerted = false;
            this.alertLevel = 0; // 0-1
            
            // Detection
            this.canSeePlayer = false;
            this.timeSinceSeen = 0;
            
            // Create mesh
            this.mesh = this.createMesh();
            this.visionCone = this.createVisionCone();
            
            // Generate patrol path
            this.generatePatrolPath();
        }
        
        createMesh() {
            const group = new THREE.Group();
            
            // Body
            const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: this.config.color,
                roughness: 0.7,
                metalness: 0.3
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.8;
            body.castShadow = true;
            group.add(body);
            
            // Head
            const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const headMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(this.config.color).multiplyScalar(0.8),
                roughness: 0.5
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.6;
            head.castShadow = true;
            group.add(head);
            
            // Eyes (glowing)
            const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            
            const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
            leftEye.position.set(-0.12, 1.6, 0.25);
            group.add(leftEye);
            
            const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
            rightEye.position.set(0.12, 1.6, 0.25);
            group.add(rightEye);
            
            group.position.copy(this.position);
            scene.add(group);
            
            return group;
        }
        
        createVisionCone() {
            const geometry = new THREE.ConeGeometry(
                Math.tan(this.visionAngle / 2) * this.visionRange,
                this.visionRange,
                32,
                1,
                true
            );
            geometry.rotateX(-Math.PI / 2);
            geometry.translate(0, 0, this.visionRange / 2);
            
            const material = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            const cone = new THREE.Mesh(geometry, material);
            cone.position.y = 0.5;
            cone.visible = false;
            this.mesh.add(cone);
            
            return cone;
        }
        
        generatePatrolPath() {
            // Generate random patrol points around spawn
            const numPoints = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const radius = 3 + Math.random() * 5;
                const x = this.position.x + Math.cos(angle) * radius;
                const z = this.position.z + Math.sin(angle) * radius;
                this.patrolPath.push(new THREE.Vector3(x, 0, z));
            }
            this.targetPosition = this.patrolPath[0];
        }
        
        update(dt) {
            if (!this.alive) return;
            
            this.stateTimer -= dt;
            
            // Update vision
            this.updateVision();
            
            // State machine
            switch (this.state) {
                case 'patrol':
                    this.updatePatrol(dt);
                    break;
                case 'investigate':
                    this.updateInvestigate(dt);
                    break;
                case 'chase':
                    this.updateChase(dt);
                    break;
                case 'search':
                    this.updateSearch(dt);
                    break;
                case 'confused':
                    this.updateConfused(dt);
                    break;
            }
            
            // Update alert level
            if (this.canSeePlayer) {
                this.alertLevel = Math.min(1, this.alertLevel + dt * 2);
                if (this.alertLevel >= 1 && this.state !== 'chase') {
                    this.setState('chase');
                    this.isAlerted = true;
                    GameState.stats.timesDetected++;
                }
            } else {
                this.alertLevel = Math.max(0, this.alertLevel - dt * 0.5);
            }
            
            // Update vision cone visibility
            this.visionCone.visible = this.isAlerted || this.state === 'chase';
            this.visionCone.material.opacity = 0.1 + (this.alertLevel * 0.2);
            
            // Update mesh
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
            this.mesh.rotation.y = this.rotation + Math.PI; // Face forward
        }
        
        updateVision() {
            if (!player) {
                this.canSeePlayer = false;
                return;
            }
            
            const toPlayer = player.position.clone().sub(this.position);
            const dist = toPlayer.length();
            toPlayer.normalize();
            
            // Check distance
            if (dist > this.visionRange) {
                this.canSeePlayer = false;
                return;
            }
            
            // Check angle
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            const angle = forward.angleTo(toPlayer);
            
            if (angle > this.visionAngle / 2) {
                this.canSeePlayer = false;
                return;
            }
            
            // Check visibility of player
            const visibility = player.visibility;
            const detectionRange = this.visionRange * (0.3 + visibility * 0.7);
            
            this.canSeePlayer = dist < detectionRange;
            
            if (this.canSeePlayer) {
                this.lastKnownPlayerPos = player.position.clone();
                this.timeSinceSeen = 0;
            } else {
                this.timeSinceSeen += 0.016;
            }
        }
        
        updatePatrol(dt) {
            if (!this.targetPosition) return;
            
            const toTarget = this.targetPosition.clone().sub(this.position);
            const dist = toTarget.length();
            
            if (dist < 0.5) {
                // Reached waypoint
                this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
                this.targetPosition = this.patrolPath[this.patrolIndex];
            }
            
            // Move towards target
            this.moveTowards(this.targetPosition, dt);
            
            // Transition to investigate if suspicious
            if (this.alertLevel > 0.3) {
                this.setState('investigate');
            }
            
            // Check for noise
            if (player.noiseLevel > CONFIG.NOISE_WALK * 2 && 
                this.position.distanceTo(player.position) < player.noiseLevel * 2) {
                this.targetPosition = player.position.clone();
                this.setState('investigate');
            }
        }
        
        updateInvestigate(dt) {
            if (!this.targetPosition) {
                this.setState('patrol');
                return;
            }
            
            this.moveTowards(this.targetPosition, dt * 1.2);
            
            const dist = this.position.distanceTo(this.targetPosition);
            if (dist < 0.5 || this.stateTimer <= 0) {
                if (this.alertLevel > 0.7) {
                    this.setState('search');
                } else {
                    this.setState('patrol');
                }
            }
        }
        
        updateChase(dt) {
            if (!player || !this.canSeePlayer) {
                if (this.timeSinceSeen > 3) {
                    this.setState('search');
                }
                return;
            }
            
            // Chase player
            this.moveTowards(player.position, dt * 1.5);
            
            // Attack if close enough
            const dist = this.position.distanceTo(player.position);
            if (dist < 1.5) {
                this.attack();
            }
        }
        
        updateSearch(dt) {
            if (this.stateTimer <= 0) {
                this.isAlerted = false;
                this.setState('patrol');
                return;
            }
            
            // Search around last known position
            if (!this.targetPosition || this.position.distanceTo(this.targetPosition) < 1) {
                const angle = Math.random() * Math.PI * 2;
                const radius = 3 + Math.random() * 5;
                this.targetPosition = this.lastKnownPlayerPos.clone().add(
                    new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
                );
            }
            
            this.moveTowards(this.targetPosition, dt);
        }
        
        updateConfused(dt) {
            if (this.stateTimer <= 0) {
                this.setState('search');
                return;
            }
            
            // Spin around confused
            this.rotation += dt * 2;
        }
        
        moveTowards(target, dt) {
            const toTarget = target.clone().sub(this.position);
            toTarget.y = 0;
            const dist = toTarget.length();
            
            if (dist > 0.1) {
                toTarget.normalize();
                
                // Smooth rotation
                const targetRotation = Math.atan2(toTarget.x, toTarget.z);
                let rotDiff = targetRotation - this.rotation;
                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                this.rotation += rotDiff * dt * 5;
                
                // Move
                const moveSpeed = this.speed * dt;
                this.position.x += Math.sin(this.rotation) * moveSpeed;
                this.position.z += Math.cos(this.rotation) * moveSpeed;
            }
        }
        
        setState(newState) {
            this.state = newState;
            
            switch (newState) {
                case 'patrol':
                    this.stateTimer = 0;
                    this.targetPosition = this.patrolPath[this.patrolIndex];
                    break;
                case 'investigate':
                    this.stateTimer = 10;
                    break;
                case 'chase':
                    this.stateTimer = 0;
                    break;
                case 'search':
                    this.stateTimer = 15;
                    break;
                case 'confused':
                    this.stateTimer = 5;
                    break;
            }
        }
        
        confuse() {
            this.setState('confused');
            this.alertLevel = 0;
        }
        
        attack() {
            if (!player) return;
            
            player.takeDamage(this.config.damage);
            
            // Visual feedback
            spawnHitEffect(player.position);
        }
        
        takeDamage(amount) {
            this.health -= amount;
            
            // Flash red
            this.mesh.children[0].material.emissive = new THREE.Color(0xff0000);
            setTimeout(() => {
                if (this.mesh && this.mesh.children[0]) {
                    this.mesh.children[0].material.emissive = new THREE.Color(0x000000);
                }
            }, 100);
            
            if (this.health <= 0) {
                this.die();
            } else {
                // Become alerted
                this.isAlerted = true;
                if (this.state !== 'chase') {
                    this.setState('investigate');
                    this.targetPosition = player.position.clone();
                }
            }
        }
        
        die() {
            this.alive = false;
            GameState.totalKills++;
            
            // Death animation
            this.mesh.rotation.x = Math.PI / 2;
            this.mesh.position.y = 0.4;
            
            // Chance to drop item
            if (Math.random() < 0.3) {
                spawnItem(this.position, 'shard');
            }
            
            // Remove after delay
            setTimeout(() => {
                scene.remove(this.mesh);
            }, 5000);
        }
    }

    // ==========================================
    // DUNGEON GENERATION
    // ==========================================
    class DungeonGenerator {
        constructor() {
            this.grid = [];
            this.width = 40;
            this.height = 40;
            this.rooms = [];
            this.walls = [];
            this.floorMeshes = [];
            this.exitPosition = null;
        }
        
        generate(levelIndex) {
            const level = CONFIG.LEVELS[levelIndex];
            
            // Clear previous
            this.clear();
            
            // Initialize grid
            this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(1));
            this.rooms = [];
            
            // Generate rooms
            const numRooms = level.rooms;
            for (let i = 0; i < numRooms; i++) {
                this.tryPlaceRoom();
            }
            
            // Connect rooms with corridors
            this.connectRooms();
            
            // Create meshes
            this.createMeshes();
            
            // Place lights
            this.placeLights();
            
            // Place items
            this.placeItems(level.shards);
            
            // Return player start position
            if (this.rooms.length > 0) {
                const startRoom = this.rooms[0];
                return new THREE.Vector3(
                    (startRoom.x + startRoom.w / 2) * CONFIG.CELL_SIZE,
                    CONFIG.PLAYER_HEIGHT,
                    (startRoom.y + startRoom.h / 2) * CONFIG.CELL_SIZE
                );
            }
            
            return new THREE.Vector3(0, CONFIG.PLAYER_HEIGHT, 0);
        }
        
        tryPlaceRoom() {
            const w = CONFIG.ROOM_MIN_SIZE + Math.floor(Math.random() * (CONFIG.ROOM_MAX_SIZE - CONFIG.ROOM_MIN_SIZE + 1));
            const h = CONFIG.ROOM_MIN_SIZE + Math.floor(Math.random() * (CONFIG.ROOM_MAX_SIZE - CONFIG.ROOM_MIN_SIZE + 1));
            
            const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;
            
            // Check overlap
            for (const room of this.rooms) {
                if (this.roomsIntersect({ x, y, w, h }, room)) {
                    return false;
                }
            }
            
            // Carve room
            for (let ry = y; ry < y + h; ry++) {
                for (let rx = x; rx < x + w; rx++) {
                    this.grid[ry][rx] = 0;
                }
            }
            
            this.rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
            return true;
        }
        
        roomsIntersect(a, b) {
            return a.x - 1 < b.x + b.w + 1 && a.x + a.w + 1 > b.x - 1 &&
                   a.y - 1 < b.y + b.h + 1 && a.y + a.h + 1 > b.y - 1;
        }
        
        connectRooms() {
            for (let i = 0; i < this.rooms.length - 1; i++) {
                const a = this.rooms[i];
                const b = this.rooms[i + 1];
                
                // Create L-shaped corridor
                const startX = Math.floor(a.cx);
                const startY = Math.floor(a.cy);
                const endX = Math.floor(b.cx);
                const endY = Math.floor(b.cy);
                
                // Horizontal then vertical
                const midX = endX;
                
                // Horizontal
                const minX = Math.min(startX, midX);
                const maxX = Math.max(startX, midX);
                for (let x = minX; x <= maxX; x++) {
                    this.grid[startY][x] = 0;
                    this.grid[startY + 1]?.[x] = 0; // Wider corridor
                }
                
                // Vertical
                const minY = Math.min(startY, endY);
                const maxY = Math.max(startY, endY);
                for (let y = minY; y <= maxY; y++) {
                    this.grid[y][endX] = 0;
                    this.grid[y][endX + 1] = 0; // Wider corridor
                }
            }
        }
        
        createMeshes() {
            const wallMat = new THREE.MeshStandardMaterial({
                color: 0x2a2038,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const floorMat = new THREE.MeshStandardMaterial({
                color: 0x151020,
                roughness: 0.95,
                metalness: 0.05
            });
            
            const ceilingMat = new THREE.MeshStandardMaterial({
                color: 0x0a0814,
                roughness: 1,
                metalness: 0
            });
            
            // Create instanced meshes for better performance
            const wallGeo = new THREE.BoxGeometry(CONFIG.CELL_SIZE, CONFIG.WALL_HEIGHT, CONFIG.CELL_SIZE);
            const floorGeo = new THREE.BoxGeometry(CONFIG.CELL_SIZE, 0.2, CONFIG.CELL_SIZE);
            
            let wallCount = 0;
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.grid[y][x] === 1) wallCount++;
                }
            }
            
            // Create walls
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.grid[y][x] === 1) {
                        const wall = new THREE.Mesh(wallGeo, wallMat);
                        wall.position.set(
                            x * CONFIG.CELL_SIZE,
                            CONFIG.WALL_HEIGHT / 2,
                            y * CONFIG.CELL_SIZE
                        );
                        wall.castShadow = true;
                        wall.receiveShadow = true;
                        scene.add(wall);
                        this.walls.push(wall);
                    } else {
                        // Floor
                        const floor = new THREE.Mesh(floorGeo, floorMat);
                        floor.position.set(
                            x * CONFIG.CELL_SIZE,
                            0,
                            y * CONFIG.CELL_SIZE
                        );
                        floor.receiveShadow = true;
                        scene.add(floor);
                        this.floorMeshes.push(floor);
                        
                        // Ceiling
                        const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
                        ceiling.position.set(
                            x * CONFIG.CELL_SIZE,
                            CONFIG.WALL_HEIGHT,
                            y * CONFIG.CELL_SIZE
                        );
                        scene.add(ceiling);
                    }
                }
            }
            
            // Create exit
            if (this.rooms.length > 0) {
                const exitRoom = this.rooms[this.rooms.length - 1];
                this.exitPosition = new THREE.Vector3(
                    exitRoom.cx * CONFIG.CELL_SIZE,
                    1,
                    exitRoom.cy * CONFIG.CELL_SIZE
                );
                
                // Exit visual
                const exitGeo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
                const exitMat = new THREE.MeshBasicMaterial({
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.5
                });
                const exit = new THREE.Mesh(exitGeo, exitMat);
                exit.position.copy(this.exitPosition);
                scene.add(exit);
                
                // Exit light
                const exitLight = new THREE.PointLight(0x00ff88, 1, 10);
                exitLight.position.copy(this.exitPosition);
                exitLight.position.y = 3;
                scene.add(exitLight);
            }
        }
        
        placeLights() {
            // Place lights in rooms
            for (const room of this.rooms) {
                // 50% chance for light in each room
                if (Math.random() < 0.6) {
                    const lightX = (room.cx + (Math.random() - 0.5) * room.w * 0.5) * CONFIG.CELL_SIZE;
                    const lightZ = (room.cy + (Math.random() - 0.5) * room.h * 0.5) * CONFIG.CELL_SIZE;
                    
                    const light = new THREE.PointLight(0xffaa44, 0.8, 15);
                    light.position.set(lightX, 4, lightZ);
                    light.castShadow = true;
                    light.shadow.bias = -0.001;
                    scene.add(light);
                    lights.push(light);
                    
                    // Torch visual
                    const torchGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
                    const torchMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
                    const torch = new THREE.Mesh(torchGeo, torchMat);
                    torch.position.set(lightX, 3.5, lightZ);
                    scene.add(torch);
                }
            }
            
            // Ambient light (very dim)
            const ambient = new THREE.AmbientLight(0x221133, 0.15);
            scene.add(ambient);
        }
        
        placeItems(numShards) {
            // Place shadow shards
            for (let i = 0; i < numShards; i++) {
                const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                const pos = new THREE.Vector3(
                    (room.cx + (Math.random() - 0.5) * room.w * 0.6) * CONFIG.CELL_SIZE,
                    1,
                    (room.cy + (Math.random() - 0.5) * room.h * 0.6) * CONFIG.CELL_SIZE
                );
                spawnItem(pos, 'shard');
            }
            
            // Place health potions
            for (let i = 0; i < 2; i++) {
                const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
                const pos = new THREE.Vector3(
                    (room.cx + (Math.random() - 0.5) * room.w * 0.6) * CONFIG.CELL_SIZE,
                    1,
                    (room.cy + (Math.random() - 0.5) * room.h * 0.6) * CONFIG.CELL_SIZE
                );
                spawnItem(pos, 'potion');
            }
        }
        
        clear() {
            // Remove all meshes
            for (const wall of this.walls) scene.remove(wall);
            for (const floor of this.floorMeshes) scene.remove(floor);
            for (const light of lights) scene.remove(light);
            
            this.walls = [];
            this.floorMeshes = [];
            lights = [];
        }
    }

    // ==========================================
    // ITEMS & COLLECTIBLES
    // ==========================================
    function spawnItem(position, type) {
        let mesh;
        
        if (type === 'shard') {
            const geo = new THREE.OctahedronGeometry(0.3, 0);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x8b00ff,
                transparent: true,
                opacity: 0.9
            });
            mesh = new THREE.Mesh(geo, mat);
            
            // Glow
            const light = new THREE.PointLight(0x8b00ff, 0.5, 5);
            light.position.y = 0.5;
            mesh.add(light);
        } else if (type === 'potion') {
            const geo = new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16);
            const mat = new THREE.MeshBasicMaterial({ color: 0xff0040 });
            mesh = new THREE.Mesh(geo, mat);
            
            const light = new THREE.PointLight(0xff0040, 0.3, 3);
            light.position.y = 0.5;
            mesh.add(light);
        }
        
        mesh.position.copy(position);
        mesh.userData = { type, collected: false };
        
        scene.add(mesh);
        items.push(mesh);
        
        // Float animation
        const startY = position.y;
        mesh.userData.animate = (time) => {
            mesh.position.y = startY + Math.sin(time * 2) * 0.2;
            mesh.rotation.y += 0.02;
        };
    }

    function updateItems(dt, time) {
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            
            // Animate
            if (item.userData.animate) {
                item.userData.animate(time);
            }
            
            // Check collection
            if (!item.userData.collected && player) {
                const dist = player.position.distanceTo(item.position);
                if (dist < 1.5) {
                    collectItem(item);
                }
            }
        }
    }

    function collectItem(item) {
        item.userData.collected = true;
        
        if (item.userData.type === 'shard') {
            GameState.shards++;
            
            // Update UI
            const shardsCount = document.getElementById('shards-count');
            if (shardsCount) shardsCount.textContent = GameState.shards;
            
            // Audio
            if (typeof HorrorAudio !== 'undefined') {
                HorrorAudio.playCollect();
            }
        } else if (item.userData.type === 'potion') {
            player.inventory.healthPotions++;
            updateInventoryUI();
            
            if (typeof HorrorAudio !== 'undefined') {
                HorrorAudio.playPowerup();
            }
        }
        
        // Remove from scene
        scene.remove(item);
        items = items.filter(i => i !== item);
    }

    function updateInventoryUI() {
        const slots = document.querySelectorAll('.inventory-slot');
        
        // Update dagger slot
        slots[0].textContent = '🗡️';
        slots[0].classList.toggle('active', player.weapon === 'dagger');
        
        // Update smoke bombs
        slots[1].textContent = player.inventory.smokeBombs > 0 ? '💣' : '⬛';
        slots[1].classList.toggle('has-item', player.inventory.smokeBombs > 0);
        
        // Update health potions
        slots[2].textContent = player.inventory.healthPotions > 0 ? '🧪' : '⬛';
        slots[2].classList.toggle('has-item', player.inventory.healthPotions > 0);
        
        // Update shadow blade
        slots[3].innerHTML = player.inventory.shadowBlade ? '⚔️' : '🔲';
        slots[3].classList.toggle('has-item', player.inventory.shadowBlade);
    }


    // ==========================================
    // VISUAL EFFECTS
    // ==========================================
    function spawnHitEffect(position) {
        const particleCount = 8;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y + 1;
            positions[i * 3 + 2] = position.z;
            
            velocities.push({
                x: (Math.random() - 0.5) * 3,
                y: Math.random() * 3,
                z: (Math.random() - 0.5) * 3
            });
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const mat = new THREE.PointsMaterial({
            color: 0xff0040,
            size: 0.2,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geo, mat);
        scene.add(particles);
        
        // Animate
        let life = 1;
        const animate = () => {
            life -= 0.05;
            if (life <= 0) {
                scene.remove(particles);
                return;
            }
            
            const pos = particles.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                pos[i * 3] += velocities[i].x * 0.016;
                pos[i * 3 + 1] += velocities[i].y * 0.016;
                pos[i * 3 + 2] += velocities[i].z * 0.016;
                velocities[i].y -= 0.1; // Gravity
            }
            particles.geometry.attributes.position.needsUpdate = true;
            particles.material.opacity = life;
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    function spawnSmokeEffect(position) {
        const smokeGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const smokeMat = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.6
        });
        
        for (let i = 0; i < 5; i++) {
            const smoke = new THREE.Mesh(smokeGeo, smokeMat.clone());
            smoke.position.copy(position);
            smoke.position.x += (Math.random() - 0.5) * 2;
            smoke.position.z += (Math.random() - 0.5) * 2;
            smoke.scale.setScalar(0.5 + Math.random());
            scene.add(smoke);
            
            // Animate expansion
            let scale = smoke.scale.x;
            const expand = () => {
                scale += 0.05;
                smoke.scale.setScalar(scale);
                smoke.material.opacity -= 0.01;
                
                if (smoke.material.opacity <= 0) {
                    scene.remove(smoke);
                } else {
                    requestAnimationFrame(expand);
                }
            };
            expand();
        }
    }

    function showDamageEffect() {
        const overlay = document.getElementById('damage-overlay');
        if (overlay) {
            overlay.classList.add('visible');
            setTimeout(() => overlay.classList.remove('visible'), 200);
        }
    }

    // ==========================================
    // ENEMY SPAWNING
    // ==========================================
    function spawnEnemies(levelIndex) {
        // Clear existing enemies
        for (const enemy of enemies) {
            if (enemy.mesh) scene.remove(enemy.mesh);
        }
        enemies = [];
        
        const level = CONFIG.LEVELS[levelIndex];
        let enemyCount = level.enemies;
        
        // Determine enemy types based on level
        const availableTypes = ['GUARD'];
        if (levelIndex >= 1) availableTypes.push('HUNTER');
        if (levelIndex >= 2) availableTypes.push('WRAITH');
        if (levelIndex >= 4) availableTypes.push('BEAST');
        if (levelIndex >= 6) availableTypes.push('SENTINEL');
        
        // Spawn in rooms (not the starting room)
        const spawnRooms = dungeon.rooms.slice(1);
        
        for (let i = 0; i < enemyCount; i++) {
            if (spawnRooms.length === 0) break;
            
            const room = spawnRooms[Math.floor(Math.random() * spawnRooms.length)];
            const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            
            const position = new THREE.Vector3(
                (room.cx + (Math.random() - 0.5) * room.w * 0.6) * CONFIG.CELL_SIZE,
                0,
                (room.cy + (Math.random() - 0.5) * room.h * 0.6) * CONFIG.CELL_SIZE
            );
            
            const enemy = new Enemy(type, position);
            enemies.push(enemy);
        }
        
        // Spawn boss on boss levels
        if (level.type === 'boss' || level.type === 'final') {
            spawnBoss();
        }
    }

    function spawnBoss() {
        const bossRoom = dungeon.rooms[dungeon.rooms.length - 1];
        const position = new THREE.Vector3(
            bossRoom.cx * CONFIG.CELL_SIZE,
            0,
            bossRoom.cy * CONFIG.CELL_SIZE
        );
        
        const boss = new Enemy('SENTINEL', position);
        boss.health = 200;
        boss.maxHealth = 200;
        boss.speed = 3;
        boss.visionRange = 25;
        boss.config.damage = 40;
        
        // Make bigger
        boss.mesh.scale.setScalar(2);
        
        enemies.push(boss);
        
        // Show warning
        const warning = document.getElementById('boss-warning');
        if (warning) {
            warning.classList.add('visible');
            setTimeout(() => warning.classList.remove('visible'), 5000);
        }
    }

    // ==========================================
    // INPUT HANDLING
    // ==========================================
    function setupInput() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            Input.keys[e.code] = true;
            
            // Handle single-press keys
            if (GameState.isPlaying && !GameState.isPaused) {
                switch (e.code) {
                    case 'Space':
                        player.attack();
                        break;
                    case 'KeyE':
                        checkInteractions();
                        break;
                    case 'Digit1':
                        player.weapon = 'dagger';
                        updateInventoryUI();
                        break;
                    case 'Digit2':
                        player.useSmokeBomb();
                        break;
                    case 'Digit3':
                        player.useHealthPotion();
                        break;
                    case 'Digit4':
                        if (player.inventory.shadowBlade) {
                            player.weapon = 'shadowBlade';
                            updateInventoryUI();
                        }
                        break;
                    case 'Escape':
                        togglePause();
                        break;
                }
            }
            
            // Sprint
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                player.isSprinting = true;
            }
            
            // Crouch
            if (e.code === 'KeyC') {
                player.isCrouching = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            Input.keys[e.code] = false;
            
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                if (player) player.isSprinting = false;
            }
            
            if (e.code === 'KeyC') {
                if (player) player.isCrouching = false;
            }
        });
        
        // Mouse
        document.addEventListener('mousemove', (e) => {
            if (Input.isPointerLocked && player && GameState.isPlaying && !GameState.isPaused) {
                const sensitivity = 0.002;
                player.rotation.y -= e.movementX * sensitivity;
                player.rotation.x -= e.movementY * sensitivity;
                player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.rotation.x));
            }
        });
        
        // Pointer lock
        const canvas = document.getElementById('game-canvas');
        canvas.addEventListener('click', () => {
            if (GameState.isPlaying && !GameState.isPaused && !Input.isPointerLocked) {
                canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            Input.isPointerLocked = document.pointerLockElement === canvas;
        });
    }

    function checkInteractions() {
        if (!player || !dungeon) return;
        
        // Check exit
        if (dungeon.exitPosition) {
            const dist = player.position.distanceTo(dungeon.exitPosition);
            if (dist < 2) {
                completeLevel();
            }
        }
    }

    // ==========================================
    // GAME FLOW CONTROL
    // ==========================================
    function init() {
        // Initialize loading
        updateLoading(10, 'Initializing renderer...');
        
        // Setup Three.js
        setupRenderer();
        
        updateLoading(30, 'Generating world...');
        
        // Setup dungeon generator
        dungeon = new DungeonGenerator();
        
        updateLoading(50, 'Setting up input...');
        
        // Setup input
        setupInput();
        
        updateLoading(70, 'Initializing audio...');
        
        // Initialize audio
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.init();
            HorrorAudio.startDrone(40, 'dark');
        }
        
        updateLoading(90, 'Finalizing...');
        
        // Setup UI
        setupUI();
        
        updateLoading(100, 'Ready!');
        
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.classList.add('hidden');
        }, 500);
        
        // Start clock
        clock = new THREE.Clock();
        
        // Start animation loop
        animate();
    }

    function setupRenderer() {
        const canvas = document.getElementById('game-canvas');
        
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0814);
        scene.fog = new THREE.FogExp2(0x0a0814, 0.035);
        
        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        
        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Handle resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    function setupUI() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', startGame);
        }
        
        // Pause menu buttons
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) resumeBtn.addEventListener('click', resumeGame);
        
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.addEventListener('click', restartLevel);
        
        const quitBtn = document.getElementById('quit-btn');
        if (quitBtn) quitBtn.addEventListener('click', quitToMenu);
        
        // Upgrade cards
        document.querySelectorAll('.upgrade-card').forEach(card => {
            card.addEventListener('click', () => buyUpgrade(card.dataset.upgrade));
        });
        
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) continueBtn.addEventListener('click', continueToNextLevel);
        
        // Game over / victory buttons
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => location.reload());
        
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => location.reload());
    }

    function updateLoading(percent, text) {
        const bar = document.getElementById('loading-bar');
        const label = document.getElementById('loading-text');
        
        if (bar) bar.style.width = percent + '%';
        if (label) label.textContent = text;
    }

    function startGame() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.classList.add('hidden');
        
        const gameUI = document.getElementById('game-ui');
        if (gameUI) gameUI.classList.add('visible');
        
        const controlsHint = document.getElementById('controls-hint');
        if (controlsHint) {
            controlsHint.classList.add('visible');
            setTimeout(() => controlsHint.classList.remove('visible'), 8000);
        }
        
        // Start first level
        startLevel(0);
        
        // Lock pointer
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.requestPointerLock();
        
        GameState.isPlaying = true;
    }

    function startLevel(levelIndex) {
        GameState.currentLevel = levelIndex;
        
        const level = CONFIG.LEVELS[levelIndex];
        
        // Update UI
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) levelDisplay.textContent = `Level ${levelIndex + 1}`;
        
        const areaName = document.getElementById('area-name');
        if (areaName) areaName.textContent = level.name;
        
        // Clear previous level
        if (dungeon) dungeon.clear();
        
        // Generate dungeon
        const startPos = dungeon.generate(levelIndex);
        
        // Create player
        if (player) {
            scene.remove(player.mesh);
        }
        player = new Player();
        player.position.copy(startPos);
        
        // Spawn enemies
        spawnEnemies(levelIndex);
        
        // Clear items from previous level
        for (const item of items) {
            scene.remove(item);
        }
        items = [];
        
        // Reset state
        GameState.isPaused = false;
        GameState.isGameOver = false;
        
        // Hide pause menu
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.remove('visible');
    }

    function completeLevel() {
        GameState.isPlaying = false;
        
        if (typeof HorrorAudio !== 'undefined') {
            HorrorAudio.playWin();
        }
        
        // Check if final level
        if (GameState.currentLevel >= CONFIG.LEVELS.length - 1) {
            showVictory();
        } else {
            // Show upgrade modal
            const upgradeModal = document.getElementById('upgrade-modal');
            if (upgradeModal) upgradeModal.classList.add('visible');
            
            // Update upgrade costs
            updateUpgradeUI();
        }
        
        // Release pointer
        document.exitPointerLock();
    }

    function continueToNextLevel() {
        const upgradeModal = document.getElementById('upgrade-modal');
        if (upgradeModal) upgradeModal.classList.remove('visible');
        
        startLevel(GameState.currentLevel + 1);
        
        GameState.isPlaying = true;
        
        // Lock pointer
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.requestPointerLock();
    }

    function updateUpgradeUI() {
        const shardsCount = document.getElementById('shards-count');
        if (shardsCount) shardsCount.textContent = GameState.shards;
        
        document.querySelectorAll('.upgrade-card').forEach(card => {
            const type = card.dataset.upgrade;
            const currentLevel = GameState.upgrades[type];
            const cost = CONFIG.UPGRADE_COSTS[currentLevel] || 'MAX';
            
            const costEl = card.querySelector('.cost-value');
            if (costEl) costEl.textContent = cost === 'MAX' ? 'MAX' : cost;
            
            if (cost === 'MAX' || GameState.shards < cost) {
                card.classList.add('maxed');
            } else {
                card.classList.remove('maxed');
            }
        });
    }

    function buyUpgrade(type) {
        const currentLevel = GameState.upgrades[type];
        const cost = CONFIG.UPGRADE_COSTS[currentLevel];
        
        if (cost === undefined || GameState.shards < cost) return;
        
        GameState.shards -= cost;
        GameState.upgrades[type]++;
        
        updateUpgradeUI();
        
        // Apply upgrade immediately
        if (type === 'health') {
            player.maxHealth += 20;
            player.health += 20;
        }
    }

    function togglePause() {
        if (!GameState.isPlaying || GameState.isGameOver) return;
        
        GameState.isPaused = !GameState.isPaused;
        
        const pauseMenu = document.getElementById('pause-menu');
        
        if (GameState.isPaused) {
            if (pauseMenu) pauseMenu.classList.add('visible');
            document.exitPointerLock();
        } else {
            if (pauseMenu) pauseMenu.classList.remove('visible');
            const canvas = document.getElementById('game-canvas');
            if (canvas) canvas.requestPointerLock();
        }
    }

    function resumeGame() {
        GameState.isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.remove('visible');
        
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.requestPointerLock();
    }

    function restartLevel() {
        GameState.isPaused = false;
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu) pauseMenu.classList.remove('visible');
        
        startLevel(GameState.currentLevel);
        
        const canvas = document.getElementById('game-canvas');
        if (canvas) canvas.requestPointerLock();
    }

    function quitToMenu() {
        location.reload();
    }

    function showGameOver(reason) {
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.add('visible');
        }
        
        const deathReason = document.getElementById('death-reason');
        if (deathReason) deathReason.textContent = reason;
        
        // Update stats
        const statLevel = document.getElementById('stat-level');
        if (statLevel) statLevel.textContent = GameState.currentLevel + 1;
        
        const statShards = document.getElementById('stat-shards');
        if (statShards) statShards.textContent = GameState.shards;
        
        const statKills = document.getElementById('stat-kills');
        if (statKills) statKills.textContent = GameState.totalKills;
        
        document.exitPointerLock();
    }

    function showVictory() {
        const victoryScreen = document.getElementById('victory-screen');
        if (victoryScreen) {
            victoryScreen.classList.add('visible');
        }
        
        // Update stats
        const victoryShards = document.getElementById('victory-shards');
        if (victoryShards) victoryShards.textContent = GameState.shards;
        
        const victoryKills = document.getElementById('victory-kills');
        if (victoryKills) victoryKills.textContent = GameState.totalKills;
        
        const victoryScore = document.getElementById('victory-score');
        if (victoryScore) {
            const score = GameState.shards * 100 + GameState.totalKills * 50 + GameState.stats.stealthKills * 200;
            victoryScore.textContent = score;
        }
        
        document.exitPointerLock();
    }

    // ==========================================
    // MAIN GAME LOOP
    // ==========================================
    function animate() {
        requestAnimationFrame(animate);
        
        const dt = Math.min(clock.getDelta(), 0.1);
        const time = clock.getElapsedTime();
        
        if (GameState.isPlaying && !GameState.isPaused && !GameState.isGameOver) {
            // Update player
            if (player) player.update(dt);
            
            // Update enemies
            for (const enemy of enemies) {
                enemy.update(dt);
            }
            
            // Update items
            updateItems(dt, time);
            
            // Check exit
            if (dungeon && dungeon.exitPosition && player) {
                const dist = player.position.distanceTo(dungeon.exitPosition);
                if (dist < 2) {
                    completeLevel();
                }
            }
            
            // Update stats
            GameState.stats.timePlayed += dt;
            
            // Update 3D audio listener
            if (typeof HorrorAudio !== 'undefined' && player) {
                const forward = new THREE.Vector3(0, 0, -1).applyEuler(player.rotation);
                const up = new THREE.Vector3(0, 1, 0);
                HorrorAudio.updateListener(
                    player.position.x, player.position.y, player.position.z,
                    forward.x, forward.y, forward.z,
                    up.x, up.y, up.z
                );
            }
        }
        
        // Render
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================
    
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.ShadowCrawler3D = {
        GameState,
        CONFIG,
        player: () => player,
        scene: () => scene,
        enemies: () => enemies
    };

})();


    // ==========================================
    // ADDITIONAL FEATURES & EXTENSIONS
    // ==========================================

    // ==========================================
    // PARTICLE SYSTEM
    // ==========================================
    class ParticleSystem {
        constructor() {
            this.particles = [];
            this.maxParticles = 1000;
        }
        
        spawn(options) {
            if (this.particles.length >= this.maxParticles) return;
            
            const particle = {
                position: options.position.clone(),
                velocity: options.velocity.clone(),
                life: options.life || 1,
                maxLife: options.life || 1,
                size: options.size || 1,
                color: options.color || new THREE.Color(1, 1, 1),
                type: options.type || 'normal'
            };
            
            this.particles.push(particle);
        }
        
        spawnExplosion(position, color, count = 10) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                
                this.spawn({
                    position: position,
                    velocity: new THREE.Vector3(
                        Math.cos(angle) * speed,
                        Math.random() * 3,
                        Math.sin(angle) * speed
                    ),
                    life: 0.5 + Math.random() * 0.5,
                    size: 0.1 + Math.random() * 0.2,
                    color: color || new THREE.Color(1, 0.2, 0.1),
                    type: 'explosion'
                });
            }
        }
        
        spawnSpark(position, count = 5) {
            for (let i = 0; i < count; i++) {
                this.spawn({
                    position: position,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 4,
                        Math.random() * 4,
                        (Math.random() - 0.5) * 4
                    ),
                    life: 0.3 + Math.random() * 0.3,
                    size: 0.05,
                    color: new THREE.Color(1, 0.8, 0.2),
                    type: 'spark'
                });
            }
        }
        
        spawnDust(position, count = 8) {
            for (let i = 0; i < count; i++) {
                this.spawn({
                    position: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)),
                    velocity: new THREE.Vector3(0, 0.5 + Math.random() * 0.5, 0),
                    life: 1 + Math.random(),
                    size: 0.2 + Math.random() * 0.3,
                    color: new THREE.Color(0.5, 0.5, 0.5),
                    type: 'dust'
                });
            }
        }
        
        update(dt) {
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                
                // Update position
                p.position.addScaledVector(p.velocity, dt);
                
                // Apply gravity for explosion particles
                if (p.type === 'explosion') {
                    p.velocity.y -= 9.8 * dt;
                }
                
                // Update life
                p.life -= dt;
                
                // Remove dead particles
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }
    }

    const particleSystem = new ParticleSystem();

    // ==========================================
    // WEATHER SYSTEM
    // ==========================================
    class WeatherSystem {
        constructor() {
            this.type = 'none'; // none, fog, rain
            this.intensity = 0;
            this.particles = null;
        }
        
        setWeather(type, intensity = 0.5) {
            this.type = type;
            this.intensity = intensity;
            
            // Update fog
            if (type === 'fog') {
                if (scene && scene.fog) {
                    scene.fog.density = 0.02 + (intensity * 0.03);
                }
            } else {
                if (scene && scene.fog) {
                    scene.fog.density = 0.035;
                }
            }
        }
        
        update(dt) {
            // Weather effects update
        }
    }

    const weatherSystem = new WeatherSystem();

    // ==========================================
    // SCREEN EFFECTS
    // ==========================================
    class ScreenEffects {
        constructor() {
            this.effects = [];
        }
        
        addShake(intensity, duration) {
            this.effects.push({
                type: 'shake',
                intensity,
                duration,
                timer: duration
            });
        }
        
        addFlash(color, duration) {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: ${color};
                opacity: 0.5;
                pointer-events: none;
                z-index: 200;
                transition: opacity ${duration}s ease;
            `;
            document.body.appendChild(overlay);
            
            requestAnimationFrame(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), duration * 1000);
            });
        }
        
        update(dt) {
            for (let i = this.effects.length - 1; i >= 0; i--) {
                const effect = this.effects[i];
                effect.timer -= dt;
                
                if (effect.timer <= 0) {
                    this.effects.splice(i, 1);
                }
            }
        }
        
        applyToCamera(camera) {
            let shakeX = 0;
            let shakeY = 0;
            
            for (const effect of this.effects) {
                if (effect.type === 'shake') {
                    const intensity = effect.intensity * (effect.timer / effect.duration);
                    shakeX += (Math.random() - 0.5) * intensity;
                    shakeY += (Math.random() - 0.5) * intensity;
                }
            }
            
            if (camera) {
                camera.position.x += shakeX;
                camera.position.y += shakeY;
            }
        }
    }

    const screenEffects = new ScreenEffects();

    // ==========================================
    // ACHIEVEMENT SYSTEM
    // ==========================================
    class AchievementSystem {
        constructor() {
            this.achievements = {
                firstBlood: { name: 'First Blood', desc: 'Kill your first enemy', unlocked: false, icon: '🗡️' },
                shadowMaster: { name: 'Shadow Master', desc: 'Get 10 stealth kills', unlocked: false, icon: '🌑' },
                shardCollector: { name: 'Shard Collector', desc: 'Collect 50 shadow shards', unlocked: false, icon: '💎' },
                survivor: { name: 'Survivor', desc: 'Complete a level without taking damage', unlocked: false, icon: '🛡️' },
                ghost: { name: 'Ghost', desc: 'Complete a level without being detected', unlocked: false, icon: '👻' },
                bossSlayer: { name: 'Boss Slayer', desc: 'Defeat your first boss', unlocked: false, icon: '⚔️' },
                completionist: { name: 'Completionist', desc: 'Complete all 10 levels', unlocked: false, icon: '🏆' }
            };
            this.damageThisLevel = 0;
            this.detectedThisLevel = false;
        }
        
        unlock(id) {
            const ach = this.achievements[id];
            if (ach && !ach.unlocked) {
                ach.unlocked = true;
                this.showNotification(ach);
            }
        }
        
        showNotification(achievement) {
            const notif = document.createElement('div');
            notif.style.cssText = `
                position: fixed;
                top: 100px;
                right: -300px;
                background: linear-gradient(135deg, rgba(139, 0, 255, 0.9), rgba(255, 0, 64, 0.9));
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                font-family: Inter, sans-serif;
                z-index: 1000;
                transition: right 0.5s ease;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            `;
            notif.innerHTML = `
                <span style="font-size: 2rem;">${achievement.icon}</span>
                <div>
                    <div style="font-weight: 700; font-size: 0.9rem;">Achievement Unlocked!</div>
                    <div style="font-size: 1.1rem; font-weight: 600;">${achievement.name}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">${achievement.desc}</div>
                </div>
            `;
            document.body.appendChild(notif);
            
            requestAnimationFrame(() => {
                notif.style.right = '20px';
            });
            
            setTimeout(() => {
                notif.style.right = '-300px';
                setTimeout(() => notif.remove(), 500);
            }, 4000);
        }
        
        checkAchievements() {
            // Check kill achievements
            if (GameState.totalKills >= 1) this.unlock('firstBlood');
            if (GameState.stats.stealthKills >= 10) this.unlock('shadowMaster');
            if (GameState.shards >= 50) this.unlock('shardCollector');
            
            // Check boss slayer
            const bossesKilled = enemies.filter(e => !e.alive && e.type === 'SENTINEL').length;
            if (bossesKilled > 0) this.unlock('bossSlayer');
            
            // Check completionist
            if (GameState.currentLevel >= 9) this.unlock('completionist');
        }
        
        onLevelComplete() {
            if (this.damageThisLevel === 0) this.unlock('survivor');
            if (!this.detectedThisLevel) this.unlock('ghost');
            
            // Reset per-level stats
            this.damageThisLevel = 0;
            this.detectedThisLevel = false;
        }
    }

    const achievementSystem = new AchievementSystem();

    // ==========================================
    // SAVE SYSTEM
    // ==========================================
    class SaveSystem {
        constructor() {
            this.saveKey = 'shadowCrawler3D_save';
        }
        
        save() {
            const saveData = {
                currentLevel: GameState.currentLevel,
                shards: GameState.shards,
                upgrades: GameState.upgrades,
                stats: GameState.stats,
                totalKills: GameState.totalKills,
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.saveKey, JSON.stringify(saveData));
        }
        
        load() {
            const saved = localStorage.getItem(this.saveKey);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    GameState.currentLevel = data.currentLevel || 0;
                    GameState.shards = data.shards || 0;
                    GameState.upgrades = data.upgrades || { speed: 0, stealth: 0, health: 0 };
                    GameState.stats = data.stats || GameState.stats;
                    GameState.totalKills = data.totalKills || 0;
                    return true;
                } catch (e) {
                    console.warn('Failed to load save:', e);
                    return false;
                }
            }
            return false;
        }
        
        clear() {
            localStorage.removeItem(this.saveKey);
        }
        
        hasSave() {
            return localStorage.getItem(this.saveKey) !== null;
        }
    }

    const saveSystem = new SaveSystem();

    // ==========================================
    // ENHANCED ENEMY BEHAVIORS
    // ==========================================
    
    // Extended enemy update with additional behaviors
    Enemy.prototype.updateAdvanced = function(dt) {
        // Call base update
        this.update(dt);
        
        // Type-specific behaviors
        switch (this.type) {
            case 'HUNTER':
                // Hunters track noise more aggressively
                if (player && player.noiseLevel > CONFIG.NOISE_WALK && 
                    this.state !== 'chase' && this.state !== 'confused') {
                    const dist = this.position.distanceTo(player.position);
                    if (dist < player.noiseLevel * 3) {
                        this.targetPosition = player.position.clone();
                        this.setState('investigate');
                    }
                }
                break;
                
            case 'WRAITH':
                // Wraiths can sense player through walls when close
                if (player && this.state === 'patrol') {
                    const dist = this.position.distanceTo(player.position);
                    if (dist < 5) {
                        this.alertLevel = Math.min(1, this.alertLevel + dt * 0.5);
                    }
                }
                break;
                
            case 'BEAST':
                // Beasts roar when alerted, attracting nearby enemies
                if (this.state === 'chase' && !this.hasRoared) {
                    this.hasRoared = true;
                    this.alertNearbyEnemies(15);
                }
                break;
        }
        
        // Animation updates
        this.updateAnimation(dt);
    };
    
    Enemy.prototype.alertNearbyEnemies = function(range) {
        for (const enemy of enemies) {
            if (enemy !== this && enemy.alive && enemy.state !== 'chase') {
                const dist = this.position.distanceTo(enemy.position);
                if (dist < range) {
                    enemy.isAlerted = true;
                    enemy.setState('investigate');
                    enemy.targetPosition = this.position.clone();
                }
            }
        }
    };
    
    Enemy.prototype.updateAnimation = function(dt) {
        // Idle animation
        if (this.state === 'patrol') {
            this.mesh.position.y = 0.8 + Math.sin(Date.now() * 0.002) * 0.02;
        }
        
        // Alert animation
        if (this.isAlerted) {
            // Pulsing glow on eyes
            const eyeIntensity = 0.5 + Math.sin(Date.now() * 0.01) * 0.5;
            if (this.mesh.children[2]) { // Left eye
                this.mesh.children[2].material.color.setHSL(0, 1, eyeIntensity);
            }
            if (this.mesh.children[3]) { // Right eye
                this.mesh.children[3].material.color.setHSL(0, 1, eyeIntensity);
            }
        }
    };

    // ==========================================
    // ADVANCED PLAYER ABILITIES
    // ==========================================
    
    Player.prototype.activateShadowMode = function() {
        if (this.shadowPower >= 30 && !this.shadowModeActive) {
            this.shadowModeActive = true;
            this.shadowPower -= 30;
            
            // Visual effect
            const overlay = document.getElementById('shadow-overlay');
            if (overlay) {
                overlay.style.background = 'rgba(139, 0, 255, 0.3)';
            }
            
            // Effects
            this.visibility = 0.05;
            this.speedMultiplier = 1.5;
            
            // Duration
            setTimeout(() => {
                this.deactivateShadowMode();
            }, 5000 + (GameState.upgrades.stealth * 1000));
            
            // Particle effect
            spawnSmokeEffect(this.position);
        }
    };
    
    Player.prototype.deactivateShadowMode = function() {
        this.shadowModeActive = false;
        this.speedMultiplier = 1;
        
        const overlay = document.getElementById('shadow-overlay');
        if (overlay) {
            overlay.style.background = '';
        }
    };

    // ==========================================
    // CONSOLE COMMANDS (Debug)
    // ==========================================
    window.sc3d = {
        god: () => {
            if (player) {
                player.health = 9999;
                player.maxHealth = 9999;
                player.shadowPower = 9999;
            }
            console.log('God mode activated');
        },
        noclip: () => {
            // Toggle collision
            console.log('Noclip toggled');
        },
        level: (n) => {
            if (n >= 0 && n < CONFIG.LEVELS.length) {
                startLevel(n);
            }
        },
        shards: (n) => {
            GameState.shards = n || 100;
            document.getElementById('shards-count').textContent = GameState.shards;
        },
        killall: () => {
            for (const enemy of enemies) {
                enemy.takeDamage(999);
            }
        },
        spawn: (type) => {
            if (player) {
                const enemy = new Enemy(type || 'GUARD', player.position.clone().add(new THREE.Vector3(0, 0, 5)));
                enemies.push(enemy);
            }
        },
        stats: () => {
            console.table(GameState.stats);
            console.table(GameState.upgrades);
        },
        save: () => saveSystem.save(),
        load: () => saveSystem.load()
    };

    // ==========================================
    // PERFORMANCE MONITORING
    // ==========================================
    let fps = 0;
    let frameCount = 0;
    let lastFpsTime = 0;

    function updateFPS() {
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFpsTime = now;
        }
    }

    // ==========================================
    // EXTENDED UPDATE LOOP
    // ==========================================
    const originalAnimate = animate;
    animate = function() {
        const dt = Math.min(clock.getDelta(), 0.1);
        const time = clock.getElapsedTime();
        
        // Update systems
        particleSystem.update(dt);
        screenEffects.update(dt);
        weatherSystem.update(dt);
        updateFPS();
        
        if (GameState.isPlaying && !GameState.isPaused && !GameState.isGameOver) {
            // Update achievements
            achievementSystem.checkAchievements();
            
            // Track level stats
            if (player) {
                if (player.isDetected && !achievementSystem.detectedThisLevel) {
                    achievementSystem.detectedThisLevel = true;
                }
            }
            
            // Apply screen effects
            if (camera) {
                screenEffects.applyToCamera(camera);
            }
            
            // Auto-save at checkpoints
            if (Math.floor(time) % 60 === 0 && Math.floor(time) > 0) {
                saveSystem.save();
            }
        }
        
        // Call original animation
        requestAnimationFrame(animate);
        
        if (GameState.isPlaying && !GameState.isPaused && !GameState.isGameOver) {
            if (player) player.update(dt);
            for (const enemy of enemies) enemy.update(dt);
            updateItems(dt, time);
        }
        
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    };

    // ==========================================
    // INITIALIZATION EXTENSIONS
    // ==========================================
    const originalInit = init;
    init = function() {
        // Check for saved game
        if (saveSystem.hasSave()) {
            console.log('Save data found. Use sc3d.load() to load it.');
        }
        
        // Call original init
        originalInit();
        
        // Additional setup
        console.log('%c Shadow Crawler 3D ', 'background: linear-gradient(135deg, #ff0040, #8b00ff); color: white; font-size: 20px; padding: 10px;');
        console.log('Debug commands available: sc3d.god(), sc3d.level(n), sc3d.shards(n), sc3d.killall(), sc3d.stats()');
    };

    // ==========================================
    // MOBILE SUPPORT
    // ==========================================
    function setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Create mobile UI
            const mobileControls = document.createElement('div');
            mobileControls.id = 'mobile-controls';
            mobileControls.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 1000;
                display: flex;
                gap: 10px;
            `;
            
            // D-pad
            const dpad = document.createElement('div');
            dpad.style.cssText = `
                display: grid;
                grid-template-columns: repeat(3, 60px);
                grid-template-rows: repeat(3, 60px);
            `;
            
            const buttons = [
                { pos: '2 / 1', key: 'ArrowUp', icon: '▲' },
                { pos: '1 / 2', key: 'ArrowLeft', icon: '◀' },
                { pos: '2 / 2', key: '', icon: '●' },
                { pos: '2 / 3', key: 'ArrowRight', icon: '▶' },
                { pos: '3 / 2', key: 'ArrowDown', icon: '▼' }
            ];
            
            for (const btn of buttons) {
                const button = document.createElement('button');
                button.style.cssText = `
                    grid-area: ${btn.pos};
                    width: 60px;
                    height: 60px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 10px;
                    color: white;
                    font-size: 20px;
                    touch-action: none;
                `;
                button.textContent = btn.icon;
                
                if (btn.key) {
                    button.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        Input.keys[btn.key] = true;
                    });
                    button.addEventListener('touchend', (e) => {
                        e.preventDefault();
                        Input.keys[btn.key] = false;
                    });
                }
                
                dpad.appendChild(button);
            }
            
            mobileControls.appendChild(dpad);
            document.body.appendChild(mobileControls);
            
            // Action buttons
            const actionControls = document.createElement('div');
            actionControls.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            
            const actionBtn = document.createElement('button');
            actionBtn.textContent = '⚔️';
            actionBtn.style.cssText = `
                width: 80px;
                height: 80px;
                background: rgba(255, 0, 64, 0.3);
                border: 2px solid #ff0040;
                border-radius: 50%;
                font-size: 30px;
            `;
            actionBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (player) player.attack();
            });
            
            actionControls.appendChild(actionBtn);
            document.body.appendChild(actionControls);
        }
    }

    // ==========================================
    // ERROR HANDLING
    // ==========================================
    window.addEventListener('error', (e) => {
        console.error('Game error:', e.error);
        
        // Show user-friendly error
        if (!document.getElementById('error-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'error-overlay';
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                color: white;
                font-family: Inter, sans-serif;
                text-align: center;
                padding: 20px;
            `;
            overlay.innerHTML = `
                <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
                <h2 style="margin-bottom: 10px;">Something went wrong</h2>
                <p style="opacity: 0.7; margin-bottom: 20px;">The game encountered an error. Try refreshing the page.</p>
                <button onclick="location.reload()" style="
                    padding: 12px 30px;
                    background: linear-gradient(135deg, #ff0040, #8b00ff);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                ">Reload Game</button>
            `;
            document.body.appendChild(overlay);
        }
    });

    // ==========================================
    // CLEANUP ON EXIT
    // ==========================================
    window.addEventListener('beforeunload', () => {
        if (GameState.isPlaying) {
            saveSystem.save();
        }
    });
