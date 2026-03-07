/**
 * Total War Engine - Hero/Commander System
 * Unique characters with skill trees, equipment, and personal retinues
 */

import type { EntityId, Vector3, UnitCategory, UnitTier } from '../types';

// ============================================================================
// Hero Definition
// ============================================================================

export interface HeroData {
  id: string;
  name: string;
  title: string;
  faction: string;
  era: 'rome' | 'medieval';
  portrait: string;
  biography: string;
  startingLevel: number;
  maxLevel: number;
  stats: HeroStats;
  baseAbilities: HeroAbility[];
  skillTree: SkillNode[];
  equipment: HeroEquipment;
  experience: number;
  traits: HeroTrait[];
  retinue: string[];
}

export interface HeroStats {
  health: number;
  damage: number;
  armor: number;
  speed: number;
  morale: number;
  fatigue: number;
  command: number;
  influence: number;
  combat: number;
  leadership: number;
  strategy: number;
  commandRange: number;
  influenceRange: number;
}

export interface HeroAbility {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive' | 'trigger';
  cooldown: number;
  duration: number;
  range: number;
  effect: AbilityEffect;
  unlockLevel: number;
}

export interface AbilityEffect {
  type: 'buff' | 'debuff' | 'damage' | 'heal' | 'summon' | 'fear';
  target: 'self' | 'allies' | 'enemies' | 'area';
  value: number;
  stat?: string;
  duration?: number;
}

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  effects: SkillEffect[];
  requirements: string[];
  children: string[];
}

export interface SkillEffect {
  stat: string;
  value: number;
  perLevel: boolean;
}

export interface HeroEquipment {
  slot: 'weapon' | 'armor' | 'accessory' | 'mount';
  itemId: string | null;
}

export interface HeroTrait {
  id: string;
  name: string;
  description: string;
  effects: TraitEffect[];
}

export interface TraitEffect {
  type: 'stat_bonus' | 'ability_unlock' | 'resistance';
  value: number;
  stat?: string;
}

// ============================================================================
// Pre-defined Heroes - Rome
// ============================================================================

