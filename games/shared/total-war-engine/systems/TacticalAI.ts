/**
 * Total War Engine - Tactical AI
 * Battle AI with terrain analysis, flanking, and reserve management
 */

import type {
  Entity,
  EntityId,
  Vector3,
  AIState,
  AIComponent,
  CombatComponent,
  HealthComponent,
  FactionComponent,
  MovementComponent,
  FormationComponent,
  BoundingBox,
} from '../types';

// ============================================================================
// AI Constants
// ============================================================================

export const AI_CONSTANTS = {
  // Detection
  VISION_RANGE: 50,
  HEARING_RANGE: 30,
  INVESTIGATION_RANGE: 20,

  // Combat behavior
  AGGRESSION_DECISION_THRESHOLD: 0.6,
  RETREAT_HEALTH_THRESHOLD: 0.25,
  ENGAGE_RATIO: 1.2, // Engage if allies > enemies * this

  // Movement
  FLANKING_DISTANCE: 15,
  RESERVE_DISTANCE: 30,
  CHARGE_DISTANCE: 25,

  // Timing
  DECISION_INTERVAL: 0.25, // Seconds between AI decisions
  PATHFINDING_INTERVAL: 0.5,

  // Coordination
  COORDINATION_RANGE: 40,
};

// ============================================================================
// Terrain Analysis
// ============================================================================

export interface TerrainAnalysis {
  elevation: number;
  cover: number;
  visibility: number;
  chokepoint: boolean;
  strategicValue: number;
}

export class TerrainAnalyzer {
  private terrainData: Map<string, TerrainAnalysis> = new Map();

  analyze(position: Vector3, mapSize: number): TerrainAnalysis {
    const key = `${Math.round(position.x)},${Math.round(position.z)}`;

    if (this.terrainData.has(key)) {
      return this.terrainData.get(key)!;
    }

    // Simplified terrain analysis
    const analysis: TerrainAnalysis = {
      elevation: 0,
      cover: this.calculateCover(position),
      visibility: this.calculateVisibility(position),
      chokepoint: this.isChokepoint(position),
      strategicValue: this.calculateStrategicValue(position, mapSize),
    };

    this.terrainData.set(key, analysis);
    return analysis;
  }

  private calculateCover(position: Vector3): number {
    // Would check for nearby obstacles
    return 0;
  }

  private calculateVisibility(position: Vector3): number {
    // Would check line of sight
    return 1.0;
  }

  private isChokepoint(position: Vector3): boolean {
    // Would check for bridges, passes, etc.
    return false;
  }

  private calculateStrategicValue(position: Vector3, mapSize: number): number {
    const centerX = 0;
    const centerZ = 0;
    const distFromCenter = Math.sqrt(
      Math.pow(position.x - centerX, 2) + Math.pow(position.z - centerZ, 2)
    );
    return Math.max(0, 1 - distFromCenter / (mapSize / 2));
  }

  findBestPosition(
    center: Vector3,
    radius: number,
    criteria: (pos: Vector3) => number
  ): Vector3 {
    let bestPos = center;
    let bestScore = -Infinity;

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      for (let dist = radius / 4; dist <= radius; dist += radius / 4) {
        const pos: Vector3 = {
          x: center.x + Math.cos(angle) * dist,
          y: 0,
          z: center.z + Math.sin(angle) * dist,
        };
        const score = criteria(pos);
        if (score > bestScore) {
          bestScore = score;
          bestPos = pos;
        }
      }
    }

    return bestPos;
  }

  clear(): void {
    this.terrainData.clear();
  }
}

// ============================================================================
// Tactical Decision
// ============================================================================

interface TacticalDecision {
  action: 'attack' | 'defend' | 'flank' | 'retreat' | 'hold' | 'reserve';
  target?: EntityId;
  targetPosition?: Vector3;
  priority: number;
}

// ============================================================================
// Tactical AI System
// ============================================================================

export class TacticalAI {
  private terrainAnalyzer: TerrainAnalyzer;
  private decisionTimers: Map<EntityId, number> = new Map();
  private squadLeaders: Map<EntityId, EntityId[]> = new Map(); // Leader -> Squad members
  private reserveUnits: Set<EntityId> = new Set();
  private engagedUnits: Set<EntityId> = new Set();

  constructor() {
    this.terrainAnalyzer = new TerrainAnalyzer();
  }

