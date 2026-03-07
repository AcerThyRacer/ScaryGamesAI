/**
 * Total War Engine - Formation System
 * Historical military formations with bonuses, penalties, and transitions
 */

import type {
  Entity,
  EntityId,
  FormationType,
  FormationData,
  FormationBonus,
  FormationPenalty,
  FormationComponent,
  TransformComponent,
  MovementComponent,
  Vector2,
  Vector3,
} from '../types';

// ============================================================================
// Formation Database
// ============================================================================

export const FORMATIONS: Record<FormationType, FormationData> = {
  line: {
    type: 'line',
    name: 'Battle Line',
    description: 'Standard linear formation, balanced offense and defense',
    bonuses: [{ type: 'defense', value: 5 }],
    penalties: [{ type: 'speed', value: 0 }],
  },
  column: {
    type: 'column',
    name: 'Marching Column',
    description: 'Deep formation for rapid movement',
    bonuses: [{ type: 'speed', value: 15 }],
    penalties: [{ type: 'defense', value: -20 }, { type: 'attack', value: -10 }],
  },
  wedge: {
    type: 'wedge',
    name: 'Wedge Formation',
    description: 'Cavalry charge formation, penetrates enemy lines',
    bonuses: [{ type: 'charge', value: 50 }, { type: 'attack', value: 15 }],
    penalties: [{ type: 'defense', value: -25 }],
  },
  square: {
    type: 'square',
    name: 'Defensive Square',
    description: 'All-around defense against cavalry',
    bonuses: [{ type: 'defense', value: 40 }],
    penalties: [{ type: 'speed', value: -50 }, { type: 'attack', value: -15 }],
  },
  circle: {
    type: 'circle',
    name: 'Shield Circle',
    description: 'Last stand formation with all-around protection',
    bonuses: [{ type: 'defense', value: 60 }, { type: 'morale', value: 20 }],
    penalties: [{ type: 'speed', value: -80 }, { type: 'attack', value: -30 }],
  },
  shield_wall: {
    type: 'shield_wall',
    name: 'Shield Wall',
    description: 'Tight formation with interlocking shields',
    bonuses: [{ type: 'defense', value: 35 }, { type: 'morale', value: 10 }],
    penalties: [{ type: 'speed', value: -30 }],
  },
  testudo: {
    type: 'testudo',
    name: 'Testudo (Tortoise)',
    description: 'Roman formation protecting from missile fire',
    bonuses: [{ type: 'defense', value: 25 }, { type: 'missile_block', value: 85 }],
    penalties: [{ type: 'speed', value: -60 }, { type: 'attack', value: -20 }],
  },
  phalanx: {
    type: 'phalanx',
    name: 'Phalanx',
    description: 'Greek-style pike formation, devastating from front',
    bonuses: [{ type: 'defense', value: 50 }, { type: 'attack', value: 20 }],
    penalties: [{ type: 'speed', value: -40 }],
    unlockRequirement: 'greek_faction',
  },
  crescent: {
    type: 'crescent',
    name: 'Crescent Formation',
    description: 'Curved line to envelop enemy flanks',
    bonuses: [{ type: 'attack', value: 10 }, { type: 'morale', value: 5 }],
    penalties: [{ type: 'defense', value: -10 }],
  },
  skirmish: {
    type: 'skirmish',
    name: 'Skirmish Line',
    description: 'Loose formation for ranged units',
    bonuses: [{ type: 'speed', value: 10 }],
    penalties: [{ type: 'defense', value: -30 }],
  },
  envelopment: {
    type: 'envelopment',
    name: 'Double Envelopment',
    description: 'Horns formation to surround enemy',
    bonuses: [{ type: 'attack', value: 25 }, { type: 'morale', value: 15 }],
    penalties: [{ type: 'defense', value: -20 }],
  },
  echelon: {
    type: 'echelon',
    name: 'Echelon Formation',
    description: 'Stepped formation for refusing a flank',
    bonuses: [{ type: 'defense', value: 15 }],
    penalties: [{ type: 'attack', value: -5 }],
  },
};

// ============================================================================
// Formation Slot Calculator
// ============================================================================

