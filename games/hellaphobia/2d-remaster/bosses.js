class WardenBoss {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 150;
        this.health = 3;
        this.maxHealth = 3;
        this.active = false;
        
        this.state = 'IDLE'; // IDLE, WALK, PREPARE_CHARGE, CHARGE, STUNNED
        this.timer = 0;
        this.speed = 50;
        this.chargeSpeed = 300;
        this.direction = -1;
    }

    start() {
        this.active = true;
        this.x = this.startX;
        this.y = this.startY;
        this.health = this.maxHealth;
        this.state = 'IDLE';
        this.timer = 2;
        alert("THE WARDEN HAS AWAKENED!");
    }

    update(deltaTime, player, room) {
        if (!this.active) return null;

        this.timer -= deltaTime;

        // State Machine
        if (this.state === 'IDLE' && this.timer <= 0) {
            this.state = 'WALK';
            this.timer = 2;
            this.direction = player.x > this.x ? 1 : -1;
        } else if (this.state === 'WALK') {
            this.x += this.direction * this.speed * deltaTime;
            if (this.timer <= 0) {
                this.state = 'PREPARE_CHARGE';
                this.timer = 1.5;
            }
        } else if (this.state === 'PREPARE_CHARGE') {
            // Flash red warning
            if (this.timer <= 0) {
                this.state = 'CHARGE';
                this.timer = 1;
                this.direction = player.x > this.x ? 1 : -1;
            }
        } else if (this.state === 'CHARGE') {
            this.x += this.direction * this.chargeSpeed * deltaTime;
            if (this.timer <= 0 || this.x <= 0 || this.x + this.width >= 800) {
                this.state = 'STUNNED';
                this.timer = 3;
            }
        } else if (this.state === 'STUNNED') {
            if (this.timer <= 0) {
                this.state = 'IDLE';
                this.timer = 1;
            }
        }

        // Bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 800) this.x = 800 - this.width;

        // Collision with player
        if (player.x < this.x + this.width && player.x + player.width > this.x &&
            player.y < this.y + this.height && player.y + player.height > this.y) {
            if (this.state !== 'STUNNED') {
                return "CAUGHT";
            }
        }

        // Check traps hitting boss
        if (room.traps) {
            for (const trap of room.traps) {
                if (trap.active) {
                    // Trap falls from ceiling, check overlap
                    const trapHitbox = { x: trap.x - 50, y: 0, width: 100, height: 600 };
                    if (this.x < trapHitbox.x + trapHitbox.width &&
                        this.x + this.width > trapHitbox.x &&
                        this.y < trapHitbox.y + trapHitbox.height &&
                        this.y + this.height > trapHitbox.y) {
                        this.takeDamage();
                        trap.active = false;
                        setTimeout(() => { trap.active = true; }, 5000);
                    }
                }
            }
        }

        return null;
    }

    takeDamage() {
        this.health--;
        this.state = 'STUNNED';
        this.timer = 5;
        
        if (this.health <= 0) {
            this.defeat();
            return "DEFEATED";
        }
        return null;
    }

    defeat() {
        this.active = false;
        alert("THE WARDEN IS DEFEATED!\nThe exit opens...");
    }

    draw(ctx) {
        if (!this.active) return;

        // Color based on state
        if (this.state === 'PREPARE_CHARGE') {
            ctx.fillStyle = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ff0000' : '#880000';
        } else if (this.state === 'STUNNED') {
            ctx.fillStyle = '#444';
        } else {
            ctx.fillStyle = '#550000';
        }

        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Eyes
        ctx.fillStyle = '#ffaa00';
        if (this.direction === 1) {
            ctx.fillRect(this.x + 80, this.y + 20, 10, 10);
        } else {
            ctx.fillRect(this.x + 10, this.y + 20, 10, 10);
        }

        // Health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 20, this.width, 10);
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x, this.y - 20, this.width * (this.health / this.maxHealth), 10);
    }
}
