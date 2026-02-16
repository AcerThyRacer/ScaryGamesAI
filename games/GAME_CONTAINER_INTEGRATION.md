# Unified Game Container Integration Guide

This guide shows how to integrate the Unified Game Container into any ScaryGamesAI game.

## Quick Start

### 1. Include the Files

Add to your game's `index.html`:

```html
<head>
  <!-- ... other styles ... -->
  <link rel="stylesheet" href="/css/game-container.css">
</head>
<body>
  <!-- Your game content -->
  
  <!-- Scripts -->
  <script src="/js/unified-game-container.js"></script>
  <script src="game.js"></script>
</body>
```

### 2. Basic Setup

In your `game.js`:

```javascript
// Create game container
const container = new GameContainer({
  gameId: 'backrooms-pacman',
  gameName: 'Backrooms: Pac-Man',
  canvas: document.getElementById('game-canvas'),
  container: document.body,
});

// Set up callbacks
container.onRestart = () => {
  // Reset your game state
  resetGame();
};

container.onExit = () => {
  // Clean up and exit
  window.location.href = '/games.html';
};

container.onSettingsChange = (settings) => {
  // Apply new settings
  applyGraphicsSettings(settings.graphics);
  applyAudioSettings(settings.audio);
};

// Start the game
container.start();
```

### 3. Update Score

```javascript
function onScoreChange(newScore) {
  container.updateScore(newScore);
}

// Or add points
function collectPellet() {
  container.addScore(100);
}
```

### 4. End Game

```javascript
function onPlayerDeath() {
  container.gameOver(container.score);
}

function onLevelComplete() {
  container.victory(container.score);
}
```

## Features

### Pause Menu
- Press `Escape` to pause/resume
- Shows time and score
- Resume, Restart, Settings, Save Replay, Exit buttons
- Click backdrop to resume

### Settings Panel
- **Audio**: Master, Music, SFX volumes; Mute toggle
- **Graphics**: Quality, Shadows, Particles, Screen Shake
- **Controls**: Sensitivity, Invert Y, Key Bindings
- **Accessibility**: Reduce Motion, High Contrast, Color Blind Mode
- **Gameplay**: Difficulty, Show FPS/Timer/Hints

### Replay System
- Auto-records gameplay inputs and states
- Save replays from pause menu
- Ghost replay playback for speedrun comparison
- Export/Import replays as JSON

### Score Submission
- Submits to API (if available)
- Falls back to local storage
- Tracks high scores per game

### Mod Support
- Register custom mods (skins, levels, etc.)
- Enable/disable mods
- Export/Import mods as JSON

## Advanced Usage

### Recording Custom States

```javascript
// Record player position for ghost replay
function gameLoop() {
  container.recordState({
    x: player.x,
    y: player.y,
    z: player.z,
    rotation: player.rotation,
  });
}
```

### Recording Inputs

```javascript
document.addEventListener('keydown', (e) => {
  container.recordInput({
    type: 'keydown',
    code: e.code,
  });
});
```

### Playing Ghost Replays

```javascript
// Get best replay
const ghostReplay = GameReplay.getBestRecording('backrooms-pacman');

// Start playback
GameReplay.startPlayback(ghostReplay, (state) => {
  // Update ghost position
  ghostMesh.position.set(state.x, state.y, state.z);
  ghostMesh.rotation.y = state.rotation;
}, () => {
  console.log('Ghost replay finished');
});
```

### Custom Key Bindings

```javascript
// Check if action key is pressed
document.addEventListener('keydown', (e) => {
  if (container.isActionPressed('jump', e)) {
    player.jump();
  }
  if (container.isActionPressed('interact', e)) {
    player.interact();
  }
});
```

### Access Settings

```javascript
const settings = container.getSettings();

// Use graphics settings
if (settings.graphics.shadows) {
  enableShadows();
}

// Use difficulty setting
switch (settings.gameplay.difficulty) {
  case 'easy': enemySpeed = 0.5; break;
  case 'normal': enemySpeed = 1.0; break;
  case 'hard': enemySpeed = 1.5; break;
  case 'nightmare': enemySpeed = 2.0; break;
}
```

### Mod Integration

```javascript
// Check for custom skins
const customSkin = GameMods.getCustomSkin('backrooms-pacman', 'player');
if (customSkin) {
  player.texture = customSkin.texture;
}

// Listen for mod changes
window.addEventListener('sgai-mods-changed', (e) => {
  console.log('Active mods:', e.detail.activeMods);
  reloadGameAssets();
});
```

## CSS Customization

Override default styles in your game's CSS:

