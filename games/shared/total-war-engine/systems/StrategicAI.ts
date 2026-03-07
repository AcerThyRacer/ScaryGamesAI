/**
 * Total War Engine - Strategic AI
 * Campaign-level AI with goal-oriented planning, economy, and diplomacy
 */

import type {
  EntityId,
  Vector3,
  Province,
  Settlement,
  DiplomaticStatus,
  Resource,
  ResourceType,
} from '../types';

// ============================================================================
// Strategic Constants
// ============================================================================

export const STRATEGIC_CONSTANTS = {
  // Economy
  MIN_TREASURY_RESERVE: 500,
  TAX_RATE_LOW: 0.1,
  TAX_RATE_MEDIUM: 0.2,
  TAX_RATE_HIGH: 0.35,

  // Military
  MIN_GARRISON_RATIO: 0.1,
  IDEAL_ARMY_SIZE: 20,
  MAX_ARMY_MAINTENANCE_RATIO: 0.5,

  // Expansion
  EXPANSION_PRIORITY_MIN: 0.3,
  MIN_PUBLIC_ORDER: 50,

  // Diplomacy
  TRUST_DECAY_RATE: 0.02,
  WAR_WEARINESS_THRESHOLD: 0.7,
};

// ============================================================================
// Strategic Goal System
// ============================================================================

export type StrategicGoalType =
  | 'expand'
  | 'defend'
  | 'economic_growth'
  | 'military_buildup'
  | 'diplomacy'
  | 'consolidate'
  | 'eliminate_threat';

export interface StrategicGoal {
  type: StrategicGoalType;
  priority: number;
  targetId?: string;
  targetValue?: number;
  deadline?: number;
  subgoals: StrategicGoal[];
  progress: number;
}

export interface FactionState {
  factionId: string;
  treasury: number;
  income: number;
  expenses: number;
  militaryStrength: number;
  provinceCount: number;
  publicOrderAvg: number;
  warCount: number;
  allianceCount: number;
  threats: string[];
  opportunities: string[];
}

// ============================================================================
// Goal-Oriented Action Planning (GOAP)
// ============================================================================

interface WorldState {
  hasArmy: boolean;
  hasGold: boolean;
  hasAlliance: boolean;
  atWar: boolean;
  provinceCount: number;
  militaryStrength: number;
  enemyStrength: number;
}

interface Action {
  name: string;
  preconditions: Partial<WorldState>;
  effects: Partial<WorldState>;
  cost: number;
  duration: number;
}

const AVAILABLE_ACTIONS: Action[] = [
  {
    name: 'recruit_army',
    preconditions: { hasGold: true },
    effects: { hasArmy: true },
    cost: 100,
    duration: 2,
  },
  {
    name: 'attack_province',
    preconditions: { hasArmy: true, atWar: true },
    effects: { provinceCount: 1 },
    cost: 50,
    duration: 1,
  },
  {
    name: 'form_alliance',
    preconditions: { hasGold: true },
    effects: { hasAlliance: true },
    cost: 200,
    duration: 3,
  },
  {
    name: 'declare_war',
    preconditions: { hasArmy: true },
    effects: { atWar: true },
    cost: 0,
    duration: 0,
  },
  {
    name: 'build_economy',
    preconditions: { hasGold: true },
    effects: { hasGold: true },
    cost: 150,
    duration: 4,
  },
];

export class GOAPPlanner {
  private maxDepth: number = 5;

  plan(currentState: WorldState, goalState: Partial<WorldState>): Action[] {
    const openSet: { state: WorldState; actions: Action[]; cost: number }[] = [
      { state: currentState, actions: [], cost: 0 },
    ];

    const visited: Set<string> = new Set();
    visited.add(this.stateToString(currentState));

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.cost - b.cost);
      const current = openSet.shift()!;

      if (this.satisfiesGoal(current.state, goalState)) {
        return current.actions;
      }

      if (current.actions.length >= this.maxDepth) continue;

