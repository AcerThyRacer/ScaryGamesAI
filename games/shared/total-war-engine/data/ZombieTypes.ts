/**
 * Total War Engine - Zombie Type Database
 * 40+ unique zombie types with abilities, tiers, and variants
 */

import type { Vector3 } from '../types';

// ============================================================================
// Zombie Type Definitions
// ============================================================================

export type ZombieTier = 'basic' | 'special' | 'elite' | 'boss' | 'legendary';
export type ZombieVariant = 'standard' | 'arctic' | 'desert' | 'swamp' | 'urban' | 'ancient';

export interface ZombieAbility {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  duration?: number;
  range?: number;
  damage?: number;
  effect?: string;
}

export interface ZombieStats {
  health: number;
  damage: number;
  speed: number;
  armor: number;
  detectionRange: number;
  attackRange: number;
  attackSpeed: number;
}

export interface ZombieType {
  id: string;
  name: string;
  description: string;
  tier: ZombieTier;
  stats: ZombieStats;
  abilities: ZombieAbility[];
  weaknesses: string[];
  spawnWeight: number;
  modelScale: number;
  variants: ZombieVariant[];
  goreType: 'standard' | 'explosive' | 'toxic' | 'fire' | 'skeletal';
  audioCues: string[];
  deathEffect?: ZombieDeathEffect;
}

