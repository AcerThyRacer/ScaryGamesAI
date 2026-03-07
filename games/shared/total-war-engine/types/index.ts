/**
 * Total War Engine - Core Type Definitions
 * TypeScript strict types for the entire engine
 */

// ============================================================================
// ECS Core Types
// ============================================================================

export type EntityId = number;
export type ComponentTypeId = string;

export interface IComponent {
  readonly type: ComponentTypeId;
}

export interface ISystem {
  readonly name: string;
  readonly requiredComponents: ComponentTypeId[];
  readonly priority: number;
  update(entities: Entity[], deltaTime: number): void;
  init?(): void;
  destroy?(): void;
}

export interface Entity {
  id: EntityId;
  active: boolean;
  components: Map<ComponentTypeId, IComponent>;
}

// ============================================================================
// Transform & Spatial
// ============================================================================

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  dirty: boolean;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface BoundingSphere {
  center: Vector3;
  radius: number;
}

export interface Ray {
  origin: Vector3;
  direction: Vector3;
}

// ============================================================================
// Components
// ============================================================================

export interface TransformComponent extends IComponent {
  type: 'transform';
  localPosition: Vector3;
  localRotation: Quaternion;
  localScale: Vector3;
  worldPosition: Vector3;
  worldRotation: Quaternion;
  parent: EntityId | null;
  children: EntityId[];
  dirty: boolean;
}

export interface VelocityComponent extends IComponent {
  type: 'velocity';
  linear: Vector3;
  angular: Vector3;
  maxSpeed: number;
  acceleration: number;
  deceleration: number;
}

export interface HealthComponent extends IComponent {
  type: 'health';
  current: number;
  max: number;
  regenRate: number;
  armor: number;
  damageModifiers: Map<string, number>;
  invulnerable: boolean;
  dead: boolean;
  deathTime: number;
}

export interface CombatComponent extends IComponent {
  type: 'combat';
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;
  attackCooldown: number;
  currentCooldown: number;
  attackType: 'melee' | 'ranged' | 'siege';
  target: EntityId | null;
  inCombat: boolean;
  chargeBonus: number;
  armorPenetration: number;
}

export interface FactionComponent extends IComponent {
  type: 'faction';
  team: 'blue' | 'red' | 'neutral';
  factionId: string;
  hostilityMatrix: Map<string, boolean>;
  allyIds: Set<string>;
  enemyIds: Set<string>;
}

export interface MovementComponent extends IComponent {
  type: 'movement';
  targetPosition: Vector3 | null;
  path: Vector3[];
  pathIndex: number;
  speed: number;
  turnRate: number;
  formationOffset: Vector2;
  formationSlot: number;
}

export interface FormationComponent extends IComponent {
  type: 'formation';
  formationType: FormationType;
  width: number;
  depth: number;
  spacing: number;
  locked: boolean;
  leaderId: EntityId | null;
  memberId: number;
}

export interface AIComponent extends IComponent {
  type: 'ai';
  state: AIState;
  stateTimer: number;
  target: EntityId | null;
  lastKnownTargetPos: Vector3 | null;
  memory: AIMemory;
  behavior: AIBehavior;
}

export interface AnimationComponent extends IComponent {
  type: 'animation';
  currentState: AnimationState;
  previousState: AnimationState;
  stateTime: number;
  blendTime: number;
  animationSpeed: number;
  triggers: Set<string>;
}

export interface RenderComponent extends IComponent {
  type: 'render';
  meshId: string;
  materialId: string;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  lodLevel: number;
  lodDistances: number[];
  billboard: boolean;
}

export interface SelectionComponent extends IComponent {
  type: 'selection';
  selected: boolean;
  selectable: boolean;
  hover: boolean;
  selectionPriority: number;
}

// ============================================================================
// Formation Types
// ============================================================================

export type FormationType =
  | 'line'
  | 'column'
  | 'wedge'
  | 'square'
  | 'circle'
  | 'shield_wall'
  | 'testudo'
  | 'phalanx'
  | 'crescent'
  | 'skirmish'
  | 'envelopment'
  | 'echelon';

export interface FormationData {
  type: FormationType;
  name: string;
  description: string;
  bonuses: FormationBonus[];
  penalties: FormationPenalty[];
  unlockRequirement?: string;
}

export interface FormationBonus {
  type: 'defense' | 'attack' | 'speed' | 'charge' | 'morale' | 'missile_block';
  value: number;
}

export interface FormationPenalty {
  type: 'speed' | 'attack' | 'defense' | 'visibility';
  value: number;
}

// ============================================================================
// AI Types
// ============================================================================

export type AIState =
  | 'idle'
  | 'patrol'
  | 'chase'
  | 'attack'
  | 'flee'
  | 'guard'
  | 'retreat'
  | 'rally'
  | 'siege'
  | 'ambush';

