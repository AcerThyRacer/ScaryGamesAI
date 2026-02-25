class StalkerAI {
    constructor(x, y, startingRoom) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 80;
        this.speed = 80;
        this.currentRoom = startingRoom;
        
        this.state = 'PATROL'; // PATROL, CHASE
        this.direction = 1; // 1 = right, -1 = left
        this.patrolTimer = 0;
    }

    update(deltaTime, player, currentRoomId, levelManager) {
        // If stalker is not in the same room, maybe it randomly moves rooms
        if (this.currentRoom !== currentRoomId) {
            // Simplified room roaming
            if (Math.random() < 0.005) { // Slow room switch
                // Move towards player's room (cheat a bit for tension)
                if (this.currentRoom < currentRoomId) this.currentRoom++;
                else if (this.currentRoom > currentRoomId) this.currentRoom--;
                
                // Spawn on appropriate side
                if (this.currentRoom === currentRoomId) {
                    this.y = 470;
                    this.x = this.currentRoom < currentRoomId ? 50 : 700;
                }
            }
            return;
        }

        const room = levelManager.rooms[this.currentRoom];
        
        // Line of sight check (simple X distance and no walls in between)
        const distToPlayerX = player.x - this.x;
        const distToPlayerY = player.y - this.y;
        const distance = Math.sqrt(distToPlayerX**2 + distToPlayerY**2);
        
        // Can see player if close, looking at them, and player is not hidden
        const isLookingAtPlayer = (this.direction === 1 && distToPlayerX > 0) || (this.direction === -1 && distToPlayerX < 0);
        
        if (distance < 300 && isLookingAtPlayer && !player.isHidden) {
            this.state = 'CHASE';
        } else if (distance > 400 || player.isHidden) {
            this.state = 'PATROL';
        }

        if (this.state === 'CHASE') {
            this.direction = distToPlayerX > 0 ? 1 : -1;
            this.x += this.direction * this.speed * 1.5 * deltaTime; // Runs faster
            
            // Check kill
            if (distance < 30) {
                return "CAUGHT"; // Signal main loop player is dead
            }
        } else if (this.state === 'PATROL') {
            this.x += this.direction * this.speed * deltaTime;
            
            this.patrolTimer -= deltaTime;
            if (this.patrolTimer <= 0) {
                this.direction *= -1; // Turn around
                this.patrolTimer = 2 + Math.random() * 3; // Patrol for 2-5 seconds
            }

            // Keep in bounds
            if (this.x < 0) {
                this.x = 0;
                this.direction = 1;
            } else if (this.x + this.width > 800) {
                this.x = 800 - this.width;
                this.direction = -1;
            }
        }
        
        // Very simple gravity for stalker
        this.y += 900 * deltaTime;
        for (const col of room.colliders) {
            // Simplified AABB for stalker
            if (this.x < col.x + col.width && this.x + this.width > col.x &&
                this.y < col.y + col.height && this.y + this.height > col.y) {
                // Just push up
                this.y = col.y - this.height;
            }
        }
    }

    draw(ctx, currentRoomId) {
        if (this.currentRoom !== currentRoomId) return;

        // Draw shadow-like creature
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Glowing red eyes
        ctx.fillStyle = '#ff0000';
        const eyeY = this.y + 15;
        if (this.direction === 1) {
            ctx.fillRect(this.x + 25, eyeY, 6, 6);
        } else {
            ctx.fillRect(this.x + 5, eyeY, 6, 6);
        }
    }
}