export interface ZombieDeathEffect {
  type: 'explosion' | 'toxic_cloud' | 'spawn' | 'acid_pool' | 'fire_burst';
  radius: number;
  damage: number;
  duration: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

const createZombie = (
  id: string,
  name: string,
  description: string,
  tier: ZombieTier,
  stats: Partial<ZombieStats>,
  abilities: ZombieAbility[] = [],
  weaknesses: string[] = [],
  options: Partial<ZombieType> = {}
): ZombieType => ({
  id,
  name,
  description,
  tier,
  stats: {
    health: 50,
    damage: 10,
    speed: 2.0,
    armor: 0,
    detectionRange: 25,
    attackRange: 1.5,
    attackSpeed: 1.0,
    ...stats,
  },
  abilities,
  weaknesses,
  spawnWeight: options.spawnWeight ?? 1.0,
  modelScale: options.modelScale ?? 1.0,
  variants: options.variants ?? ['standard'],
  goreType: options.goreType ?? 'standard',
  audioCues: options.audioCues ?? ['groan'],
  deathEffect: options.deathEffect,
});

const createAbility = (
  id: string,
  name: string,
  description: string,
  cooldown: number,
  options: Partial<ZombieAbility> = {}
): ZombieAbility => ({
  id,
  name,
  description,
  cooldown,
  ...options,
});

// ============================================================================
// BASIC ZOMBIES (10 Types)
// ============================================================================

export const BASIC_ZOMBIES: ZombieType[] = [
  createZombie(
    'shambler',
    'Shambler',
    'Slow but relentless basic zombie',
    'basic',
    { health: 40, damage: 8, speed: 1.5, detectionRange: 20 },
    [],
    ['fire', 'headshots'],
    { spawnWeight: 1.0 }
  ),
  createZombie(
    'walker',
    'Walker',
    'Standard walking zombie, average in all regards',
    'basic',
    { health: 50, damage: 10, speed: 2.0, detectionRange: 25 },
    [],
    ['fire', 'decapitation'],
    { spawnWeight: 1.0 }
  ),
  createZombie(
    'crawler',
    'Crawler',
    'Low-profile zombie that drags itself forward',
    'basic',
    { health: 30, damage: 8, speed: 1.0, detectionRange: 15, attackRange: 0.8 },
    [createAbility('low_profile', 'Low Profile', 'Harder to hit at range', 0)],
    ['stomp', 'area_damage'],
    { spawnWeight: 0.6, modelScale: 0.5 }
  ),
  createZombie(
    'runner',
    'Runner',
    'Fast zombie that sprints toward prey',
    'basic',
    { health: 35, damage: 12, speed: 5.0, detectionRange: 35 },
    [createAbility('sprint', 'Sprint', 'Burst of speed', 5, { duration: 3 })],
    ['traps', 'stunning'],
    { spawnWeight: 0.8 }
  ),
  createZombie(
    'rotting',
    'Rotting Corpse',
    'Decaying zombie that spreads disease',
    'basic',
    { health: 25, damage: 6, speed: 1.2, detectionRange: 20 },
    [createAbility('disease_aura', 'Disease Aura', 'Nearby units take damage over time', 0, { range: 3, damage: 2 })],
    ['fire'],
    { spawnWeight: 0.5, goreType: 'toxic' }
  ),
  createZombie(
    'fresh',
    'Freshly Turned',
    'Recently infected, retains some human agility',
    'basic',
    { health: 60, damage: 12, speed: 2.5, detectionRange: 30, attackSpeed: 1.2 },
    [],
    ['fire', 'holy'],
    { spawnWeight: 0.7 }
  ),
  createZombie(
    'bloated_corpse',
    'Bloated Corpse',
    'Swollen with gases, explodes on death',
    'basic',
    { health: 45, damage: 8, speed: 1.0, detectionRange: 20 },
    [],
    ['fire', 'piercing'],
    {
      spawnWeight: 0.4,
      deathEffect: { type: 'explosion', radius: 3, damage: 25, duration: 0 },
      goreType: 'explosive',
    }
  ),
  createZombie(
    'skeleton',
    'Skeleton',
    'Animated bones, resistant to piercing',
    'basic',
    { health: 20, damage: 8, speed: 2.0, armor: 2, detectionRange: 25 },
    [],
    ['bludgeoning', 'holy'],
    { spawnWeight: 0.5, goreType: 'skeletal', modelScale: 0.9 }
  ),
  createZombie(
    'drowned',
    'Drowned One',
    'Waterlogged zombie that emerges from depths',
    'basic',
    { health: 55, damage: 10, speed: 1.8, detectionRange: 22 },
    [createAbility('grapple', 'Grapple', 'Slows target on hit', 8, { duration: 2 })],
    ['fire', 'lightning'],
    { spawnWeight: 0.3, variants: ['standard', 'swamp'] }
  ),
  createZombie(
    'frostbitten',
    'Frostbitten Walker',
    'Frozen zombie that slows targets',
    'basic',
    { health: 50, damage: 10, speed: 1.8, detectionRange: 25 },
    [createAbility('chill', 'Chill', 'Slows attack speed of nearby enemies', 0, { range: 2 })],
    ['fire', 'holy'],
    { spawnWeight: 0.4, variants: ['standard', 'arctic'] }
  ),
];

// ============================================================================
// SPECIAL ZOMBIES (15 Types)
// ============================================================================

export const SPECIAL_ZOMBIES: ZombieType[] = [
  createZombie(
    'spitter',
    'Spitter',
    'Ranged zombie that hurls acidic bile',
    'special',
    { health: 40, damage: 5, speed: 1.5, detectionRange: 40, attackRange: 25 },
    [
      createAbility('acid_spit', 'Acid Spit', 'Ranged acid attack', 4, { range: 25, damage: 20 }),
      createAbility('acid_pool', 'Acid Pool', 'Creates damaging area on death', 0),
    ],
    ['priority_target', 'close_range'],
    {
      spawnWeight: 0.4,
      deathEffect: { type: 'acid_pool', radius: 3, damage: 10, duration: 5 },
      goreType: 'toxic',
    }
  ),
  createZombie(
    'bloater',
    'Bloater',
    'Massive zombie that explodes in toxic cloud',
    'special',
    { health: 120, damage: 15, speed: 1.0, armor: 5, detectionRange: 20 },
    [
      createAbility('death_explosion', 'Death Explosion', 'Explodes when killed', 0, { range: 5, damage: 60 }),
      createAbility('toxic_cloud', 'Toxic Cloud', 'Releases poison gas', 15, { duration: 8, range: 6 }),
    ],
    ['fire', 'explosive', 'long_range'],
    {
      spawnWeight: 0.3,
      modelScale: 1.4,
      deathEffect: { type: 'toxic_cloud', radius: 6, damage: 15, duration: 10 },
      goreType: 'explosive',
    }
  ),
  createZombie(
    'howler',
    'Howler',
    'Emits piercing scream that attracts more zombies',
    'special',
    { health: 60, damage: 8, speed: 2.5, detectionRange: 50 },
    [
      createAbility('alarm_scream', 'Alarm Scream', 'Attracts nearby zombies', 20, { range: 80 }),
      createAbility('fear', 'Fear', 'Causes morale damage', 15, { range: 10 }),
    ],
    ['silenced_weapons', 'priority_target'],
    { spawnWeight: 0.3 }
  ),
  createZombie(
    'hunter',
    'Hunter',
    'Agile predator that leaps at prey',
    'special',
    { health: 70, damage: 25, speed: 4.0, detectionRange: 40 },
    [
      createAbility('pounce', 'Pounce', 'Leaps at target', 8, { range: 15, damage: 35 }),
      createAbility('stealth', 'Stealth', 'Becomes harder to detect', 12, { duration: 5 }),
    ],
    ['traps', 'fire'],
    { spawnWeight: 0.35 }
  ),
  createZombie(
    'charger',
    'Charger',
    'Massive arm used to bull-rush targets',
    'special',
    { health: 200, damage: 30, speed: 3.5, armor: 10, detectionRange: 35 },
    [
      createAbility('charge', 'Charge', 'Rushes forward, knocking aside enemies', 10, { range: 20, damage: 50 }),
    ],
    ['legs', 'fire'],
    { spawnWeight: 0.25, modelScale: 1.3 }
  ),
  createZombie(
    'smoker',
    'Smoker',
    'Uses long tongue to drag victims',
    'special',
    { health: 80, damage: 15, speed: 1.8, detectionRange: 35, attackRange: 20 },
    [
      createAbility('tongue_grab', 'Tongue Grab', 'Drags target toward itself', 12, { range: 20 }),
      createAbility('smoke_cloud', 'Smoke Cloud', 'Creates vision-blocking smoke on death', 0, { duration: 6 }),
    ],
    ['priority_target', 'close_range'],
    { spawnWeight: 0.3 }
  ),
  createZombie(
    'jockey',
    'Jockey',
    'Small zombie that rides on victims backs',
    'special',
    { health: 40, damage: 10, speed: 5.0, detectionRange: 30 },
    [
      createAbility('ride', 'Ride', 'Attaches to target, controlling movement', 15, { duration: 5, range: 3 }),
    ],
    ['stomp', 'area_damage'],
    { spawnWeight: 0.25, modelScale: 0.6 }
  ),
  createZombie(
    'leaper',
    'Leaper',
    'Jumping zombie that attacks from above',
    'special',
    { health: 55, damage: 20, speed: 3.0, detectionRange: 30 },
    [
      createAbility('leap', 'Leap', 'Jumps high into the air', 6, { range: 12 }),
      createAbility('pounce_attack', 'Pounce Attack', 'Deals bonus damage on landing', 0, { damage: 40 }),
    ],
    ['mid_air', 'fire'],
    { spawnWeight: 0.35 }
  ),
  createZombie(
    'burrower',
    'Burrower',
    'Digs underground to ambush prey',
    'special',
    { health: 65, damage: 18, speed: 2.5, detectionRange: 25 },
    [
      createAbility('burrow', 'Burrow', 'Digs underground', 10, { duration: 8 }),
      createAbility('emerge', 'Emerge', 'Surprises target from below', 0, { damage: 30 }),
    ],
    ['fire', 'ground_attacks'],
    { spawnWeight: 0.3 }
  ),
  createZombie(
    'screamer',
    'Screamer',
    'Deafening shriek that disorients enemies',
    'special',
    { health: 50, damage: 8, speed: 2.0, detectionRange: 35 },
    [
      createAbility('deafening_shriek', 'Deafening Shriek', 'Stuns nearby enemies', 18, { range: 8, duration: 2 }),
    ],
    ['silenced_weapons', 'priority_target'],
    { spawnWeight: 0.25 }
  ),
  createZombie(
    'hazer',
    'Hazer',
    'Releases blinding mist',
    'special',
    { health: 45, damage: 6, speed: 1.5, detectionRange: 30 },
    [
      createAbility('blind_mist', 'Blind Mist', 'Reduces accuracy of nearby units', 12, { range: 5, duration: 4 }),
    ],
    ['fire', 'wind'],
    { spawnWeight: 0.3 }
  ),
  createZombie(
    'impaler',
    'Impaler',
    'Arms transformed into deadly spikes',
    'special',
    { health: 80, damage: 30, speed: 2.0, armor: 5, detectionRange: 25, attackRange: 3 },
    [
      createAbility('impale', 'Impale', 'Pierces multiple targets in a line', 8, { range: 5, damage: 45 }),
    ],
    ['fire', 'bludgeoning'],
    { spawnWeight: 0.3 }
  ),
  createZombie(
    'devourer',
    'Devourer',
    'Consumes corpses to heal and grow stronger',
    'special',
    { health: 100, damage: 20, speed: 2.0, detectionRange: 30 },
    [
      createAbility('devour', 'Devour', 'Consumes nearby corpse to heal', 5, { damage: -50 }),
      createAbility('growth', 'Growth', 'Gains stats from consumed corpses', 0),
    ],
    ['fire', 'holy'],
    { spawnWeight: 0.25 }
  ),
  createZombie(
    'spiker',
    'Spiker',
    'Launches bone spikes at range',
    'special',
    { health: 60, damage: 10, speed: 1.8, detectionRange: 35, attackRange: 20 },
    [
      createAbility('spike_volley', 'Spike Volley', 'Fires multiple bone spikes', 6, { range: 20, damage: 15 }),
    ],
    ['close_range', 'fire'],
    { spawnWeight: 0.35, goreType: 'skeletal' }
  ),
  createZombie(
    'vomitron',
    'Vomitron',
    'Continuously sprays corrosive bile',
    'special',
    { health: 90, damage: 12, speed: 1.2, detectionRange: 25 },
    [
      createAbility('bile_spray', 'Bile Spray', 'Cone of acid damage', 4, { range: 8, damage: 25 }),
    ],
    ['fire', 'long_range'],
    { spawnWeight: 0.3, goreType: 'toxic' }
  ),
];

// ============================================================================
// ELITE ZOMBIES (10 Types)
// ============================================================================

export const ELITE_ZOMBIES: ZombieType[] = [
  createZombie(
    'tank',
    'Tank',
    'Massive armored zombie, nearly unstoppable',
    'elite',
    { health: 500, damage: 40, speed: 2.0, armor: 30, detectionRange: 35, attackRange: 2 },
    [
      createAbility('ground_pound', 'Ground Pound', 'AoE stun around itself', 15, { range: 5, duration: 2 }),
      createAbility('throw', 'Throw', 'Hurls debris or zombies', 8, { range: 15, damage: 60 }),
    ],
    ['fire', 'explosive'],
    { spawnWeight: 0.1, modelScale: 1.8 }
  ),
  createZombie(
    'witch',
    'Witch',
    'Crying zombie that becomes enraged when disturbed',
    'elite',
    { health: 150, damage: 80, speed: 5.5, detectionRange: 15 },
    [
      createAbility('rage', 'Rage', 'Massively increases speed and damage', 0, { duration: 10 }),
      createAbility('sorrow_aura', 'Sorrow Aura', 'Nearby units have reduced morale', 0, { range: 8 }),
    ],
    ['fire', 'priority_target', 'stealth'],
    { spawnWeight: 0.08 }
  ),
  createZombie(
    'alpha_zombie',
    'Alpha Zombie',
    'Leader that commands nearby zombies',
    'elite',
    { health: 200, damage: 25, speed: 2.5, armor: 10, detectionRange: 45 },
    [
      createAbility('command', 'Command', 'Directs nearby zombies', 5, { range: 30 }),
      createAbility('rally', 'Rally', 'Boosts stats of nearby zombies', 20, { duration: 10, range: 20 }),
    ],
    ['fire', 'priority_target'],
    { spawnWeight: 0.1 }
  ),
  createZombie(
    'necromancer',
    'Necromancer',
    'Raises fallen soldiers as zombies',
    'elite',
    { health: 120, damage: 15, speed: 1.5, detectionRange: 40, attackRange: 20 },
    [
      createAbility('raise_dead', 'Raise Dead', 'Animates corpses as zombies', 30, { range: 15 }),
      createAbility('dark_bolt', 'Dark Bolt', 'Ranged necrotic damage', 3, { range: 25, damage: 30 }),
    ],
    ['holy', 'priority_target'],
    { spawnWeight: 0.08 }
  ),
  createZombie(
    'psychic',
    'Psychic Zombie',
    'Uses mental powers to attack',
    'elite',
    { health: 100, damage: 20, speed: 2.0, detectionRange: 50 },
    [
      createAbility('mind_blast', 'Mind Blast', 'Ranged psychic damage', 5, { range: 30, damage: 40 }),
      createAbility('confusion', 'Confusion', 'Causes target to attack allies', 20, { duration: 3, range: 15 }),
    ],
    ['holy', 'silence'],
    { spawnWeight: 0.08 }
  ),
  createZombie(
    'armored_zombie',
    'Armored Zombie',
    'Clad in scavenged armor, highly resistant to damage',
    'elite',
    { health: 180, damage: 18, speed: 1.8, armor: 40, detectionRange: 25 },
    [createAbility('shield_wall', 'Shield Wall', 'Reduces frontal damage', 0)],
    ['fire', 'armor_piercing'],
    { spawnWeight: 0.12, modelScale: 1.1 }
  ),
  createZombie(
    'berserker',
    'Berserker',
    'Enraged zombie that gains power as it takes damage',
    'elite',
    { health: 150, damage: 30, speed: 3.5, detectionRange: 35 },
    [
      createAbility('frenzy', 'Frenzy', 'Increases damage as health decreases', 0),
      createAbility('bloodlust', 'Bloodlust', 'Heals on kill', 0),
    ],
    ['fire', 'stunning'],
    { spawnWeight: 0.1 }
  ),
  createZombie(
    'toxic_titan',
    'Toxic Titan',
    'Massive zombie trailing poisonous fog',
    'elite',
    { health: 350, damage: 35, speed: 1.5, armor: 15, detectionRange: 30 },
    [
      createAbility('toxic_aura', 'Toxic Aura', 'Constant poison damage nearby', 0, { range: 5, damage: 10 }),
      createAbility('slam', 'Slam', 'Ground slam with toxic explosion', 12, { range: 6, damage: 50 }),
    ],
    ['fire', 'wind'],
    { spawnWeight: 0.06, modelScale: 1.6, goreType: 'toxic' }
  ),
  createZombie(
    'shadow',
    'Shadow',
    'Semi-corporeal zombie that phases through attacks',
    'elite',
    { health: 80, damage: 25, speed: 4.0, detectionRange: 35 },
    [
      createAbility('phase', 'Phase', 'Becomes invulnerable briefly', 10, { duration: 2 }),
      createAbility('shadow_step', 'Shadow Step', 'Teleports short distance', 8, { range: 10 }),
    ],
    ['holy', 'light'],
    { spawnWeight: 0.08 }
  ),
  createZombie(
    'siren',
    'Siren',
    'Beautiful but deadly zombie with mesmerizing voice',
    'elite',
    { health: 100, damage: 15, speed: 2.0, detectionRange: 40 },
    [
      createAbility('allure', 'Allure', 'Draws enemies toward her', 15, { range: 25 }),
      createAbility('deadly_kiss', 'Deadly Kiss', 'Massive damage to charmed target', 20, { damage: 100 }),
    ],
    ['holy', 'willpower'],
    { spawnWeight: 0.06 }
  ),
];

// ============================================================================
// BOSS ZOMBIES (5 Types)
// ============================================================================

export const BOSS_ZOMBIES: ZombieType[] = [
  createZombie(
    'hive_mind',
    'Hive Mind',
    'Central intelligence controlling the zombie horde',
    'boss',
    { health: 1000, damage: 50, speed: 1.5, armor: 20, detectionRange: 60 },
    [
      createAbility('summon_horde', 'Summon Horde', 'Spawns waves of zombies', 30, { range: 20 }),
      createAbility('neural_link', 'Neural Link', 'Boosts all nearby zombies', 0, { range: 50 }),
      createAbility('mind_spike', 'Mind Spike', 'Powerful psychic attack', 8, { range: 30, damage: 80 }),
    ],
    ['fire', 'holy', 'headshots'],
    { spawnWeight: 0.02, modelScale: 2.0 }
  ),
  createZombie(
    'patient_zero',
    'Patient Zero',
    'The original infected, source of the plague',
    'boss',
    { health: 800, damage: 45, speed: 2.5, armor: 15, detectionRange: 50 },
    [
      createAbility('plague_breath', 'Plague Breath', 'Cone of disease', 10, { range: 10, damage: 60 }),
      createAbility('infection', 'Infection', 'Converts killed enemies to zombies', 0),
      createAbility('regeneration', 'Regeneration', 'Heals over time', 5, { damage: -30 }),
    ],
    ['holy', 'fire'],
    { spawnWeight: 0.02, modelScale: 1.5 }
  ),
  createZombie(
    'giant',
    'Giant Abomination',
    'Fused mass of dozens of zombies',
    'boss',
    { health: 1500, damage: 80, speed: 1.0, armor: 25, detectionRange: 40, attackRange: 3 },
    [
      createAbility('devastating_slam', 'Devastating Slam', 'Massive AoE damage', 15, { range: 8, damage: 120 }),
      createAbility('consume', 'Consume', 'Eats nearby zombies to heal', 20, { range: 5, damage: -200 }),
      createAbility('corpse_barrage', 'Corpse Barrage', 'Hurls zombies as projectiles', 12, { range: 30, damage: 50 }),
    ],
    ['fire', 'explosive', 'armor_piercing'],
    { spawnWeight: 0.01, modelScale: 3.0 }
  ),
  createZombie(
    'ancient_lich',
    'Ancient Lich',
    'Undead sorcerer from ages past',
    'boss',
    { health: 600, damage: 30, speed: 1.8, detectionRange: 60 },
    [
      createAbility('soul_harvest', 'Soul Harvest', 'Drains life from nearby units', 10, { range: 15, damage: 40 }),
      createAbility('bone_storm', 'Bone Storm', 'Vortex of bones', 20, { range: 10, damage: 70, duration: 5 }),
      createAbility('raise_champion', 'Raise Champion', 'Summons elite zombie', 45, { range: 10 }),
    ],
    ['holy', 'light'],
    { spawnWeight: 0.02, goreType: 'skeletal' }
  ),
  createZombie(
    'apocalypse_beast',
    'Apocalypse Beast',
    'Monstrous harbinger of the end times',
    'boss',
    { health: 2000, damage: 100, speed: 1.2, armor: 30, detectionRange: 50, attackRange: 4 },
    [
      createAbility('apocalypse_roar', 'Apocalypse Roar', 'Global fear effect', 30, { range: 100 }),
      createAbility('destruction_beam', 'Destruction Beam', 'Line attack', 15, { range: 50, damage: 150 }),
      createAbility('summon_apocalypse', 'Summon Apocalypse', 'Massive zombie spawn', 60, { range: 20 }),
    ],
    ['holy', 'legendary_weapons'],
    { spawnWeight: 0.005, modelScale: 4.0 }
  ),
];

// ============================================================================
// ALL ZOMBIES COMBINED
// ============================================================================

export const ALL_ZOMBIES: ZombieType[] = [
  ...BASIC_ZOMBIES,
  ...SPECIAL_ZOMBIES,
  ...ELITE_ZOMBIES,
  ...BOSS_ZOMBIES,
];

export const ZOMBIE_DATABASE: Record<string, ZombieType> = ALL_ZOMBIES.reduce((acc, zombie) => {
  acc[zombie.id] = zombie;
  return acc;
}, {} as Record<string, ZombieType>);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getZombieById(id: string): ZombieType | undefined {
  return ZOMBIE_DATABASE[id];
}

export function getZombiesByTier(tier: ZombieTier): ZombieType[] {
  return ALL_ZOMBIES.filter(z => z.tier === tier);
}

export function getRandomZombie(tier?: ZombieTier): ZombieType {
  const pool = tier ? getZombiesByTier(tier) : ALL_ZOMBIES;
  const weights = pool.map(z => z.spawnWeight);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < pool.length; i++) {
    random -= weights[i];
    if (random <= 0) return pool[i];
  }

