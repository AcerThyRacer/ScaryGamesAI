/**
 * Total War Engine - Main Entry Point
 * Complete overhaul for Total Zombies Rome & Medieval
 * 
 * Features:
 * - 80+ unit types across two eras
 * - 40+ zombie types with unique abilities
 * - Full campaign layer with provinces, settlements, armies
 * - Advanced tactical AI with terrain analysis
 * - Strategic AI with goal-oriented planning
 * - 12 historical formations with bonuses
 * - Hero/Commander system with skill trees
 * - WebGPU/WebGL2 renderer with LOD
 * - 3D positional audio
 * - Dynamic music system
 */

// Core
export { World, EntityManager, ComponentManager, SystemManager, SpatialPartition } from './core/ECSCore';
export { AdvancedRenderer, detectGPUCapabilities, QUALITY_PRESETS, MATERIAL_PRESETS, LODSystem } from './core/AdvancedRenderer';

// Systems
export { CombatSystem, MoraleSystem, ProjectileSystem, CombatMath, COMBAT_CONSTANTS } from './systems/CombatSystem';
export { FormationSystem, FormationSlotCalculator, FORMATIONS } from './systems/FormationSystem';
export { TacticalAI, TerrainAnalyzer, AI_CONSTANTS } from './systems/TacticalAI';
export { StrategicAI, GOAPPlanner, StrategicDecision, STRATEGIC_CONSTANTS } from './systems/StrategicAI';
export { CampaignMap, HexGrid, CAMPAIGN_CONSTANTS } from './systems/CampaignMap';
export { EconomySystem, ResourceManager, BUILDING_DEFINITIONS, ECONOMY_CONSTANTS } from './systems/EconomySystem';
export { DiplomacySystem, CASUS_BELLI, MODIFIERS, DIPLOMACY_CONSTANTS } from './systems/DiplomacySystem';
export { AnimationSystem, AnimationStateMachine, AnimationClip, AnimationInstance } from './systems/AnimationSystem';
export { AudioSystem, AudioTrack, AudioInstance, MusicState } from './systems/AudioSystem';
export { HeroSystem, HeroData, HeroAbility, ROME_HEROES, MEDIEVAL_HEROES } from './systems/HeroSystem';

// Data
export { UNIT_DATABASE, ALL_UNITS, ROME_UNITS, MEDIEVAL_UNITS, getUnitById, getUnitsByFaction } from './data/Units';
export { ZOMBIE_DATABASE, ALL_ZOMBIES, getZombieById, getZombieWaveComposition, getRandomZombie } from './data/ZombieTypes';

// Types
export * from './types';

// ============================================================================
// Quick Start Example
// ============================================================================

/**
 * Initialize a Total War game:
 * 
 * ```typescript
 * import { World, AdvancedRenderer, CampaignMap, CombatSystem } from 'total-war-engine';
 * 
 * // Create game world
 * const world = new World(200);
 * const renderer = new AdvancedRenderer(canvas);
 * await renderer.initialize();
 * 
 * // Create campaign
 * const campaign = new CampaignMap(100, 80);
 * 
 * // Create combat system
 * const combat = new CombatSystem();
 * 
 * // Game loop
 * function gameLoop() {
 *   world.update();
 *   renderer.beginFrame();
 *   // Render units...
 *   renderer.endFrame();
 *   requestAnimationFrame(gameLoop);
 * }
 * ```
 */
