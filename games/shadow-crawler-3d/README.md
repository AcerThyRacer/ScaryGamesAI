# Shadow Crawler 3D

A terrifying 3D stealth horror experience built with Three.js. Hide in shadows, evade deadly enemies, and escape the cursed dungeon.

## Overview

Shadow Crawler 3D is a complete first-person stealth horror game featuring procedural dungeon generation, advanced enemy AI with vision cones, a comprehensive stealth system, and atmospheric 3D graphics.

## Features

### Core Gameplay
- **Stealth Mechanics**: Hide in shadows to become nearly invisible to enemies
- **Noise System**: Running makes noise that attracts enemies; crouch to move silently
- **Vision-Based Detection**: Enemies have realistic vision cones and alert states
- **Procedural Dungeons**: Each level is uniquely generated with rooms, corridors, and obstacles

### Enemy Types (5 Unique Enemies)
1. **Guard** - Basic patrol unit with moderate vision
2. **Hunter** - Fast predator that tracks noise
3. **Wraith** - Ethereal being with extended vision range
4. **Beast** - Heavy brute with high damage but shorter vision
5. **Sentinel** - Boss enemy with massive health and long-range detection

### Combat System
- **Stealth Kills**: Eliminate enemies silently from the shadows (3x damage)
- **Direct Combat**: Limited combat options when detected
- **Weapons**:
  - Dagger (standard weapon)
  - Shadow Blade (upgraded weapon with higher damage)
  - Smoke Bombs (create confusion among enemies)
  - Health Potions (restore health)

### Progression
- **10 Procedurally Generated Levels** with increasing difficulty
- **Shadow Shards**: Collectible currency for upgrades
- **Upgrade System**:
  - Shadow Speed: Move faster while hidden
  - Shadow Cloak: Extended invisibility duration
  - Dark Vitality: Increased maximum health
- **Boss Fights**: Every 3 levels feature powerful boss enemies

### Visual Effects
- Dynamic lighting with shadows
- Fog and atmospheric effects
- Particle effects for hits, smoke, and collectibles
- Screen-space shadow overlay when hidden
- Damage flash effects

## Controls

| Key | Action |
|-----|--------|
| **W, A, S, D** | Move |
| **Mouse** | Look around |
| **Shift** | Sprint (drains stamina, makes noise) |
| **C** | Crouch (reduces visibility, quieter) |
| **Space** | Attack |
| **E** | Interact (exits, etc.) |
| **1** | Equip Dagger |
| **2** | Use Smoke Bomb |
| **3** | Use Health Potion |
| **4** | Equip Shadow Blade (if owned) |
| **ESC** | Pause Menu |

## How to Play

1. **Start the Game**: Click "Enter the Darkness" on the title screen
2. **Navigate the Dungeon**: Use WASD to move through procedurally generated levels
3. **Stay Hidden**: Stick to dark areas to avoid detection (indicated by "HIDDEN IN SHADOWS")
4. **Watch Your Noise**: Running makes noise shown by the sound waves indicator
5. **Eliminate Enemies**: Sneak up behind enemies in shadows for instant stealth kills
6. **Collect Shards**: Gather purple shadow shards to purchase upgrades
7. **Find the Exit**: Reach the green glowing exit to complete each level
8. **Upgrade**: Between levels, spend shards on permanent upgrades
9. **Survive**: Make it through all 10 levels to escape the dungeon

## Stealth Mechanics

### Visibility System
- **Light Exposure**: Standing in lit areas makes you fully visible
- **Shadow Hiding**: Dark areas reduce your visibility to 20-50%
- **Crouching**: Reduces visibility by 40%
- **Enemy Vision**: Enemies have different vision ranges and field of view angles

### Detection States
- **Unaware**: Enemy is on normal patrol
- **Suspicious**: Enemy heard noise or briefly saw you (investigating)
- **Alerted**: Enemy has detected you and is actively searching
- **Chasing**: Enemy has confirmed your location and is attacking

### Noise System
- **Crouching**: Minimal noise (0.5 units)
- **Walking**: Moderate noise (2 units)
- **Sprinting**: Loud noise (8 units)
- Noise travels in a radius - enemies within range will investigate

## Enemy AI Behavior

Each enemy type has unique characteristics:

| Enemy | Health | Speed | Vision | Damage | Special |
|-------|--------|-------|--------|--------|---------|
| Guard | 30 | 2.5 | 12 | 15 | Standard patrol |
| Hunter | 45 | 4.0 | 15 | 25 | Tracks noise |
| Wraith | 25 | 3.5 | 18 | 20 | Wide vision cone |
| Beast | 80 | 5.0 | 10 | 35 | High damage |
| Sentinel | 60 | 2.0 | 20 | 30 | Boss enemy |

## Level Structure

| Level | Name | Rooms | Enemies | Shards | Type |
|-------|------|-------|---------|--------|------|
| 1 | The Dungeon | 8 | 5 | 3 | Normal |
| 2 | Cursed Halls | 10 | 7 | 4 | Normal |
| 3 | Whispering Depths | 12 | 9 | 5 | Normal |
| 4 | The Labyrinth | 15 | 12 | 6 | Boss |
| 5 | Shadow Warren | 12 | 10 | 5 | Normal |
| 6 | Blood Chambers | 14 | 12 | 6 | Normal |
| 7 | The Forgotten | 16 | 14 | 7 | Normal |
| 8 | Veil of Darkness | 18 | 16 | 8 | Boss |
| 9 | Eternal Night | 20 | 18 | 8 | Normal |
| 10 | The Abyss | 25 | 25 | 10 | Final |

## Upgrade System

Spend shadow shards between levels to improve your abilities:

### Shadow Speed (⚡)
- Level 1: +10% movement speed in shadows (5 shards)
- Level 2: +20% movement speed (10 shards)
- Level 3: +30% movement speed (15 shards)
- Level 4: +40% movement speed (25 shards)
- Level 5: +50% movement speed (40 shards)

### Shadow Cloak (🌑)
- Extends duration of shadow power abilities
- Reduces visibility in partial light

### Dark Vitality (❤️)
- Each level grants +20 max health
- Applies immediately and persists through levels

## Technical Details

### Built With
- **Three.js r128** - 3D rendering engine
- **Custom Game Engine** - Built specifically for this game
- **Procedural Generation** - Dungeon layout generated algorithmically
- **Web Audio API** - Procedural sound effects via HorrorAudio system

### Browser Requirements
- WebGL support required
- Pointer Lock API for mouse look
- Recommended: Chrome, Edge, or Firefox

### Performance Notes
- Uses instanced meshes for efficient rendering
- Optimized collision detection
- Adjustable graphics quality
- Mobile: Not recommended due to control scheme

## File Structure

```
games/shadow-crawler-3d/
├── shadow-crawler-3d.html    # Main HTML file with UI
├── shadow-crawler-3d.js      # Complete game logic (~2500 lines)
├── README.md                 # This file
└── core/
    └── ShadowCrawler3D.js    # Original skeleton (legacy)
```

## Credits

- **Game Engine**: Custom built for ScaryGamesAI
- **Audio**: HorrorAudio procedural sound system
- **Utilities**: GameUtils shared library

## License

Part of the ScaryGamesAI collection. See project root for licensing information.

---

**Warning**: This game contains horror themes, darkness, and intense audio. Not recommended for players sensitive to these elements.
