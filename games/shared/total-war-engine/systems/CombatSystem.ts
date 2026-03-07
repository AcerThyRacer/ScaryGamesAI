/**
 * Total War Engine - Combat System
 * Advanced combat mechanics with morale, fatigue, and formation bonuses
 */

import type {
  Entity,
  EntityId,
  DamageResult,
  DamageType,
  CombatEvent,
  CombatComponent,
  HealthComponent,
  FormationComponent,
  FactionComponent,
  Vector3,
} from '../types';

// ============================================================================
// Combat Constants
// ============================================================================

export const COMBAT_CONSTANTS = {
  // Base damage multipliers
  FLANKING_BONUS: 1.25,
  REAR_ATTACK_BONUS: 1.5,
  CHARGE_BONUS_DECAY: 0.8, // Per second
  MORALE_BREAK_THRESHOLD: 20,
  MORALE_RALLY_THRESHOLD: 50,

  // Fatigue
  FATIGUE_MELEE_COST: 0.5,
  FATIGUE_RUNNING_COST: 0.3,
  FATIGUE_RECOVERY: 0.1,
  FATIGUE_PENALTY_THRESHOLD: 0.3,
  FATIGUE_MAX_PENALTY: 0.5,

  // Timing
  ATTACK_QUEUE_DURATION: 0.5,
  PROJECTILE_LIFETIME: 5.0,

  // Armor
  ARMOR_EFFECTIVENESS: 0.6,
  ARMOR_PENETRATION_DECAY: 0.5,
};

// ============================================================================
// Combat Math Utilities
// ============================================================================

export class CombatMath {
  static calculateDamage(
    baseDamage: number,
    armor: number,
    armorPenetration: number,
    damageType: DamageType
  ): number {
    const effectiveArmor = Math.max(0, armor - armorPenetration);
    const damageReduction = effectiveArmor * COMBAT_CONSTANTS.ARMOR_EFFECTIVENESS;
    return Math.max(1, baseDamage * (1 - damageReduction));
  }

  static getFlankingBonus(attackerFacing: number, targetFacing: number): number {
    const angleDiff = Math.abs(this.normalizeAngle(attackerFacing - targetFacing));

    // Rear attack (behind)
    if (angleDiff > (Math.PI * 2) / 3) {
      return COMBAT_CONSTANTS.REAR_ATTACK_BONUS;
    }
    // Flanking attack (sides)
    if (angleDiff > Math.PI / 3) {
      return COMBAT_CONSTANTS.FLANKING_BONUS;
    }
    return 1.0;
  }

  static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  static calculateChargeDamage(baseDamage: number, chargeBonus: number, chargeDistance: number): number {
    const maxChargeBonus = chargeDistance >= 30 ? 1.0 : chargeDistance / 30;
    return baseDamage * (1 + chargeBonus * maxChargeBonus);
  }

  static calculateMoraleModifier(
    currentMorale: number,
    nearbyAllies: number,
    nearbyEnemies: number,
    fatigue: number
  ): number {
    let modifier = 0;

    // Outnumbered penalty
    if (nearbyEnemies > nearbyAllies) {
      modifier -= (nearbyEnemies - nearbyAllies) * 2;
    }

    // Allied advantage bonus
    if (nearbyAllies > nearbyEnemies) {
      modifier += (nearbyAllies - nearbyEnemies) * 1;
    }

    // Fatigue penalty
    if (fatigue < COMBAT_CONSTANTS.FATIGUE_PENALTY_THRESHOLD) {
      modifier -=
        (1 - fatigue / COMBAT_CONSTANTS.FATIGUE_PENALTY_THRESHOLD) *
        COMBAT_CONSTANTS.FATIGUE_MAX_PENALTY *
        50;
    }

    return currentMorale + modifier;
  }
}

// ============================================================================
// Projectile System
// ============================================================================

interface Projectile {
  id: EntityId;
  position: Vector3;
  velocity: Vector3;
  damage: number;
  damageType: DamageType;
  sourceId: EntityId;
  targetId: EntityId | null;
  lifetime: number;
  projectileType: 'arrow' | 'bolt' | 'stone' | 'acid';
}

