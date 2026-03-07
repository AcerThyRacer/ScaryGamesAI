/**
 * Total War Engine - Campaign Map System
 * Turn-based strategic layer with provinces, settlements, and armies
 */

import type {
  EntityId,
  Vector2,
  Vector3,
  Province,
  Settlement,
  Resource,
  ResourceType,
  Building,
  BuildingType,
  SiegeState,
} from '../types';

// ============================================================================
// Campaign Constants
// ============================================================================

export const CAMPAIGN_CONSTANTS = {
  // Map
  HEX_SIZE: 10,
  MAP_WIDTH: 100,
  MAP_HEIGHT: 80,

  // Turns
  SEASONS_PER_YEAR: 4,
  TURNS_PER_SEASON: 1,

  // Movement
  BASE_MOVEMENT_POINTS: 20,
  ROAD_MOVEMENT_BONUS: 0.5,
  RIVER_CROSSING_COST: 10,

  // Growth
  BASE_POPULATION_GROWTH: 0.02,
  MAX_SETTLEMENT_POPULATION: 100000,
};

// ============================================================================
// Hex Coordinate System
// ============================================================================

export interface HexCoord {
  q: number;
  r: number;
}

export class HexGrid {
  private width: number;
  private height: number;
  private hexData: Map<string, HexData> = new Map();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  static coordToKey(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
  }