export class FormationSlotCalculator {
  /**
   * Calculate slot positions for a formation
   */
  static calculateSlots(
    formationType: FormationType,
    unitCount: number,
    width: number,
    depth: number,
    spacing: number
  ): Vector2[] {
    switch (formationType) {
      case 'line':
        return this.calculateLineSlots(unitCount, width, spacing);
      case 'column':
        return this.calculateColumnSlots(unitCount, depth, spacing);
      case 'wedge':
        return this.calculateWedgeSlots(unitCount, spacing);
      case 'square':
        return this.calculateSquareSlots(unitCount, spacing);
      case 'circle':
        return this.calculateCircleSlots(unitCount, spacing);
      case 'shield_wall':
        return this.calculateShieldWallSlots(unitCount, width, spacing);
      case 'testudo':
        return this.calculateTestudoSlots(unitCount, spacing);
      case 'phalanx':
        return this.calculatePhalanxSlots(unitCount, width, spacing);
      case 'crescent':
        return this.calculateCrescentSlots(unitCount, width, spacing);
      case 'skirmish':
        return this.calculateSkirmishSlots(unitCount, spacing);
      case 'envelopment':
        return this.calculateEnvelopmentSlots(unitCount, width, spacing);
      case 'echelon':
        return this.calculateEchelonSlots(unitCount, width, spacing);
      default:
        return this.calculateLineSlots(unitCount, width, spacing);
    }
  }

  private static calculateLineSlots(count: number, width: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const rows = Math.ceil(count / width);
    const unitsPerRow = Math.min(width, count);

    for (let row = 0; row < rows; row++) {
      const rowUnits = row === rows - 1 ? count - row * width : unitsPerRow;
      const startX = -(rowUnits - 1) * spacing / 2;

      for (let col = 0; col < rowUnits; col++) {
        slots.push({
          x: startX + col * spacing,
          y: -row * spacing,
        });
      }
    }

    return slots;
  }

  private static calculateColumnSlots(count: number, depth: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const cols = Math.ceil(count / depth);

    for (let col = 0; col < cols; col++) {
      const colUnits = col === cols - 1 ? count - col * depth : depth;
      const startY = -(colUnits - 1) * spacing / 2;

      for (let row = 0; row < colUnits; row++) {
        slots.push({
          x: col * spacing,
          y: startY + row * spacing,
        });
      }
    }

    return slots;
  }

  private static calculateWedgeSlots(count: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    let placed = 0;
    let row = 0;

    while (placed < count) {
      const rowUnits = row + 1;
      const startX = -row * spacing / 2;

      for (let col = 0; col < rowUnits && placed < count; col++) {
        slots.push({
          x: startX + col * spacing,
          y: -row * spacing * 0.866, // 60 degree angle
        });
        placed++;
      }
      row++;
    }

    return slots;
  }

  private static calculateSquareSlots(count: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const sideLength = Math.ceil(Math.sqrt(count));
    const perimeter = 4 * (sideLength - 1);

    // Place units around perimeter
    let placed = 0;
    const halfSize = (sideLength - 1) * spacing / 2;

    // Top row
    for (let i = 0; i < sideLength && placed < count; i++) {
      slots.push({ x: -halfSize + i * spacing, y: -halfSize });
      placed++;
    }

    // Right column (excluding corners)
    for (let i = 1; i < sideLength - 1 && placed < count; i++) {
      slots.push({ x: halfSize, y: -halfSize + i * spacing });
      placed++;
    }

    // Bottom row
    for (let i = sideLength - 1; i >= 0 && placed < count; i--) {
      slots.push({ x: -halfSize + i * spacing, y: halfSize });
      placed++;
    }

    // Left column (excluding corners)
    for (let i = sideLength - 2; i > 0 && placed < count; i--) {
      slots.push({ x: -halfSize, y: -halfSize + i * spacing });
      placed++;
    }

    // Fill center if needed
    while (placed < count) {
      for (let r = 1; r < sideLength - 1 && placed < count; r++) {
        for (let c = 1; c < sideLength - 1 && placed < count; c++) {
          slots.push({ x: -halfSize + c * spacing, y: -halfSize + r * spacing });
          placed++;
        }
      }
    }

    return slots;
  }

  private static calculateCircleSlots(count: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const radius = spacing * count / (2 * Math.PI);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      slots.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    return slots;
  }

  private static calculateShieldWallSlots(count: number, width: number, spacing: number): Vector2[] {
    const tightSpacing = spacing * 0.6;
    return this.calculateLineSlots(count, width, tightSpacing);
  }

  private static calculateTestudoSlots(count: number, spacing: number): Vector2[] {
    const tightSpacing = spacing * 0.5;
    const width = Math.ceil(Math.sqrt(count));
    return this.calculateLineSlots(count, width, tightSpacing);
  }

