# Cursed Objects - Anthology Horror Game

A fully playable point-and-click horror game featuring 10 episodes, each focusing on a different cursed object.

## Game Structure

```
games/cursed-objects/
├── cursed-objects.html      # Main game HTML file
├── cursed-objects.js        # Complete game engine + all 10 episodes (4000+ lines)
├── README.md                # This file
└── assets/
    ├── episodes/            # Episode-specific assets
    │   ├── ep1/             # The VHS Tape
    │   ├── ep2/             # The Doll
    │   ├── ep3/             # The Mirror
    │   ├── ep4/             # The Camera
    │   ├── ep5/             # The Music Box
    │   ├── ep6/             # The Painting
    │   ├── ep7/             # The Smartphone
    │   ├── ep8/             # The Car
    │   ├── ep9/             # The House
    │   └── ep10/            # The Collection (Finale)
    ├── ui/                  # UI assets
    └── audio/               # Audio assets (optional - uses procedural audio)
```

## Features

### All 10 Episodes Fully Playable

1. **The VHS Tape** - 7 days mechanic, copying curse
2. **The Doll** - Moving doll, possession attempts
3. **The Mirror** - Reflection changes, future visions
4. **The Camera** - Predicting deaths, intervention
5. **The Music Box** - Timed puzzle, spirits
6. **The Painting** - Changing picture investigation
7. **The Smartphone** - Text messages from the dead
8. **The Car** - Endless highway, escape puzzle
9. **The House** - Smart home becomes hostile
10. **The Collection** - Finale combining all objects

### Episode Structure
Each episode includes:
- **3 Acts** with 3-5 scenes each
- **Unique puzzles** (combinations, item usage, dialogue choices)
- **Multiple endings** per episode (5 each = 50 total endings)
- **30-60 minutes** gameplay each

### Game Systems

#### Scene System
- Scene manager with smooth transitions
- Clickable hotspots on each scene
- Object examination system
- Item pickup and usage

#### Inventory System
- 8-slot inventory
- Item combining (context-sensitive)
- Using items on hotspots
- Tooltips and descriptions

#### Sanity System
- Visual distortions at low sanity
- False clues/hallucinations
- Audio whispers
- Screen effects (vignette, scanlines, noise)

#### Save System
- Auto-save at checkpoints
- 5 manual save slots
- Episode completion tracking
- Export/Import functionality

#### Dialogue System
- Typewriter text effect
- Multiple choice conversations
- Branching narrative paths
- Character portraits (placeholder ready)

## How to Play

1. Open `cursed-objects.html` in a web browser
2. Select "New Game" or "Episode Select"
3. Click on hotspots to interact
4. Right-click for action menu (Examine, Take, Use, Talk)
5. Manage your sanity - don't let it drop too low!
6. Complete episodes to unlock the finale

### Controls

- **Left Click**: Interact with hotspots, advance dialogue
- **Right Click**: Open action menu
- **ESC**: Pause menu
- **Inventory**: Click items to select, click again to deselect

## Integration

This game integrates with:
- **GameUtils** - Shared game utilities (pause, settings, stats)
- **HorrorAudio** - Procedural horror audio engine
- **UniversalGameSystem** - Achievements and daily challenges (if available)

## Technical Details

- **Canvas-based rendering** with atmospheric lighting effects
- **Responsive design** works on desktop and mobile
- **Web Audio API** for procedural sound generation
- **LocalStorage** for save data
- **No external dependencies** except shared game utilities

## Game Version

Current Version: 1.0.0

## Save Data Format

Saves are stored in LocalStorage with the key `cursed_objects_save_{slot}`

## Credits

Created for ScaryGamesAI - An anthology horror experience inspired by:
- The Ring (Ringu)
- Ju-On (The Grudge)
- Creepypasta classics
- Point-and-click adventure games