export class ProjectileSystem {
  private projectiles: Map<EntityId, Projectile> = new Map();
  private nextProjectileId: EntityId = 1;

  createProjectile(
    position: Vector3,
    target: Vector3,
    damage: number,
    damageType: DamageType,
    sourceId: EntityId,
    targetId: EntityId | null,
    projectileType: 'arrow' | 'bolt' | 'stone' | 'acid',
    speed: number
  ): EntityId {
    const id = this.nextProjectileId++;
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const dz = target.z - position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const projectile: Projectile = {
      id,
      position: { ...position },
      velocity: {
        x: (dx / dist) * speed,
        y: (dy / dist) * speed + (projectileType === 'stone' ? 5 : 2), // Arc
        z: (dz / dist) * speed,
      },
      damage,
      damageType,
      sourceId,
      targetId,
      lifetime: COMBAT_CONSTANTS.PROJECTILE_LIFETIME,
      projectileType,
    };

    this.projectiles.set(id, projectile);
    return id;
  }

  update(deltaTime: number): { projectileId: EntityId; hitPosition: Vector3 }[] {
    const hits: { projectileId: EntityId; hitPosition: Vector3 }[] = [];

    for (const [id, projectile] of this.projectiles) {
      projectile.position.x += projectile.velocity.x * deltaTime;
      projectile.position.y += projectile.velocity.y * deltaTime;
      projectile.position.z += projectile.velocity.z * deltaTime;

      // Gravity for non-acid
      if (projectile.projectileType !== 'acid') {
        projectile.velocity.y -= 9.8 * deltaTime;
      }

      projectile.lifetime -= deltaTime;

      // Ground hit
      if (projectile.position.y <= 0 || projectile.lifetime <= 0) {
        hits.push({ projectileId: id, hitPosition: { ...projectile.position } });
        this.projectiles.delete(id);
      }
    }

    return hits;
  }

  removeProjectile(id: EntityId): void {
    this.projectiles.delete(id);
  }

  getProjectile(id: EntityId): Projectile | undefined {
    return this.projectiles.get(id);
  }

  getActiveProjectiles(): Projectile[] {
    return Array.from(this.projectiles.values());
  }
}

// ============================================================================
// Combat System
// ============================================================================

export class CombatSystem {
  private projectileSystem: ProjectileSystem;
  private combatEvents: CombatEvent[] = [];
  private killCount: Map<string, number> = new Map();
  private damageDealt: Map<EntityId, number> = new Map();
  private damageTaken: Map<EntityId, number> = new Map();

  constructor() {
    this.projectileSystem = new ProjectileSystem();
  }

  processCombat(
    entities: Entity[],
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined,
    deltaTime: number
  ): void {
    // Update projectiles
    const projectileHits = this.projectileSystem.update(deltaTime);

    // Process each entity
    for (const entity of entities) {
      const combat = getComponent<CombatComponent>(entity.id, 'combat');
      const health = getComponent<HealthComponent>(entity.id, 'health');
      const faction = getComponent<FactionComponent>(entity.id, 'faction');

      if (!combat || !health || health.dead) continue;

      // Update cooldowns
      if (combat.currentCooldown > 0) {
        combat.currentCooldown -= deltaTime;
      }

      // Process attack if ready
      if (combat.target !== null && combat.currentCooldown <= 0) {
        const targetHealth = getComponent<HealthComponent>(combat.target, 'health');
        const targetFaction = getComponent<FactionComponent>(combat.target, 'faction');

        if (targetHealth && targetFaction && !targetHealth.dead && faction) {
          if (this.areHostile(faction, targetFaction)) {
            this.executeAttack(entity.id, combat, health, targetHealth, getComponent, deltaTime);
          } else {
            combat.target = null;
            combat.inCombat = false;
          }
        } else {
          combat.target = null;
          combat.inCombat = false;
        }
      }
    }

    // Record combat events
    this.recordCombatEvents(entities, getComponent, deltaTime);
  }

