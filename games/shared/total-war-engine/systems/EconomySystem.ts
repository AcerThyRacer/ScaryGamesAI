/**
 * Total War Engine - Economy System
 * Resource management, trade, taxation, and building chains
 */

import type {
  Province,
  Settlement,
  Resource,
  ResourceType,
  Building,
  BuildingType,
} from '../types';

// ============================================================================
// Economy Constants
// ============================================================================

export const ECONOMY_CONSTANTS = {
  // Base rates
  BASE_TAX_INCOME: 50,
  BASE_FARM_PRODUCTION: 20,
  BASE_MINE_PRODUCTION: 30,
  BASE_TRADE_INCOME: 25,

  // Multipliers
  MARKET_BONUS: 0.15,
  PORT_BONUS: 0.25,
  CAPITAL_BONUS: 0.5,

  // Costs
  BASE_BUILDING_COST: 100,
  BASE_UNIT_COST: 50,
  BASE_UPKEEP_PER_UNIT: 5,

  // Limits
  MAX_TAX_RATE: 0.5,
  MIN_TAX_RATE: 0,
};

// ============================================================================
// Building Definitions
// ============================================================================

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costPerLevel: number;
  buildTime: number;
  effects: BuildingEffect[];
  requirements: BuildingRequirement[];
  upgrades: BuildingType[];
}

export interface BuildingEffect {
  type: BuildingEffectType;
  value: number;
  perLevel?: boolean;
}

export type BuildingEffectType =
  | 'income'
  | 'food'
  | 'materials'
  | 'public_order'
  | 'recruitment_slots'
  | 'garrison'
  | 'defense'
  | 'growth'
  | 'research';

