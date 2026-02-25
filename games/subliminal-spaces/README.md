# 🌀 Subliminal Spaces - Procedural Liminal Horror

**Phase 31 Implementation** - 2026 Ultimate Roadmap  
**Status:** ✅ PROTOTYPE COMPLETE  
**Genre:** Psychological Liminal Horror  
**Engine:** WebGPU/WebGL with Ray Marching

---

## Overview

Subliminal Spaces is an infinitely explorable psychological horror game set in procedurally generated liminal architecture. There are no traditional enemies—the horror comes from the architecture itself, your own mind, and the faces you see in the walls.

> "The backstage of reality, where the architecture watches back."

---

## Features

### Core Mechanics
- ✅ **Infinite Procedural Generation** - WFC-based architecture that never repeats
- ✅ **Ray-Marched Lighting** - Real-time global illumination and soft shadows  
- ✅ **Pareidolia Engine** - Sees faces and figures in architectural patterns
- ✅ **Sanity System** - Reality stability degrades with exposure
- ✅ **Psychological Effects** - Hallucinations, déjà vu, dissociation

### Horror Systems
- **Liminal Space Themes:** 8 distinct themes (office, mall, school, hospital, hotel, parking garage, pool rooms, backrooms)
- **Recognition Phases:** Hidden → Peripheral → Recognized → Staring
- **Reality Distortion:** Geometry shifts, texture crawl, color desaturation, non-Euclidean geometry
- **Audio Horror:** 17Hz infrasound, binaural whispers, generative drones

---

## Technical Implementation

### Files Created
1. `subliminal-spaces.html` - Main HTML structure with UI overlay
2. `subliminal-spaces.js` - Core game loop, rendering, input handling
3. `procedural-architecture.js` - WFC-based generation system
4. `psychological-effects.js` - Pareidolia engine and hallucinations
5. `ambient-system.js` - Generative audio soundscapes

### Dependencies
- `../../core/renderer/WebGPURenderer2026.js` - Next-gen renderer
- `../../core/procedural/WaveFunctionCollapse.js` - Procedural generation
- `../../core/vfx/RayMarchingRenderer.js` - Ray marching effects

### Performance Targets
- **60 FPS** with ray marching enabled
- **WebGPU** primary, **WebGL** fallback
- **Zero loading screens** via chunk streaming
- **<200ms** chunk generation time

---

## How to Play

### Controls
- **WASD / Arrow Keys** - Move
- **Mouse** - Look around
- **Shift** - Sprint
- **E** - Interact
- **ESC** - Pause / unlock cursor

### Objective
There is no traditional objective. Explore the infinite liminal spaces, maintain your sanity, and discover what lies in the deepest architecture. The game ends when your sanity reaches zero—or when you choose to leave.

### Tips
- Avoid staring at faces in the walls
- Your peripheral vision is more sensitive than direct sight
- Lower sanity = more distortions but also more revelations
- Some areas are safer than others

---

## Psychological Systems

### Sanity Meter (Reality Stability)
- **100-70%**: Normal perception
- **70-40%**: Mild hallucinations (peripheral movement)
- **40-20%**: Moderate hallucinations (shadow figures, whispers)
- **20-10%**: Severe hallucinations (reality breaks)
- **<10%**: Critical (dissociative episodes)

### Pareidolia Recognition
1. **Hidden** - Not yet detected
2. **Peripheral** - Felt but not seen clearly
3. **Recognized** - Face pattern visible
4. **Staring** - Full recognition, intense effect

---

## Audio Design

### Layers
1. **Drone** - Generative harmonic foundation (A series: 55, 110, 220, 440 Hz)
2. **Ambience** - Pink noise environmental texture
3. **Infrasound** - 17Hz sine wave (fight-or-flight trigger)
4. **Whispers** - Binaural processed noise bursts
5. **Effects** - Dynamic psychological event sounds

### Psychoacoustics
- **17Hz Infrasound**: Scientifically proven to cause dread/unease
- **Binaural Beats**: Different frequencies per ear create anxiety
- **Generative Music**: Never repeats, always evolving

---

## Architecture Themes

### 1. Office Liminal
- Cubicles, fluorescent lights, carpet tiles
- Humming lights, endless corridors
- Uncanny corporate emptiness

### 2. Mall Liminal
- Storefronts, kiosks, benches
- Skylights, potted plants
- Dead commerce aesthetic

### 3. School Liminal
- Lockers, classroom doors, trophy cases
- Water fountains, linoleum floors
- After-hours emptiness

### 4. Hospital Liminal
- Gurneys, IV stands, wheelchairs
- Hand sanitizer stations
- Sterile white corridors

### 5. Hotel Liminal
- Luggage carts, potted plants
- Elevator doors, ice machines
- Transient space between places

### 6. Parking Garage
- Concrete pillars, parking spaces
- Pay stations, exit signs
- Brutalist concrete maze

### 7. Pool Rooms
- Tiled walls, drains
- Underwater benches, submerged doors
- Aquatic liminality

### 8. Backrooms
- Yellow wallpaper, humming lights
- Damp carpet, mono-yellow
- Classic internet horror

---

## Future Enhancements (Post-Prototype)

### Phase 31 Complete When:
- [x] Basic procedural generation
- [x] Ray marching integration
- [x] Pareidolia engine
- [x] Sanity system
- [x] Audio system
- [ ] Multiplayer co-op exploration
- [ ] Photo mode with filters
- [ ] Speedrun timer
- [ ] Achievement system
- [ ] Custom theme creation

---

## Known Issues

- WebGL fallback lacks some ray marching features
- Chunk transitions can be visible on slower hardware
- Audio requires user interaction to start (browser policy)

---

## Credits

**Implementation:** ScaryGamesAI Development Team  
**Phase:** 31 of 50 (2026 Ultimate Roadmap)  
**Date:** February 19, 2026  
**Status:** Prototype Complete ✅

---

## Trigger Warning

This game contains:
- Psychological horror elements
- Deliberate unease and anxiety induction
- Infrasound audio (may cause discomfort)
- Themes of isolation and dissociation

**Not recommended for players with:**
- Anxiety disorders
- Panic disorder
- Sound sensitivity
- Claustrophobia

Player discretion is advised. This is a horror experience designed to unsettle.

---

*"There are no monsters here. Only architecture. Only you. Only the faces in the walls."*
