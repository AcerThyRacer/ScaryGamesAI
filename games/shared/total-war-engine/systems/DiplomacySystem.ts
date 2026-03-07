/**
 * Total War Engine - Diplomacy System
 * Faction relations, treaties, and diplomatic actions
 */

import type { DiplomaticStatus, DiplomaticRelation, Treaty, DiplomaticEvent } from '../types';

// ============================================================================
// Diplomacy Constants
// ============================================================================

export const DIPLOMACY_CONSTANTS = {
  // Trust
  TRUST_MIN: -100,
  TRUST_MAX: 100,
  TRUST_DECAY_RATE: 1,
  TRUST_BREAK_ALLIANCE: -30,
  TRUST_DECLARE_WAR: -50,

  // Fear
  FEAR_MIN: 0,
  FEAR_MAX: 100,

  // Actions
  GIFT_GOLD_AMOUNT: 500,
  GIFT_TRUST_INCREASE: 10,
  ALLIANCE_TRUST_REQUIRED: 30,
  NON_AGGRESSION_TRUST_REQUIRED: 0,

  // Duration
  NON_AGGRESSION_DURATION: 20,
  TRADE_AGREEMENT_DURATION: -1, // Permanent until broken
  ALLIANCE_DURATION: -1,

  // War exhaustion
  WAR_WEARINESS_PER_TURN: 2,
  WAR_WEARINESS_PER_BATTLE: 5,
};

// ============================================================================
// Diplomatic Modifiers
// ============================================================================

export interface DiplomaticModifier {
  name: string;
  value: number;
  turnsRemaining: number;
}

export const MODIFIERS: Record<string, DiplomaticModifier> = {
  recent_trade: { name: 'Recent Trade', value: 5, turnsRemaining: 10 },
  border_friction: { name: 'Border Friction', value: -10, turnsRemaining: 5 },
  historical_enemy: { name: 'Historical Enemy', value: -20, turnsRemaining: -1 },
  same_religion: { name: 'Same Religion', value: 10, turnsRemaining: -1 },
  cultural_differences: { name: 'Cultural Differences', value: -5, turnsRemaining: -1 },
  recent_war: { name: 'Recent War', value: -30, turnsRemaining: 20 },
  alliance_honored: { name: 'Alliance Honored', value: 20, turnsRemaining: 15 },
  alliance_broken: { name: 'Alliance Broken', value: -40, turnsRemaining: 30 },
  gift_received: { name: 'Gift Received', value: 15, turnsRemaining: 10 },
  trade_partner: { name: 'Trade Partner', value: 8, turnsRemaining: -1 },
};

// ============================================================================
// Casus Belli System
// ============================================================================

export type CasusBelliType =
  | 'no_casus_belli'
  | 'border_incident'
  | 'trade_dispute'
  | 'holy_war'
  | 'reconquest'
  | 'liberation'
  | 'imperialism'
  | 'colonial_conflict'
  | 'succession_crisis';

export interface CasusBelli {
  type: CasusBelliType;
  targetFactionId: string;
  validityTurns: number;
  prestigeCost: number;
  aggressiveExpansionImpact: number;
}

export const CASUS_BELLI: Record<CasusBelliType, Partial<CasusBelli>> = {
  no_casus_belli: {
    prestigeCost: 50,
    aggressiveExpansionImpact: 30,
  },
  border_incident: {
    validityTurns: 10,
    prestigeCost: 25,
    aggressiveExpansionImpact: 20,
  },
  trade_dispute: {
    validityTurns: 15,
    prestigeCost: 10,
    aggressiveExpansionImpact: 15,
  },
  holy_war: {
    validityTurns: 50,
    prestigeCost: 0,
    aggressiveExpansionImpact: 10,
  },
  reconquest: {
    validityTurns: 100,
    prestigeCost: 0,
    aggressiveExpansionImpact: 5,
  },
  liberation: {
    validityTurns: 30,
    prestigeCost: 0,
    aggressiveExpansionImpact: 0,
  },
  imperialism: {
    validityTurns: 5,
    prestigeCost: 30,
    aggressiveExpansionImpact: 25,
  },
  colonial_conflict: {
    validityTurns: 20,
    prestigeCost: 15,
    aggressiveExpansionImpact: 15,
  },
  succession_crisis: {
    validityTurns: 15,
    prestigeCost: 5,
    aggressiveExpansionImpact: 10,
  },
};

// ============================================================================
// Diplomacy System
// ============================================================================

export class DiplomacySystem {
  private relations: Map<string, DiplomaticRelation> = new Map();
  private casusBelli: Map<string, CasusBelli[]> = new Map();
  private warWeariness: Map<string, number> = new Map();
  private factionPower: Map<string, number> = new Map();
  private factionSize: Map<string, number> = new Map();

  constructor() {}