export interface BuildingRequirement {
  type: 'building' | 'resource' | 'technology' | 'faction';
  target: string;
  level?: number;
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  farm: {
    type: 'farm',
    name: 'Farm',
    description: 'Produces food for your population',
    maxLevel: 5,
    baseCost: 100,
    costPerLevel: 50,
    buildTime: 4,
    effects: [
      { type: 'food', value: 20, perLevel: true },
      { type: 'growth', value: 0.05, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
  mine: {
    type: 'mine',
    name: 'Mine',
    description: 'Extracts valuable materials from the earth',
    maxLevel: 4,
    baseCost: 200,
    costPerLevel: 100,
    buildTime: 6,
    effects: [
      { type: 'materials', value: 15, perLevel: true },
      { type: 'income', value: 10, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
  barracks: {
    type: 'barracks',
    name: 'Barracks',
    description: 'Recruit and train infantry units',
    maxLevel: 4,
    baseCost: 300,
    costPerLevel: 150,
    buildTime: 5,
    effects: [
      { type: 'recruitment_slots', value: 1, perLevel: true },
      { type: 'garrison', value: 2, perLevel: true },
    ],
    requirements: [],
    upgrades: ['stable'],
  },
  stable: {
    type: 'stable',
    name: 'Stable',
    description: 'Recruit cavalry units',
    maxLevel: 3,
    baseCost: 400,
    costPerLevel: 200,
    buildTime: 6,
    effects: [
      { type: 'recruitment_slots', value: 1, perLevel: true },
    ],
    requirements: [{ type: 'building', target: 'barracks', level: 2 }],
    upgrades: [],
  },
  market: {
    type: 'market',
    name: 'Market',
    description: 'Increases trade income and public order',
    maxLevel: 4,
    baseCost: 250,
    costPerLevel: 125,
    buildTime: 4,
    effects: [
      { type: 'income', value: 15, perLevel: true },
      { type: 'public_order', value: 3, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
  temple: {
    type: 'temple',
    name: 'Temple',
    description: 'Increases public order and provides cultural benefits',
    maxLevel: 4,
    baseCost: 200,
    costPerLevel: 100,
    buildTime: 5,
    effects: [
      { type: 'public_order', value: 8, perLevel: true },
      { type: 'growth', value: 0.02, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
  wall: {
    type: 'wall',
    name: 'Walls',
    description: 'Defensive fortifications for the settlement',
    maxLevel: 4,
    baseCost: 350,
    costPerLevel: 175,
    buildTime: 8,
    effects: [
      { type: 'defense', value: 20, perLevel: true },
      { type: 'garrison', value: 3, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
  port: {
    type: 'port',
    name: 'Port',
    description: 'Enables maritime trade and naval recruitment',
    maxLevel: 4,
    baseCost: 400,
    costPerLevel: 200,
    buildTime: 6,
    effects: [
      { type: 'income', value: 25, perLevel: true },
      { type: 'recruitment_slots', value: 1, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
  workshop: {
    type: 'workshop',
    name: 'Workshop',
    description: 'Produces materials and enables siege equipment',
    maxLevel: 3,
    baseCost: 300,
    costPerLevel: 150,
    buildTime: 5,
    effects: [
      { type: 'materials', value: 10, perLevel: true },
      { type: 'research', value: 5, perLevel: true },
    ],
    requirements: [],
    upgrades: [],
  },
};

// ============================================================================
// Resource Manager
// ============================================================================

export class ResourceManager {
  private factionResources: Map<string, Map<ResourceType, Resource>> = new Map();

  initializeFaction(factionId: string, startingResources: Partial<Record<ResourceType, number>>): void {
    const resources = new Map<ResourceType, Resource>();

    const defaults: Record<ResourceType, number> = {
      gold: 1000,
      food: 500,
      materials: 200,
      manpower: 100,
      influence: 10,
    };

    for (const [type, amount] of Object.entries(defaults)) {
      resources.set(type as ResourceType, {
        type: type as ResourceType,
        amount: startingResources[type as ResourceType] ?? amount,
        maxAmount: type === 'manpower' ? 1000 : 100000,
        growthRate: this.getBaseGrowthRate(type as ResourceType),
      });
    }

    this.factionResources.set(factionId, resources);
  }

  private getBaseGrowthRate(type: ResourceType): number {
    switch (type) {
      case 'gold':
        return 10;
      case 'food':
        return 5;
      case 'materials':
        return 2;
      case 'manpower':
        return 1;
      case 'influence':
        return 0.5;
      default:
        return 0;
    }
  }

  getResource(factionId: string, type: ResourceType): Resource | undefined {
    return this.factionResources.get(factionId)?.get(type);
  }

  getAllResources(factionId: string): Map<ResourceType, Resource> | undefined {
    return this.factionResources.get(factionId);
  }

  modifyResource(factionId: string, type: ResourceType, amount: number): boolean {
    const resource = this.factionResources.get(factionId)?.get(type);
    if (!resource) return false;

    resource.amount = Math.max(0, Math.min(resource.amount + amount, resource.maxAmount));
    return true;
  }

  canAfford(factionId: string, costs: Partial<Record<ResourceType, number>>): boolean {
    const resources = this.factionResources.get(factionId);
    if (!resources) return false;

    for (const [type, amount] of Object.entries(costs)) {
      const resource = resources.get(type as ResourceType);
      if (!resource || resource.amount < (amount || 0)) {
        return false;
      }
    }

    return true;
  }

  spend(factionId: string, costs: Partial<Record<ResourceType, number>>): boolean {
    if (!this.canAfford(factionId, costs)) return false;

    for (const [type, amount] of Object.entries(costs)) {
      this.modifyResource(factionId, type as ResourceType, -(amount || 0));
    }

    return true;
  }
}

// ============================================================================
// Economy System
// ============================================================================

export class EconomySystem {
  private resourceManager: ResourceManager;
  private tradeRoutes: Map<string, TradeRoute[]> = new Map();
  private buildingQueue: Map<string, BuildingConstruction[]> = new Map();

  constructor() {
    this.resourceManager = new ResourceManager();
  }

  /**
   * Process economy for a turn
   */
  processTurn(
    factionId: string,
    provinces: Province[],
    armies: { upkeep: number }[]
  ): EconomyReport {
    const report: EconomyReport = {
      factionId,
      income: { gold: 0, food: 0, materials: 0, manpower: 0 },
      expenses: { gold: 0, food: 0, materials: 0, manpower: 0 },
      net: { gold: 0, food: 0, materials: 0, manpower: 0 },
      breakdown: [],
    };

    // Process each province
    for (const province of provinces) {
      const provinceReport = this.processProvince(factionId, province);
      report.income.gold += provinceReport.income;
      report.income.food += provinceReport.food;
      report.income.materials += provinceReport.materials;
      report.breakdown.push(provinceReport);
    }

    // Process trade routes
    const tradeRoutes = this.tradeRoutes.get(factionId) || [];
    for (const route of tradeRoutes) {
      if (route.active) {
        report.income.gold += route.income;
      }
    }

    // Process army upkeep
    for (const army of armies) {
      report.expenses.gold += army.upkeep;
    }

    // Calculate net
    report.net.gold = report.income.gold - report.expenses.gold;
    report.net.food = report.income.food - report.expenses.food;
    report.net.materials = report.income.materials - report.expenses.materials;

    // Apply to resources
    for (const [type, amount] of Object.entries(report.net)) {
      this.resourceManager.modifyResource(factionId, type as ResourceType, amount);
    }

    return report;
  }

  private processProvince(factionId: string, province: Province): ProvinceEconomyReport {
    const report: ProvinceEconomyReport = {
      provinceId: province.id,
      income: 0,
      food: 0,
      materials: 0,
      publicOrder: province.publicOrder,
      taxRate: province.taxRate,
    };

    const settlement = province.settlementId; // Would get settlement data

    // Base income from population (tax)
    const baseTax = ECONOMY_CONSTANTS.BASE_TAX_INCOME * (1 + province.taxRate * 2);
    report.income += baseTax;

    // Building income
    for (const building of province.buildings) {
      if (!building.active) continue;

      const def = BUILDING_DEFINITIONS[building.type];
      if (!def) continue;

      for (const effect of def.effects) {
        const value = effect.perLevel ? effect.value * building.level : effect.value;

        switch (effect.type) {
          case 'income':
            report.income += value;
            break;
          case 'food':
            report.food += value;
            break;
          case 'materials':
            report.materials += value;
            break;
        }
      }
    }

    // Resource nodes
    for (const resource of province.resources) {
      switch (resource.type) {
        case 'gold':
          report.income += resource.amount * 0.1;
          break;
        case 'food':
          report.food += resource.amount * 0.1;
          break;
        case 'materials':
          report.materials += resource.amount * 0.1;
          break;
      }
    }

    // Fertility modifier
    report.food *= 0.5 + province.fertility * 0.5;

    return report;
  }

  // === Building Construction ===

  startConstruction(
    factionId: string,
    provinceId: string,
    buildingType: BuildingType,
    level: number = 1
  ): { success: boolean; reason?: string } {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) {
      return { success: false, reason: 'Unknown building type' };
    }

    const cost = this.calculateBuildingCost(buildingType, level);
    if (!this.resourceManager.canAfford(factionId, { gold: cost })) {
      return { success: false, reason: 'Insufficient gold' };
    }

    this.resourceManager.spend(factionId, { gold: cost });

    if (!this.buildingQueue.has(factionId)) {
      this.buildingQueue.set(factionId, []);
    }

    this.buildingQueue.get(factionId)!.push({
      provinceId,
      buildingType,
      level,
      turnsRemaining: def.buildTime,
    });

    return { success: true };
  }

  calculateBuildingCost(buildingType: BuildingType, level: number): number {
    const def = BUILDING_DEFINITIONS[buildingType];
    if (!def) return 0;
    return def.baseCost + def.costPerLevel * (level - 1);
  }

  processConstruction(factionId: string): CompletedBuilding[] {
    const queue = this.buildingQueue.get(factionId) || [];
    const completed: CompletedBuilding[] = [];

    for (let i = queue.length - 1; i >= 0; i--) {
      queue[i].turnsRemaining--;
      if (queue[i].turnsRemaining <= 0) {
        completed.push({
          provinceId: queue[i].provinceId,
          buildingType: queue[i].buildingType,
          level: queue[i].level,
        });
        queue.splice(i, 1);
      }
    }

    return completed;
  }

  // === Trade ===

  createTradeRoute(
    factionId: string,
    partnerFactionId: string,
    settlementA: string,
    settlementB: string
  ): TradeRoute {
    const route: TradeRoute = {
      id: `${factionId}-${partnerFactionId}-${Date.now()}`,
      factionA: factionId,
      factionB: partnerFactionId,
      settlementA,
      settlementB,
      income: 50, // Base trade income
      active: true,
    };

    if (!this.tradeRoutes.has(factionId)) {
      this.tradeRoutes.set(factionId, []);
    }
    this.tradeRoutes.get(factionId)!.push(route);

    return route;
  }

  breakTradeRoute(routeId: string): void {
    for (const [factionId, routes] of this.tradeRoutes) {
      const index = routes.findIndex(r => r.id === routeId);
      if (index >= 0) {
        routes[index].active = false;
        break;
      }
    }
  }

  // === Taxation ===

  setTaxRate(province: Province, rate: number): void {
    province.taxRate = Math.max(
      ECONOMY_CONSTANTS.MIN_TAX_RATE,
      Math.min(ECONOMY_CONSTANTS.MAX_TAX_RATE, rate)
    );
  }

  // === Accessors ===

  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface EconomyReport {
  factionId: string;
  income: Partial<Record<ResourceType, number>>;
  expenses: Partial<Record<ResourceType, number>>;
  net: Partial<Record<ResourceType, number>>;
  breakdown: ProvinceEconomyReport[];
}

export interface ProvinceEconomyReport {
  provinceId: string;
  income: number;
  food: number;
  materials: number;
  publicOrder: number;
  taxRate: number;
}

export interface TradeRoute {
  id: string;
  factionA: string;
  factionB: string;
  settlementA: string;
  settlementB: string;
  income: number;
  active: boolean;
}

export interface BuildingConstruction {
  provinceId: string;
  buildingType: BuildingType;
  level: number;
  turnsRemaining: number;
}

export interface CompletedBuilding {
  provinceId: string;
  buildingType: BuildingType;
  level: number;
}

export default EconomySystem;
