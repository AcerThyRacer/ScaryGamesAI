# 🔧 BACKROOMS PACMAN - INTEGRATION GUIDE

## Quick Start: How to Use All New Systems

This guide shows you how to integrate all the newly implemented systems into your main game.

---

## 1️⃣ ADD DEPENDENCIES TO HTML

Update `backrooms-pacman.html` and add these scripts **before** your main game script:

```html
<!-- Core Systems (NEW) -->
<script src="core/EventBus.js"></script>
<script src="core/AssetManager.js"></script>
<script src="core/GameManager.js"></script>
<script src="core/Quadtree.js"></script>

<!-- External Libraries -->
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.0.0/dist/tf.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js"></script>

<!-- Your existing scripts -->
<script src="backrooms-pacman.js"></script>
<script src="wave-function-collapse.js"></script>
<script src="performance-optimizer.js"></script>
<!-- ... all other modules ... -->
```

---

## 2️⃣ INITIALIZE CORE SYSTEMS

In your main `init()` or `startGame()` function, add:

```javascript
// Initialize core systems
AssetManager.init(new THREE.TextureLoader());
GameManager.setConfig({ targetFPS: 60, enableStats: true });
Quadtree.init(200, 200, { maxObjects: 4, maxLevels: 8 });

// Register systems with GameManager (priority: lower = earlier)
GameManager.registerSystem('renderer', Renderer, 1);
GameManager.registerSystem('physics', Physics, 10);
GameManager.registerSystem('ai', AI, 20);
GameManager.registerSystem('audio', Audio, 30);
GameManager.registerSystem('ui', UI, 40);

// Start game loop
GameManager.start();
```

---

## 3️⃣ USE EVENT BUS FOR COMMUNICATION

Replace direct function calls with events:

**Before:**
```javascript
// Tight coupling
SanitySystem.update(delta);
HorrorDirector.onSanityChanged(sanity);
UI.updateSanityBar(sanity);
```

**After:**
```javascript
// Decoupled with EventBus
EventBus.player.on('sanity:changed', function(data) {
    console.log('Sanity changed:', data.amount);
});

// Emit event
EventBus.player.emit('sanity:changed', {
    amount: sanity,
    delta: delta
});
```

**Common Events:**
```javascript
// Player events
EventBus.player.emit('damage', { amount: 10, source: enemy });
EventBus.player.emit('move', { position, rotation });
EventBus.player.emit('ability:use', { abilityId: 'sprint' });

// Enemy events
EventBus.enemy.emit('spawn', { type, position });
EventBus.enemy.emit('defeated', { enemy, points });

// Game events
EventBus.game.emit('state:changed', { from: 'playing', to: 'paused' });
EventBus.game.emit('score', { points: 100 });

// UI events
EventBus.ui.emit('hud:update', { score, time, sanity });
```

---

## 4️⃣ USE ASSET MANAGER

**Load textures:**
```javascript
// Single texture
const texture = await AssetManager.loadTexture('textures/wall.jpg', {
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    anisotropy: 16
});

// Multiple textures
const textures = await AssetManager.loadTextures([
    'textures/floor.jpg',
    'textures/ceiling.jpg'
]);

// Preload assets
await AssetManager.preloadAssets([
    { type: 'texture', url: 'textures/wall.jpg' },
    { type: 'texture', url: 'textures/floor.jpg' },
    { type: 'audio', url: 'audio/ambient.mp3', audioContext: audioCtx }
]);
```

**Get cached geometries:**
```javascript
const boxGeom = AssetManager.getGeometry('box', {
    width: 4,
    height: 3.5,
    depth: 0.5
});

const sphereGeom = AssetManager.getGeometry('sphere', {
    radius: 0.3,
    widthSegments: 8,
    heightSegments: 8
});
```

---

## 5️⃣ USE GPU INSTANCING

**For pellets:**
```javascript
// Collect all pellet positions
const pelletPositions = [];
for (let x = 0; x < mazeWidth; x++) {
    for (let z = 0; z < mazeHeight; z++) {
        if (maze[x][z] === TILE.PELLET) {
            pelletPositions.push({ x: x * 4, y: 0.5, z: z * 4 });
        }
    }
}

// Create instanced mesh
const pelletMesh = PerformanceOptimizer.createInstancedPellets(
    pelletPositions,
    scene
);
```

**For walls:**
```javascript
const wallPositions = [];
for (let x = 0; x < mazeWidth; x++) {
    for (let z = 0; z < mazeHeight; z++) {
        if (maze[x][z] === TILE.WALL) {
            wallPositions.push({
                x: x * 4,
                y: 1.75,
                z: z * 4,
                rotationY: 0
            });
        }
    }
}

const wallMesh = PerformanceOptimizer.createInstancedWalls(
    wallPositions,
    scene
);
```

---

## 6️⃣ USE QUADTREE FOR COLLISIONS

**Initialize with game world:**
```javascript
Quadtree.init(200, 200, {
    maxObjects: 4,
    maxLevels: 8,
    debug: false
});
```

