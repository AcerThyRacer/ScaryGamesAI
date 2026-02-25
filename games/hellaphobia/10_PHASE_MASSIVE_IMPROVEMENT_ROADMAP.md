# 🔥 HELLAPHOBIA 3.0 - ULTIMATE 10-PHASE TRANSFORMATION ROADMAP

## 📊 Executive Summary

This roadmap transforms Hellaphobia from a functional horror game into a **masterpiece of psychological horror** with AAA-quality visuals, challenging boss fights, and an unforgettable experience.

**Total Estimated Development Time:** 10-12 weeks
**Total New Code:** ~15,000+ lines
**Target:** 60 FPS, <150MB memory, browser-compatible

---

# 🎯 PHASE 1: VISUAL FOUNDATION & RENDERING OVERHAUL

## Duration: 1 week
## Lines of Code: ~2,000

### 1.1 WebGL Renderer Replacement
```
Current: Canvas 2D API
Target: WebGL 2.0 with fallback to Canvas 2D
```

**Implementation:**
- Create `renderer/WebGLRenderer.js` with full shader pipeline
- Implement batch rendering for sprites/tiles (reduce draw calls)
- Add texture atlas system for all game assets
- Dynamic lighting with per-pixel illumination
- Normal mapping for depth on 2D sprites
- Bloom/glow effects for eyes, projectiles, UI

**Shaders to Create:**
| Shader | Purpose | Complexity |
|--------|---------|------------|
| `sprite.vert/frag` | Basic sprite rendering | Low |
| `lighting.vert/frag` | Dynamic per-pixel lighting | Medium |
| `bloom.vert/frag` | Glow effect for bright pixels | Medium |
| `distortion.vert/frag` | Screen warp for horror | High |
| `chromatic.vert/frag` | RGB split aberration | Low |
| `noise.vert/frag` | Film grain/static overlay | Low |
| `vignette.vert/frag` | Edge darkening | Low |
| `horror.vert/frag` | Combined horror preset | High |

### 1.2 Sprite Asset Creation
**Player Sprites:**
- 8-direction movement (N, NE, E, SE, S, SW, W, NW)
- 4 animation frames per direction (idle, walk, run)
- Jump, land, crouch, slide animations
- Combat: attack (3 frames), parry (2 frames), hurt (3 frames), death (5 frames)
- Eye tracking animation (pupils follow cursor)
- **Total: ~100 frames**

**Monster Sprites (per type):**
- 4-direction movement
- 3 animation frames (idle, walk, attack)
- Death animation (4 frames)
- Special: glow effects, shadow variations
- **Total per monster: ~20 frames × 15 types = 300 frames**

**Environment Sprites:**
- Floor tiles: 10 variations (stone, blood, bone, cracks)
- Wall tiles: 8 variations
- Decorations: torches (animated), chains, bones, pools
- Interactive: doors, levers, chests
- **Total: ~200 tiles**

**FX Sprites:**
- Blood splatter: 5 variations
- Dust/debris: 4 variations
- Magic effects: 6 variations
- Fire/smoke: 4 variations
- Glitch artifacts: 8 variations
- **Total: ~30 FX sheets**

### 1.3 Lighting System
```javascript
// Dynamic light sources
{
    type: 'point' | 'spot' | 'directional',
    position: {x, y, z},
    color: '#rrggbb',
    intensity: 0-1,
    radius: pixels,
    flicker: { speed, amplitude },
    castShadows: true/false,
    cookie: 'texture' // gobos for patterns
}
```

**Light Types:**
- Player flashlight (cone, moves with player)
- Torches (flickering, wall-mounted)
- Monster glow (eyes, aura)
- Pickups (pulsing)
- Environmental (light shafts, cracks)

**Shadow System:**
- Raycasted shadows from light sources
- Soft shadow edges (penumbra)
- Shadow receiving on floor tiles
- Dynamic shadow casting for entities

### 1.4 Post-Processing Stack
**Effect Chain (in order):**
1. **Bloom** - Extract bright pixels, blur, composite
2. **Chromatic Aberration** - Split RGB channels at edges
3. **Film Grain** - Animated noise overlay
4. **Vignette** - Radial darkness (intensity based on sanity)
5. **Color Grading** - LUT-based color transformation
6. **Scanlines** - CRT effect (optional)
7. **Distortion** - Wave/pinch for glitch moments

**Presets:**
```javascript
const PRESETS = {
    NORMAL: { vignette: 0.3, grain: 0.05, bloom: 0.5 },
    HORROR: { vignette: 0.6, grain: 0.1, chromatic: 0.003, color: 'desaturated' },
    SANITY_LOW: { vignette: 0.8, grain: 0.15, distortion: 0.2, chromatic: 0.005 },
    BOSS_FIGHT: { vignette: 0.5, bloom: 0.8, grain: 0.08, color: 'redshift' },
    FLASHBACK: { vignette: 0.4, grain: 0.2, color: 'sepia', scanlines: 0.3 }
};
```

### 1.5 UI Visual Overhaul
**New HUD Design:**
- Animated health bar (segments that deplete)
- Sanity meter with visual distortion based on level
- Mini-map (optional, fog of war)
- Buff/debuff icon tray
- Boss health bar (already exists, enhance with portrait)

**Menu Screens:**
- Main menu: Animated background, parallax layers
- Pause menu: Blur backdrop, smooth transitions
- Settings: Visual previews for changes
- Death screen: Animated vignette, ghost overlay