  private getRelationKey(faction1: string, faction2: string): string {
    return [faction1, faction2].sort().join('-');
  }

  // === Relation Management ===

  getRelation(faction1: string, faction2: string): DiplomaticRelation {
    const key = this.getRelationKey(faction1, faction2);
    if (!this.relations.has(key)) {
      this.relations.set(key, this.createDefaultRelation(faction1, faction2));
    }
    return this.relations.get(key)!;
  }

  private createDefaultRelation(faction1: string, faction2: string): DiplomaticRelation {
    return {
      faction1Id: faction1,
      faction2Id: faction2,
      status: 'peace',
      trust: 0,
      fear: 0,
      history: [],
      treaties: [],
    };
  }

  updateTrust(faction1: string, faction2: string, change: number): void {
    const relation = this.getRelation(faction1, faction2);
    relation.trust = Math.max(
      DIPLOMACY_CONSTANTS.TRUST_MIN,
      Math.min(DIPLOMACY_CONSTANTS.TRUST_MAX, relation.trust + change)
    );
  }

  updateFear(faction1: string, faction2: string, change: number): void {
    const relation = this.getRelation(faction1, faction2);
    relation.fear = Math.max(
      DIPLOMACY_CONSTANTS.FEAR_MIN,
      Math.min(DIPLOMACY_CONSTANTS.FEAR_MAX, relation.fear + change)
    );
  }

  // === Diplomatic Status ===

  getStatus(faction1: string, faction2: string): DiplomaticStatus {
    return this.getRelation(faction1, faction2).status;
  }

  isAtWar(faction1: string, faction2: string): boolean {
    return this.getStatus(faction1, faction2) === 'war';
  }

  isAllied(faction1: string, faction2: string): boolean {
    const status = this.getStatus(faction1, faction2);
    return status === 'alliance' || status === 'defensive_pact';
  }

  // === Diplomatic Actions ===

  declareWar(
    aggressorFaction: string,
    targetFaction: string,
    casusBelliType: CasusBelliType = 'no_casus_belli'
  ): DiplomaticResult {
    const relation = this.getRelation(aggressorFaction, targetFaction);

    // Check if already at war
    if (relation.status === 'war') {
      return { success: false, reason: 'Already at war' };
    }

    // Check for alliance (can't declare war on ally without breaking alliance)
    if (relation.status === 'alliance') {
      return { success: false, reason: 'Must break alliance first' };
    }

    // Apply casus belli effects
    const cb = CASUS_BELLI[casusBelliType];
    const trustLoss = cb.prestigeCost ? -cb.prestigeCost : DIPLOMACY_CONSTANTS.TRUST_DECLARE_WAR;
    this.updateTrust(aggressorFaction, targetFaction, trustLoss);

    // Break treaties
    for (const treaty of relation.treaties) {
      treaty.duration = 0;
    }
    relation.treaties = relation.treaties.filter(t => t.duration !== 0);

    // Set status
    relation.status = 'war';

    // Record history
    relation.history.push({
      type: 'war_declared',
      turn: 0, // Would get current turn
      initiatorId: aggressorFaction,
      targetId: targetFaction,
    });

    // Initialize war weariness
    const warKey = this.getRelationKey(aggressorFaction, targetFaction);
    this.warWeariness.set(warKey, 0);

    // Notify allies
    this.notifyAlliesOfWar(aggressorFaction, targetFaction);

    return { success: true };
  }

  makePeace(
    initiatorFaction: string,
    targetFaction: string,
    terms: PeaceTerms
  ): DiplomaticResult {
    const relation = this.getRelation(initiatorFaction, targetFaction);

    if (relation.status !== 'war') {
      return { success: false, reason: 'Not at war' };
    }

    // Evaluate AI acceptance (for non-player factions)
    const acceptanceChance = this.evaluatePeaceAcceptance(initiatorFaction, targetFaction, terms);
    if (Math.random() > acceptanceChance) {
      return { success: false, reason: 'Peace offer rejected' };
    }

    // Apply terms
    for (const provinceId of terms.ceasedProvinces) {
      // Transfer province ownership
    }

    for (const payment of terms.reparations) {
      // Transfer gold
    }

    // Set status
    relation.status = 'peace';
    this.updateTrust(initiatorFaction, targetFaction, 10);

    // Record history
    relation.history.push({
      type: 'peace_offered',
      turn: 0,
      initiatorId: initiatorFaction,
      targetId: targetFaction,
    });

    return { success: true };
  }

