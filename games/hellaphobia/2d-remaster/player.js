class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 60;
        
        this.vx = 0;
        this.vy = 0;
        this.speed = 200;
        this.jumpForce = -400;
        
        this.isGrounded = false;
        this.isCrouching = false;
        this.isHidden = false;
        
        this.normalHeight = 60;
        this.crouchHeight = 30;
        
        this.facingRight = true;
    }

    update(engine, deltaTime, colliders, hidingSpot) {
        // Hiding logic
        if (hidingSpot && engine.keys['KeyE']) {
            if (!this.ePressed) {
                this.isHidden = !this.isHidden;
                this.ePressed = true;
                
                if (this.isHidden) {
                    this.vx = 0;
                    this.vy = 0;
                    // Snap to hiding spot center
                    this.x = hidingSpot.x + hidingSpot.width / 2 - this.width / 2;
                }
            }
        } else {
            this.ePressed = false;
        }

        if (this.isHidden) return; // Can't move while hidden

        // Input handling
        if (engine.keys['ArrowLeft'] || engine.keys['KeyA']) {
            this.vx = -this.speed;
            this.facingRight = false;
        } else if (engine.keys['ArrowRight'] || engine.keys['KeyD']) {
            this.vx = this.speed;
            this.facingRight = true;
        } else {
            this.vx = 0;
        }

        // Crouching
        if (engine.keys['ArrowDown'] || engine.keys['KeyS']) {
            if (!this.isCrouching) {
                this.isCrouching = true;
                this.height = this.crouchHeight;
                this.y += (this.normalHeight - this.crouchHeight);
                this.speed = 100;
            }
        } else {
            if (this.isCrouching) {
                // Check if we can stand up (no ceiling above)
                const canStand = true; // Simplified for now
                if (canStand) {
                    this.isCrouching = false;
                    this.y -= (this.normalHeight - this.crouchHeight);
                    this.height = this.normalHeight;
                    this.speed = 200;
                }
            }
        }

        // Jumping
        if ((engine.keys['ArrowUp'] || engine.keys['KeyW'] || engine.keys['Space']) && this.isGrounded && !this.isCrouching) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
        }

        // Apply gravity
        this.vy += engine.gravity * deltaTime;

        // Apply velocities
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Collision logic
        this.isGrounded = false;
        for (const collider of colliders) {
            if (engine.checkCollision(this, collider)) {
                engine.resolveCollision(this, collider);
            }
        }

        // Level boundaries (Room transitions are handled in level-manager)
        if (this.x < 0) this.x = 0; // Prevent leaving left side unless transitioning
        if (this.x + this.width > 800) this.x = 800 - this.width;
        if (this.y + this.height > 600) {
            this.y = 600 - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }
    }

    draw(ctx) {
        if (this.isHidden) return;

        ctx.fillStyle = '#aa0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw eyes
        ctx.fillStyle = '#fff';
        const eyeY = this.y + 10;
        if (this.facingRight) {
            ctx.fillRect(this.x + 20, eyeY, 5, 5);
        } else {
            ctx.fillRect(this.x + 5, eyeY, 5, 5);
        }
    }
}