  private static calculatePhalanxSlots(count: number, width: number, spacing: number): Vector2[] {
    const tightSpacing = spacing * 0.7;
    return this.calculateLineSlots(count, width, tightSpacing);
  }

  private static calculateCrescentSlots(count: number, width: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const rows = Math.ceil(count / width);

    for (let row = 0; row < rows; row++) {
      const rowUnits = row === rows - 1 ? count - row * width : width;
      const curve = row * spacing * 0.3;
      const startX = -(rowUnits - 1) * spacing / 2;

      for (let col = 0; col < rowUnits; col++) {
        const curveOffset = Math.abs(col - (rowUnits - 1) / 2) * curve / (rowUnits / 2);
        slots.push({
          x: startX + col * spacing,
          y: -row * spacing - curveOffset,
        });
      }
    }

    return slots;
  }

  private static calculateSkirmishSlots(count: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const looseSpacing = spacing * 1.5;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const offset = row % 2 === 0 ? 0 : looseSpacing / 2;
      slots.push({
        x: col * looseSpacing + offset - 2 * looseSpacing,
        y: -row * looseSpacing,
      });
    }

    return slots;
  }

  private static calculateEnvelopmentSlots(count: number, width: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const centerCount = Math.floor(count * 0.5);
    const wingCount = Math.floor((count - centerCount) / 2);

    // Center
    const centerSlots = this.calculateLineSlots(centerCount, width, spacing);
    for (const slot of centerSlots) {
      slots.push(slot);
    }

    // Left wing
    let wingOffset = 0;
    for (let i = 0; i < wingCount; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      slots.push({
        x: -width * spacing / 2 - 5 * spacing - col * spacing,
        y: -row * spacing - 2 * spacing,
      });
    }

    // Right wing
    for (let i = 0; i < wingCount; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      slots.push({
        x: width * spacing / 2 + 5 * spacing + col * spacing,
        y: -row * spacing - 2 * spacing,
      });
    }

    return slots;
  }

  private static calculateEchelonSlots(count: number, width: number, spacing: number): Vector2[] {
    const slots: Vector2[] = [];
    const rows = Math.ceil(count / width);

    for (let row = 0; row < rows; row++) {
      const rowUnits = row === rows - 1 ? count - row * width : width;
      const startX = -(rowUnits - 1) * spacing / 2 + row * spacing;

      for (let col = 0; col < rowUnits; col++) {
        slots.push({
          x: startX + col * spacing,
          y: -row * spacing,
        });
      }
    }

    return slots;
  }
}

// ============================================================================
// Formation System
// ============================================================================

export class FormationSystem {
  private formationGroups: Map<EntityId, EntityId[]> = new Map(); // Leader -> Members
  private formationSlots: Map<EntityId, Vector2[]> = new Map(); // Leader -> Slot positions
  private formationTargets: Map<EntityId, Vector3> = new Map(); // Leader -> Target position
  private formationFacings: Map<EntityId, number> = new Map(); // Leader -> Facing angle

