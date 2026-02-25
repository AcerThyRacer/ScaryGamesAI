let engine;
let player;
let levelManager;
let lighting;
let sanity;
let stalker;
let inventory;
let wardenBoss;

let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, VICTORY

function init() {
    document.getElementById('btn-start').addEventListener('click', startGame);
}

function startGame() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('sanity-meter').classList.remove('hidden');
    document.getElementById('inventory-ui').classList.remove('hidden');
    
    engine = new Engine('gameCanvas');
    player = new Player(100, 400);
    levelManager = new LevelManager();
    lighting = new LightingSystem();
    sanity = new SanitySystem();
    stalker = new StalkerAI(600, 470, 2); // Start stalker in room 2
    inventory = new InventorySystem();
    wardenBoss = new WardenBoss(600, 350);
    
    gameState = 'PLAYING';
    engine.start(update, draw);
}

function update(deltaTime) {
    if (gameState !== 'PLAYING') return;

    const currentRoom = levelManager.getCurrentRoom();
    const hidingSpot = levelManager.getHidingSpot(player);
    const nearbyItem = levelManager.getNearbyItem(player);
    const nearbyDoor = levelManager.getNearbyDoor(player);
    
    // Check ending
    if (levelManager.currentRoomId === 5) {
        gameState = 'VICTORY';
        alert("You survived the darkness.\nTRUE ENDING UNLOCKED.");
        location.reload();
        return;
    }

    // Boss Activation
    if (levelManager.currentRoomId === 4 && !wardenBoss.active && wardenBoss.health > 0) {
        wardenBoss.start();
        // Lock door behind player
        currentRoom.exits.left = undefined;
    }

    // Trap interaction
    if (currentRoom.traps) {
        for (const trap of currentRoom.traps) {
            if (trap.active && engine.checkCollision(player, trap)) {
                // Check if boss is near trap to stun
                if (wardenBoss.active && engine.checkCollision(wardenBoss, { x: trap.x - 50, y: trap.y - 200, width: 100, height: 200 })) {
                    wardenBoss.takeDamage();
                    trap.active = false;
                    setTimeout(() => { trap.active = true; }, 5000); // Reactivate after 5s
                }
            }
        }
    }
    
    // UI Prompt
    const prompt = document.getElementById('interaction-prompt');
    if (hidingSpot) {
        prompt.classList.remove('hidden');
        prompt.innerText = player.isHidden ? "Press [E] to Exit" : "Press [E] to Hide";
    } else if (nearbyItem) {
        prompt.classList.remove('hidden');
        prompt.innerText = "Press [E] to Pick Up";
    } else if (nearbyDoor && nearbyDoor.locked) {
        prompt.classList.remove('hidden');
        prompt.innerText = "Press [E] to Unlock Door";
    } else {
        prompt.classList.add('hidden');
    }

    // Handle E interactions
    if (engine.keys['KeyE']) {
        if (!this.ePressedGlobal) {
            this.ePressedGlobal = true;
            if (nearbyItem && !player.isHidden) {
                if (nearbyItem.item.type === 'lore') {
                    inventory.readLore(nearbyItem.item.loreId);
                } else {
                    inventory.addItem(nearbyItem.item.type);
                }
                levelManager.removeItem(nearbyItem.index);
            } else if (nearbyDoor && nearbyDoor.locked && !player.isHidden) {
                if (inventory.hasKey()) {
                    inventory.useKey();
                    nearbyDoor.locked = false;
                } else {
                    // Need key message
                    prompt.innerText = "Door is Locked. Need a Key.";
                }
            }
        }
    } else {
        this.ePressedGlobal = false;
    }
    
    inventory.handleInput(engine, lighting, sanity);
    
    player.update(engine, deltaTime, currentRoom.colliders, hidingSpot);
    levelManager.checkTransitions(player);
    
    // Check collision with locked doors
    for (const door of currentRoom.doors) {
        if (door.locked || door.isBossDoor) { // Allow passing boss door if unlocked
            // Simple blocking
            if (player.x + player.width > door.x && player.x < door.x) {
                player.x = door.x - player.width;
            }
        }
    }
    
    // Check Hazards
    if (levelManager.checkHazards(player)) {
        gameOver("You fell to your doom...");
        return;
    }
    
    // Update Stalker
    const stalkerResult = stalker.update(deltaTime, player, levelManager.currentRoomId, levelManager);
    if (stalkerResult === "CAUGHT") {
        gameOver("The Stalker caught you...");
        return;
    }

    // Update Boss
    if (levelManager.currentRoomId === 4) {
        const bossResult = wardenBoss.update(deltaTime, player, currentRoom);
        if (bossResult === "CAUGHT") {
            gameOver("The Warden crushed you...");
            return;
        } else if (bossResult === "DEFEATED") {
            wardenBoss.active = false;
            // Open exit door
            // Already handled by transition logic if right exit exists
        }
    }
    
    lighting.update(deltaTime, engine);
    
    // Check if player is in darkness (flashlight off)
    sanity.update(deltaTime, !lighting.flashlightOn);
    
    // Check death condition
    if (sanity.currentSanity <= 0) {
        gameOver("Your mind has collapsed into the void...");
    }
}

function draw(ctx) {
    if (gameState !== 'PLAYING') return;

    // Clear canvas
    ctx.clearRect(0, 0, engine.width, engine.height);
    
    // Draw world
    levelManager.draw(ctx);
    
    // Draw entities
    player.draw(ctx);
    stalker.draw(ctx, levelManager.currentRoomId);
    
    if (levelManager.currentRoomId === 4) {
        wardenBoss.draw(ctx);
    }
    
    // Draw lighting (must be last to mask out shadows)
    lighting.draw(ctx, player);
}

function gameOver(reason) {
    gameState = 'GAMEOVER';
    alert("GAME OVER\n" + reason);
    location.reload();
}

// Start
window.onload = init;