  return pool[0];
}

export function getZombieWaveComposition(
  totalPoints: number,
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare'
): Map<string, number> {
  const composition = new Map<string, number>();

  const tierWeights = {
    easy: { basic: 0.9, special: 0.1, elite: 0, boss: 0 },
    normal: { basic: 0.7, special: 0.25, elite: 0.05, boss: 0 },
    hard: { basic: 0.5, special: 0.35, elite: 0.13, boss: 0.02 },
    nightmare: { basic: 0.3, special: 0.4, elite: 0.25, boss: 0.05 },
  };

  const weights = tierWeights[difficulty];

  // Spawn basic zombies
  const basicPoints = totalPoints * weights.basic;
  const basicCount = Math.floor(basicPoints / 10);
  composition.set('basic', basicCount);

  // Spawn special zombies
  const specialPoints = totalPoints * weights.special;
  const specialCount = Math.floor(specialPoints / 30);
  composition.set('special', specialCount);

  // Spawn elite zombies
  const elitePoints = totalPoints * weights.elite;
  const eliteCount = Math.floor(elitePoints / 100);
  composition.set('elite', eliteCount);

  // Spawn boss
  if (Math.random() < weights.boss) {
    composition.set('boss', 1);
  }

  return composition;
}

export default ZOMBIE_DATABASE;