  private executeAttack(
    attackerId: EntityId,
    combat: CombatComponent,
    attackerHealth: HealthComponent,
    targetHealth: HealthComponent,
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined,
    deltaTime: number
  ): void {
    combat.currentCooldown = combat.attackCooldown;
    combat.inCombat = true;

    const result = this.calculateAttackDamage(attackerId, combat, targetHealth, getComponent);

    // Apply damage
    targetHealth.current -= result.damage;
    if (result.killed) {
      targetHealth.dead = true;
      targetHealth.deathTime = 0;
      this.killCount.set(
        this.getEntityFaction(attackerId, getComponent),
        (this.killCount.get(this.getEntityFaction(attackerId, getComponent)) || 0) + 1
      );
    }

    // Track damage
    this.damageDealt.set(attackerId, (this.damageDealt.get(attackerId) || 0) + result.damage);
    this.damageTaken.set(combat.target!, (this.damageTaken.get(combat.target!) || 0) + result.damage);
  }

  private calculateAttackDamage(
    attackerId: EntityId,
    combat: CombatComponent,
    targetHealth: HealthComponent,
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined
  ): DamageResult {
    let damage = combat.attackDamage;

    // Apply charge bonus
    const chargeBonus = combat.chargeBonus || 0;
    if (chargeBonus > 0) {
      damage *= 1 + chargeBonus * 0.5;
    }

    // Calculate flanking bonus
    const attackerTransform = getComponent<{ localPosition: Vector3; targetFacing?: number }>(
      attackerId,
      'transform'
    );
    const targetTransform = getComponent<{ localPosition: Vector3; targetFacing?: number }>(
      combat.target!,
      'transform'
    );

    let flankingBonus = 1.0;
    if (attackerTransform && targetTransform) {
      // Simplified facing calculation
      flankingBonus = CombatMath.getFlankingBonus(0, Math.PI); // Default front attack
    }

    damage *= flankingBonus;

    // Apply armor
    const finalDamage = CombatMath.calculateDamage(
      damage,
      targetHealth.armor,
      combat.armorPenetration,
      'physical'
    );

    return {
      targetId: combat.target!,
      damage: finalDamage,
      blocked: 0,
      armorAbsorbed: damage - finalDamage,
      critical: false,
      killed: targetHealth.current - finalDamage <= 0,
      damageType: 'physical',
    };
  }

  private areHostile(faction1: FactionComponent, faction2: FactionComponent): boolean {
    return (
      faction1.team !== faction2.team ||
      faction1.enemyIds.has(faction2.factionId) ||
      faction2.enemyIds.has(faction1.factionId)
    );
  }

  private getEntityFaction(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): string {
    const faction = getComponent<FactionComponent>(entityId, 'faction');
    return faction?.factionId || 'unknown';
  }

  private recordCombatEvents(
    entities: Entity[],
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined,
    deltaTime: number
  ): void {
    // Record deaths
    for (const entity of entities) {
      const health = getComponent<HealthComponent>(entity.id, 'health');
      const combat = getComponent<CombatComponent>(entity.id, 'combat');

      if (health?.dead && health.deathTime === 0) {
        health.deathTime = deltaTime;
        this.combatEvents.push({
          type: 'kill',
          attackerId: combat?.target || entity.id,
          targetId: entity.id,
          timestamp: performance.now(),
          data: { faction: this.getEntityFaction(entity.id, getComponent) },
        });
      }
    }
  }

  fireRangedAttack(
    attackerId: EntityId,
    targetId: EntityId,
    damage: number,
    range: number,
    accuracy: number
  ): EntityId | null {
    // This would be called by the ranged combat logic
    // Returns projectile ID
    return this.projectileSystem.createProjectile(
      { x: 0, y: 0, z: 0 }, // Would get from transform
      { x: 0, y: 0, z: 0 }, // Would get from target transform
      damage,
      'piercing',
      attackerId,
      targetId,
      'arrow',
      50
    );
  }

  getKillCount(factionId: string): number {
    return this.killCount.get(factionId) || 0;
  }

  getTotalKillCount(): number {
    let total = 0;
    for (const count of this.killCount.values()) {
      total += count;
    }
    return total;
  }