      for (const action of AVAILABLE_ACTIONS) {
        if (this.canApply(current.state, action)) {
          const newState = this.applyAction(current.state, action);
          const stateStr = this.stateToString(newState);

          if (!visited.has(stateStr)) {
            visited.add(stateStr);
            openSet.push({
              state: newState,
              actions: [...current.actions, action],
              cost: current.cost + action.cost,
            });
          }
        }
      }
    }

    return []; // No plan found
  }

  private canApply(state: WorldState, action: Action): boolean {
    for (const [key, value] of Object.entries(action.preconditions)) {
      if (state[key as keyof WorldState] !== value) {
        return false;
      }
    }
    return true;
  }

  private applyAction(state: WorldState, action: Action): WorldState {
    const newState = { ...state };
    for (const [key, value] of Object.entries(action.effects)) {
      if (typeof value === 'number' && typeof newState[key as keyof WorldState] === 'number') {
        (newState as any)[key] += value;
      } else {
        (newState as any)[key] = value;
      }
    }
    return newState;
  }

  private satisfiesGoal(state: WorldState, goal: Partial<WorldState>): boolean {
    for (const [key, value] of Object.entries(goal)) {
      if (state[key as keyof WorldState] !== value) {
        return false;
      }
    }
    return true;
  }

  private stateToString(state: WorldState): string {
    return JSON.stringify(state);
  }
}

// ============================================================================
// Strategic AI
// ============================================================================

export class StrategicAI {
  private factionGoals: Map<string, StrategicGoal[]> = new Map();
  private factionStates: Map<string, FactionState> = new Map();
  private goapPlanner: GOAPPlanner;
  private decisionCooldowns: Map<string, number> = new Map();

  constructor() {
    this.goapPlanner = new GOAPPlanner();
  }

  /**
   * Update strategic AI for a faction
   */
  update(
    factionId: string,
    provinces: Province[],
    armies: any[],
    diplomaticRelations: Map<string, DiplomaticStatus>,
    resources: Map<ResourceType, number>,
    deltaTime: number
  ): StrategicDecision[] {
    // Update faction state
    const state = this.calculateFactionState(factionId, provinces, armies, diplomaticRelations, resources);
    this.factionStates.set(factionId, state);

    // Generate/update goals
    const goals = this.generateGoals(factionId, state);
    this.factionGoals.set(factionId, goals);

    // Make decisions based on goals
    const decisions = this.makeDecisions(factionId, goals, state, provinces, armies);

    return decisions;
  }

  private calculateFactionState(
    factionId: string,
    provinces: Province[],
    armies: any[],
    diplomaticRelations: Map<string, DiplomaticStatus>,
    resources: Map<ResourceType, number>
  ): FactionState {
    const treasury = resources.get('gold') || 0;
    const food = resources.get('food') || 0;

    let totalIncome = 0;
    let totalExpenses = 0;
    let publicOrderSum = 0;

    for (const province of provinces) {
      // Calculate income from province
      totalIncome += province.taxRate * province.resources.find(r => r.type === 'gold')?.amount || 0;
      publicOrderSum += province.publicOrder;
      totalExpenses += province.buildings.length * 10; // Upkeep
    }

    // Military expenses
    totalExpenses += armies.length * 50;

    // Count wars and alliances
    let warCount = 0;
    let allianceCount = 0;
    const threats: string[] = [];

    for (const [otherFaction, status] of diplomaticRelations) {
      if (status === 'war') {
        warCount++;
        threats.push(otherFaction);
      } else if (status === 'alliance') {
        allianceCount++;
      }
    }

    // Calculate military strength
    let militaryStrength = 0;
    for (const army of armies) {
      militaryStrength += army.units?.length || 0;
    }

    return {
      factionId,
      treasury,
      income: totalIncome - totalExpenses,
      expenses: totalExpenses,
      militaryStrength,
      provinceCount: provinces.length,
      publicOrderAvg: provinces.length > 0 ? publicOrderSum / provinces.length : 0,
      warCount,
      allianceCount,
      threats,
      opportunities: this.findOpportunities(factionId, provinces),
    };
  }

  private findOpportunities(factionId: string, provinces: Province[]): string[] {
    // Find weak neighbors, unclaimed territories, etc.
    return [];
  }