  update(
    entities: Entity[],
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined,
    getNearbyEntities: (pos: Vector3, range: number) => EntityId[],
    deltaTime: number,
    mapSize: number
  ): void {
    // Update decision timers
    for (const entity of entities) {
      const ai = getComponent<AIComponent>(entity.id, 'ai');
      if (!ai) continue;

      const timer = this.decisionTimers.get(entity.id) || 0;
      if (timer <= 0) {
        this.makeDecision(entity.id, ai, getComponent, getNearbyEntities, mapSize);
        this.decisionTimers.set(entity.id, AI_CONSTANTS.DECISION_INTERVAL);
      } else {
        this.decisionTimers.set(entity.id, timer - deltaTime);
      }

      // Execute current state
      this.executeState(entity.id, ai, getComponent, getNearbyEntities, deltaTime);
    }
  }

  private makeDecision(
    entityId: EntityId,
    ai: AIComponent,
    getComponent: <T>(id: EntityId, t: string) => T | undefined,
    getNearbyEntities: (pos: Vector3, range: number) => EntityId[],
    mapSize: number
  ): void {
    const health = getComponent<HealthComponent>(entityId, 'health');
    const combat = getComponent<CombatComponent>(entityId, 'combat');
    const faction = getComponent<FactionComponent>(entityId, 'faction');
    const transform = getComponent<{ localPosition: Vector3 }>(entityId, 'transform');

    if (!health || health.dead || !transform) return;

    const position = transform.localPosition;
    const nearby = getNearbyEntities(position, AI_CONSTANTS.COORDINATION_RANGE);

    // Analyze situation
    const situation = this.analyzeSituation(entityId, nearby, getComponent);

    // Health check - retreat if critically low
    if (health.current / health.max < AI_CONSTANTS.RETREAT_HEALTH_THRESHOLD) {
      this.setAIState(ai, 'retreat');
      return;
    }

    // Find best target
    const bestTarget = this.findBestTarget(entityId, nearby, getComponent);

    if (!bestTarget) {
      // No enemies nearby
      if (ai.state === 'attack' || ai.state === 'chase') {
        this.setAIState(ai, 'patrol');
      }
      return;
    }

    // Decide action based on situation
    const decision = this.calculateBestAction(entityId, situation, bestTarget, getComponent, mapSize);

    // Execute decision
    this.executeDecision(entityId, ai, combat, decision, getComponent);
  }

  private analyzeSituation(
    entityId: EntityId,
    nearbyEntities: EntityId[],
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): SituationAnalysis {
    const faction = getComponent<FactionComponent>(entityId, 'faction');

    let allies = 0;
    let enemies = 0;
    let enemyStrength = 0;
    let allyStrength = 0;

    for (const nearbyId of nearbyEntities) {
      if (nearbyId === entityId) continue;

      const nearbyFaction = getComponent<FactionComponent>(nearbyId, 'faction');
      const nearbyHealth = getComponent<HealthComponent>(nearbyId, 'health');

      if (!nearbyHealth || nearbyHealth.dead) continue;

      const isEnemy = this.areHostile(faction, nearbyFaction);
      const strength = nearbyHealth.current / nearbyHealth.max;

      if (isEnemy) {
        enemies++;
        enemyStrength += strength;
      } else {
        allies++;
        allyStrength += strength;
      }
    }

    return {
      allies,
      enemies,
      allyStrength,
      enemyStrength,
      ratio: enemies > 0 ? (allyStrength + 1) / enemyStrength : Infinity,
      isOutnumbered: enemies > allies * 1.5,
      hasAdvantage: allies > enemies * AI_CONSTANTS.ENGAGE_RATIO,
    };
  }

  private areHostile(faction1?: FactionComponent, faction2?: FactionComponent): boolean {
    if (!faction1 || !faction2) return false;
    if (faction1.team === faction2.team) return false;
    return true;
  }

  private findBestTarget(
    entityId: EntityId,
    nearbyEntities: EntityId[],
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): EntityId | null {
    const faction = getComponent<FactionComponent>(entityId, 'faction');
    const transform = getComponent<{ localPosition: Vector3 }>(entityId, 'transform');

    if (!faction || !transform) return null;

    let bestTarget: EntityId | null = null;
    let bestScore = -Infinity;

    for (const nearbyId of nearbyEntities) {
      const nearbyFaction = getComponent<FactionComponent>(nearbyId, 'faction');
      const nearbyHealth = getComponent<HealthComponent>(nearbyId, 'health');
      const nearbyTransform = getComponent<{ localPosition: Vector3 }>(nearbyId, 'transform');

      if (!nearbyHealth || nearbyHealth.dead) continue;
      if (!this.areHostile(faction, nearbyFaction)) continue;

      // Score targets
      let score = 100;

      // Prefer low health targets
      score += (1 - nearbyHealth.current / nearbyHealth.max) * 50;

      // Prefer closer targets
      if (nearbyTransform) {
        const dist = this.distance(transform.localPosition, nearbyTransform.localPosition);
        score -= dist * 0.5;
      }

      // Prefer ranged units (high priority)
      const nearbyCombat = getComponent<CombatComponent>(nearbyId, 'combat');
      if (nearbyCombat?.attackType === 'ranged') {
        score += 30;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = nearbyId;
      }
    }

    return bestTarget;
  }