### Success Criteria
- [ ] WebGL renderer achieves 60 FPS with 500 sprites
- [ ] Dynamic lighting with 20+ lights at 60 FPS
- [ ] All post-processing effects working
- [ ] Complete sprite set for player and 5 monster types
- [ ] UI matches horror aesthetic

---

# 👹 PHASE 2: BOSS AI REVOLUTION

## Duration: 1.5 weeks
## Lines of Code: ~2,500

### 2.1 Behavior Tree System
Replace simple state machine with proper behavior trees:

```
Root
├── Selector
│   ├── Sequence (Enraged)
│   │   ├── CheckEnraged
│   │   └── EnragedAttacks
│   ├── Sequence (LowHealth)
│   │   ├── CheckLowHealth
│   │   ├── FleeOrHeal
│   │   └── DesperateAttack
│   ├── Sequence (Combat)
│   │   ├── SelectAttackPattern
│   │   ├── MoveToPosition
│   │   └── ExecuteAttack
│   └── Sequence (Idle)
│       ├── PatrolOrTaunt
│       └── LookForPlayer
```

**Nodes to Implement:**
- Conditions: HealthCheck, DistanceCheck, VisionCheck, CooldownReady
- Actions: MoveTo, Attack, PlayAnimation, SpawnMinion, Teleport, ChangePhase
- Decorators: Inverter, Repeater, Timeout
- Composites: Selector, Sequence, Parallel

### 2.2 Each Boss Gets Unique AI

#### The Warden - Aggressive Pursuer
```javascript
{
    personality: 'aggressive',
    patience: 0.2, // How long before charging
    predictability: 0.3, // Low = hard to predict
    aggression: 0.9, // How often attacks

    signature: 'CHARGE_AND_SLAM',
    tells: {
        charge: 'backs_up_then_learns_forward',
        slam: 'raises_arms_over_head',
        summon: 'kneels_and_glows'
    },

    counterplay: 'dodge_charge_into_wall_stun'
}
```

#### The Collector - Tactical Hunter
```javascript
{
    personality: 'calculating',
    patience: 0.7,
    predictability: 0.5,
    aggression: 0.6,

    signature: 'TELEPORT_AMBUSHER',
    tells: {
        teleport: 'dissolves_into_particles',
        soul_grab: 'reaches_with_both_hands',
        dimension_rift: 'arms_spread_wide'
    },

    counterplay: 'attack_during_teleport_vulnerability'
}
```

#### Hellaphobia - Reality Bender
```javascript
{
    personality: 'cosmic_horror',
    patience: 0.5,
    predictability: 0.1, // Nearly unpredictable
    aggression: 0.8,

    signature: 'FOURTH_WALL_BREAKER',
    tells: {
        reality_break: 'screen_glitches_around_boss',
        fourth_wall: 'looks_at_camera_player',
        game_crash: 'boss_model_corrupts'
    },

    counterplay: 'pattern_recognition_timing'
}
```

### 2.3 Attack Pattern Enhancements

**Pattern Components:**
| Component | Description | Example |
|-----------|-------------|---------|
| Windup | Telegraphed preparation | Boss raises arm, glows |
| Warning | Visual/audio cue | Red ground indicator |
| Execution | Actual attack | Charge forward |
| Recovery | Vulnerable period | Boss catches breath |
| Cooldown | Can't repeat immediately | 3 second wait |

**New Attack Patterns:**

**The Warden:**
1. **Shield Bash** - Raises shield, charges, stuns on hit
2. **Ground Pound** - Jumps, creates expanding shockwave
3. **Guard Summon** - Kneels, spawns 2-3 guard minions
4. **Whirlwind** - Spins with weapon, 360° attack zone
5. **Execution** - Grabs player, instant kill if not escaped

**The Collector:**
1. **Soul Drain** - Tethers to player, drains HP/sanity
2. **Memory Clone** - Creates copy of player that attacks
3. **Void Zone** - Creates damaging area on ground
4. **Dimension Hop** - Teleports, appears behind player
5. **Soul Storm** - Projectiles rain from ceiling

**Hellaphobia:**
1. **Code Inject** - UI buttons move/flip, controls invert
2. **Delete Zone** - Chunks of arena disappear
3. **Player Copy** - Fights corrupted version of player
4. **Reality Tear** - Screen splits, attacks from both sides
5. **Admin Command** - "BAN" appears, instant death if not dodged

### 2.4 Pattern Learning System
Boss remembers player behavior and adapts:

```javascript
const PlayerPatterns = {
    favoritePosition: 'left_side', // Where player stands most
    dodgePreference: 'right', // Which way player dodges
    attackPattern: 'melee_heavy', // Player's preferred damage
    panicBehavior: 'run_away', // What player does when hurt

    adaptations: {
        // If player stands left often, attack that area
        positionCounter: 'spawn_projectiles_on_favorite',
        // If player dodges right, attack left first
        dodgeCounter: 'feint_left_attack_right',
        // If player uses melee, stay at range
        rangeCounter: 'keep_distance_attacks'
    }
};
```

### 2.5 Boss Weakness System
Each boss has specific weaknesses to exploit:

| Boss | Weakness | How to Trigger | Reward |
|------|----------|----------------|--------|
| Warden | Parry | Perfect-timed block | Stuns for 3s |
| Warden | Ranged | Attack from distance | Reduced defense |
| Collector | Light | Shine flashlight | Teleport disabled |
| Collector | Sanity | Use sanity attacks | Vulnerable phase |
| Hellaphobia | Acceptance | Don't dodge某些 attacks | Respect dialogue |
| Hellaphobia | Glitch | Attack during glitches | Skip phase |