export const ROME_HEROES: HeroData[] = [
  {
    id: 'scipio_africanus',
    name: 'Scipio Africanus',
    title: 'Conqueror of Carthage',
    faction: 'rome',
    era: 'rome',
    portrait: '/portraits/scipio.jpg',
    biography: 'The greatest general of the Roman Republic, defeated Hannibal at Zama.',
    startingLevel: 1,
    maxLevel: 10,
    stats: {
      health: 250,
      damage: 35,
      armor: 40,
      speed: 7,
      morale: 100,
      fatigue: 100,
      command: 10,
      influence: 8,
      combat: 10,
      leadership: 9,
      strategy: 10,
      commandRange: 80,
      influenceRange: 50,
    },
    baseAbilities: [
      {
        id: 'inspire_troops',
        name: 'Inspire Troops',
        description: 'Nearby units gain attack and morale bonus',
        type: 'active',
        cooldown: 60,
        duration: 30,
        range: 40,
        effect: { type: 'buff', target: 'allies', stat: 'attack', value: 20, duration: 30 },
        unlockLevel: 1,
      },
      {
        id: 'roman_discipline',
        name: 'Roman Discipline',
        description: 'Passive: Units in command range have +10% defense',
        type: 'passive',
        cooldown: 0,
        duration: 0,
        range: 50,
        effect: { type: 'buff', target: 'allies', stat: 'defense', value: 10 },
        unlockLevel: 1,
      },
      {
        id: 'cavalry_charge',
        name: 'Cavalry Charge',
        description: 'Personal cavalry unit gains massive charge bonus',
        type: 'active',
        cooldown: 90,
        duration: 10,
        range: 15,
        effect: { type: 'buff', target: 'self', stat: 'charge', value: 100, duration: 10 },
        unlockLevel: 3,
      },
    ],
    skillTree: [
      {
        id: 'tactics',
        name: 'Tactical Genius',
        description: 'Strategic mastery on the battlefield',
        maxLevel: 5,
        effects: [{ stat: 'command', value: 2, perLevel: true }],
        requirements: [],
        children: ['logistics', 'encirclement'],
      },
      {
        id: 'logistics',
        name: 'Logistics',
        description: 'Improved army supply',
        maxLevel: 3,
        effects: [{ stat: 'movement', value: 5, perLevel: true }],
        requirements: ['tactics'],
        children: [],
      },
    ],
    equipment: {
      slot: 'weapon',
      itemId: 'gladius',
    },
    traits: [
      {
        id: 'born_commander',
        name: 'Born Commander',
        description: 'Natural talent for leadership',
        effects: [{ type: 'stat_bonus', value: 15, stat: 'command' }],
      },
    ],
    retinue: ['praetorian_guard'],
  },
  {
    id: 'julius_caesar',
    name: 'Julius Caesar',
    title: 'Dictator Perpetuo',
    faction: 'rome',
    era: 'rome',
    portrait: '/portraits/caesar.jpg',
    biography: 'Conqueror of Gaul, transformed Rome from Republic to Empire.',
    startingLevel: 1,
    maxLevel: 10,
    stats: {
      health: 280,
      damage: 40,
      armor: 45,
      speed: 7,
      morale: 100,
      fatigue: 100,
      command: 10,
      influence: 10,
      combat: 9,
      leadership: 10,
      strategy: 9,
      commandRange: 100,
      influenceRange: 60,
    },
    baseAbilities: [
      {
        id: 'veni_vidi_vici',
        name: 'Veni, Vidi, Vici',
        description: 'I came, I saw, I conquered - Army gains massive attack bonus',
        type: 'active',
        cooldown: 120,
        duration: 20,
        range: 60,
        effect: { type: 'buff', target: 'allies', stat: 'attack', value: 50, duration: 20 },
        unlockLevel: 5,
      },
      {
        id: 'imperial_presence',
        name: 'Imperial Presence',
        description: 'Passive: Enemies in range have reduced morale',
        type: 'passive',
        cooldown: 0,
        duration: 0,
        range: 40,
        effect: { type: 'debuff', target: 'enemies', stat: 'morale', value: -15 },
        unlockLevel: 1,
      },
    ],
    skillTree: [
      {
        id: 'charisma',
        name: 'Charisma',
        description: 'Personal magnetism',
        maxLevel: 5,
        effects: [{ stat: 'influence', value: 2, perLevel: true }],
        requirements: [],
        children: ['oratory', 'diplomacy'],
      },
    ],
    equipment: {
      slot: 'weapon',
      itemId: 'gladius_caesar',
    },
    traits: [
      {
        id: 'ambitious',
        name: 'Ambitious',
        description: 'Drives for greater glory',
        effects: [{ type: 'stat_bonus', value: 20, stat: 'influence' }],
      },
    ],
    retinue: ['legion_xiii'],
  },
  {
    id: 'marcus_aurelius',
    name: 'Marcus Aurelius',
    title: 'The Philosopher Emperor',
    faction: 'rome',
    era: 'rome',
    portrait: '/portraits/aurelius.jpg',
    biography: 'Stoic philosopher and wise ruler of the Roman Empire.',
    startingLevel: 1,
    maxLevel: 10,
    stats: {
      health: 220,
      damage: 30,
      armor: 35,
      speed: 6,
      morale: 100,
      fatigue: 100,
      command: 8,
      influence: 10,
      combat: 7,
      leadership: 9,
      strategy: 10,
      commandRange: 70,
      influenceRange: 80,
    },
    baseAbilities: [
      {
        id: 'stoic_calm',
        name: 'Stoic Calm',
        description: 'Army gains immunity to morale shocks',
        type: 'active',
        cooldown: 90,
        duration: 60,
        range: 50,
        effect: { type: 'buff', target: 'allies', stat: 'morale_immune', value: 1, duration: 60 },
        unlockLevel: 3,
      },
    ],
    skillTree: [],
    equipment: {
      slot: 'weapon',
      itemId: 'gladius',
    },
    traits: [
      {
        id: 'philosopher',
        name: 'Philosopher',
        description: 'Wisdom in battle',
        effects: [{ type: 'stat_bonus', value: 10, stat: 'strategy' }],
      },
    ],
    retinue: ['praetorian_guard'],
  },
];

// ============================================================================
// Pre-defined Heroes - Medieval
// ============================================================================