**Insert objects:**
```javascript
// Insert player
Quadtree.insert({
    x: player.x,
    y: player.z,
    width: 1,
    height: 1,
    type: 'player',
    entity: player
});

// Insert enemies
enemies.forEach(enemy => {
    Quadtree.insert({
        x: enemy.x,
        y: enemy.z,
        width: 1,
        height: 1,
        type: 'enemy',
        entity: enemy
    });
});
```

**Query for collisions:**
```javascript
// Find nearby enemies
const nearby = Quadtree.query({
    x: player.x - 5,
    y: player.z - 5,
    width: 10,
    height: 10
});

// Filter to enemies only
const enemies = nearby.filter(obj => obj.type === 'enemy');

// Check actual collisions
enemies.forEach(enemyObj => {
    const distance = player.distanceTo(enemyObj.entity);
    if (distance < 1.0) {
        // Collision detected!
        handleCollision(player, enemyObj.entity);
    }
});
```

**Update positions:**
```javascript
// Update player position in quadtree
Quadtree.updatePosition(playerObj, player.x, player.z);
```

---

## 7️⃣ USE AI LEARNER

**Initialize model:**
```javascript
// Call this in your init function
if (typeof tf !== 'undefined') {
    await AILearner.initModel();
}
```

**Record player positions:**
```javascript
// In your update loop
AILearner.recordPlayerPosition(player.position, Date.now());
```

**Train periodically:**
```javascript
// Train every 30 seconds
setInterval(() => {
    AILearner.trainOnHistory().then(success => {
        if (success) {
            console.log('AI model trained successfully');
        }
    });
}, 30000);
```

**Predict player movement:**
```javascript
// For enemy AI
const predictedPos = AILearner.predictNextPosition(player.position);

// Use prediction for enemy pathfinding
enemy.setTarget(predictedPos);
```

---

## 8️⃣ SETUP MULTIPLAYER

**Client-side:**
```javascript
// Initialize networking
MultiplayerNetwork.init({
    signalingUrl: 'ws://localhost:8080',
    playerName: 'Player1'
});

// Create or join room
MultiplayerNetwork.createHost('my-room', {
    maxPlayers: 8,
    metadata: { difficulty: 'hard' }
});

// Or join existing
MultiplayerNetwork.joinHost('my-room');

// Send player state
MultiplayerNetwork.updatePlayerState({
    position: player.position,
    rotation: player.rotation,
    animation: 'run'
});

// Send game action
MultiplayerNetwork.sendGameAction({
    type: 'ability:use',
    abilityId: 'sprint'
});

// Listen for events
EventBus.on('multiplayer:connected', (data) => {
    console.log('Connected to peer:', data.peerId);
});

EventBus.on('multiplayer:disconnected', (data) => {
    console.log('Peer disconnected:', data.peerId);
});
```

**Voice chat:**
```javascript
// Setup voice
const success = await ProximityVoiceChat.setup();
if (success) {
    console.log('Voice chat ready');
}

// Update proximity volume
function updateVoiceVolumes() {
    const remotePlayers = MultiplayerNetwork.getRemotePlayers();
    remotePlayers.forEach(remote => {
        const distance = player.position.distanceTo(remote.position);
        const volume = Math.max(0, 1 - (distance / 50));
        ProximityVoiceChat.setPlayerVolume(remote.peerId, volume);
    });
}
```

---

## 9️⃣ SUBMIT SCORES

```javascript
// After game ends
const scoreData = {
    player: 'Player1',
    score: 15420,
    time: '2:34.56',
    category: 'speedrun'
};

// Submit to leaderboard
const success = await CommunityModding.submitScore(scoreData);
if (success) {
    console.log('Score submitted!');
}

// Get leaderboard
const leaderboard = await CommunityModding.getLeaderboard('speedrun');
console.log('Top players:', leaderboard.slice(0, 5));
```

---

## 🔟 LOAD MODS

```javascript
// Initialize mod loader
ModLoader.init();

// Load mod from file input
document.getElementById('mod-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    
    try {
        const modData = await ModLoader.extractZip(arrayBuffer);
        await ModLoader.installMod(modData);
        console.log('Mod installed:', modData.manifest.name);
    } catch (error) {
        console.error('Mod installation failed:', error);
    }
});

// Enable mod
ModLoader.enableMod('mod-id');

// Get active mods
const stats = ModLoader.getStats();
console.log('Active mods:', stats.activeMods);
```

---

## 1️⃣1️⃣ USE GAME MANAGER

**Register custom systems:**
```javascript
const CustomSystem = {
    init: function() {
        console.log('Custom system initialized');
    },
    
    start: function() {
        console.log('Custom system started');
    },
    
    update: function(deltaTime, totalTime) {
        // Your update logic
    },
    
    pause: function() {
        console.log('Custom system paused');
    },
    
    resume: function() {
        console.log('Custom system resumed');
    },
    
    stop: function() {
        console.log('Custom system stopped');
    }
};

GameManager.registerSystem('custom', CustomSystem, 50);
```