### Success Criteria
- [ ] Behavior trees for all 3 bosses
- [ ] Each boss has 5+ unique attack patterns
- [ ] Pattern learning adapts to player behavior
- [ ] Clear telegraphing for all attacks
- [ ] Exploitable weaknesses for each boss

---

# 🎨 PHASE 3: ENVIRONMENTAL STORYTELLING

## Duration: 1 week
## Lines of Code: ~1,500 + Art Assets

### 3.1 Dynamic Environment System

**Interactive Elements:**
- Breakable walls (reveal secrets)
- Pushable objects (puzzles, cover)
- Destructible furniture (loot, sound)
- Light sources (extinguishable)
- Blood trails (followable)
- Scratches on walls (lore)

**Atmospheric Elements:**
- Fog that thickens in dangerous areas
- Particles: dust, ash, embers, spores
- Animated decorations: swinging chains, flowing blood
- Weather: dripping water, falling debris

### 3.2 Lore Integration

**Lore Objects:**
```javascript
const LoreObjects = {
    JOURNAL: { type: 'readable', text: 'lore_entry_42', glow: true },
    CORPSE: { type: 'inspectable', story: 'victim_final_moments' },
    GRAFFITI: { type: 'visible', text: 'warning_message' },
    ALTAR: { type: 'interactable', effect: 'blessing_curse' },
    MIRROR: { type: 'special', shows: 'alternate_reality' }
};
```

**Environmental Narrative:**
- Blood trail leads to hidden room
- Pile of bones in corner (something died here)
- Scratches on wall = count of days trapped
- Fresh corpse vs skeleton (timeline)
- Personal belongings tell story

### 3.3 Procedural Events

**Dynamic Events:**
| Event | Trigger | Effect |
|-------|---------|--------|
| Lights Out | Random/timed | Darkness, monsters louder |
| Earthquake | Phase transition | Tiles shake, debris falls |
| Blood Rain | Low sanity | Floor slippery, vision red |
| Whisper Storm | Boss nearby | Directional audio clues |
| Vision | Specific location | Flashback sequence |

### 3.4 Secret Systems

**Secret Types:**
- False walls (attack to reveal)
- Floor traps (pressure plates)
- Hidden passages (behind waterfalls, bookshelves)
- Lore rooms (require key items)
- Challenge rooms (optional hard content)

**Discovery Mechanics:**
- Player flashlight reveals hidden symbols
- Low sanity shows "ghost" of secret entrance
- Sound cues (wind from cracks)
- Monster AI avoids certain areas (hints at secrets)

### Success Criteria
- [ ] 20+ interactive environmental objects
- [ ] 50+ lore objects/entries
- [ ] 10+ dynamic events
- [ ] At least 3 secret types per phase
- [ ] Environmental tells for secrets

---

# 💀 PHASE 4: DIFFICULTY & BALANCING OVERHAUL

## Duration: 1 week
## Lines of Code: ~1,200

### 4.1 Multi-Tier Difficulty System

```javascript
const DifficultyTiers = {
    STORY: {
        playerDamageMult: 0.5,
        playerHealthMult: 1.5,
        monsterDamageMult: 0.6,
        monsterHealthMult: 0.7,
        sanityDrainMult: 0.5,
        checkpoints: 'frequent',
        aimsAssist: true
    },
    NORMAL: {
        playerDamageMult: 1.0,
        playerHealthMult: 1.0,
        monsterDamageMult: 1.0,
        monsterHealthMult: 1.0,
        sanityDrainMult: 1.0,
        checkpoints: 'moderate'
    },
    NIGHTMARE: {
        playerDamageMult: 1.2,
        playerHealthMult: 0.8,
        monsterDamageMult: 1.5,
        monsterHealthMult: 1.3,
        sanityDrainMult: 1.5,
        checkpoints: 'rare'
    },
    HELLAPHOBIA: {
        playerDamageMult: 1.0,
        playerHealthMult: 0.5, // One-shot potential
        monsterDamageMult: 2.0,
        monsterHealthMult: 1.5,
        sanityDrainMult: 2.0,
        checkpoints: 'none', // Only at phase start
        permadeath: true
    }
};
```

### 4.2 Dynamic Difficulty Adjustment (DDA)

System adjusts in real-time based on player performance:

```javascript
const DDA = {
    metrics: {
        deathsInArea: 0,
        timeInArea: 0,
        damageTaken: 0,
        accuracy: 0,
        dodgeSuccessRate: 0
    },

    adjustments: {
        // Player struggling - help them
        tooManyDeaths: () => {
            if (metrics.deathsInArea > 5) {
                reduceMonsterAggression(0.8);
                increaseHealthDropRate(1.5);
                showSubtleHint('try_ranged_attacks');
            }
        },

        // Player dominating - challenge them
        tooEasy: () => {
            if (metrics.damageTaken < expected * 0.3) {
                spawnAdditionalMonster(1);
                reduceHealthDropRate(0.7);
            }
        }
    }
};
```

### 4.3 Boss Difficulty Scaling

**Per-Difficulty Boss Changes:**

| Difficulty | Warden | Collector | Hellaphobia |
|------------|--------|-----------|-------------|
| Story | 300 HP, 15 dmg | 500 HP, 20 dmg | 900 HP, 40 dmg |
| Normal | 500 HP, 25 dmg | 800 HP, 30 dmg | 1500 HP, 60 dmg |
| Nightmare | 750 HP, 35 dmg | 1200 HP, 45 dmg | 2200 HP, 90 dmg |
| Hellaphobia | 1000 HP, 50 dmg | 1600 HP, 60 dmg | 3000 HP, 120 dmg |