export const MEDIEVAL_HEROES: HeroData[] = [
  {
    id: 'richard_lionheart',
    name: 'Richard the Lionheart',
    title: 'The Crusader King',
    faction: 'england',
    era: 'medieval',
    portrait: '/portraits/richard.jpg',
    biography: 'Legendary warrior king, leader of the Third Crusade.',
    startingLevel: 1,
    maxLevel: 10,
    stats: {
      health: 300,
      damage: 45,
      armor: 50,
      speed: 8,
      morale: 100,
      fatigue: 100,
      command: 9,
      influence: 8,
      combat: 10,
      leadership: 9,
      strategy: 7,
      commandRange: 80,
      influenceRange: 40,
    },
    baseAbilities: [
      {
        id: 'lion_roar',
        name: "Lion's Roar",
        description: 'Fearless battle cry terrifies enemies',
        type: 'active',
        cooldown: 60,
        duration: 10,
        range: 50,
        effect: { type: 'fear', target: 'enemies', value: 30, duration: 10 },
        unlockLevel: 1,
      },
      {
        id: 'charge_leader',
        name: 'Lead the Charge',
        description: 'Personal charge deals triple damage',
        type: 'trigger',
        cooldown: 30,
        duration: 5,
        range: 20,
        effect: { type: 'buff', target: 'self', stat: 'charge_damage', value: 200, duration: 5 },
        unlockLevel: 2,
      },
    ],
    skillTree: [
      {
        id: 'chivalry',
        name: 'Chivalry',
        description: 'Code of knightly honor',
        maxLevel: 5,
        effects: [{ stat: 'influence', value: 2, perLevel: true }],
        requirements: [],
        children: [],
      },
    ],
    equipment: {
      slot: 'weapon',
      itemId: 'greatsword',
    },
    traits: [
      {
        id: 'fearless',
        name: 'Fearless',
        description: 'Immune to fear effects',
        effects: [{ type: 'resistance', value: 100, stat: 'fear' }],
      },
    ],
    retinue: ['knights_templar'],
  },
  {
    id: 'saladin',
    name: 'Saladin',
    title: 'Sultan of Egypt',
    faction: 'saracen',
    era: 'medieval',
    portrait: '/portraits/saladin.jpg',
    biography: 'Wise and chivalrous Sultan, respected even by his enemies.',
    startingLevel: 1,
    maxLevel: 10,
    stats: {
      health: 250,
      damage: 38,
      armor: 40,
      speed: 8,
      morale: 100,
      fatigue: 100,
      command: 10,
      influence: 9,
      combat: 8,
      leadership: 10,
      strategy: 9,
      commandRange: 90,
      influenceRange: 60,
    },
    baseAbilities: [
      {
        id: 'magnanimous',
        name: 'Magnanimous Victory',
        description: 'Treating defeated enemies honorably improves diplomacy',
        type: 'passive',
        cooldown: 0,
        duration: 0,
        range: 0,
        effect: { type: 'buff', target: 'self', stat: 'diplomacy', value: 25 },
        unlockLevel: 1,
      },
    ],
    skillTree: [],
    equipment: {
      slot: 'weapon',
      itemId: 'scimitar',
    },
    traits: [],
    retinue: ['mamluk_guard'],
  },
  {
    id: 'joan_arc',
    name: "Joan of Arc",
    title: 'The Maid of Orleans',
    faction: 'france',
    era: 'medieval',
    portrait: '/portraits/joan.jpg',
    biography: 'Divinely inspired peasant girl who led France to victory.',
    startingLevel: 1,
    maxLevel: 10,
    stats: {
      health: 200,
      damage: 35,
      armor: 35,
      speed: 7,
      morale: 100,
      fatigue: 100,
      command: 8,
      influence: 10,
      combat: 8,
      leadership: 9,
      strategy: 6,
      commandRange: 70,
      influenceRange: 80,
    },
    baseAbilities: [
      {
        id: 'divine_inspiration',
        name: 'Divine Inspiration',
        description: 'Holy aura inspires troops to heroic deeds',
        type: 'active',
        cooldown: 120,
        duration: 60,
        range: 60,
        effect: { type: 'buff', target: 'allies', stat: 'all', value: 25, duration: 60 },
        unlockLevel: 5,
      },
      {
        id: 'holy_banner',
        name: 'Holy Banner',
        description: 'Rallying point for routing units',
        type: 'passive',
        cooldown: 0,
        duration: 0,
        range: 40,
        effect: { type: 'buff', target: 'allies', stat: 'rally_chance', value: 50 },
        unlockLevel: 3,
      },
    ],
    skillTree: [],
    equipment: {
      slot: 'weapon',
      itemId: 'banner',
    },
    traits: [
      {
        id: 'divine_mission',
        name: 'Divine Mission',
        description: 'Cannot be demoralized',
        effects: [{ type: 'resistance', value: 100, stat: 'morale_loss' }],
      },
    ],
    retinue: ['faithful_followers'],
  },
];