  static keyToCoord(key: string): HexCoord {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  getHex(coord: HexCoord): HexData | undefined {
    return this.hexData.get(HexGrid.coordToKey(coord));
  }

  setHex(coord: HexCoord, data: HexData): void {
    this.hexData.set(HexGrid.coordToKey(coord), data);
  }

  getNeighbors(coord: HexCoord): HexCoord[] {
    const directions = [
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ];

    return directions.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
  }

  distance(a: HexCoord, b: HexCoord): number {
    return (
      (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
    );
  }

  hexToWorld(coord: HexCoord, hexSize: number): Vector3 {
    const x = hexSize * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
    const z = hexSize * ((3 / 2) * coord.r);
    return { x, y: 0, z };
  }

  worldToHex(world: Vector3, hexSize: number): HexCoord {
    const q = ((Math.sqrt(3) / 3) * world.x - (1 / 3) * world.z) / hexSize;
    const r = ((2 / 3) * world.z) / hexSize;
    return this.roundHex({ q, r });
  }

  private roundHex(coord: { q: number; r: number }): HexCoord {
    const s = -coord.q - coord.r;
    let q = Math.round(coord.q);
    let r = Math.round(coord.r);
    let sRounded = Math.round(s);

    const qDiff = Math.abs(q - coord.q);
    const rDiff = Math.abs(r - coord.r);
    const sDiff = Math.abs(sRounded - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - sRounded;
    } else if (rDiff > sDiff) {
      r = -q - sRounded;
    }

    return { q, r };
  }

  getPath(start: HexCoord, end: HexCoord, canPass: (hex: HexData) => boolean): HexCoord[] {
    // A* pathfinding
    const openSet: HexCoord[] = [start];
    const cameFrom: Map<string, HexCoord> = new Map();
    const gScore: Map<string, number> = new Map();
    const fScore: Map<string, number> = new Map();

    gScore.set(HexGrid.coordToKey(start), 0);
    fScore.set(HexGrid.coordToKey(start), this.distance(start, end));

    while (openSet.length > 0) {
      // Get node with lowest fScore
      openSet.sort((a, b) => {
        const fA = fScore.get(HexGrid.coordToKey(a)) || Infinity;
        const fB = fScore.get(HexGrid.coordToKey(b)) || Infinity;
        return fA - fB;
      });

      const current = openSet.shift()!;

      if (current.q === end.q && current.r === end.r) {
        return this.reconstructPath(cameFrom, current);
      }

      for (const neighbor of this.getNeighbors(current)) {
        const hexData = this.getHex(neighbor);
        if (!hexData || !canPass(hexData)) continue;

        const tentativeG = (gScore.get(HexGrid.coordToKey(current)) || 0) + hexData.movementCost;

        const neighborKey = HexGrid.coordToKey(neighbor);
        if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + this.distance(neighbor, end));

          if (!openSet.some(n => n.q === neighbor.q && n.r === neighbor.r)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return []; // No path found
  }

  private reconstructPath(cameFrom: Map<string, HexCoord>, current: HexCoord): HexCoord[] {
    const path: HexCoord[] = [current];
    let key = HexGrid.coordToKey(current);

    while (cameFrom.has(key)) {
      current = cameFrom.get(key)!;
      path.unshift(current);
      key = HexGrid.coordToKey(current);
    }

    return path;
  }
}

export interface HexData {
  terrain: TerrainType;
  movementCost: number;
  hasRoad: boolean;
  hasRiver: boolean;
  provinceId: string | null;
  settlementId: string | null;
  resourceNode: ResourceType | null;
}

export type TerrainType =
  | 'plains'
  | 'forest'
  | 'mountains'
  | 'hills'
  | 'desert'
  | 'swamp'
  | 'coastal'
  | 'ocean'
  | 'river';

// ============================================================================
// Campaign Map
// ============================================================================

export class CampaignMap {
  private hexGrid: HexGrid;
  private provinces: Map<string, Province> = new Map();
  private settlements: Map<string, Settlement> = new Map();
  private armies: Map<EntityId, CampaignArmy> = new Map();
  private factions: Map<string, FactionData> = new Map();
  private currentTurn: number = 1;
  private currentSeason: Season = 'spring';
  private nextArmyId: number = 1;

  constructor(width: number = CAMPAIGN_CONSTANTS.MAP_WIDTH, height: number = CAMPAIGN_CONSTANTS.MAP_HEIGHT) {
    this.hexGrid = new HexGrid(width, height);
  }

  // === Province Management ===

  addProvince(province: Province): void {
    this.provinces.set(province.id, province);
  }

  getProvince(provinceId: string): Province | undefined {
    return this.provinces.get(provinceId);
  }

  getProvincesByOwner(factionId: string): Province[] {
    return Array.from(this.provinces.values()).filter(p => p.ownerId === factionId);
  }

  // === Settlement Management ===

  addSettlement(settlement: Settlement): void {
    this.settlements.set(settlement.id, settlement);
  }

  getSettlement(settlementId: string): Settlement | undefined {
    return this.settlements.get(settlementId);
  }

  getSettlementsByOwner(factionId: string): Settlement[] {
    return Array.from(this.settlements.values()).filter(s => {
      const province = this.provinces.get(s.provinceId);
      return province?.ownerId === factionId;
    });
  }

  // === Army Management ===

  createArmy(factionId: string, position: HexCoord, units: EntityId[]): EntityId {
    const armyId = this.nextArmyId++;
    const army: CampaignArmy = {
      id: armyId,
      factionId,
      position,
      units,
      movementPoints: CAMPAIGN_CONSTANTS.BASE_MOVEMENT_POINTS,
      stance: 'normal',
      isInBattle: false,
      isBesieging: null,
    };
    this.armies.set(armyId, army);
    return armyId;
  }

  getArmy(armyId: EntityId): CampaignArmy | undefined {
    return this.armies.get(armyId);
  }

  getArmiesByFaction(factionId: string): CampaignArmy[] {
    return Array.from(this.armies.values()).filter(a => a.factionId === factionId);
  }

  moveArmy(armyId: EntityId, target: HexCoord): { success: boolean; remainingPoints: number } {
    const army = this.armies.get(armyId);
    if (!army) return { success: false, remainingPoints: 0 };

    const path = this.hexGrid.getPath(army.position, target, hex => hex.terrain !== 'ocean');

    if (path.length === 0) {
      return { success: false, remainingPoints: army.movementPoints };
    }

    let cost = 0;
    for (let i = 1; i < path.length; i++) {
      const hexData = this.hexGrid.getHex(path[i]);
      if (hexData) {
        let hexCost = hexData.movementCost;
        if (hexData.hasRoad) hexCost *= CAMPAIGN_CONSTANTS.ROAD_MOVEMENT_BONUS;
        if (hexData.hasRiver && i === path.length - 1) {
          hexCost += CAMPAIGN_CONSTANTS.RIVER_CROSSING_COST;
        }
        cost += hexCost;
      }
    }

    if (cost <= army.movementPoints) {
      army.position = target;
      army.movementPoints -= cost;
      return { success: true, remainingPoints: army.movementPoints };
    }

    return { success: false, remainingPoints: army.movementPoints };
  }

  // === Turn Management ===

  nextTurn(): TurnResult {
    const results: TurnEvent[] = [];

    // Advance turn counter
    this.currentTurn++;
    if (this.currentTurn % CAMPAIGN_CONSTANTS.TURNS_PER_SEASON === 0) {
      this.advanceSeason();
    }

    // Process all provinces
    for (const [provinceId, province] of this.provinces) {
      const events = this.processProvinceTurn(province);
      results.push(...events);
    }

    // Process all armies
    for (const [armyId, army] of this.armies) {
      army.movementPoints = CAMPAIGN_CONSTANTS.BASE_MOVEMENT_POINTS;
      this.processArmyTurn(army);
    }

    // Check for battles
    const battles = this.detectBattles();
    results.push(...battles.map(b => ({ type: 'battle' as const, data: b })));

    // Check for victories/defeats
    const victoryEvents = this.checkVictoryConditions();
    results.push(...victoryEvents);

    return { turn: this.currentTurn, season: this.currentSeason, events: results };
  }

  private advanceSeason(): void {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(this.currentSeason);
    this.currentSeason = seasons[(currentIndex + 1) % seasons.length];
  }

  private processProvinceTurn(province: Province): TurnEvent[] {
    const events: TurnEvent[] = [];

    // Population growth
    const settlement = this.settlements.get(province.settlementId);
    if (settlement) {
      const growth =
        settlement.population *
        CAMPAIGN_CONSTANTS.BASE_POPULATION_GROWTH *
        (1 + province.fertility * 0.5);
      settlement.population = Math.min(
        settlement.population + growth,
        CAMPAIGN_CONSTANTS.MAX_SETTLEMENT_POPULATION
      );
    }

    // Resource production
    for (const resource of province.resources) {
      resource.amount = Math.min(
        resource.amount + resource.growthRate,
        resource.maxAmount
      );
    }

    // Building construction
    for (const building of province.buildings) {
      if (building.constructionProgress < 100) {
        building.constructionProgress += 25; // 4 turns to complete
        if (building.constructionProgress >= 100) {
          building.active = true;
          events.push({
            type: 'building_complete',
            data: { provinceId: province.id, buildingType: building.type },
          });
        }
      }
    }

    // Public order
    province.publicOrder = this.calculatePublicOrder(province);

    return events;
  }

  private calculatePublicOrder(province: Province): number {
    let order = 50; // Base

    // Tax penalty
    order -= province.taxRate * 100;

    // Building bonuses
    for (const building of province.buildings) {
      if (building.active) {
        if (building.type === 'temple') order += 10 * building.level;
        if (building.type === 'market') order += 5 * building.level;
      }
    }

    // Garrison bonus
    // Would check army presence

    return Math.max(0, Math.min(100, order));
  }

  private processArmyTurn(army: CampaignArmy): void {
    // Heal units
    // Pay upkeep
    // Check for attrition
  }

  private detectBattles(): PendingBattle[] {
    const battles: PendingBattle[] = [];
    const positionArmies: Map<string, CampaignArmy[]> = new Map();

    for (const army of this.armies.values()) {
      const key = HexGrid.coordToKey(army.position);
      if (!positionArmies.has(key)) {
        positionArmies.set(key, []);
      }
      positionArmies.get(key)!.push(army);
    }

    for (const [position, armies] of positionArmies) {
      const factions = new Set(armies.map(a => a.factionId));
      if (factions.size > 1) {
        // Multiple factions - check if hostile
        battles.push({
          position: HexGrid.keyToCoord(position),
          armies: armies.map(a => a.id),
        });
      }
    }

    return battles;
  }

  private checkVictoryConditions(): TurnEvent[] {
    const events: TurnEvent[] = [];

    // Check for eliminated factions
    for (const [factionId, faction] of this.factions) {
      const provinces = this.getProvincesByOwner(factionId);
      if (provinces.length === 0 && !faction.isDefeated) {
        faction.isDefeated = true;
        events.push({
          type: 'faction_eliminated',
          data: { factionId },
        });
      }
    }

    // Check for campaign victory (own X provinces)
    for (const [factionId, faction] of this.factions) {
      const provinces = this.getProvincesByOwner(factionId);
      if (provinces.length >= 50) {
        events.push({
          type: 'campaign_victory',
          data: { factionId },
        });
      }
    }

    return events;
  }

  // === Settlement Capture ===

  captureSettlement(settlementId: string, newOwnerFactionId: string): void {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) return;

    const province = this.provinces.get(settlement.provinceId);
    if (province) {
      province.ownerId = newOwnerFactionId;

      // Clear siege state
      province.siegeState = undefined;

      // Reduce public order (recently conquered)
      province.publicOrder -= 30;

      // Kill some population (sack)
      settlement.population *= 0.8;
    }
  }

  // === Serialization ===

  serialize(): CampaignMapData {
    return {
      hexData: Array.from(this.hexGrid['hexData'].entries()),
      provinces: Array.from(this.provinces.entries()),
      settlements: Array.from(this.settlements.entries()),
      armies: Array.from(this.armies.entries()),
      factions: Array.from(this.factions.entries()),
      currentTurn: this.currentTurn,
      currentSeason: this.currentSeason,
    };
  }

  deserialize(data: CampaignMapData): void {
    this.hexGrid['hexData'] = new Map(data.hexData);
    this.provinces = new Map(data.provinces);
    this.settlements = new Map(data.settlements);
    this.armies = new Map(data.armies);
    this.factions = new Map(data.factions);
    this.currentTurn = data.currentTurn;
    this.currentSeason = data.currentSeason;
  }

  // === Accessors ===

  getHexGrid(): HexGrid {
    return this.hexGrid;
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getCurrentSeason(): Season {
    return this.currentSeason;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface CampaignArmy {
  id: EntityId;
  factionId: string;
  position: HexCoord;
  units: EntityId[];
  movementPoints: number;
  stance: 'normal' | 'forced_march' | 'ambush' | 'encamp';
  isInBattle: boolean;
  isBesieging: string | null; // Settlement ID
}

export interface FactionData {
  id: string;
  name: string;
  color: string;
  isPlayer: boolean;
  isDefeated: boolean;
  resources: Map<ResourceType, number>;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TurnResult {
  turn: number;
  season: Season;
  events: TurnEvent[];
}

export interface TurnEvent {
  type:
    | 'building_complete'
    | 'unit_recruited'
    | 'battle'
    | 'settlement_captured'
    | 'faction_eliminated'
    | 'campaign_victory'
    | 'diplomatic_event';
  data: any;
}

export interface PendingBattle {
  position: HexCoord;
  armies: EntityId[];
}

export interface CampaignMapData {
  hexData: [string, HexData][];
  provinces: [string, Province][];
  settlements: [string, Settlement][];
  armies: [EntityId, CampaignArmy][];
  factions: [string, FactionData][];
  currentTurn: number;
  currentSeason: Season;
}

export default CampaignMap;
