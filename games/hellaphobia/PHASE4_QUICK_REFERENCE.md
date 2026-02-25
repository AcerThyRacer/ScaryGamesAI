# Phase 4 - Quick Reference Guide

## Quick Start

```javascript
// Initialize (automatically done in startGame())
Phase4Core.init();

// Update in game loop
Phase4Core.update(dt, player, monsters);

// Render in game loop
Phase4Core.render(ctx, camera, player, time, dt);
```

## Effect Triggers

### Immediate Effects
```javascript
Phase4Effects.triggerScreenShake(1.0, 0.5);    // intensity, duration
Phase4Effects.triggerFlash('#ffffff', 0.3);    // color, duration
Phase4Effects.triggerGlitch(2.0, 0.8);         // duration, intensity
Phase4Effects.triggerFlicker(3, 0.5);          // times, duration
Phase4Effects.triggerScanlines(5, 0.3);        // duration, intensity
Phase4Effects.triggerFilmGrain(3, 0.2);        // duration, intensity
Phase4Effects.triggerTunnelVision(2, 0.3);     // duration, minRadius
Phase4Effects.triggerColorShift(1, 0, 0, 2);   // r, g, b, duration
Phase4Effects.triggerInvertedColors(3);        // duration
Phase4Effects.triggerPixelation(4, 2);         // size, duration
```

### Sustained Effects
```javascript
Phase4Effects.setVignette(0.7, '#000000');     // intensity, color
Phase4Effects.setChromaticAberration(5);       // amount
Phase4Effects.applyDistortion(0.5);            // amount
Phase4Effects.setAtmosphere('tense', 10);      // type, duration
```

## Audio Triggers

```javascript
Phase4Audio.playSound('jumpscare', 1.0);       // name, volume
Phase4Audio.playSound('whisper', 0.8);
Phase4Audio.playSound('glitch', 0.5);
Phase4Audio.playSound('heartbeat', 0.7);
Phase4Audio.playSound('screech', 0.9);
Phase4Audio.playSound('rumble', 0.6);

Phase4Audio.playMusic('chase', 0.8);           // track, volume

Phase4Audio.playAmbient('whispers', 0.3);      // type, volume
Phase4Audio.playAmbient('flicker', 0.2);
Phase4Audio.playAmbient('dungeon', 0.4);

const whisper = Phase4Audio.playWhisper();     // Returns whisper text
console.log(whisper.text);
```

## Sanity System

```javascript
// Manual sanity adjustment
SanitySystem.restoreSanity(player, 25);        // player, amount
SanitySystem.drainSanity(player, 10);

// Get hallucinations (for save/load)
const hallucinations = SanitySystem.hallucinations;

// Sanity states (automatic)
// STABLE (80-100%): No effects
// UNSETTLED (60-80%): Whispers, flicker
// DISTURBED (40-60%): + Shadows, distortion
// FRAGMENTED (20-40%): + Hallucinations, glitches
// BROKEN (0-20%): + Reality breaks
```

## Fourth Wall Events

```javascript
// Trigger fourth wall message
Phase4Core.triggerFourthWall({
    deaths: 10,
    currentPhase: 5,
    player: player,
    startTime: Date.now(),
    mouseX: 500,
    mouseY: 400,
    fps: 60,
    battery: '85%'
});

// Show floating text
Phase4UI.showFloatingText(x, y, "Hello?", '#ff00ff', 2, 16);

// Show system message
Phase4UI.showSystemMessage("System failure detected", 'error', 3000);
```

## Player Profiler

```javascript
// Get current profile
const profile = Phase4Core.getPlayerProfile();
/* Returns:
{
    fearResponse: 0.7,
    stressTolerance: 0.4,
    explorationStyle: 0.6,
    combatPreference: 0.3,
    puzzleAptitude: 0.5,
    riskTolerance: 0.4,
    immersionLevel: 0.8,
    adaptationRate: 0.5
}
*/

// Record behavior event
Phase4Core.recordBehavior({
    type: 'death',
    x: player.x,
    y: player.y,
    cause: 'monster'
});

// Get horror stats
const stats = Phase4Core.getHorrorStats();
/* Returns:
{
    eventsTriggered: 25,
    averageIntensity: 0.6,
    currentIntensity: 0.5,
    eventBreakdown: { JUMP_SCARE: 5, ATMOSPHERIC: 12, ... }
}
*/
```

## Atmosphere Types

```javascript
Phase4Effects.setAtmosphere('normal', 10);     // No overlay
Phase4Effects.setAtmosphere('tense', 10);      // Red tint
Phase4Effects.setAtmosphere('oppressive', 10); // Dark overlay
Phase4Effects.setAtmosphere('surreal', 10);    // Rainbow cycle
```

## Common Patterns

### Low Sanity Trigger
```javascript
if (player.sanity / player.maxSanity < 0.25) {
    Phase4Effects.triggerGlitch(2, 0.8);
    Phase4Audio.playSound('whisper', 1.0);
    Phase4Core.triggerFourthWall(gameData);
}
```

### Death Event
```javascript
function playerDie(cause) {
    Phase4Effects.triggerScreenShake(1.5, 0.5);
    Phase4Audio.playSound('heartbeat', 0.8);
    Phase4Core.triggerFourthWall({
        deaths: deathCount,
        currentPhase,
        player,
        startTime,
        mouseX, mouseY,
        fps: 60,
        battery: 'unknown'
    });
}
```

### Chase Sequence
```javascript
// Start chase
Phase4Audio.playMusic('chase', 0.8);
Phase4Effects.setVignette(0.7, '#ff0000');
Phase4Effects.triggerFilmGrain(10, 0.3);

// Boost monsters
monsters.forEach(m => {
    m.chaseBoost = 1.5;
    m.state = 'CHASE';
});
```

### Jump Scare
```javascript
Phase4Effects.triggerScreenShake(1.0, 0.3);
Phase4Effects.triggerFlash('#ffffff', 0.1);
Phase4Audio.playSound('jumpscare', 1.0);
player.sanity -= 15;
```

## Performance Tips

| Effect | Cost | Recommendation |
|--------|------|----------------|
| Screen Shake | Low | Use freely |
| Flash | Low | Use freely |
| Glitch | Medium | Limit duration |
| Chromatic Aberration | Medium | Use sparingly |
| Film Grain | High | Reduce in crowded scenes |
| Pixelation | Medium | Safe for brief moments |

## Troubleshooting

### Effects not showing
- Check Phase4Core.render() is called in game loop
- Verify ctx is valid canvas context
- Check effect duration hasn't expired

### Audio not playing
- Call Phase4Audio.init() on user interaction (click)
- Check browser audio permissions
- Verify AudioContext isn't suspended

### Hallucinations not rendering
- Ensure sanity < 40% for hallucinations to spawn
- Check Phase4Core.render() includes hallucination rendering
- Verify camera position is correct

## Integration Checklist

- [ ] Phase4Core.init() called in startGame()
- [ ] Phase4Core.update() called in update loop
- [ ] Phase4Core.render() called in render loop
- [ ] Fourth wall events triggered on death
- [ ] Low sanity triggers configured
- [ ] Audio initialized on first user interaction
