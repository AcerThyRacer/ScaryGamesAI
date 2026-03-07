# BUG FIX SUMMARY - Phase 2 & 3 Integration

## Overview
Fixed 4 critical bugs in the ECS Integration, WebGPU Renderer, and Physics Integration files that were causing game logic errors, visual glitches, and rendering issues.

---

## ✅ Bug 1: ECS GameState Curse Field Offset Error

**File:** `games/blood-tetris/core/ECSIntegration.js`  
**Lines:** 280, 286  
**Severity:** 🔴 CRITICAL - Game-breaking bug

### Problem
The `CurseSystem` was reading/writing the wrong GameState field:
- Reading `state.data[state.offset]` (field 0 = `active`) instead of `state.data[state.offset + 3]` (field 3 = `curseActive`)
- When curse expired, it set `state.data[state.offset] = 0`, which **deactivated the entire game** instead of just ending the curse

### GameState Field Layout
```javascript
GameState: {
  [0] active,       // ← Bug was reading/writing here
  [1] paused,
  [2] gameOver,
  [3] curseActive,  // ← Should be reading/writing here
  [4] curseType,
  [5] curseTimer    // ← Correctly accessed
}
```

### Fix Applied
```javascript
// BEFORE (BUG)
const curseActive = state.data[state.offset];  // Wrong: reads field 0 (active)
state.data[state.offset] = 0;  // Wrong: sets field 0 to 0, deactivating game

// AFTER (FIXED)
const curseActive = state.data[state.offset + 3];  // Correct: reads field 3 (curseActive)
state.data[state.offset + 3] = 0;  // Correct: sets field 3 to 0, only deactivates curse
```

### Impact
- ✅ Curse system now works correctly
- ✅ Game no longer randomly deactivates when curses expire
- ✅ Curse timer properly decrements and expires

---

## ✅ Bug 2: WebGPU Material Key Mismatch

**File:** `games/blood-tetris/renderer/WebGPURenderer.js`  
**Line:** 183  
**Severity:** 🟡 HIGH - Visual quality degradation

### Problem
Materials were defined with string keys (`I`, `O`, `T`, `S`, `Z`, `J`, `L`) but accessed with numeric array indices (0-6), causing all tetrominos to use the same material (the `I` piece material as fallback).

```javascript
// Materials defined with STRING keys
materials: {
  I: { baseColor: [0.8, 0.13, 0.13], ... },
  O: { baseColor: [0.53, 0.13, 0.13], ... },
  T: { baseColor: [0.67, 0.2, 0.2], ... },
  // ...
}

// Access with NUMERIC index (BUG)
const material = this.materials[typeIndex];  // Always undefined!
```

### Fix Applied
```javascript
// BEFORE (BUG)
const material = this.materials[typeIndex] || this.materials.I;
// typeIndex = 0-6, but materials keys are 'I', 'O', 'T', etc.
// Result: Always falls back to this.materials.I

// AFTER (FIXED)
const materialKeys = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const materialKey = materialKeys[typeIndex] || 'I';
const material = this.materials[materialKey] || this.materials.I;
// Now correctly maps: 0→I, 1→O, 2→T, 3→S, 4→Z, 5→J, 6→L
```

### Impact
- ✅ Each tetromino type now has its unique PBR material
- ✅ Visual variety restored (different colors, metallic/roughness values)
- ✅ All 7 material definitions are now actually used

---

## ✅ Bug 3: Séance Spirit Rendering - Empty Path

**File:** `games/seance/core/PhysicsIntegration.js`  
**Lines:** 81-89  
**Severity:** 🟡 HIGH - Spirits completely invisible

### Problem
The rendering code called `ctx.beginPath()` then immediately created a gradient and called `ctx.fill()` **without defining any path geometry** (no `arc()`, `rect()`, or `moveTo()`/`lineTo()` calls).

```javascript
// BEFORE (BUG)
ctx.beginPath();
const gradient = ctx.createRadialGradient(...);  // Creates gradient
gradient.addColorStop(0, '...');
gradient.addColorStop(1, '...');
ctx.fillStyle = gradient;
ctx.fill();  // Fills EMPTY path - draws nothing!
```