  private generateGoals(factionId: string, state: FactionState): StrategicGoal[] {
    const goals: StrategicGoal[] = [];

    // Survival - always priority
    if (state.treasury < STRATEGIC_CONSTANTS.MIN_TREASURY_RESERVE) {
      goals.push({
        type: 'economic_growth',
        priority: 1.0,
        targetValue: STRATEGIC_CONSTANTS.MIN_TREASURY_RESERVE,
        subgoals: [],
        progress: state.treasury / STRATEGIC_CONSTANTS.MIN_TREASURY_RESERVE,
      });
    }

    // Military buildup if weak
    if (state.militaryStrength < STRATEGIC_CONSTANTS.IDEAL_ARMY_SIZE) {
      goals.push({
        type: 'military_buildup',
        priority: 0.8,
        targetValue: STRATEGIC_CONSTANTS.IDEAL_ARMY_SIZE,
        subgoals: [],
        progress: state.militaryStrength / STRATEGIC_CONSTANTS.IDEAL_ARMY_SIZE,
      });
    }

    // Handle threats
    for (const threat of state.threats) {
      goals.push({
        type: 'eliminate_threat',
        priority: 0.9,
        targetId: threat,
        subgoals: [],
        progress: 0,
      });
    }

    // Expansion if stable
    if (state.publicOrderAvg > STRATEGIC_CONSTANTS.MIN_PUBLIC_ORDER && state.warCount === 0) {
      goals.push({
        type: 'expand',
        priority: 0.6,
        subgoals: [],
        progress: 0,
      });
    }

    // Consolidate if overextended
    if (state.publicOrderAvg < STRATEGIC_CONSTANTS.MIN_PUBLIC_ORDER) {
      goals.push({
        type: 'consolidate',
        priority: 0.7,
        subgoals: [],
        progress: 0,
      });
    }

    // Sort by priority
    goals.sort((a, b) => b.priority - a.priority);
    return goals;
  }

  private makeDecisions(
    factionId: string,
    goals: StrategicGoal[],
    state: FactionState,
    provinces: Province[],
    armies: any[]
  ): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    // Check cooldown
    const cooldown = this.decisionCooldowns.get(factionId) || 0;
    if (cooldown > 0) {
      this.decisionCooldowns.set(factionId, cooldown - 1);
      return decisions;
    }

    // Process highest priority goal
    const topGoal = goals[0];
    if (!topGoal) return decisions;

    switch (topGoal.type) {
      case 'economic_growth':
        decisions.push(...this.makeEconomicDecisions(factionId, state, provinces));
        break;

      case 'military_buildup':
        decisions.push(...this.makeMilitaryDecisions(factionId, state, provinces));
        break;

      case 'expand':
        decisions.push(...this.makeExpansionDecisions(factionId, state, provinces, armies));
        break;

      case 'defend':
      case 'eliminate_threat':
        decisions.push(...this.makeDefenseDecisions(factionId, state, topGoal.targetId));
        break;

      case 'diplomacy':
        decisions.push(...this.makeDiplomaticDecisions(factionId, state));
        break;

      case 'consolidate':
        decisions.push(...this.makeConsolidationDecisions(factionId, state, provinces));
        break;
    }

    if (decisions.length > 0) {
      this.decisionCooldowns.set(factionId, 3); // 3 turn cooldown
    }