  proposeAlliance(proposingFaction: string, targetFaction: string): DiplomaticResult {
    const relation = this.getRelation(proposingFaction, targetFaction);

    if (relation.status !== 'peace') {
      return { success: false, reason: 'Must be at peace first' };
    }

    if (relation.trust < DIPLOMACY_CONSTANTS.ALLIANCE_TRUST_REQUIRED) {
      return { success: false, reason: 'Insufficient trust' };
    }

    // Evaluate acceptance
    const acceptanceChance = this.evaluateAllianceAcceptance(proposingFaction, targetFaction);
    if (Math.random() > acceptanceChance) {
      this.updateTrust(proposingFaction, targetFaction, -5);
      return { success: false, reason: 'Alliance proposal rejected' };
    }

    relation.status = 'alliance';
    relation.treaties.push({
      id: `alliance-${Date.now()}`,
      type: 'alliance',
      duration: DIPLOMACY_CONSTANTS.ALLIANCE_DURATION,
      turnsRemaining: DIPLOMACY_CONSTANTS.ALLIANCE_DURATION,
      conditions: [],
    });

    this.updateTrust(proposingFaction, targetFaction, 20);

    relation.history.push({
      type: 'alliance_formed',
      turn: 0,
      initiatorId: proposingFaction,
      targetId: targetFaction,
    });

    return { success: true };
  }

  breakAlliance(faction: string, allyFaction: string): DiplomaticResult {
    const relation = this.getRelation(faction, allyFaction);

    if (relation.status !== 'alliance') {
      return { success: false, reason: 'Not allied' };
    }

    relation.status = 'peace';
    this.updateTrust(faction, allyFaction, DIPLOMACY_CONSTANTS.TRUST_BREAK_ALLIANCE);

    // Remove alliance treaty
    relation.treaties = relation.treaties.filter(t => t.type !== 'alliance');

    relation.history.push({
      type: 'treaty_broken',
      turn: 0,
      initiatorId: faction,
      targetId: allyFaction,
    });

    return { success: true };
  }

  proposeNonAggression(faction: string, targetFaction: string): DiplomaticResult {
    const relation = this.getRelation(faction, targetFaction);

    if (relation.status !== 'peace') {
      return { success: false, reason: 'Must be at peace' };
    }

    if (relation.trust < DIPLOMACY_CONSTANTS.NON_AGGRESSION_TRUST_REQUIRED) {
      return { success: false, reason: 'Insufficient trust' };
    }

    relation.treaties.push({
      id: `nap-${Date.now()}`,
      type: 'non_aggression',
      duration: DIPLOMACY_CONSTANTS.NON_AGGRESSION_DURATION,
      turnsRemaining: DIPLOMACY_CONSTANTS.NON_AGGRESSION_DURATION,
      conditions: [],
    });

    this.updateTrust(faction, targetFaction, 5);

    return { success: true };
  }

  proposeTradeAgreement(faction: string, targetFaction: string): DiplomaticResult {
    const relation = this.getRelation(faction, targetFaction);

    if (relation.status === 'war') {
      return { success: false, reason: 'Cannot trade with enemies' };
    }

    // Check if already trading
    if (relation.treaties.some(t => t.type === 'trade_agreement')) {
      return { success: false, reason: 'Already trading' };
    }

    relation.treaties.push({
      id: `trade-${Date.now()}`,
      type: 'trade_agreement',
      duration: DIPLOMACY_CONSTANTS.TRADE_AGREEMENT_DURATION,
      turnsRemaining: DIPLOMACY_CONSTANTS.TRADE_AGREEMENT_DURATION,
      conditions: [],
    });

    this.updateTrust(faction, targetFaction, 3);

    return { success: true };
  }

  sendGift(faction: string, targetFaction: string, goldAmount: number): DiplomaticResult {
    const relation = this.getRelation(faction, targetFaction);

    const trustGain = Math.floor(goldAmount / 100);
    this.updateTrust(faction, targetFaction, trustGain);

    relation.history.push({
      type: 'diplomatic_event',
      turn: 0,
      initiatorId: faction,
      targetId: targetFaction,
    });

    return { success: true };
  }

  // === Evaluation ===

  private evaluatePeaceAcceptance(
    proposingFaction: string,
    targetFaction: string,
    terms: PeaceTerms
  ): number {
    const relation = this.getRelation(proposingFaction, targetFaction);
    const warKey = this.getRelationKey(proposingFaction, targetFaction);
    const weariness = this.warWeariness.get(warKey) || 0;

    let chance = 0.3; // Base chance

    // War weariness increases acceptance
    chance += weariness / 100;

    // Trust affects acceptance
    chance += relation.trust / 200;

    // Favorable terms
    if (terms.ceasedProvinces.length > 0) {
      chance += 0.2;
    }
    if (terms.reparations > 0) {
      chance += 0.1;
    }

    // Power comparison
    const targetPower = this.factionPower.get(targetFaction) || 1;
    const proposerPower = this.factionPower.get(proposingFaction) || 1;
    if (proposerPower > targetPower * 1.5) {
      chance += 0.2;
    }

    return Math.max(0, Math.min(1, chance));
  }