// ============================================================================
// Hero System
// ============================================================================

export class HeroSystem {
  private heroes: Map<string, HeroData> = new Map();
  private activeHeroes: Map<EntityId, string> = new Map();
  private experience: Map<string, number> = new Map();
  private abilityCooldowns: Map<string, Map<string, number>> = new Map();

  constructor() {
    // Load all heroes with deep clone to prevent mutation of source data
    for (const hero of [...ROME_HEROES, ...MEDIEVAL_HEROES]) {
      this.heroes.set(hero.id, JSON.parse(JSON.stringify(hero)));
      this.experience.set(hero.id, 0);
      this.abilityCooldowns.set(hero.id, new Map());
    }
  }

  getHero(heroId: string): HeroData | undefined {
    return this.heroes.get(heroId);
  }

  getHeroByEntity(entityId: EntityId): HeroData | undefined {
    const heroId = this.activeHeroes.get(entityId);
    return heroId ? this.heroes.get(heroId) : undefined;
  }

  assignHeroToEntity(entityId: EntityId, heroId: string): boolean {
    const hero = this.heroes.get(heroId);
    if (!hero) return false;

    this.activeHeroes.set(entityId, heroId);
    return true;
  }

  removeHeroFromEntity(entityId: EntityId): void {
    this.activeHeroes.delete(entityId);
  }

  grantExperience(heroId: string, amount: number): void {
    const current = this.experience.get(heroId) || 0;
    this.experience.set(heroId, current + amount);

    // Check for level up
    const hero = this.heroes.get(heroId);
    if (hero && current + amount >= this.getExperienceForLevel(hero.startingLevel + 1)) {
      this.levelUp(heroId);
    }
  }

  private getExperienceForLevel(level: number): number {
    return level * level * 100;
  }

  private levelUp(heroId: string): void {
    const hero = this.heroes.get(heroId);
    if (!hero || hero.startingLevel >= hero.maxLevel) return;

    hero.startingLevel++;
    console.log(`${hero.name} leveled up to ${hero.startingLevel}!`);
  }

  useAbility(
    heroId: string,
    abilityId: string,
    targetPosition: Vector3,
    getEntitiesInRange: (pos: Vector3, range: number) => EntityId[]
  ): { success: boolean; targets: EntityId[] } {
    const hero = this.heroes.get(heroId);
    if (!hero) return { success: false, targets: [] };

    const ability = hero.baseAbilities.find(a => a.id === abilityId);
    if (!ability) return { success: false, targets: [] };

    // Check cooldown
    const cooldowns = this.abilityCooldowns.get(heroId)!;
    const currentCooldown = cooldowns.get(abilityId) || 0;
    if (currentCooldown > 0) return { success: false, targets: [] };

    // Check unlock level
    if (ability.unlockLevel > hero.startingLevel) return { success: false, targets: [] };

    // Find targets
    const targets = getEntitiesInRange(targetPosition, ability.range);

    // Set cooldown
    cooldowns.set(abilityId, ability.cooldown);

    return { success: true, targets };
  }

  updateCooldowns(deltaTime: number): void {
    for (const [, cooldowns] of this.abilityCooldowns) {
      for (const [abilityId, cooldown] of cooldowns) {
        if (cooldown > 0) {
          cooldowns.set(abilityId, Math.max(0, cooldown - deltaTime));
        }
      }
    }
  }

  getAvailableHeroes(faction: string, era: string): HeroData[] {
    return Array.from(this.heroes.values()).filter(
      h => h.faction === faction && h.era === era
    );
  }

  getCommandBonus(heroId: string): number {
    const hero = this.heroes.get(heroId);
    return hero ? hero.stats.command : 0;
  }

  getInfluenceBonus(heroId: string): number {
    const hero = this.heroes.get(heroId);
    return hero ? hero.stats.influence : 0;
  }
}

}

export default HeroSystem;