    return decisions;
  }

  private makeEconomicDecisions(
    factionId: string,
    state: FactionState,
    provinces: Province[]
  ): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    // Increase taxes if desperate
    if (state.treasury < 100) {
      for (const province of provinces) {
        if (province.taxRate < STRATEGIC_CONSTANTS.TAX_RATE_HIGH) {
          decisions.push({
            type: 'adjust_tax',
            factionId,
            provinceId: province.id,
            value: STRATEGIC_CONSTANTS.TAX_RATE_HIGH,
            reason: 'Emergency tax increase',
          });
          break; // One at a time
        }
      }
    }

    // Build economy
    for (const province of provinces) {
      const hasFarm = province.buildings.some(b => b.type === 'farm');
      if (!hasFarm && province.fertility > 0.5) {
        decisions.push({
          type: 'construct_building',
          factionId,
          provinceId: province.id,
          buildingType: 'farm',
          reason: 'Economic growth - farm construction',
        });
        break;
      }
    }

    return decisions;
  }

  private makeMilitaryDecisions(
    factionId: string,
    state: FactionState,
    provinces: Province[]
  ): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    // Find settlement with barracks
    for (const province of provinces) {
      const settlement = province.settlementId;
      const hasBarracks = province.buildings.some(b => b.type === 'barracks');

      if (hasBarracks && state.treasury > 100) {
        decisions.push({
          type: 'recruit_unit',
          factionId,
          settlementId: settlement,
          unitType: 'swordsmen',
          reason: 'Military buildup',
        });
        break;
      }
    }

    // Build barracks if none
    if (!provinces.some(p => p.buildings.some(b => b.type === 'barracks'))) {
      const capital = provinces.find(p => province.settlementId);
      if (capital && state.treasury > 200) {
        decisions.push({
          type: 'construct_building',
          factionId,
          provinceId: capital.id,
          buildingType: 'barracks',
          reason: 'Military buildup - barracks construction',
        });
      }
    }

    return decisions;
  }

  private makeExpansionDecisions(
    factionId: string,
    state: FactionState,
    provinces: Province[],
    armies: any[]
  ): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    if (armies.length === 0) return decisions;

    // Find border province to attack
    for (const province of provinces) {
      // Would check for neighboring enemy provinces
      decisions.push({
        type: 'attack_province',
        factionId,
        targetProvinceId: 'target_province_id',
        armyId: armies[0].id,
        reason: 'Expansion - border conquest',
      });
      break;
    }

    return decisions;
  }

  private makeDefenseDecisions(
    factionId: string,
    state: FactionState,
    threatId?: string
  ): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    // Mobilize reserves
    decisions.push({
      type: 'mobilize_army',
      factionId,
      targetProvinceId: 'border_province',
      reason: 'Defense against threat: ' + threatId,
    });

    // Request alliance
    if (state.allianceCount === 0 && threatId) {
      decisions.push({
        type: 'propose_alliance',
        factionId,
        targetFactionId: 'potential_ally',
        reason: 'Seek allies against threat',
      });
    }

    return decisions;
  }

  private makeDiplomaticDecisions(factionId: string, state: FactionState): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    // Propose non-aggression pact with neighbors
    if (state.warCount === 0 && state.treasury > 200) {
      decisions.push({
        type: 'propose_treaty',
        factionId,
        targetFactionId: 'neighbor_faction',
        treatyType: 'non_aggression',
        reason: 'Secure borders',
      });
    }

    return decisions;
  }

  private makeConsolidationDecisions(
    factionId: string,
    state: FactionState,
    provinces: Province[]
  ): StrategicDecision[] {
    const decisions: StrategicDecision[] = [];

    // Lower taxes
    for (const province of provinces) {
      if (province.publicOrder < 50 && province.taxRate > STRATEGIC_CONSTANTS.TAX_RATE_LOW) {
        decisions.push({
          type: 'adjust_tax',
          factionId,
          provinceId: province.id,
          value: STRATEGIC_CONSTANTS.TAX_RATE_LOW,
          reason: 'Consolidation - reduce unrest',
        });
        break;
      }
    }

    // Build temples for public order
    for (const province of provinces) {
      if (province.publicOrder < 60) {
        decisions.push({
          type: 'construct_building',
          factionId,
          provinceId: province.id,
          buildingType: 'temple',
          reason: 'Consolidation - improve public order',
        });
        break;
      }
    }

    return decisions;
  }

  /**
   * Get current goals for a faction
   */
  getGoals(factionId: string): StrategicGoal[] {
    return this.factionGoals.get(factionId) || [];
  }

  /**
   * Get faction state
   */
  getState(factionId: string): FactionState | undefined {
    return this.factionStates.get(factionId);
  }

  /**
   * Evaluate peace treaty
   */
  evaluatePeaceOffer(factionId: string, offeringFaction: string): boolean {
    const state = this.factionStates.get(factionId);
    if (!state) return false;

    // More likely to accept if losing
    const warWeariness = state.warCount / (state.provinceCount + 1);
    return warWeariness > STRATEGIC_CONSTANTS.WAR_WEARINESS_THRESHOLD;
  }

  /**
   * Evaluate alliance proposal
   */
  evaluateAllianceProposal(factionId: string, proposingFaction: string): boolean {
    const state = this.factionStates.get(factionId);
    if (!state) return false;

    // Accept if threatened
    return state.threats.length > 0 || state.allianceCount === 0;
  }
}

// ============================================================================
// Strategic Decision
// ============================================================================

export interface StrategicDecision {
  type:
    | 'recruit_unit'
    | 'construct_building'
    | 'adjust_tax'
    | 'attack_province'
    | 'mobilize_army'
    | 'propose_alliance'
    | 'propose_treaty'
    | 'move_army';
  factionId: string;
  reason: string;
  [key: string]: any;
}

export default StrategicAI;