  private evaluateAllianceAcceptance(proposingFaction: string, targetFaction: string): number {
    const relation = this.getRelation(proposingFaction, targetFaction);

    let chance = 0.2; // Base chance

    // Trust
    chance += relation.trust / 100;

    // Common enemies
    const proposerEnemies = this.getFactionEnemies(proposingFaction);
    const targetEnemies = this.getFactionEnemies(targetFaction);
    const commonEnemies = proposerEnemies.filter(e => targetEnemies.includes(e));
    chance += commonEnemies.length * 0.15;

    // Power balance
    const targetPower = this.factionPower.get(targetFaction) || 1;
    const proposerPower = this.factionPower.get(proposingFaction) || 1;
    if (proposerPower > targetPower * 0.5 && proposerPower < targetPower * 2) {
      chance += 0.1; // Similar power = good alliance
    }

    return Math.max(0, Math.min(1, chance));
  }

  // === Helpers ===

  private notifyAlliesOfWar(aggressor: string, target: string): void {
    // Get allies of both factions and potentially bring them into war
  }

  private getFactionEnemies(faction: string): string[] {
    const enemies: string[] = [];
    for (const [key, relation] of this.relations) {
      if (relation.status === 'war') {
        if (relation.faction1Id === faction) {
          enemies.push(relation.faction2Id);
        } else if (relation.faction2Id === faction) {
          enemies.push(relation.faction1Id);
        }
      }
    }
    return enemies;
  }

  // === Turn Processing ===

  processTurn(factions: string[]): DiplomaticTurnResult {
    const result: DiplomaticTurnResult = {
      expiredTreaties: [],
      warWearinessChanges: [],
    };

    // Decay trust
    for (const relation of this.relations.values()) {
      if (relation.trust !== 0) {
        const decay = Math.sign(relation.trust) * DIPLOMACY_CONSTANTS.TRUST_DECAY_RATE;
        relation.trust -= decay;
      }
    }

    // Process treaties
    for (const relation of this.relations.values()) {
      for (let i = relation.treaties.length - 1; i >= 0; i--) {
        const treaty = relation.treaties[i];
        if (treaty.duration > 0) {
          treaty.turnsRemaining--;
          if (treaty.turnsRemaining <= 0) {
            result.expiredTreaties.push({
              faction1: relation.faction1Id,
              faction2: relation.faction2Id,
              treatyType: treaty.type,
            });
            relation.treaties.splice(i, 1);
          }
        }
      }
    }

    // Update war weariness
    for (const [key, weariness] of this.warWeariness) {
      const newWeariness = weariness + DIPLOMACY_CONSTANTS.WAR_WEARINESS_PER_TURN;
      this.warWeariness.set(key, Math.min(100, newWeariness));
      result.warWearinessChanges.push({
        factions: key,
        weariness: newWeariness,
      });
    }

    // Update casus belli
    for (const [faction, cbList] of this.casusBelli) {
      for (let i = cbList.length - 1; i >= 0; i--) {
        cbList[i].validityTurns--;
        if (cbList[i].validityTurns <= 0) {
          cbList.splice(i, 1);
        }
      }
    }

    return result;
  }

  // === Casus Belli ===

  addCasusBelli(faction: string, targetFaction: string, type: CasusBelliType): void {
    if (!this.casusBelli.has(faction)) {
      this.casusBelli.set(faction, []);
    }

    const cb: CasusBelli = {
      type,
      targetFactionId: targetFaction,
      validityTurns: CASUS_BELLI[type].validityTurns || 10,
      prestigeCost: CASUS_BELLI[type].prestigeCost || 0,
      aggressiveExpansionImpact: CASUS_BELLI[type].aggressiveExpansionImpact || 0,
    };

    this.casusBelli.get(faction)!.push(cb);
  }

  getCasusBelli(faction: string, targetFaction: string): CasusBelli | undefined {
    const cbList = this.casusBelli.get(faction) || [];
    return cbList.find(cb => cb.targetFactionId === targetFaction);
  }

  getAllCasusBelli(faction: string): CasusBelli[] {
    return this.casusBelli.get(faction) || [];
  }

  // === Setters for External Data ===

  setFactionPower(faction: string, power: number): void {
    this.factionPower.set(faction, power);
  }

  setFactionSize(faction: string, size: number): void {
    this.factionSize.set(faction, size);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface DiplomaticResult {
  success: boolean;
  reason?: string;
}

export interface PeaceTerms {
  ceasedProvinces: string[];
  reparations: number;
  releaseVassals: string[];
}

export interface DiplomaticTurnResult {
  expiredTreaties: { faction1: string; faction2: string; treatyType: string }[];
  warWearinessChanges: { factions: string; weariness: number }[];
}

export default DiplomacySystem;
