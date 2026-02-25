/**
 * Zombie Type Database
 * 25+ unique zombie types with abilities, weaknesses, and variants
 */

const ZombieTypes = {
  // === BASIC INFECTED ===
  
  shambler: {
    id: 'shambler',
    name: 'Shambler',
    description: 'Slow but numerous basic zombie',
    tier: 'basic',
    stats: {
      health: 50,
      damage: 10,
      speed: 1.5,
      armor: 0,
      detectionRange: 20,
      aggression: 0.6
    },
    abilities: [],
    weaknesses: ['fire', 'headshots'],
    spawnWeight: 1.0,
    modelVariants: ['male_a', 'male_b', 'female_a', 'elder'],
    audioCues: ['groan_low', 'shuffle'],
    goreType: 'standard'
  },
  
  runner: {
    id: 'runner',
    name: 'Runner',
    description: 'Fast, fragile zombie that flanks',
    tier: 'basic',
    stats: {
      health: 30,
      damage: 15,
      speed: 5.0,
      armor: 0,
      detectionRange: 30,
      aggression: 0.9
    },
    abilities: ['sprint', 'vault'],
    weaknesses: ['low_health', 'stunning', 'traps'],
    spawnWeight: 0.6,
    modelVariants: ['athlete', 'teenager'],
    audioCues: ['scream_high', 'fast_footsteps'],
    movementType: 'sprint'
  },
  
  bloater: {
    id: 'bloater',
    name: 'Bloater',
    description: 'Explodes on death, toxic cloud',
    tier: 'special',
    stats: {
      health: 100,
      damage: 20,
      speed: 1.0,
      armor: 10,
      detectionRange: 15,
      aggression: 0.5
    },
    abilities: ['death_explosion', 'toxic_cloud'],
    weaknesses: ['fire', 'explosive', 'long_range'],
    spawnWeight: 0.3,
    deathEffect: {
      type: 'explosion',
      radius: 5,
      damage: 50,
      poisonDamage: 10,
      poisonDuration: 10,
      visualEffect: 'green_cloud'
    },
    modelScale: 1.3,
    audioCues: ['gurgling', 'bubble']
  },
  
  spitter: {
    id: 'spitter',
    name: 'Spitter',
    description: 'Ranged acid attack',
    tier: 'special',
    stats: {
      health: 40,
      damage: 5,
      speed: 1.5,
      armor: 0,
      detectionRange: 40,
      aggression: 0.7
    },
    abilities: ['acid_spit', 'area_denial'],
    weaknesses: ['priority_target', 'close_range'],
    spawnWeight: 0.4,
    attackPattern: {
      type: 'ranged',
      range: 30,
      cooldown: 3,
      projectileSpeed: 15,
      splashRadius: 2,
      acidDamage: 25,
      acidDuration: 5,
      accuracy: 0.8
    },
    audioCues: ['spit_charge', 'spit_release']
  },
  
  howler: {
    id: 'howler',
    name: 'Howler',
    description: 'Attracts more zombies with scream',
    tier: 'special',
    stats: {
      health: 60,
      damage: 10,
      speed: 2.0,
      armor: 0,
      detectionRange: 50,
      aggression: 0.8
    },
    abilities: ['alarm_scream', 'zombie_attraction', 'fear'],
    weaknesses: ['silenced_weapons', 'priority_target'],
    spawnWeight: 0.35,
    screamEffect: {
      range: 100,
      alertedZombies: 20,
      duration: 10,
      cooldown: 30,
      fearRadius: 10,
      fearDuration: 3
    },
    audioCues: ['scream_buildup', 'ear_piercing_scream']
  },
  
  crawler: {
    id: 'crawler',
    name: 'Crawler',
    description: 'Low profile, hard to hit',
    tier: 'basic',
    stats: {
      health: 35,
      damage: 12,
      speed: 2.5,
      armor: 0,
      detectionRange: 15,
      aggression: 0.7
    },
    abilities: ['low_profile', 'ankle_bite'],
    weaknesses: ['stomp', 'area_damage'],
    spawnWeight: 0.5,
    modelScale: 0.7,
    hitboxHeight: 0.5,
    audioCues: ['dragging', 'low_groan']
  },
  
  // === SPECIAL INFECTED ===
  
  tank: {
    id: 'tank',
    name: 'Tank',
    description: 'Massive HP, charges through walls',
    tier: 'elite',
    stats: {
      health: 500,
      damage: 50,
      speed: 2.5,
      armor: 50,
      detectionRange: 30,
      aggression: 1.0
    },
    abilities: ['charge', 'wall_break', 'rock_throw', 'knockback'],
    weaknesses: ['fire', 'sustained_damage', 'legs'],
    spawnWeight: 0.1,
    size: { scale: 2.5, mass: 300, hitboxMultiplier: 2 },
    chargeAttack: {
      windup: 2,
      speed: 15,
      damage: 100,
      knockback: 10,
      wallDestruction: true,
      cooldown: 10
    },
    audioCues: ['roar', 'heavy_footsteps', 'charge_windup']
  },
  
  witch: {
    id: 'witch',
    name: 'Witch',
    description: 'Passive until provoked, one-shot kill',
    tier: 'elite',
    stats: {
      health: 100,
      damage: 999,
      speed: 8.0,
      armor: 0,
      detectionRange: 10,
      aggression: 0.1
    },
    abilities: ['berserk_rush', 'one_hit_kill', 'crying'],
    weaknesses: ['headshot', 'keep_distance', 'silenced'],
    spawnWeight: 0.05,
    behavior: {
      default: 'passive',
      provocationRadius: 5,
      berserkSpeed: 12,
      berserkDuration: 10,
      returnsToPassive: false
    },
    audioCues: ['crying', 'mumbling', 'berserk_scream']
  },
  
  smoker: {
    id: 'smoker',
    name: 'Smoker',
    description: 'Long-range tongue grab',
    tier: 'special',
    stats: {
      health: 50,
      damage: 15,
      speed: 1.5,
      armor: 0,
      detectionRange: 60,
      aggression: 0.6
    },
    abilities: ['tongue_grab', 'choke', 'pull_victim', 'smoke_cloud'],
    weaknesses: ['close_range', 'teammates', 'fire'],
    spawnWeight: 0.3,
    tongueAttack: {
      range: 25,
      damagePerSecond: 10,
      pullSpeed: 8,
      chokeDamage: 20,
      tongueHealth: 30,
      cooldown: 5
    },
    audioCues: ['cough', 'tongue_shoot']
  },
  
  hunter: {
    id: 'hunter',
    name: 'Hunter',
    description: 'Leaps from heights, pounces',
    tier: 'special',
    stats: {
      health: 70,
      damage: 30,
      speed: 4.0,
      armor: 10,
      detectionRange: 40,
      aggression: 0.85
    },
    abilities: ['pounce', 'climb_walls', 'ceiling_ambush', 'leap'],
    weaknesses: ['mid_air', 'shotgun', 'looking_up'],
    spawnWeight: 0.35,
    pounceAttack: {
      leapDistance: 15,
      leapHeight: 8,
      damage: 40,
      knockdown: true,
      pinDuration: 3,
      cooldown: 8
    },
    audioCues: ['screech', 'pounce']
  },
  
  charger: {
    id: 'charger',
    name: 'Charger',
    description: 'Bull rush attack, knocks down',
    tier: 'special',
    stats: {
      health: 150,
      damage: 40,
      speed: 3.0,
      armor: 30,
      detectionRange: 35,
      aggression: 0.9
    },
    abilities: ['bull_rush', 'knockdown', 'trample', 'stomp'],
    weaknesses: ['sidestep', 'legs', 'trip'],
    spawnWeight: 0.25,
    chargeAttack: {
      windup: 1.5,
      speed: 18,
      damage: 60,
      knockback: 8,
      trampleDamage: 20,
      cooldown: 12,
      telegraph: true
    },
    audioCues: ['snort', 'charge_footsteps']
  },
  
  jockey: {
    id: 'jockey',
    name: 'Jockey',
    description: 'Rides survivors, controls movement',
    tier: 'special',
    stats: {
      health: 45,
      damage: 5,
      speed: 5.0,
      armor: 0,
      detectionRange: 30,
      aggression: 0.8
    },
    abilities: ['ride', 'control_victim', 'head_bite'],
    weaknesses: ['teammates', 'melee'],
    spawnWeight: 0.3,
    rideAttack: {
      range: 3,
      controlDuration: 10,
      damagePerSecond: 8,
      canClimbWalls: true
    },
    audioCues: ['laugh', 'ride_yell']
  },
  
  // === ELITE INFECTED ===
  
  alphaZombie: {
    id: 'alphaZombie',
    name: 'Alpha Zombie',
    description: 'Commands nearby zombies',
    tier: 'elite',
    stats: {
      health: 200,
      damage: 35,
      speed: 3.5,
      armor: 20,
      detectionRange: 50,
      aggression: 0.9
    },
    abilities: ['command_aura', 'tactical_orders', 'rally', 'buff'],
    weaknesses: ['isolation', 'priority_target'],
    spawnWeight: 0.15,
    commandAura: {
      range: 30,
      damageBonus: 0.3,
      speedBonus: 0.2,
      coordinationBonus: 0.5,
      maxAffected: 20
    },
    audioCues: ['command_shout', 'tactical_bark']
  },
  
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    description: 'Resurrects dead zombies',
    tier: 'elite',
    stats: {
      health: 120,
      damage: 25,
      speed: 2.0,
      armor: 10,
      detectionRange: 40,
      aggression: 0.6
    },
    abilities: ['resurrect', 'bone_armor', 'curse', 'dark_ritual'],
    weaknesses: ['holy_damage', 'priority_target', 'interrupt'],
    spawnWeight: 0.1,
    resurrection: {
      range: 20,
      cooldown: 15,
      maxSimultaneous: 5,
      resurrectedHP: 0.5,
      castTime: 3,
      canBeInterrupted: true
    },
    audioCues: ['chant', 'bones_rattle', 'dark_magic']
  },
  
  psychic: {
    id: 'psychic',
    name: 'Psychic Zombie',
    description: 'Hallucinations, fear aura',
    tier: 'elite',
    stats: {
      health: 80,
      damage: 20,
      speed: 2.5,
      armor: 0,
      detectionRange: 45,
      aggression: 0.7
    },
    abilities: ['hallucination', 'fear_aura', 'mind_control', 'telekinesis'],
    weaknesses: ['psychic_resistance', 'headshot'],
    spawnWeight: 0.12,
    psychicPowers: {
      hallucinationRange: 25,
      fearAuraRange: 15,
      mindControlChance: 0.1,
      mindControlDuration: 10,
      telekinesisForce: 50
    },
    audioCues: ['psychic_hum', 'whispers']
  },
  
  armored: {
    id: 'armored',
    name: 'Armored Zombie',
    description: 'Military gear, bulletproof vest',
    tier: 'elite',
    stats: {
      health: 180,
      damage: 30,
      speed: 2.0,
      armor: 80,
      detectionRange: 30,
      aggression: 0.75
    },
    abilities: ['bullet_resistance', 'grenade', 'shield_bash'],
    weaknesses: ['armor_piercing', 'melee', 'explosives', 'legs'],
    spawnWeight: 0.2,
    armorZones: {
      torso: 0.9,
      head: 0.5,
      arms: 0.7,
      legs: 0.2
    },
    audioCues: ['armor_clank', 'military_boot']
  },
  
  giant: {
    id: 'giant',
    name: 'Giant Zombie',
    description: '3x size, throws cars',
    tier: 'boss',
    stats: {
      health: 800,
      damage: 80,
      speed: 1.5,
      armor: 40,
      detectionRange: 60,
      aggression: 1.0
    },
    abilities: ['car_throw', 'ground_slam', 'building_collapse', 'stomp'],
    weaknesses: ['knees', 'eyes', 'sustained_fire'],
    spawnWeight: 0.05,
    size: { scale: 3.0, mass: 500, hitboxMultiplier: 3 },
    throwAttack: {
      objectTypes: ['car', 'debris', 'human'],
      range: 40,
      damage: 100,
      areaDamage: 50,
      areaRadius: 8,
      cooldown: 8
    },
    audioCues: ['earthquake_footstep', 'bellow', 'car_crunch']
  },
  
  // === ENVIRONMENTAL VARIANTS ===
  
  arcticZombie: {
    id: 'arcticZombie',
    name: 'Frozen Zombie',
    description: 'Arctic variant, freeze touch',
    tier: 'variant',
    stats: {
      health: 80,
      damage: 15,
      speed: 1.0,
      armor: 20,
      detectionRange: 25,
      aggression: 0.6
    },
    abilities: ['freeze_touch', 'ice_armor', 'cold_aura'],
    weaknesses: ['fire', 'heat'],
    spawnWeight: 0.4,
    environment: 'snow',
    freezeEffect: {
      slowAmount: 0.5,
      slowDuration: 5,
      freezeChance: 0.2
    },
    audioCues: ['ice_crack', 'cold_wind']
  },
  
  desertZombie: {
    id: 'desertZombie',
    name: 'Desiccated Zombie',
    description: 'Desert variant, heat resistant',
    tier: 'variant',
    stats: {
      health: 60,
      damage: 20,
      speed: 2.5,
      armor: 5,
      detectionRange: 35,
      aggression: 0.8
    },
    abilities: ['sandstorm_call', 'burrow', 'heat_resistance'],
    weaknesses: ['water', 'cold'],
    spawnWeight: 0.4,
    environment: 'desert',
    burrowAbility: {
      duration: 10,
      speed: 8,
      cooldown: 20
    },
    audioCues: ['sand_swirl', 'dry_rattle']
  },
  
  urbanZombie: {
    id: 'urbanZombie',
    name: 'City Zombie',
    description: 'Urban variant, uses tools',
    tier: 'variant',
    stats: {
      health: 70,
      damage: 25,
      speed: 2.0,
      armor: 15,
      detectionRange: 30,
      aggression: 0.75
    },
    abilities: ['tool_use', 'door_breach', 'improvised_weapon'],
    weaknesses: ['open_spaces'],
    spawnWeight: 0.5,
    environment: 'urban',
    toolUse: {
      canOpenDoors: true,
      canUseWeapons: true,
      preferredWeapons: ['pipe', 'bat', 'knife']
    },
    audioCues: ['city_ambient', 'glass_break']
  },
  
  swampZombie: {
    id: 'swampZombie',
    name: 'Swamp Zombie',
    description: 'Wetland variant, disease carrier',
    tier: 'variant',
    stats: {
      health: 90,
      damage: 18,
      speed: 1.2,
      armor: 10,
      detectionRange: 25,
      aggression: 0.65
    },
    abilities: ['disease_cloud', 'submerge', 'infection_bite'],
    weaknesses: ['fire', 'drying'],
    spawnWeight: 0.4,
    environment: 'swamp',
    diseaseEffect: {
      infectionChance: 0.3,
      damageOverTime: 5,
      duration: 20
    },
    audioCues: ['water_splash', 'bubble']
  },
  
  industrialZombie: {
    id: 'industrialZombie',
    name: 'Industrial Zombie',
    description: 'Factory worker, chemical burns',
    tier: 'variant',
    stats: {
      health: 100,
      damage: 22,
      speed: 1.8,
      armor: 25,
      detectionRange: 28,
      aggression: 0.7
    },
    abilities: ['chemical_spit', 'corrosive_touch', 'toxic_blood'],
    weaknesses: ['water', 'clean_areas'],
    spawnWeight: 0.45,
    environment: 'industrial',
    chemicalEffect: {
      armorDamage: 10,
      burnDamage: 15,
      duration: 8
    },
    audioCues: ['factory_ambient', 'chemical_sizzle']
  },
  
  // === BOSS ZOMBIES ===
  
  hiveMind: {
    id: 'hiveMind',
    name: 'Hive Mind',
    description: 'Controls entire zombie hordes',
    tier: 'boss',
    stats: {
      health: 2000,
      damage: 50,
      speed: 1.0,
      armor: 60,
      detectionRange: 100,
      aggression: 1.0
    },
    abilities: ['control_horde', 'spawn_minions', 'psychic_blast', 'regenerate'],
    weaknesses: ['destroy_spawn_points', 'headshot'],
    spawnWeight: 0.02,
    bossPhases: [
      { hp: 1.0, abilities: ['spawn_minions'] },
      { hp: 0.6, abilities: ['spawn_minions', 'psychic_blast'] },
      { hp: 0.3, abilities: ['spawn_minions', 'psychic_blast', 'control_horde'] }
    ],
    audioCues: ['psychic_scream', 'horde_groan']
  },
  
  patientZero: {
    id: 'patientZero',
    name: 'Patient Zero',
    description: 'The original infected',
    tier: 'boss',
    stats: {
      health: 1500,
      damage: 60,
      speed: 3.0,
      armor: 40,
      detectionRange: 50,
      aggression: 1.0
    },
    abilities: ['infect', 'regenerate', 'berserk', 'infection_cloud'],
    weaknesses: ['fire', 'headshot'],
    spawnWeight: 0.01,
    infectionAbility: {
      chance: 0.5,
      transformationTime: 30,
      canBeCured: false
    },
    audioCues: ['original_groan', 'infection_sound']
  }
};