export interface AIMemory {
  lastEnemyPosition: Vector3 | null;
  lastEnemyTime: number;
  knownEnemyPositions: Vector3[];
  threatLevel: number;
  moraleModifier: number;
}

export interface AIBehavior {
  aggression: number;
  caution: number;
  intelligence: number;
  coordination: number;
  specialRules: string[];
}

// ============================================================================
// Animation Types
// ============================================================================

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'charge'
  | 'attack_melee'
  | 'attack_ranged'
  | 'defend'
  | 'death'
  | 'victory'
  | 'rally'
  | 'flee'
  | 'swim'
  | 'climb';

// ============================================================================
// Unit Types
// ============================================================================

export type UnitCategory = 'infantry' | 'cavalry' | 'ranged' | 'siege' | 'naval' | 'special';
export type UnitTier = 'militia' | 'regular' | 'veteran' | 'elite' | 'legendary';

export interface UnitStats {
  health: number;
  armor: number;
  meleeAttack: number;
  meleeDefense: number;
  chargeBonus: number;
  rangedAttack: number;
  range: number;
  accuracy: number;
  speed: number;
  morale: number;
  stamina: number;
  upkeep: number;
  recruitCost: number;
  recruitTime: number;
}

export interface UnitData {
  id: string;
  name: string;
  description: string;
  category: UnitCategory;
  tier: UnitTier;
  faction: string;
  era: string;
  stats: UnitStats;
  abilities: string[];
  formations: FormationType[];
  requirements: string[];
  upgrades: string[];
}

// ============================================================================
// Combat Types
// ============================================================================

export interface DamageResult {
  targetId: EntityId;
  damage: number;
  blocked: number;
  armorAbsorbed: number;
  critical: boolean;
  killed: boolean;
  damageType: DamageType;
}

export type DamageType = 'physical' | 'piercing' | 'crushing' | 'fire' | 'poison' | 'holy' | 'necrotic';

export interface CombatEvent {
  type: 'attack' | 'kill' | 'rout' | 'rally' | 'charge' | 'ability';
  attackerId: EntityId;
  targetId?: EntityId;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Campaign Types
// ============================================================================

export interface Province {
  id: string;
  name: string;
  ownerId: string;
  settlementId: string;
  resources: Resource[];
  buildings: Building[];
  publicOrder: number;
  taxRate: number;
  fertility: number;
}

export interface Settlement {
  id: string;
  name: string;
  type: 'village' | 'town' | 'city' | 'fortress' | 'capital';
  provinceId: string;
  population: number;
  garrison: EntityId[];
  siegeState?: SiegeState;
}

export interface Resource {
  type: ResourceType;
  amount: number;
  maxAmount: number;
  growthRate: number;
}

export type ResourceType = 'gold' | 'food' | 'materials' | 'manpower' | 'influence';

export interface Building {
  id: string;
  type: BuildingType;
  level: number;
  constructionProgress: number;
  active: boolean;
}

export type BuildingType =
  | 'farm'
  | 'mine'
  | 'barracks'
  | 'stable'
  | 'market'
  | 'temple'
  | 'wall'
  | 'port'
  | 'workshop';

export interface SiegeState {
  besiegerId: string;
  turnCount: number;
  wallsBreached: number;
  siegeEngines: string[];
  suppliesRemaining: number;
}

// ============================================================================
// Diplomacy Types
// ============================================================================

export type DiplomaticStatus =
  | 'war'
  | 'peace'
  | 'alliance'
  | 'defensive_pact'
  | 'non_aggression'
  | 'vassal'
  | 'overlord'
  | 'trade_agreement';

export interface DiplomaticRelation {
  faction1Id: string;
  faction2Id: string;
  status: DiplomaticStatus;
  trust: number;
  fear: number;
  history: DiplomaticEvent[];
  treaties: Treaty[];
}

export interface Treaty {
  id: string;
  type: DiplomaticStatus;
  duration: number;
  turnsRemaining: number;
  conditions: string[];
}

export interface DiplomaticEvent {
  type: 'war_declared' | 'peace_offered' | 'alliance_formed' | 'treaty_broken';
  turn: number;
  initiatorId: string;
  targetId: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type GameEventType =
  | 'unit_spawned'
  | 'unit_died'
  | 'unit_routed'
  | 'unit_rallied'
  | 'battle_started'
  | 'battle_ended'
  | 'settlement_captured'
  | 'faction_defeated'
  | 'faction_victorious'
  | 'diplomatic_event'
  | 'economic_event';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  entityCount: number;
  activeEntityCount: number;
  drawCalls: number;
  triangles: number;
  memoryUsed: number;
  gpuMemoryUsed: number;
}

export interface LODLevel {
  distance: number;
  entityCount: number;
  detailLevel: 'full' | 'simplified' | 'billboard';
}
