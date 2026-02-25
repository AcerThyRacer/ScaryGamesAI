/**
 * Enhanced Movement System for Hellaphobia
 * Phase 1: Core Gameplay Overhaul
 * 
 * Features:
 * - Momentum-based physics
 * - Wall jumping/clinging
 * - Slide mechanic
 * - Air control
 * - Crouch/crawl
 */

export class EnhancedMovementSystem {
    constructor(player, options = {}) {
        this.player = player;
        
        // Movement constants
        this.constants = {
            ACCELERATION: 1200,
            DECELERATION: 800,
            MAX_SPEED: 300,
            AIR_CONTROL: 0.6,
            WALL_JUMP_FORCE: { x: 400, y: -550 },
            SLIDE_DURATION: 0.8,
            CROUCH_SPEED: 100,
            GRAVITY: 9.81,
            JUMP_FORCE: 400,
            DOUBLE_JUMP_FORCE: 350,
            WALL_SLIDE_GRAVITY: 3.0
        };
        
        // State machine
        this.state = {
            current: 'idle',
            previous: null,
            onGround: false,
            onWall: false,
            wallSide: 0, // -1 left, 1 right
            isSliding: false,
            slideTimer: 0,
            isCrouching: false,
            canDoubleJump: false,
            jumpCount: 0,
            maxJumps: 2
        };
        
        // Velocity
        this.velocity = {
            x: 0,
            y: 0,
            z: 0
        };
        
        // Input buffer
        this.inputBuffer = {
            jump: false,
            crouch: false,
            sprint: false
        };
    }
    
    /**
     * Update movement state
     */
    update(deltaTime, input) {
        // Handle state transitions
        this.handleStateTransitions(input);
        
        // Apply gravity
        this.applyGravity(deltaTime);
        
        // Process movement input
        this.processMovementInput(input, deltaTime);
        
        // Handle wall interactions
        this.handleWallInteractions();
        
        // Apply friction/deceleration
        this.applyFriction(deltaTime);
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Update state
        this.updateState();
    }
    
    /**
     * Handle state machine transitions
     */
    handleStateTransitions(input) {
        const prevState = this.state.current;
        
        if (!this.state.onGround && !this.state.onWall) {
            this.state.current = 'falling';
        } else if (!this.state.onGround && this.state.onWall) {
            this.state.current = 'wall_sliding';
        } else if (this.state.isSliding) {
            this.state.current = 'sliding';
        } else if (this.state.isCrouching) {
            this.state.current = 'crouching';
        } else if (Math.abs(this.velocity.x) > 10 || Math.abs(this.velocity.z) > 10) {
            this.state.current = input.sprint ? 'running' : 'walking';
        } else {
            this.state.current = 'idle';
        }
        
        if (prevState !== this.state.current) {
            this.onStateChange(prevState, this.state.current);
        }
    }
    
    /**
     * Apply gravity to velocity
     */
    applyGravity(deltaTime) {
        if (this.state.onGround) {
            this.velocity.y = 0;
            return;
        }
        
        let gravity = this.constants.GRAVITY * 100;
        
        // Reduced gravity when wall sliding
        if (this.state.onWall && this.state.current === 'wall_sliding') {
            gravity = this.constants.WALL_SLIDE_GRAVITY * 100;
        }
        
        this.velocity.y -= gravity * deltaTime;
    }
    
    /**
     * Process movement input
     */
    processMovementInput(input, deltaTime) {
        const acceleration = this.constants.ACCELERATION;
        const maxSpeed = input.sprint ? this.constants.MAX_SPEED * 1.5 : this.constants.MAX_SPEED;
        
        // Calculate movement direction
        let moveX = 0;
        let moveZ = 0;
        
        if (input.forward) moveZ -= 1;
        if (input.backward) moveZ += 1;
        if (input.left) moveX -= 1;
        if (input.right) moveX += 1;
        
        // Normalize diagonal movement
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 0) {
            moveX /= length;
            moveZ /= length;
        }
        
        // Rotate by camera rotation
        const cos = Math.cos(input.rotationY);
        const sin = Math.sin(input.rotationY);
        const rotatedX = moveX * cos - moveZ * sin;
        const rotatedZ = moveX * sin + moveZ * cos;
        
        // Apply acceleration (reduced in air)
        const controlMultiplier = this.state.onGround ? 1.0 : this.constants.AIR_CONTROL;
        
        if (rotatedX !== 0 || rotatedZ !== 0) {
            this.velocity.x += rotatedX * acceleration * controlMultiplier * deltaTime;
            this.velocity.z += rotatedZ * acceleration * controlMultiplier * deltaTime;
        }
        