**Control game loop:**
```javascript
// Pause game
GameManager.pause();

// Resume game
GameManager.resume();

// Get stats
const stats = GameManager.getStats();
console.log('FPS:', stats.fps);
console.log('Frame time:', stats.frameTime);
console.log('System performance:', stats.systems);
```

---

## 🎯 COMPLETE INTEGRATION EXAMPLE

Here's a minimal example putting it all together:

```javascript
// Main game initialization
async function initGame() {
    // Initialize core systems
    AssetManager.init(new THREE.TextureLoader());
    Quadtree.init(200, 200);
    
    // Load assets
    await AssetManager.preloadAssets([
        { type: 'texture', url: 'textures/wall.jpg' },
        { type: 'texture', url: 'textures/floor.jpg' }
    ]);
    
    // Initialize AI
    if (typeof tf !== 'undefined') {
        await AILearner.initModel();
    }
    
    // Initialize multiplayer
    MultiplayerNetwork.init({
        signalingUrl: 'ws://localhost:8080'
    });
    
    // Register systems
    GameManager.registerSystem('renderer', {
        update: function(delta) { render(); }
    }, 1);
    
    GameManager.registerSystem('gameLogic', {
        update: function(delta) { updateGame(delta); }
    }, 10);
    
    GameManager.registerSystem('ai', {
        update: function(delta) { updateAI(delta); }
    }, 20);
    
    // Start game loop
    GameManager.start();
    
    // Generate maze
    const maze = WaveFunctionCollapse.generateMaze(20, 20, {
        addRooms: true
    });
    
    // Create instanced geometry
    createInstancedMaze(maze);
    
    console.log('Game initialized!');
}

function createInstancedMaze(maze) {
    const pelletPositions = [];
    const wallPositions = [];
    
    for (let x = 0; x < maze.length; x++) {
        for (let z = 0; z < maze[x].length; z++) {
            if (maze[x][z] === TILE.PELLET) {
                pelletPositions.push({ x: x * 4, y: 0.5, z: z * 4 });
            } else if (maze[x][z] === TILE.WALL) {
                wallPositions.push({ x: x * 4, y: 1.75, z: z * 4 });
            }
        }
    }
    
    PerformanceOptimizer.createInstancedPellets(pelletPositions, scene);
    PerformanceOptimizer.createInstancedWalls(wallPositions, scene);
}

function updateGame(delta) {
    // Update player
    updatePlayer(delta);
    
    // Record for AI
    AILearner.recordPlayerPosition(player.position, Date.now());
    
    // Update quadtree
    Quadtree.updatePosition(playerQuadObj, player.x, player.z);
    
    // Check collisions
    const nearby = Quadtree.query({
        x: player.x - 5,
        y: player.z - 5,
        width: 10,
        height: 10
    });
    
    // Emit events
    EventBus.player.emit('move', {
        position: player.position,
        velocity: player.velocity
    });
}

function updateAI(delta) {
    // Train AI periodically
    if (Date.now() - lastTraining > 30000) {
        AILearner.trainOnHistory();
        lastTraining = Date.now();
    }
    
    // Update enemies with predictions
    enemies.forEach(enemy => {
        const predicted = AILearner.predictNextPosition(player.position);
        enemy.setTarget(predicted);
    });
}

// Start everything
window.addEventListener('load', initGame);
```

---

## 🚀 SERVER DEPLOYMENT

**Start signaling server:**
```bash
cd games/backrooms-pacman/server
npm install ws express cors
node signaling-server.js
```

**Start leaderboard API:**
```bash
cd games/backrooms-pacman/server
npm install express cors
node leaderboard-api.js
```

**Production with PM2:**
```bash
npm install -g pm2
pm2 start signaling-server.js --name backrooms-signal
pm2 start leaderboard-api.js --name backrooms-leaderboard
pm2 save
pm2 startup
```

---

## ✅ VERIFICATION CHECKLIST

Run through this to verify everything works:

- [ ] EventBus emits and receives events
- [ ] AssetManager loads textures without errors
- [ ] GameManager maintains 60 FPS
- [ ] Quadtree returns nearby objects
- [ ] WFC generates valid mazes
- [ ] GPU instancing shows 1000+ pellets
- [ ] Abilities activate with cooldowns
- [ ] AI model trains without errors
- [ ] Multiplayer connects to signaling server
- [ ] Voice chat captures microphone
- [ ] Leaderboards submit scores
- [ ] Mods extract and load

---

## 🆘 TROUBLESHOOTING

**Problem:** "EventBus is not defined"  
**Solution:** Make sure EventBus.js is loaded before other scripts

**Problem:** GPU instancing not working  
**Solution:** Check `config.rendering.gpuInstancing = true` in performance-optimizer.js

**Problem:** AI model fails to train  
**Solution:** Ensure TensorFlow.js is loaded and playerHistory has 20+ entries

**Problem:** Multiplayer won't connect  
**Solution:** Verify signaling server is running on ws://localhost:8080

**Problem:** Mods won't extract  
**Solution:** Check JSZip library is loaded

---

**Need help?** Check the implementation summary for detailed documentation on each system.

**Generated:** March 6, 2026  
**Status:** ✅ READY FOR INTEGRATION