### Fix Applied
```javascript
// AFTER (FIXED)
const cx = sb.center?.x || sb.points[0]?.x || 0;
const cy = sb.center?.y || sb.points[0]?.y || 0;
const radius = sb.radius || 30;

const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(cx, cy, radius, 0, Math.PI * 2);  // ← Define circle path
ctx.fill();  // Now fills the circle
```

### Impact
- ✅ Spirits are now visible with proper radial gradient
- ✅ Ethereal, ghostly appearance as intended
- ✅ Proper circle geometry rendered

---

## ✅ Bug 4: ctx.globalAlpha Not Restored

**Files:** 
- `games/seance/core/PhysicsIntegration.js` (line 97-102)
- `games/yeti-run/core/PhysicsIntegration.js` (line 106)

**Severity:** 🟠 MEDIUM - Visual artifacts in subsequent rendering

### Problem
Both files set `ctx.globalAlpha` to reduced values (0.6-0.8) for particle rendering but **never restored it to 1.0**, causing all subsequent canvas drawing in that frame to inherit the reduced alpha.

```javascript
// BEFORE (BUG - Séance)
this.fluidSim.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.7;  // ← Set alpha
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
});
// Alpha still 0.7 - next render calls affected!

// BEFORE (BUG - Yeti Run)
this.fluidSim.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = this.config.fluidType === 'snow' ? 0.8 : 0.6;  // ← Set alpha
    ctx.beginPath();
    // ... draw ...
    ctx.fill();
});
// Alpha still reduced - game elements drawn after this appear semi-transparent!
```

### Fix Applied
```javascript
// AFTER (FIXED - Séance)
ctx.save();  // ← Save current state (alpha = 1.0)
this.fluidSim.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
});
ctx.restore();  // ← Restore alpha to 1.0

// AFTER (FIXED - Yeti Run)
ctx.save();  // ← Save current state
this.fluidSim.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = this.config.fluidType === 'snow' ? 0.8 : 0.6;
    ctx.beginPath();
    if (this.config.fluidType === 'snow') {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    } else {
        ctx.ellipse(p.x, p.y, 2, 8, 0, 0, Math.PI * 2);
    }
    ctx.fill();
});
ctx.restore();  // ← Restore alpha to 1.0
```

### Impact
- ✅ Subsequent canvas drawing no longer affected by particle alpha
- ✅ Game elements render at full opacity after particles
- ✅ No visual artifacts or unexpected transparency

---

## Verification

All fixes have been verified by:
1. ✅ Code inspection of fixed files
2. ✅ Checking for similar patterns in other files
3. ✅ Ensuring `ctx.save()`/`ctx.restore()` used consistently

### Files Fixed
- ✅ `games/blood-tetris/core/ECSIntegration.js`
- ✅ `games/blood-tetris/renderer/WebGPURenderer.js`
- ✅ `games/seance/core/PhysicsIntegration.js`
- ✅ `games/yeti-run/core/PhysicsIntegration.js`

### Files Already Correct
- ✅ `games/blood-tetris/core/PhysicsIntegration.js` - Already uses `ctx.save()`/`ctx.restore()`
- ✅ `games/zombie-horde/core/PhysicsIntegration.js` - No alpha issues
- ✅ `games/crypt-tanks/core/PhysicsIntegration.js` - No alpha issues

---

## Summary

| Bug | Severity | Status | Impact |
|-----|----------|--------|--------|
| GameState field offset | 🔴 CRITICAL | ✅ Fixed | Game no longer breaks on curse expiry |
| Material key mismatch | 🟡 HIGH | ✅ Fixed | All 7 tetromino materials now unique |
| Empty spirit path | 🟡 HIGH | ✅ Fixed | Spirits now visible with gradient |
| Alpha not restored | 🟠 MEDIUM | ✅ Fixed | No more transparency artifacts |

**Total Bugs Fixed:** 4/4 (100%)  
**Files Modified:** 4  
**Lines Changed:** ~25

All Phase 2 & 3 integration bugs have been resolved! 🎉
