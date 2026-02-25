# Hellaphobia Mod Examples

This folder contains comprehensive example mods demonstrating the full capabilities of the Hellaphobia modding system.

## Included Examples

### 1. **Example Monster Pack** (`example-monster-mod.js`)
**Demonstrates:** Custom entity registration, AI behaviors, event hooks, loot drops

Adds 3 new monster types:
- **Shadow Stalker**: Ambush predator that hides in darkness
- **Echo Phantom**: Creates sound decoys to confuse players
- **Nightmare Brute**: Tank enemy with armor and special attacks

**Key Features:**
- Custom AI state machines
- Event-driven spawning
- Unique attack patterns
- Custom loot drops
- Achievement integration

---

### 2. **Visual Enhancement Pack** (`example-visual-mod.js`)
**Demonstrates:** Asset overrides, post-processing shaders, particle systems, texture replacements

Enhances visual quality with:
- Film grain effect
- Chromatic aberration
- Vignette and color grading
- Enhanced blood splatter particles
- HD texture overrides
- Dynamic lighting improvements

**Key Features:**
- Custom fragment shaders
- Particle system configuration
- Texture override system
- Performance monitoring
- Quality settings UI

---

### 3. **Gameplay Overhaul** (`example-gameplay-mod.js`)
**Demonstrates:** Mechanic changes, new abilities, balance adjustments, input handling

Complete gameplay improvements:
- **Wall Running**: Run along walls for 3 seconds
- **Double Jump**: Extra jump in mid-air
- **Slide Mechanic**: Fast sliding under obstacles
- **Combo System**: 4-hit attack combos
- **Parry System**: Timing-based defense
- **Enhanced Sanity**: Progressive hallucinations

**Key Features:**
- New movement abilities
- Combat system extensions
- Sanity mechanic overhaul
- Custom items and power-ups
- Balance adjustments

---

## How to Use These Examples

### Installation

1. **Copy the mod file** you want to test
2. **Place it in your mods folder**: `games/hellaphobia/mods/`
3. **Create a mod.json** configuration file:

```json
{
  "id": "my_custom_mod",
  "name": "My Mod",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What your mod does",
  "scripts": [
    {
      "src": "example-monster-mod.js"
    }
  ],
  "dependencies": []
}
```

4. **Enable the mod** in-game (press F4 to open Mod Manager)
5. **Test your mod** in a level

---

## Mod Structure

Every mod should follow this basic structure:

```javascript
/**
 * MOD METADATA
 */
const MOD_METADATA = {
    id: 'unique_mod_id',
    name: 'Mod Name',
    version: '1.0.0',
    author: 'Author Name',
    description: 'Description'
};

/**
 * INITIALIZATION
 */
(function() {
    'use strict';
    
    // Check for modAPI
    if (typeof modAPI === 'undefined') {
        console.error('[ModName] modAPI not available!');
        return;
    }
    
    const api = modAPI;
    api.log('Initializing mod...');
    
    // Your mod code here
    
})();
```

---

## API Reference

### Core Functions

```javascript
// Register custom entity
api.registerEntity(type, config)

// Register asset
api.registerAsset(type, name, data)

// Override existing asset
api.overrideAsset(targetName, asset)

// Spawn entity
api.spawnEntity(type, x, y, props)

// Event hooks
api.on(event, callback)
api.off(event, callback)
api.emit(event, data)

// Game state (read-only)
api.getGameState()
api.getPlayer()

// Utilities
api.getTime()
api.getRandom(min, max)
api.log/warn/error()
```

### Events

**Player Events:**
- `player:update` - Every frame player updates
- `player:move` - Player movement
- `player:attack` - Player attacks
- `player:damage` - Player takes damage
- `player:heal` - Player heals

**Enemy Events:**
- `enemy:spawn` - Enemy spawns
- `enemy:damage` - Enemy takes damage
- `enemy:death` - Enemy dies
- `enemy:attack` - Enemy attacks

**Game Events:**
- `game:update` - Every frame
- `game:render` - Render frame
- `game:pause` - Game paused
- `game:resume` - Game resumed
- `level:start` - Level begins
- `level:complete` - Level completed

---

## Best Practices

### 1. **Use Strict Mode**
Always use `'use strict';` to avoid global variable pollution.

### 2. **Check for modAPI**
Verify modAPI exists before using it.

### 3. **Namespace Your Code**
Wrap everything in an IIFE (Immediately Invoked Function Expression).

### 4. **Use Event Hooks**
Don't modify game code directly - use events instead.

### 5. **Clean Up Resources**
If your mod creates objects, clean them up when disabled.

### 6. **Test Compatibility**
Test your mod with other popular mods.

### 7. **Document Your Mod**
Include comments and a README.

---

## Troubleshooting

### Mod doesn't load
- Check console for errors
- Verify mod.json is valid JSON
- Ensure script paths are correct

### modAPI is undefined
- Mod system may not be initialized yet
- Check if mod loading is enabled in settings

### Performance issues
- Reduce particle counts
- Optimize update loops
- Use object pooling

### Crashes on enable/disable
- Check for proper cleanup
- Remove all event hooks on disable

---

## Sharing Your Mods

### Upload to Workshop

1. Test your mod thoroughly
2. Create preview images
3. Write a clear description
4. Upload via Mod Manager (F4 → Workshop → Upload)

### Mod Requirements for Workshop

- ✅ Working functionality
- ✅ Clear description
- ✅ Preview image (1920x1080 recommended)
- ✅ No malicious code
- ✅ Proper credits

---

## Advanced Topics

### Creating Custom Shaders

See `example-visual-mod.js` for shader examples. Shaders use GLSL syntax and support:
- Vertex shaders
- Fragment shaders
- Uniform parameters
- Multiple render passes

### Multiplayer Compatibility

Ensure your mod works in multiplayer:
- Don't modify client-side only state
- Sync custom entities properly
- Test with multiple players

### Save System Integration

To integrate with save system:
```javascript
api.on('game:save', (data) => {
    data.myModData = { ... };
});

api.on('game:load', (data) => {
    // Restore mod data
});
```

---

## Community Resources

- **Discord**: [Link TBD] - Mod discussion and support
- **GitHub**: [Link TBD] - Open source mods
- **Wiki**: [Link TBD] - Detailed documentation
- **Showcase**: [Link TBD] - Featured mods

---

## License

These example mods are provided under the same license as Hellaphobia (GPL-3.0-or-later). You are free to use, modify, and distribute them.

---

**Happy Modding!** 🎮👻