  private calculateBestAction(
    entityId: EntityId,
    situation: SituationAnalysis,
    targetId: EntityId,
    getComponent: <T>(id: EntityId, t: string) => T | undefined,
    mapSize: number
  ): TacticalDecision {
    const health = getComponent<HealthComponent>(entityId, 'health');
    const combat = getComponent<CombatComponent>(entityId, 'combat');
    const formation = getComponent<FormationComponent>(entityId, 'formation');
    const transform = getComponent<{ localPosition: Vector3 }>(entityId, 'transform');
    const targetTransform = getComponent<{ localPosition: Vector3 }>(targetId, 'transform');

    // Default: attack
    const decision: TacticalDecision = {
      action: 'attack',
      target: targetId,
      priority: 1,
    };

    // Outnumbered - consider flanking or holding
    if (situation.isOutnumbered) {
      if (formation && this.canFlank(entityId, targetId, getComponent)) {
        decision.action = 'flank';
        decision.targetPosition = this.calculateFlankingPosition(
          transform?.localPosition!,
          targetTransform?.localPosition!,
          AI_CONSTANTS.FLANKING_DISTANCE
        );
      } else {
        decision.action = 'hold';
      }
    }

    // Strong advantage - charge
    if (situation.hasAdvantage && combat?.attackType === 'melee') {
      decision.action = 'attack';
      decision.priority = 2;
    }

    // Reserve management
    if (!this.engagedUnits.has(entityId) && situation.ratio > 2) {
      this.reserveUnits.add(entityId);
      decision.action = 'reserve';
    }

    return decision;
  }

  private canFlank(
    entityId: EntityId,
    targetId: EntityId,
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): boolean {
    const combat = getComponent<CombatComponent>(entityId, 'combat');
    return combat?.attackType === 'melee'; // Only melee units flank
  }

  private calculateFlankingPosition(
    myPos: Vector3,
    targetPos: Vector3,
    distance: number
  ): Vector3 {
    const dx = myPos.x - targetPos.x;
    const dz = myPos.z - targetPos.z;
    const angle = Math.atan2(dz, dx) + Math.PI / 2; // Perpendicular

    return {
      x: targetPos.x + Math.cos(angle) * distance,
      y: 0,
      z: targetPos.z + Math.sin(angle) * distance,
    };
  }

  private executeDecision(
    entityId: EntityId,
    ai: AIComponent,
    combat: CombatComponent | undefined,
    decision: TacticalDecision,
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): void {
    switch (decision.action) {
      case 'attack':
        this.setAIState(ai, 'attack');
        if (combat && decision.target) {
          combat.target = decision.target;
        }
        this.engagedUnits.add(entityId);
        this.reserveUnits.delete(entityId);
        break;

      case 'flank':
        this.setAIState(ai, 'chase');
        if (decision.targetPosition) {
          const movement = getComponent<MovementComponent>(entityId, 'movement');
          if (movement) {
            movement.targetPosition = decision.targetPosition;
          }
        }
        break;

      case 'defend':
      case 'hold':
        this.setAIState(ai, 'guard');
        break;

      case 'retreat':
        this.setAIState(ai, 'flee');
        this.engagedUnits.delete(entityId);
        break;

      case 'reserve':
        this.setAIState(ai, 'idle');
        this.reserveUnits.add(entityId);
        break;
    }
  }