  getDamageDealt(entityId: EntityId): number {
    return this.damageDealt.get(entityId) || 0;
  }

  getDamageTaken(entityId: EntityId): number {
    return this.damageTaken.get(entityId) || 0;
  }

  getRecentEvents(count: number = 10): CombatEvent[] {
    return this.combatEvents.slice(-count);
  }

  clearEvents(): void {
    this.combatEvents = [];
  }

  getProjectileSystem(): ProjectileSystem {
    return this.projectileSystem;
  }
}

// ============================================================================
// Morale System
// ============================================================================

export class MoraleSystem {
  private routedUnits: Set<EntityId> = new Set();
  private rallyingUnits: Map<EntityId, number> = new Map(); // EntityId -> rally timer

  update(
    entities: Entity[],
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined,
    getNearbyEntities: (pos: Vector3, range: number) => EntityId[],
    deltaTime: number
  ): void {
    for (const entity of entities) {
      const health = getComponent<HealthComponent>(entity.id, 'health');
      const combat = getComponent<CombatComponent>(entity.id, 'combat');
      const transform = getComponent<{ localPosition: Vector3 }>(entity.id, 'transform');
      const faction = getComponent<FactionComponent>(entity.id, 'faction');

      if (!health || health.dead) continue;

      // Get nearby units for morale calculation
      const nearby = transform ? getNearbyEntities(transform.localPosition, 20) : [];

      let nearbyAllies = 0;
      let nearbyEnemies = 0;

      for (const nearbyId of nearby) {
        const nearbyFaction = getComponent<FactionComponent>(nearbyId, 'faction');
        const nearbyHealth = getComponent<HealthComponent>(nearbyId, 'health');

        if (!nearbyHealth || nearbyHealth.dead) continue;

        if (nearbyFaction && faction) {
          if (this.areAllies(faction, nearbyFaction)) {
            nearbyAllies++;
          } else {
            nearbyEnemies++;
          }
        }
      }

      // Calculate morale (simplified - in full system would have fatigue)
      const moraleModifier = CombatMath.calculateMoraleModifier(100, nearbyAllies, nearbyEnemies, 1.0);
      const effectiveMorale = Math.max(0, Math.min(100, moraleModifier));

      // Check for rout
      if (effectiveMorale < COMBAT_CONSTANTS.MORALE_BREAK_THRESHOLD && !this.routedUnits.has(entity.id)) {
        this.routedUnits.add(entity.id);
        this.triggerRout(entity.id, getComponent);
      }

      // Check for rally
      if (this.routedUnits.has(entity.id)) {
        if (effectiveMorale > COMBAT_CONSTANTS.MORALE_RALLY_THRESHOLD) {
          if (!this.rallyingUnits.has(entity.id)) {
            this.rallyingUnits.set(entity.id, 3.0); // 3 second rally timer
          } else {
            const timer = this.rallyingUnits.get(entity.id)! - deltaTime;
            if (timer <= 0) {
              this.rallyUnit(entity.id, getComponent);
            } else {
              this.rallyingUnits.set(entity.id, timer);
            }
          }
        } else {
          this.rallyingUnits.delete(entity.id);
        }
      }
    }
  }

  private areAllies(faction1: FactionComponent, faction2: FactionComponent): boolean {
    return (
      faction1.team === faction2.team ||
      faction1.allyIds.has(faction2.factionId) ||
      faction2.allyIds.has(faction1.factionId)
    );
  }

  private triggerRout(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): void {
    const combat = getComponent<CombatComponent>(entityId, 'combat');
    if (combat) {
      combat.target = null;
      combat.inCombat = false;
    }

    // In full system, would set AI state to 'flee'
  }

  private rallyUnit(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): void {
    this.routedUnits.delete(entityId);
    this.rallyingUnits.delete(entityId);

    // In full system, would set AI state back to 'idle' or 'guard'
  }

  isRouted(entityId: EntityId): boolean {
    return this.routedUnits.has(entityId);
  }

  getRoutedUnits(): EntityId[] {
    return Array.from(this.routedUnits);
  }
}

export default CombatSystem;