  /**
   * Create a formation group with a leader
   */
  createFormation(leaderId: EntityId, members: EntityId[]): void {
    this.formationGroups.set(leaderId, members);

    // Assign formation slots
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      // Would set FormationComponent.memberId = i
    }
  }

  /**
   * Set formation type for a group
   */
  setFormationType(
    leaderId: EntityId,
    formationType: FormationType,
    width: number,
    depth: number,
    spacing: number
  ): void {
    const members = this.formationGroups.get(leaderId);
    if (!members) return;

    const slots = FormationSlotCalculator.calculateSlots(formationType, members.length, width, depth, spacing);
    this.formationSlots.set(leaderId, slots);
  }

  /**
   * Move formation to target position
   */
  moveFormation(leaderId: EntityId, targetPosition: Vector3, facing?: number): void {
    this.formationTargets.set(leaderId, { ...targetPosition });

    if (facing !== undefined) {
      this.formationFacings.set(leaderId, facing);
    }
  }

  /**
   * Update formation positions
   */
  update(
    entities: Entity[],
    getComponent: <T>(entityId: EntityId, type: string) => T | undefined,
    deltaTime: number
  ): void {
    for (const [leaderId, members] of this.formationGroups) {
      const slots = this.formationSlots.get(leaderId);
      const target = this.formationTargets.get(leaderId);
      const facing = this.formationFacings.get(leaderId) || 0;

      if (!slots || !target) continue;

      const leaderTransform = getComponent<TransformComponent>(leaderId, 'transform');
      if (!leaderTransform) continue;

      // Update each member's target position
      for (let i = 0; i < members.length; i++) {
        const memberId = members[i];
        const slot = slots[i];

        if (!slot) continue;

        // Calculate world position from slot offset
        const cos = Math.cos(facing);
        const sin = Math.sin(facing);

        const worldX = target.x + slot.x * cos - slot.y * sin;
        const worldZ = target.z + slot.x * sin + slot.y * cos;

        const movement = getComponent<MovementComponent>(memberId, 'movement');
        if (movement) {
          movement.targetPosition = { x: worldX, y: 0, z: worldZ };
        }
      }
    }
  }

  /**
   * Get formation bonuses for an entity
   */
  getFormationBonuses(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): FormationBonus[] {
    const formation = getComponent<FormationComponent>(entityId, 'formation');
    if (!formation) return [];

    const formationData = FORMATIONS[formation.formationType];
    return formationData?.bonuses || [];
  }

  /**
   * Get formation penalties for an entity
   */
  getFormationPenalties(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): FormationPenalty[] {
    const formation = getComponent<FormationComponent>(entityId, 'formation');
    if (!formation) return [];

    const formationData = FORMATIONS[formation.formationType];
    return formationData?.penalties || [];
  }

  /**
   * Calculate total defense bonus
   */
  getDefenseBonus(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): number {
    const bonuses = this.getFormationBonuses(entityId, getComponent);
    const penalties = this.getFormationPenalties(entityId, getComponent);

    let total = 0;
    for (const bonus of bonuses) {
      if (bonus.type === 'defense') total += bonus.value;
    }
    for (const penalty of penalties) {
      if (penalty.type === 'defense') total += penalty.value;
    }

    return total;
  }

  /**
   * Calculate total attack bonus
   */
  getAttackBonus(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): number {
    const bonuses = this.getFormationBonuses(entityId, getComponent);
    const penalties = this.getFormationPenalties(entityId, getComponent);

    let total = 0;
    for (const bonus of bonuses) {
      if (bonus.type === 'attack') total += bonus.value;
    }
    for (const penalty of penalties) {
      if (penalty.type === 'attack') total += penalty.value;
    }

    return total;
  }

  /**
   * Calculate charge bonus
   */
  getChargeBonus(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): number {
    const bonuses = this.getFormationBonuses(entityId, getComponent);

    for (const bonus of bonuses) {
      if (bonus.type === 'charge') return bonus.value;
    }

    return 0;
  }

  /**
   * Calculate missile block chance
   */
  getMissileBlockChance(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): number {
    const bonuses = this.getFormationBonuses(entityId, getComponent);

    for (const bonus of bonuses) {
      if (bonus.type === 'missile_block') return bonus.value / 100;
    }

    return 0;
  }

  /**
   * Check if formation is locked (in combat)
   */
  isFormationLocked(entityId: EntityId, getComponent: <T>(id: EntityId, t: string) => T | undefined): boolean {
    const formation = getComponent<FormationComponent>(entityId, 'formation');
    return formation?.locked || false;
  }

  /**
   * Dissolve formation (emergency)
   */
  dissolveFormation(leaderId: EntityId): void {
    this.formationGroups.delete(leaderId);
    this.formationSlots.delete(leaderId);
    this.formationTargets.delete(leaderId);
    this.formationFacings.delete(leaderId);
  }

  /**
   * Transition to new formation type
   */
  transitionFormation(
    leaderId: EntityId,
    newType: FormationType,
    transitionTime: number
  ): void {
    const members = this.formationGroups.get(leaderId);
    if (!members) return;

    // Would set transition state and animate over time
    // For now, immediate change
    const slots = this.formationSlots.get(leaderId);
    if (slots) {
      this.setFormationType(leaderId, newType, 10, 4, 1.5);
    }
  }

  /**
   * Get formation info
   */
  getFormationInfo(formationType: FormationType): FormationData | undefined {
    return FORMATIONS[formationType];
  }

  /**
   * Get all available formations
   */
  getAvailableFormations(faction?: string): FormationType[] {
    return Object.entries(FORMATIONS)
      .filter(([_, data]) => {
        if (!data.unlockRequirement) return true;
        if (data.unlockRequirement === 'greek_faction' && faction === 'greek') return true;
        return false;
      })
      .map(([type, _]) => type as FormationType);
  }
}

export default FormationSystem;