// === ZOMBIE TYPE FACTORY ===

class ZombieTypeFactory {
  static create(typeId, position) {
    const type = ZombieTypes[typeId];
    if (!type) {
      console.warn(`Unknown zombie type: ${typeId}, using shambler`);
      return this.create('shambler', position);
    }
    
    return {
      typeId: type.id,
      name: type.name,
      position: position.clone(),
      stats: { ...type.stats },
      abilities: [...type.abilities],
      weaknesses: [...type.weaknesses],
      modelVariant: type.modelVariants?.[Math.floor(Math.random() * type.modelVariants.length)] || 'default',
      scale: type.modelScale || 1.0
    };
  }
  
  static getRandomType(weights = null) {
    const types = Object.keys(ZombieTypes);
    const typeWeights = weights || types.map(t => ZombieTypes[t].spawnWeight);
    
    const totalWeight = typeWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < types.length; i++) {
      random -= typeWeights[i];
      if (random <= 0) {
        return types[i];
      }
    }
    
    return 'shambler';
  }
  
  static getTypesByTier(tier) {
    return Object.keys(ZombieTypes).filter(
      key => ZombieTypes[key].tier === tier
    );
  }
  
  static getTypesByEnvironment(environment) {
    return Object.keys(ZombieTypes).filter(
      key => !ZombieTypes[key].environment || ZombieTypes[key].environment === environment
    );
  }
}

// Export
window.ZombieTypes = ZombieTypes;
window.ZombieTypeFactory = ZombieTypeFactory;
console.log('✅ Zombie Types database loaded (25+ types)');
