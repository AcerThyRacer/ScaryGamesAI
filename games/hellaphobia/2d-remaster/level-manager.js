class LevelManager {
    constructor() {
        // Hazards
        this.hazards = [];

        // Hiding spots
        this.hidingSpots = [];
        this.rooms = [];
        this.generateRooms();
    }

    generateRooms() {
        // Room 0: Starting room
        this.rooms.push({
            id: 0,
            color: '#222',
            colliders: [
                { x: 0, y: 550, width: 800, height: 50 }, // Floor
                { x: 300, y: 450, width: 100, height: 20 }, // Platform
                { x: 500, y: 350, width: 100, height: 20 }  // Platform
            ],
            hazards: [],
            hidingSpots: [],
            items: [
                { x: 520, y: 330, width: 15, height: 20, type: 'battery' }
            ],
            doors: [],
            exits: { right: 1 },
            spawnPoints: { left: { x: 50, y: 490 }, right: { x: 700, y: 490 } }
        });

        // Room 1: Hallway
        this.rooms.push({
            id: 1,
            color: '#1a1a1a',
            colliders: [
                { x: 0, y: 550, width: 300, height: 50 }, // Floor part 1
                { x: 400, y: 550, width: 400, height: 50 }, // Floor part 2 (gap)
                { x: 400, y: 400, width: 50, height: 150 } // Wall block
            ],
            hazards: [
                { x: 300, y: 580, width: 100, height: 20, type: 'pit' } // Bottomless pit
            ],
            hidingSpots: [],
            items: [
                { x: 250, y: 530, width: 15, height: 15, type: 'key' }
            ],
            doors: [
                { x: 780, y: 450, width: 20, height: 100, locked: true, requiredKey: true }
            ],
            exits: { left: 0, right: 2 },
            spawnPoints: { left: { x: 50, y: 490 }, right: { x: 700, y: 490 } }
        });
        
        // Room 2: First puzzle/hiding room
        this.rooms.push({
            id: 2,
            color: '#111',
            colliders: [
                { x: 0, y: 550, width: 800, height: 50 }, // Floor
                { x: 200, y: 200, width: 20, height: 350 }, // Tall wall
                { x: 200, y: 200, width: 400, height: 20 }  // Ceiling path
            ],
            hazards: [
                { x: 400, y: 540, width: 100, height: 10, type: 'spikes' } // Spikes
            ],
            hidingSpots: [
                { x: 100, y: 450, width: 50, height: 100 } // Locker
            ],
            items: [
                { x: 300, y: 530, width: 20, height: 20, type: 'lore', loreId: 'note_1' },
                { x: 700, y: 530, width: 15, height: 20, type: 'pill' }
            ],
            doors: [],
            exits: { left: 1, right: 3 },
            spawnPoints: { left: { x: 50, y: 490 }, right: { x: 700, y: 490 } }
        });

        // Room 3: Pre-boss room
        this.rooms.push({
            id: 3,
            color: '#0a0a0a',
            colliders: [
                { x: 0, y: 550, width: 800, height: 50 }, // Floor
            ],
            hazards: [],
            hidingSpots: [],
            items: [
                { x: 400, y: 530, width: 20, height: 20, type: 'lore', loreId: 'note_2' }
            ],
            doors: [
                { x: 780, y: 450, width: 20, height: 100, locked: false, isBossDoor: true }
            ],
            exits: { left: 2 }, // Handled by boss door logic
            spawnPoints: { left: { x: 50, y: 490 }, right: { x: 700, y: 490 } }
        });

        // Room 4: Boss Arena (The Warden)
        this.rooms.push({
            id: 4,
            color: '#1a0505',
            colliders: [
                { x: 0, y: 550, width: 800, height: 50 }, // Floor
                { x: 0, y: 0, width: 20, height: 600 }, // Left Wall
                { x: 780, y: 0, width: 20, height: 600 } // Right Wall
            ],
            hazards: [], // Boss manager injects traps
            hidingSpots: [],
            items: [],
            doors: [
                { x: 20, y: 450, width: 20, height: 100, locked: false, isBossDoor: true } // Back door
            ],
            exits: {}, 
            spawnPoints: { left: { x: 50, y: 490 }, right: { x: 700, y: 490 } }
        });

        // Room 4: Boss Arena (The Warden)
        this.rooms.push({
            id: 4,
            color: '#211',
            colliders: [
                { x: 0, y: 550, width: 800, height: 50 }, // Floor
                { x: 0, y: 0, width: 20, height: 600 }, // Left Wall (Locks)
                { x: 780, y: 0, width: 20, height: 600 } // Right Wall
            ],
            hazards: [],
            hidingSpots: [],
            items: [],
            doors: [],
            traps: [ // Puzzles to hit boss
                { x: 400, y: 530, width: 30, height: 20, active: true } // Pressure plate
            ],
            exits: { right: 5 }, // 5 is ending
            spawnPoints: { left: { x: 50, y: 490 } }
        });

        // Room 5: Ending Room
        this.rooms.push({
            id: 5,
            color: '#fff', // White void
            colliders: [
                { x: 0, y: 550, width: 800, height: 50 }, // Floor
            ],
            hazards: [],
            hidingSpots: [],
            items: [],
            doors: [],
            exits: {},
            spawnPoints: { left: { x: 50, y: 490 } }
        });
    }

    getCurrentRoom() {
        return this.rooms[this.currentRoomId];
    }

    checkTransitions(player) {
        const room = this.getCurrentRoom();
        
        if (player.x > 800 && room.exits.right !== undefined) {
            this.transitionTo(room.exits.right, player, 'left');
        } else if (player.x + player.width < 0 && room.exits.left !== undefined) {
            this.transitionTo(room.exits.left, player, 'right');
        }
        
        // Keep player in bounds if no exit
        if (player.x < 0 && room.exits.left === undefined) player.x = 0;
        if (player.x + player.width > 800 && room.exits.right === undefined) player.x = 800 - player.width;
    }

    checkHazards(player) {
        const room = this.getCurrentRoom();
        for (const hazard of room.hazards) {
            if (hazard.type === 'spikes' || hazard.type === 'pit') {
                if (player.x < hazard.x + hazard.width && player.x + player.width > hazard.x &&
                    player.y < hazard.y + hazard.height && player.y + player.height > hazard.y) {
                    return true; // Dead
                }
            }
        }
        return false;
    }

    getHidingSpot(player) {
        const room = this.getCurrentRoom();
        for (const spot of room.hidingSpots) {
            // Player center must be inside the hiding spot x-bounds
            const px = player.x + player.width / 2;
            if (px > spot.x && px < spot.x + spot.width &&
                player.y < spot.y + spot.height && player.y + player.height > spot.y) {
                return spot;
            }
        }
        return null;
    }

    transitionTo(roomId, player, spawnSide) {
        this.currentRoomId = roomId;
        const newRoom = this.getCurrentRoom();
        const spawn = newRoom.spawnPoints[spawnSide];
        player.x = spawn.x;
        player.y = spawn.y;
        player.vx = 0;
        player.vy = 0;
        
        // Flash screen black for transition
        // (Could add visual effect in main.js)
    }

    draw(ctx) {
        const room = this.getCurrentRoom();
        
        // Draw background
        ctx.fillStyle = room.color;
        ctx.fillRect(0, 0, 800, 600);

        // Draw hiding spots
        ctx.fillStyle = '#111'; // Darker than background
        ctx.strokeStyle = '#444';
        for (const spot of room.hidingSpots) {
            ctx.fillRect(spot.x, spot.y, spot.width, spot.height);
            ctx.strokeRect(spot.x, spot.y, spot.width, spot.height);
        }

        // Draw doors
        for (const door of room.doors) {
            ctx.fillStyle = door.locked ? '#522' : '#252';
            ctx.fillRect(door.x, door.y, door.width, door.height);
            ctx.strokeStyle = '#000';
            ctx.strokeRect(door.x, door.y, door.width, door.height);
        }

        // Draw items
        for (const item of room.items) {
            if (item.type === 'battery') ctx.fillStyle = '#0f0';
            else if (item.type === 'pill') ctx.fillStyle = '#0ff';
            else if (item.type === 'key') ctx.fillStyle = '#fd0';
            else if (item.type === 'lore') ctx.fillStyle = '#fff';
            
            ctx.fillRect(item.x, item.y, item.width, item.height);
        }

        // Draw traps
        if (room.traps) {
            for (const trap of room.traps) {
                ctx.fillStyle = trap.active ? '#f00' : '#400';
                ctx.fillRect(trap.x, trap.y, trap.width, trap.height);
            }
        }

        // Draw colliders
        ctx.fillStyle = '#333';
        for (const col of room.colliders) {
            ctx.fillRect(col.x, col.y, col.width, col.height);
            // Draw brick texture outline
            ctx.strokeStyle = '#222';
            ctx.strokeRect(col.x, col.y, col.width, col.height);
        }

        // Draw hazards
        for (const hazard of room.hazards) {
            if (hazard.type === 'spikes') {
                ctx.fillStyle = '#888';
                for (let i = 0; i < hazard.width; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(hazard.x + i, hazard.y + hazard.height);
                    ctx.lineTo(hazard.x + i + 5, hazard.y);
                    ctx.lineTo(hazard.x + i + 10, hazard.y + hazard.height);
                    ctx.fill();
                }
            } else if (hazard.type === 'pit') {
                // Just an empty void
                ctx.fillStyle = '#000';
                ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
            } else if (hazard.type === 'falling_block') {
                ctx.fillStyle = '#555';
                ctx.fillRect(hazard.x, hazard.y, hazard.width, hazard.height);
            }
        }
    }

    getNearbyItem(player) {
        const room = this.getCurrentRoom();
        for (let i = 0; i < room.items.length; i++) {
            const item = room.items[i];
            if (player.x < item.x + item.width && player.x + player.width > item.x &&
                player.y < item.y + item.height && player.y + player.height > item.y) {
                return { item, index: i };
            }
        }
        return null;
    }

    getNearbyDoor(player) {
        const room = this.getCurrentRoom();
        for (const door of room.doors) {
            // Expand hit box slightly for interaction
            if (player.x < door.x + door.width + 10 && player.x + player.width > door.x - 10 &&
                player.y < door.y + door.height && player.y + player.height > door.y) {
                return door;
            }
        }
        return null;
    }

    removeItem(index) {
        const room = this.getCurrentRoom();
        room.items.splice(index, 1);
    }
}