  private executeState(
    entityId: EntityId,
    ai: AIComponent,
    getComponent: <T>(id: EntityId, t: string) => T | undefined,
    getNearbyEntities: (pos: Vector3, range: number) => EntityId[],
    deltaTime: number
  ): void {
    const movement = getComponent<MovementComponent>(entityId, 'movement');
    const combat = getComponent<CombatComponent>(entityId, 'combat');
    const transform = getComponent<{ localPosition: Vector3 }>(entityId, 'transform');

    switch (ai.state) {
      case 'attack':
        // Move toward and attack target
        if (combat?.target) {
          const targetTransform = getComponent<{ localPosition: Vector3 }>(combat.target, 'transform');
          if (targetTransform && movement) {
            movement.targetPosition = { ...targetTransform.localPosition };
          }
        }
        break;

      case 'flee':
        // Move away from enemies
        if (transform && movement) {
          const enemies = this.getNearestEnemies(entityId, getNearbyEntities, transform.localPosition);
          if (enemies.length > 0) {
            const fleeDir = this.calculateFleeDirection(entityId, enemies, getComponent);
            movement.targetPosition = {
              x: transform.localPosition.x + fleeDir.x * 20,
              y: 0,
              z: transform.localPosition.z + fleeDir.z * 20,
            };
          }
        }
        break;

      case 'guard':
        // Hold position, attack if enemy in range
        if (combat && transform) {
          const nearbyEnemies = this.getNearestEnemies(
            entityId,
            getNearbyEntities,
            transform.localPosition
          );
          if (nearbyEnemies.length > 0) {
            combat.target = nearbyEnemies[0];
          }
        }
        break;
    }

    ai.stateTimer += deltaTime;
  }

  private getNearestEnemies(
    entityId: EntityId,
    getNearbyEntities: (pos: Vector3, range: number) => EntityId[],
    position: Vector3
  ): EntityId[] {
    // Would use spatial partition to find enemies
    return [];
  }

  private calculateFleeDirection(
    entityId: EntityId,
    enemies: EntityId[],
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): Vector3 {
    let totalX = 0;
    let totalZ = 0;
    const transform = getComponent<{ localPosition: Vector3 }>(entityId, 'transform');

    for (const enemyId of enemies) {
      const enemyTransform = getComponent<{ localPosition: Vector3 }>(enemyId, 'transform');
      if (enemyTransform && transform) {
        const dx = transform.localPosition.x - enemyTransform.localPosition.x;
        const dz = transform.localPosition.z - enemyTransform.localPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0) {
          totalX += dx / dist;
          totalZ += dz / dist;
        }
      }
    }

    const len = Math.sqrt(totalX * totalX + totalZ * totalZ);
    return len > 0 ? { x: totalX / len, y: 0, z: totalZ / len } : { x: 1, y: 0, z: 0 };
  }

  private setAIState(ai: AIComponent, newState: AIState): void {
    if (ai.state !== newState) {
      ai.state = newState;
      ai.stateTimer = 0;
    }
  }

  private distance(a: Vector3, b: Vector3): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.z - b.z, 2));
  }

  // === Squad Coordination ===

  assignSquad(leaderId: EntityId, members: EntityId[]): void {
    this.squadLeaders.set(leaderId, members);
  }

  coordinateSquad(
    leaderId: EntityId,
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): void {
    const members = this.squadLeaders.get(leaderId);
    if (!members) return;

    const leaderAI = getComponent<AIComponent>(leaderId, 'ai');
    if (!leaderAI) return;

    // Sync member states with leader
    for (const memberId of members) {
      const memberAI = getComponent<AIComponent>(memberId, 'ai');
      if (memberAI) {
        memberAI.behavior.coordination = leaderAI.behavior.coordination;
      }
    }
  }

  // === Siege Tactics ===

  planSiegeAssault(
    attackers: EntityId[],
    walls: BoundingBox[],
    getComponent: <T>(id: EntityId, t: string) => T | undefined
  ): void {
    // Assign units to siege roles
    const siegeEngines: EntityId[] = [];
    const assaultTeams: EntityId[] = [];
    const ranged: EntityId[] = [];

    for (const attackerId of attackers) {
      const combat = getComponent<CombatComponent>(attackerId, 'combat');
      if (combat?.attackType === 'siege') {
        siegeEngines.push(attackerId);
      } else if (combat?.attackType === 'ranged') {
        ranged.push(attackerId);
      } else {
        assaultTeams.push(attackerId);
      }
    }

    // Position siege engines
    // Create breach points
    // Coordinate assault waves
  }

  getTerrainAnalyzer(): TerrainAnalyzer {
    return this.terrainAnalyzer;
  }

  getReserveCount(): number {
    return this.reserveUnits.size;
  }

  getEngagedCount(): number {
    return this.engagedUnits.size;
  }
}

interface SituationAnalysis {
  allies: number;
  enemies: number;
  allyStrength: number;
  enemyStrength: number;
  ratio: number;
  isOutnumbered: boolean;
  hasAdvantage: boolean;
}

export default TacticalAI;