```css
/* Custom pause menu colors */
.pause-menu {
  --accent-red: #ff0000;
}

/* Custom game over screen */
.game-over-title {
  font-family: 'Creepster', cursive;
}

/* Hide specific HUD elements */
.game-hud .game-timer {
  display: none;
}
```

## Full Example

```javascript
// game.js - Complete integration example

let container;
let player, enemies, score;

function init() {
  container = new GameContainer({
    gameId: 'my-game',
    gameName: 'My Scary Game',
    container: document.body,
  });

  container.onRestart = restartGame;
  container.onExit = exitGame;
  container.onSettingsChange = applySettings;
  
  // Load settings
  applySettings(container.getSettings());
  
  // Check for mods
  loadMods();
  
  startGame();
}

function startGame() {
  container.start();
  score = 0;
  spawnPlayer();
  gameLoop();
}

function gameLoop() {
  if (!container.isPaused && !container.isGameOver) {
    updatePlayer();
    updateEnemies();
    checkCollisions();
    
    // Record state for replay
    container.recordState({
      x: player.x,
      y: player.y,
      score: score,
    });
  }
  
  requestAnimationFrame(gameLoop);
}

function onCollectible() {
  container.addScore(100);
}

function onPlayerDeath() {
  container.gameOver(score);
}

function restartGame() {
  score = 0;
  enemies = [];
  startGame();
}

function exitGame() {
  window.location.href = '/games.html';
}

function applySettings(settings) {
  setVolume(settings.audio.masterVolume);
  setQuality(settings.graphics.quality);
  setDifficulty(settings.gameplay.difficulty);
}

function loadMods() {
  const skin = GameMods.getCustomSkin('my-game');
  if (skin) {
    player.setTexture(skin.texture);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
```

## API Reference

### GameContainer

| Method | Description |
|--------|-------------|
| `start()` | Start the game session |
| `pause()` | Pause the game |
| `resume()` | Resume from pause |
| `togglePause()` | Toggle pause state |
| `restart()` | Restart the game |
| `exit()` | Exit to menu |
| `gameOver(score)` | End game with Game Over screen |
| `victory(score)` | End game with Victory screen |
| `updateScore(score)` | Set the current score |
| `addScore(points)` | Add points to current score |
| `recordInput(input)` | Record an input for replay |
| `recordState(state)` | Record game state for ghost replay |
| `getSettings()` | Get current settings object |
| `getBindings()` | Get current key bindings |
| `isActionPressed(action, event)` | Check if action key matches event |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isPaused` | boolean | Game is paused |
| `isGameOver` | boolean | Game has ended |
| `isRunning` | boolean | Game is running |
| `score` | number | Current score |
| `elapsedTime` | number | Time since start (ms) |

### Callbacks

| Callback | Description |
|----------|-------------|
| `onRestart` | Called when restart button clicked |
| `onExit` | Called when exit button clicked |
| `onBeforePause` | Called before pausing |
| `onAfterResume` | Called after resuming |
| `onSettingsChange` | Called when settings change |

### GameReplay

| Method | Description |
|--------|-------------|
| `startRecording(gameId, metadata)` | Start recording |
| `recordInput(input)` | Record input event |
| `recordState(state)` | Record game state |
| `stopRecording(finalScore)` | Stop and save recording |
| `discardRecording()` | Discard current recording |
| `getRecordings(gameId)` | Get all recordings for game |
| `getBestRecording(gameId)` | Get highest scoring replay |
| `deleteRecording(replayId)` | Delete a recording |
| `startPlayback(recording, onState, onComplete)` | Play ghost replay |
| `stopPlayback()` | Stop playback |
| `exportRecording(replayId)` | Export as JSON string |
| `importRecording(jsonStr)` | Import from JSON string |

### GameMods

| Method | Description |
|--------|-------------|
| `registerMod(mod)` | Register a new mod |
| `enableMod(modId)` | Enable a mod |
| `disableMod(modId)` | Disable a mod |
| `deleteMod(modId)` | Delete a mod |
| `getMods(type)` | Get all mods (optionally filtered) |
| `getActiveMods(type)` | Get enabled mods |
| `getCustomSkin(gameId, characterId)` | Get custom skin data |
| `getCustomLevel(gameId, levelId)` | Get custom level data |
| `importMod(jsonStr)` | Import mod from JSON |
| `exportMod(modId)` | Export mod as JSON |

### GameSettings

| Method | Description |
|--------|-------------|
| `get(path)` | Get setting value (e.g., 'audio.masterVolume') |
| `set(path, value)` | Set setting value |
| `getBinding(action)` | Get key code for action |
| `setBinding(action, key)` | Set key binding |
| `getBindingLabel(action)` | Get human-readable key name |
| `reset(category)` | Reset settings to defaults |
| `onChange(callback)` | Listen for setting changes |