**Additional Phases on Higher Difficulty:**
- Nightmare: Bosses gain +1 phase
- Hellaphobia: Bosses gain +2 phases with exclusive attacks

### 4.4 Fairness Systems

**Anti-Frustration Features:**
- I-frames after damage (0.5s invincibility)
- Dodge iframe window (0.2s at perfect timing)
- Parry grace period (±0.05s from perfect)
- Fall damage forgiveness (first hit doesn't kill)
- Checkpoint before boss (auto-teleport on first attempt)

**Telegraphing Rules:**
- All attacks have ≥0.5s windup
- Red ground indicators for AoE
- Audio cue before every attack
- Boss faces target before attack

### Success Criteria
- [ ] 4 difficulty modes implemented
- [ ] DDA system adjusts fairly
- [ ] Bosses scaled appropriately
- [ ] All attacks properly telegraphed
- [ ] Playtest: 70% completion on Normal

---

# 🧠 PHASE 5: PSYCHOLOGICAL HORROR AMPLIFICATION

## Duration: 1 week
## Lines of Code: ~1,800

### 5.1 Enhanced Sanity System

**Sanity Tiers:**
```
100-80%: Normal - No effects
80-60%: Uneasy - Minor whispers, peripheral movement
60-40%: Disturbed - Visual distortions, fake sounds
40-20%: Terrified - Hallucinations, control interference
20-10%: Breaking - Reality breaks, fake UI elements
<10%: Broken - Full psychosis, random events
```

**Effects Per Tier:**

| Sanity | Visual | Audio | Gameplay |
|--------|--------|-------|----------|
| 80% | Slight vignette | Occasional whisper | None |
| 60% | Peripheral shadows | Footsteps behind | Slight aim drift |
| 40% | Walls breathe | Monster voices | Controls lag 50ms |
| 20% | Fake monsters | Fake death sounds | Controls invert briefly |
| 10% | Screen cracks | Voice calls name | Fake UI, wrong inputs |
| 0% | Reality glitches | Deafening screams | Random teleports |

### 5.2 Fourth Wall Breaking 2.0

**Escalation System:**

**Level 1 (Subtle):**
- UI elements slightly misaligned
- Menu background shows gameplay
- Death screen shows real death count

**Level 2 (Noticeable):**
- Game "remembers" previous deaths
- Boss calls player by Steam name
- Fake crash screen (easily dismissed)

**Level 3 (Bold):**
- Boss references playtime
- Game reads "recently played" list
- Fake error messages mid-gameplay

**Level 4 (Aggressive):**
- Game pretends to close
- Boss shows player's webcam (fake)
- "System32 deletion" fake progress

**Level 5 (Reality-Breaking):**
- Desktop overlay (fake)
- Boss "escapes" game window
- Final boss reveals it's been recording

### 5.3 Jumpscare System

**Jumpscare Types:**
| Type | Buildup | Execution | Aftermath |
|------|---------|-----------|-----------|
| Classic | Silence, darkness | Monster face + scream | 2s freeze, sanity -20 |
| Fake-out | Obvious buildup | Nothing happens | Relief, then real scare |
| Environmental | Creaking sounds | Object flies at screen | 1s shake |
| Reflection | Mirror/portal | Reflection moves wrong | Sanity -10 |
| Audio-only | Building sounds | Deafening scream | Sanity -15 |

**Jumpscare Rules:**
- Max 1 major jumpscare per 10 minutes
- Telegraph "fake" scares for player sanity
- Never during combat (always in exploration)
- Volume-capped to prevent hearing damage
- Option to disable in settings (with achievement penalty)

### 5.4 Fear Conditioning

**Pavlovian Elements:**
- Specific sound before monster spawn (player learns to fear sound)
- Color palette shift before boss (red = danger)
- Music cut before jumpscare (silence = dread)
- Controller vibration pattern for fear

**Subliminal Techniques:**
- Single frame of monster in background
- Subliminal text in loading screens
- Backwards audio in ambient tracks
- Patterns that look like faces (pareidolia)

### Success Criteria
- [ ] Sanity system has visible gameplay impact
- [ ] Fourth wall breaks escalate naturally
- [ ] 5+ jumpscare variations implemented
- [ ] Fear conditioning evident in playtest
- [ ] Accessibility options for all effects

---

# ⚔️ PHASE 6: COMBAT SYSTEM REWORK

## Duration: 1.5 weeks
## Lines of Code: ~2,000

### 6.1 Expanded Combat Moveset

**Melee Weapons (unlockable):**
| Weapon | Speed | Damage | Range | Special |
|--------|-------|--------|-------|---------|
| Fists | Fast | 5 | 30px | Always available |
| Knife | Fast | 12 | 40px | Bleed effect |
| Sword | Medium | 20 | 60px | Can parry |
| Axe | Slow | 35 | 50px | Breaks shields |
| Spear | Medium | 18 | 80px | Keep enemies at bay |

**Ranged Weapons:**
| Weapon | Speed | Damage | Ammo | Special |
|--------|-------|--------|------|---------|
| Sanity Blast | Medium | 25 | Sanity | Pierces enemies |
| Crossbow | Slow | 40 | Bolts | Silent, high crit |
| Pistol | Fast | 20 | Bullets | Reliable |
| Shotgun | Slow | 15×8 | Shells | Spread, close range |
| Flamethrower | Continuous | 5/tick | Fuel | DoT, area denial |

### 6.2 Combo System

**Combo Chains:**
```
Light Attack → Light → Light → Heavy (Finisher)
Light Attack → Heavy → Knockdown
Heavy Attack → Light → Stun
Dodge → Light → Counter Attack
Parry → Light → Critical Hit
```

**Combo Meter:**
- Builds with consecutive hits
- 3 levels: Bronze → Silver → Gold
- Gold combos deal 2x damage
- Meter decays if out of combat 5s

### 6.3 Defensive Mechanics

**Dodge System:**
- Directional dodge (roll in movement direction)
- I-frames: 0.2s at start of dodge
- Stamina cost: 20 per dodge
- Dodge distance: 120px
- Perfect dodge (timed) → slow-mo 2s

**Parry System:**
- Hold block, release on impact
- Perfect parry window: ±0.1s
- Success: Enemy stunned 2s, counter available
- Failure: Take 50% damage, staggered
- Some attacks cannot be parried (marked red)

**Block System:**
- Hold block button
- Reduces damage by 70%
- Drain stamina while blocking
- Break if stamina depleted (3s stun)

### 6.4 Enemy Variety

**New Enemy Types:**
| Enemy | Behavior | Weakness | Threat |
|-------|----------|----------|--------|
| Crawler | Rushes player | AOE | Low |
| Shielder | Blocks front | Backstab | Medium |
| Archer | Ranged attacks | Rush down | Medium |
| Brute | Slow, heavy hits | Dodge/parry | High |
| Mage | Casts spells | Interrupt | High |
| Phantom | Invisible until attack | Light | Medium |
| Mimic | Disguised as object | Attack first | Medium |

### 6.5 Combat Encounters

**Arena Design:**
- Multiple elevation levels
- Environmental hazards (spikes, pits)
- Cover objects (destructible/indestructible)
- Interactive elements (chandeliers, traps)
- Escape routes (for kiting)

**Encounter Types:**
| Type | Description | Example |
|------|-------------|---------|
| Gauntlet | Waves of enemies | 3 waves, increasing difficulty |
| Elite | Single powerful enemy | Brute with 2x HP |
| Mixed | Different enemy types | 2 shielders + 3 archers |
| Timed | Kill all before timer | 60s, reward for success |
| Protection | Defend NPC/object | 5 waves protecting altar |

### Success Criteria
- [ ] 5 melee + 5 ranged weapons
- [ ] Combo system with 5+ chains
- [ ] Dodge, parry, block all functional
- [ ] 10+ enemy types with unique behaviors
- [ ] 5 encounter variations

---

# 🌍 PHASE 7: PROCEDURAL GENERATION 2.0

## Duration: 1 week
## Lines of Code: ~1,800

### 7.1 Enhanced WFC Algorithm

**Improvements over current:**
- Larger tile sets (50+ tiles vs current 16)
- 3D height considerations (stairs, pits)
- Semantic rules ("boss room must be reachable")
- Biome blending (smooth transitions)
- Guaranteed key placements

**New Tile Properties:**
```javascript
const TileProperties = {
    type: 'floor' | 'wall' | 'door' | 'special',
    height: 0 | 1 | -1, // Same level, stairs up, stairs down
    biome: 'stone' | 'blood' | 'bone' | 'void',
    lighting: 'dark' | 'dim' | 'lit' | 'bright',
    danger: 0-1, // Monster spawn weight
    loot: 0-1, // Item spawn weight
    lore: 0-1, // Story element weight
    connections: { N, S, E, W } // Which sides can connect
};
```

### 7.2 Biome System

**10 Unique Biomes:**
1. **Stone Dungeon** - Classic, moderate danger
2. **Blood Sewers** - Slippery floors, high danger
3. **Bone Catacombs** - Narrow corridors, undead
4. **Crystal Caves** - Reflective lighting, puzzles
5. **Flesh Gardens** - Organic walls, healing pools
6. **Clockwork Hell** - Moving parts, timing puzzles
7. **Void Corridors** - Low visibility, sanity drain
8. **Library** - Lore heavy, quiet (stealth)
9. **Prison** - Cells, traps, guards
10. **Throne Room** - Boss arenas, ornate

**Biome Blending:**
- Gradual transition over 3-4 tiles
- Visual tell (blood spreading from sewers)
- Audio transition (echo changes)
- Monster migration (some follow player)

### 7.3 Room Templates

**Hand-Crafted Rooms:**
- Combat arenas (pre-designed layouts)
- Treasure rooms (guaranteed loot)
- Shrine rooms (buffs/curses)
- Lore rooms (story progression)
- Trap rooms (hazard navigation)
- Boss arenas (scripted encounters)

**Template Rules:**
```javascript
const RoomRules = {
    BOSS_ARENA: {
        minDistance: 10, // Must be 10+ rooms from start
        requires: ['key_item'], // Must have key to enter
        guarantanteed: true, // Always spawns
        connections: ['single'] // Only one entrance
    },
    TREASURE: {
        maxPerRun: 3,
        requires: ['trap_disarmed'],
        lootMultiplier: 2.0
    },
    SHRINE: {
        effect: 'random_blessing_or_curse',
        cannotRepeat: true
    }
};
```

### 7.4 Loot Generation

**Rarity Tiers:**
```
Common (white): 60% - Basic items, ammo
Uncommon (green): 25% - Better weapons, armor
Rare (blue): 10% - Unique weapons, artifacts
Epic (purple): 4% - Legendary items
Legendary (gold): 1% - Game-changing items
```

**Loot Tables:**
```javascript
const LootTables = {
    CHEST_BASIC: [
        { item: 'health_potion', weight: 30, qty: [1, 3] },
        { item: 'ammo_pistol', weight: 25, qty: [5, 15] },
        { item: 'knife', weight: 10, qty: [1, 1] },
        { item: 'rare_sword', weight: 2, qty: [1, 1] }
    ],
    BOSS_DROP: [
        { item: 'boss_soul', weight: 100, qty: [1, 1] },
        { item: 'legendary_weapon', weight: 10, qty: [1, 1] },
        { item: 'ability_unlock', weight: 5, qty: [1, 1] }
    ]
};
```

### Success Criteria
- [ ] WFC generates valid levels 100% of time
- [ ] 10 distinct biomes implemented
- [ ] 20+ hand-crafted room templates
- [ ] Loot system with 4 rarities
- [ ] Runs feel meaningfully different

---

# 🏆 PHASE 8: PROGRESSION & REWARDS

## Duration: 1 week
## Lines of Code: ~1,500

### 8.1 Skill Tree System

**5 Skill Trees:**

**Agility (Movement):**
```
Tier 1:
- Double Jump (unlock second jump)
- Sprint (+30% move speed)
- Slide (crouch + run = slide under obstacles)

Tier 2:
- Wall Jump (jump off walls)
- Air Dash (dash while airborne)
- Landing Roll (no fall damage)

Tier 3:
- Shadow Step (dash through enemies)
- Time Stop (brief pause on perfect dodge)
- Phantom Form (no collision for 1s)
```

**Combat (Offense):**
```
Tier 1:
- Power Strike (+20% melee damage)
- Quick Reload (faster ranged)
- Weak Point (+50% crit chance)

Tier 2:
- Lifesteal (heal 10% of damage dealt)
- Combo Master (combo meter lasts 10s longer)
- Penetration (ranged pierces 1 enemy)

Tier 3:
- Execute (kill enemies <10% HP instantly)
- Berserker (+50% dmg when <30% HP)
- Weapon Master (all weapons +1 tier)
```

**Survival (Defense):**
```
Tier 1:
- Thick Skin (+20 max HP)
- Sanity Training (+20 max sanity)
- Resistance (-10% damage taken)

Tier 2:
- Regeneration (heal 1 HP/s out of combat)
- Iron Will (cannot go below 1 HP, 60s cooldown)
- Cleanse (remove debuffs on dodge)

Tier 3:
- Immortality (survive fatal hit, 300s cooldown)
- Sanity Shield (sanity absorbs 50% damage)
- Phoenix (revive on death, heal to 50%)
```

**Stealth (Evasion):**
```
Tier 1:
- Silent Footstep (no sound from walking)
- Shadow Blend (harder to detect in dark)
- Quick Hide (enter hiding spots faster)

Tier 2:
- Backstab (2x damage from behind)
- Vanish (become invisible 2s on dodge)
- Decoy (leave fake corpse on dodge)

Tier 3:
- Assassin (kill normal enemies instantly from stealth)
- Ghost (no detection while stationary)
- Mind Trick (enemies forget you for 5s)
```

**Psychic (Sanity Powers):**
```
Tier 1:
- Mind Blast (damage enemies with sanity)
- Sense Presence (see enemies through walls)
- Calm Mind (sanity drain -30%)

Tier 2:
- Telekinesis (push enemies away)
- Foresight (see attack 1s before it happens)
- Nightmare (inflict fear on enemies)

Tier 3:
- Dominate Mind (control enemy for 10s)
- Reality Bend (slow time for 5s)
- Psychic Storm (AOE damage over 5s)
```

### 8.2 Achievement System

**Achievement Categories:**
| Category | Count | Examples |
|----------|-------|----------|
| Story | 10 | Complete Phase 5, Defeat Warden |
| Combat | 15 | 100 kills, Perfect parry x10 |
| Exploration | 10 | Find all secrets in Phase 3 |
| Survival | 10 | Survive 10 min in Phase 10 |
| Challenge | 15 | No damage boss, Solo melee only |
| Meta | 10 | Die 100 times, Play 50 hours |

**Achievement Rewards:**
- Skin unlocks (cosmetic only)
- Title badges (displayed in menu)
- Stat trackers
- New game mode unlocks
- Soundtrack/Art unlocks

### 8.3 New Game Plus

**NG+ Progression:**
```
NG+ (Unlocked after first completion):
- Keep all skills and items
- +1 enemy tier
- +10% damage taken
- New enemy placements
- Unique NG+ dialogue

NG+2:
- All NG+ bonuses
- +2 enemy tiers
- +25% damage taken
- Bosses gain new attacks

NG+5 (Max):
- All previous bonuses
- +5 enemy tiers
- +50% damage taken
- "Hellaphobia Mode" available
- Golden weapon skins
```

**NG+ Exclusive Content:**
- Reverse dungeon (start at boss, go backwards)
- Mirror mode (left/right flipped)
- Boss rush mode
- Speedrun mode with timers

### 8.4 Daily/Weekly Challenges

**Daily Challenge:**
- Fixed seed (same level for everyone)
- Special modifier (e.g., "low gravity", "shotgun only")
- Leaderboard by completion time
- Reward: Currency for shop

**Weekly Challenge:**
- Longer, multi-phase run
- Multiple modifiers stacked
- Harder but better rewards
- Exclusive weekly achievements

**Challenge Modifiers:**
```javascript
const Modifiers = {
    GLASS_CANNON: { dmg: 3, health: 0.3 },
    INVISIBLE: { playerInvisible: true, butSoundReveals: true },
    BOSS_RUSH: { onlyBosses: true, backToBack: true },
    SPEEDRUN: { timer: 300, rewardIfComplete: true },
    PACIFIST: { noKilling: true, mustEvade: true },
    MELEE_ONLY: { rangedDisabled: true, meleeOnly: true }
};
```

### Success Criteria
- [ ] 5 skill trees with 3 tiers each
- [ ] 70+ achievements implemented
- [ ] NG+ with 5 progression levels
- [ ] Daily/weekly challenges functional
- [ ] Rewards meaningful but not pay-to-win

---

# 🎵 PHASE 9: AUDIO VISUAL SYNERGY

## Duration: 1 week
## Lines of Code: ~1,200 + Audio Assets

### 9.1 Dynamic Soundtrack 2.0

**Adaptive Music System:**
```
Layers (stackable):
├── Base: Ambient drone (always playing)
├── Rhythm: Percussion (adds on danger)
├── Melody: Main theme (adds on combat)
├── Harmony: Supporting instruments (adds on exploration)
└── FX: Stingers, hits (event-triggered)

Intensity Triggers:
- 0 enemies: Base only
- 1-2 enemies: Base + Rhythm
- 3+ enemies: Base + Rhythm + Melody
- Boss fight: All layers + FX
- Low HP: Add dissonant harmony
- Low sanity: Distorted versions of layers
```

**Music Transitions:**
- Beat-matched transitions (no jarring cuts)
- Crossfade duration: 2-4 beats
- Stingers on major events (boss spawn, phase change)
- Silence used intentionally (before jumpscares)

### 9.2 Audio-Reactive Visuals

**Visuals React to Audio:**
| Audio Event | Visual Response |
|-------------|-----------------|
| Bass hit | Screen shake (subtle) |
| High frequencies | Particle sparkle |
| Music intensity | Light flicker rate |
| Monster roar | Chromatic aberration spike |
| Player heartbeat | Vignette pulse |

**Implementation:**
```javascript
const AudioReactivity = {
    analyzeFFT() {
        // Get frequency data
        const bass = getAverage(0-100Hz);
        const mids = getAverage(100-3000Hz);
        const highs = getAverage(3000-20000Hz);

        // Apply to visuals
        this.shakeIntensity = bass * 0.5;
        this.particleSpawnRate = highs * 2;
        this.lightFlicker = mids * 0.3;
    }
};
```

### 9.3 Voice Acting

**Voice Categories:**
| Type | Lines | Usage |
|------|-------|-------|
| Boss Intro | 3-5 per boss | When boss spawns |
| Boss Taunt | 10-15 per boss | During combat |
| Boss Defeat | 2-3 per boss | On death |
| Narrator | 20-30 | Story transitions |
| Whispers | 50+ | Sanity effects |
| Player Grunts | 10 | Hurt, effort, death |

**Voice Processing:**
- Pitch shift for supernatural effect
- Reverb for dungeon acoustics
- Distortion for corrupted entities
- Backwards audio for eerie moments

### 9.4 Sound Design Polish

**Foley Work:**
- Unique footsteps per surface (8+ surfaces)
- Clothing rustle on player movement
- Weapon swooshes (unique per weapon)
- Monster vocalizations (each type distinct)
- UI sounds (satisfying clicks, hovers)

**Ambient Layers:**
```
Dungeon Ambient =
    Base drone (50Hz sine)
    + Occasional drip (random 3-8s)
    + Distant creak (random 5-15s)
    + Wind howl (random 10-30s)
    + Rat scuttle (rare, 1/60s)
```

**3D Audio:**
- HRTF for headphone users
- Distance-based EQ rolloff
- Occlusion through walls
- Reflections (echo in large rooms)

### Success Criteria
- [ ] 5-layer adaptive music system
- [ ] Audio-reactive visuals implemented
- [ ] Voice acting for all bosses
- [ ] Complete foley library
- [ ] 3D audio positioning working

---

# 🚀 PHASE 10: POLISH & OPTIMIZATION

## Duration: 1.5 weeks
## Lines of Code: ~1,500 + Testing

### 10.1 Performance Optimization

**Target Metrics:**
| Platform | Resolution | Target FPS | Max Draw Calls |
|----------|------------|------------|----------------|
| High-end PC | 1920x1080 | 144 | 500 |
| Mid PC | 1920x1080 | 60 | 300 |
| Low-end PC | 1280x720 | 60 | 200 |
| Integrated | 1280x720 | 30 | 100 |

**Optimization Techniques:**
- Object pooling (particles, projectiles, sounds)
- Texture atlasing (reduce texture binds)
- Instanced rendering (batch identical sprites)
- Level of detail (fewer particles at distance)
- Frustum culling (don't render off-screen)
- Occlusion culling (don't render behind walls)

**Memory Budget:**
```
Texture Memory: 80 MB
Audio Memory: 30 MB
Geometry: 10 MB
Code + State: 20 MB
Overhead: 10 MB
Total: 150 MB
```

### 10.2 Bug Fixing & QA

**Testing Checklist:**
- [ ] No crashes after 1 hour continuous play
- [ ] No softlocks (can always progress)
- [ ] All achievements unlockable
- [ ] Save system reliable (no corruption)
- [ ] All bosses defeatable (no impossible states)
- [ ] Visual effects don't obscure gameplay
- [ ] Audio levels balanced (no clipping)

**Edge Cases:**
- Rapid-fire inputs (button mashing)
- Alt-tab during critical moments
- Low disk space (save failures)
- Audio device disconnect
- Multiple monitors

### 10.3 Accessibility Features

**Visual Accessibility:**
- Colorblind modes (protanopia, deuteranopia, tritanopia)
- High contrast mode
- Screen reader support for menus
- Subtitles for all audio (including ambient)
- Visual indicators for audio cues

**Motor Accessibility:**
- Toggle holds (no sustained button presses)
- Input buffering (forgiving timing)
- Remappable controls
- One-handed mode
- Auto-dodge option

**Cognitive Accessibility:**
- Objective markers (can toggle)
- Reduced flashing option
- Calm mode (fewer visual effects)
- Extended time on timers
- Simplified UI option

**Hearing Accessibility:**
- Visual subtitles (show direction of sounds)
- Visual warnings for audio telegraphs
- Separate volume sliders
- Mono audio option

### 10.4 Final Polish Pass

**Game Feel Improvements:**
- Hit stop on heavy impacts (5-10 frames)
- Screen shake proportional to impact
- Animation canceling (responsive controls)
- Coyote time (grace period for jumps)
- Input buffering (queue next action)

**Visual Polish:**
- Smooth camera follow (no jitter)
- Anticipation frames before attacks
- Follow-through on animations
- Particle density scales with action
- UI animations (slide, fade, pop)

**Audio Polish:**
- No abrupt cut-offs
- Proper fade in/out
- Consistent volume levels
- No looping artifacts
- Spatial audio accurate

### 10.5 Launch Preparation

**Build Process:**
- Automated build pipeline
- Version numbering
- Changelog generation
- Asset optimization on export
- Minification and bundling

**Distribution:**
- itch.io page setup
- Steam store page (if applicable)
- Social media assets
- Trailer (gameplay + cinematic)
- Press kit

**Post-Launch Plan:**
| Week | Content |
|------|---------|
| 1-2 | Bug fixes from feedback |
| 3-4 | Balance patch based on data |
| 5-8 | Free DLC (new boss, weapons) |
| 9-12 | Community features (workshop) |
| 13+ | Sequel planning / expansion |

### Success Criteria
- [ ] 60 FPS on mid-range PC
- [ ] <150 MB memory usage
- [ ] Zero critical bugs
- [ ] Full accessibility support
- [ ] Ready for public release

---

# 📈 OVERALL ROADMAP SUMMARY

## Timeline
| Phase | Duration | Cumulative |
|-------|----------|------------|
| 1: Visual Foundation | 1 week | Week 1 |
| 2: Boss AI Revolution | 1.5 weeks | Week 2.5 |
| 3: Environmental Storytelling | 1 week | Week 3.5 |
| 4: Difficulty Overhaul | 1 week | Week 4.5 |
| 5: Psychological Horror | 1 week | Week 5.5 |
| 6: Combat Rework | 1.5 weeks | Week 7 |
| 7: Procedural Gen 2.0 | 1 week | Week 8 |
| 8: Progression & Rewards | 1 week | Week 9 |
| 9: Audio Visual Synergy | 1 week | Week 10 |
| 10: Polish & Optimization | 1.5 weeks | Week 11.5 |

**Total: 11.5 weeks (~3 months)**

## Code Estimates
| Phase | New Lines | Modified Lines |
|-------|-----------|----------------|
| 1 | 2,000 | 500 |
| 2 | 2,500 | 800 |
| 3 | 1,500 | 400 |
| 4 | 1,200 | 600 |
| 5 | 1,800 | 500 |
| 6 | 2,000 | 1,000 |
| 7 | 1,800 | 700 |
| 8 | 1,500 | 400 |
| 9 | 1,200 | 800 |
| 10 | 1,500 | 1,000 |

**Total: ~17,000 new lines, ~6,700 modified lines**

## Priority Order (If Time Constrained)
1. **Phase 1** - Visual foundation (everything else depends on this)
2. **Phase 2** - Boss AI (core gameplay pillar)
3. **Phase 6** - Combat (player interaction)
4. **Phase 4** - Difficulty (accessibility + challenge)
5. **Phase 10** - Polish (shipping quality)
6. **Phase 5** - Psychological horror (unique selling point)
7. **Phase 9** - Audio synergy (immersion)
8. **Phase 7** - Procedural gen (replayability)
9. **Phase 8** - Progression (retention)
10. **Phase 3** - Environmental storytelling (nice-to-have)

---

## 🎯 SUCCESS METRICS

After completing all 10 phases:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Visual Quality | Canvas 2D | WebGL + Post-FX | AAA browser game |
| Boss Fights | 3 basic | 3 complex + phases | Memorable encounters |
| Combat | Basic | Deep + skill-based | Competitive viability |
| Difficulty | Binary | 4 tiers + DDA | 70% Normal completion |
| Horror | Generic | Multi-layered | Industry benchmark |
| Audio | Procedural | Full soundtrack | Immersive experience |
| Progression | None | 5 trees + NG+ | 50+ hour retention |
| Performance | Uncapped | Optimized 60 FPS | Smooth experience |
| Accessibility | None | Full support | Playable by all |
| Polish | Prototype | Ship-ready | Professional quality |

---

*This roadmap represents a complete transformation of Hellaphobia into a premium horror experience. Each phase builds on the previous, creating a cohesive vision of psychological horror excellence.*