        // Clamp to max speed
        const horizontalSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if (horizontalSpeed > maxSpeed) {
            const ratio = maxSpeed / horizontalSpeed;
            this.velocity.x *= ratio;
            this.velocity.z *= ratio;
        }
        
        // Handle jump
        if (input.jump && !this.inputBuffer.jump) {
            this.handleJump();
        }
        this.inputBuffer.jump = input.jump;
        
        // Handle crouch
        if (input.crouch && !this.state.onGround === false) {
            this.state.isCrouching = true;
        } else if (!input.crouch) {
            this.state.isCrouching = false;
        }
    }
    
    /**
     * Handle jump action
     */
    handleJump() {
        if (this.state.onGround) {
            // Normal jump
            this.velocity.y = this.constants.JUMP_FORCE;
            this.state.onGround = false;
            this.state.jumpCount = 1;
            this.state.canDoubleJump = true;
        } else if (this.state.onWall && this.state.current === 'wall_sliding') {
            // Wall jump
            this.velocity.y = this.constants.WALL_JUMP_FORCE.y;
            this.velocity.x = -this.state.wallSide * this.constants.WALL_JUMP_FORCE.x;
            this.state.onWall = false;
        } else if (this.state.jumpCount < this.state.maxJumps && this.state.canDoubleJump) {
            // Double jump
            this.velocity.y = this.constants.DOUBLE_JUMP_FORCE;
            this.state.jumpCount++;
            this.state.canDoubleJump = false;
        }
    }
    
    /**
     * Handle wall interactions
     */
    handleWallInteractions() {
        // Raycast to detect walls
        const wallDetection = this.detectWall();
        this.state.onWall = wallDetection.detected;
        this.state.wallSide = wallDetection.side;
    }
    
    /**
     * Detect wall using raycast
     */
    detectWall() {
        // Simplified wall detection
        // In full implementation, use raycasting against level geometry
        return {
            detected: false,
            side: 0
        };
    }
    
    /**
     * Apply friction/deceleration
     */
    applyFriction(deltaTime) {
        const friction = this.constants.DECELERATION;
        
        if (this.state.onGround) {
            // Ground friction
            this.velocity.x -= this.velocity.x * friction * deltaTime;
            this.velocity.z -= this.velocity.z * friction * deltaTime;
        } else {
            // Air resistance (minimal)
            this.velocity.x *= 0.99;
            this.velocity.z *= 0.99;
        }
        
        // Stop completely if very slow
        if (Math.abs(this.velocity.x) < 1) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 1) this.velocity.z = 0;
    }
    
    /**
     * Update position based on velocity
     */
    updatePosition(deltaTime) {
        // Integrate velocity
        this.player.position.x += this.velocity.x * deltaTime;
        this.player.position.y += this.velocity.y * deltaTime;
        this.player.position.z += this.velocity.z * deltaTime;
        
        // Collision detection would happen here
        this.checkCollisions();
    }
    
    /**
     * Check collisions with environment
     */
    checkCollisions() {
        // Simplified collision
        // In full implementation: AABB or capsule collision against level
        
        // Floor collision
        if (this.player.position.y < 1.6) {
            this.player.position.y = 1.6;
            this.velocity.y = 0;
            this.state.onGround = true;
            this.state.jumpCount = 0;
        }
    }
    
    /**
     * Update internal state
     */
    updateState() {
        // Update slide timer
        if (this.state.isSliding) {
            this.state.slideTimer -= 0.016;
            if (this.state.slideTimer <= 0) {
                this.state.isSliding = false;
            }
        }
    }
    
    /**
     * Called when state changes
     */
    onStateChange(from, to) {
        console.log(`Movement state: ${from} → ${to}`);
        
        // Trigger animations, sounds, etc.
        switch(to) {
            case 'jumping':
                this.playAnimation('jump');
                break;
            case 'landing':
                this.playAnimation('land');
                break;
            case 'sliding':
                this.playAnimation('slide_start');
                break;
        }
    }
    
    /**
     * Play animation (placeholder)
     */
    playAnimation(animName) {
        // In full implementation, trigger sprite/3D animation
    }
    
    /**
     * Start slide
     */
    startSlide() {
        if (this.state.current === 'running' && this.inputBuffer.crouch) {
            this.state.isSliding = true;
            this.state.slideTimer = this.constants.SLIDE_DURATION;
            
            // Boost forward velocity
            const forwardBoost = 200;
            this.velocity.x *= 1.5;
            this.velocity.z *= 1.5;
        }
    }
    
    /**
     * Get current state for rendering
     */
    getState() {
        return {
            ...this.state,
            velocity: { ...this.velocity },
            position: { ...this.player.position }
        };
    }
}
