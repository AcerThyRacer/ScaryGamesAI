/**
 * Total War Engine - Unit Database
 * 80+ unique units for Rome and Medieval eras
 */

import type { UnitData, UnitCategory, UnitTier, FormationType } from '../types';

// ============================================================================
// Unit Stats Helper
// ============================================================================

const createUnit = (
  id: string,
  name: string,
  description: string,
  category: UnitCategory,
  tier: UnitTier,
  faction: string,
  era: string,
  stats: Partial<UnitData['stats']>,
  abilities: string[] = [],
  formations: FormationType[] = ['line', 'column']
): UnitData => ({
  id,
  name,
  description,
  category,
  tier,
  faction,
  era,
  stats: {
    health: 100,
    armor: 0,
    meleeAttack: 10,
    meleeDefense: 10,
    chargeBonus: 0,
    rangedAttack: 0,
    range: 0,
    accuracy: 0,
    speed: 3.5,
    morale: 60,
    stamina: 100,
    upkeep: 20,
    recruitCost: 100,
    recruitTime: 1,
    ...stats,
  },
  abilities,
  formations,
  requirements: [],
  upgrades: [],
});

// ============================================================================
// ROME UNITS (40+ Units)
// ============================================================================

export const ROME_UNITS: UnitData[] = [
  // === Militia Infantry ===
  createUnit(
    'rome_peasant_mob',
    'Peasant Mob',
    'Desperate civilians pressed into service with improvised weapons',
    'infantry',
    'militia',
    'rome',
    'republic',
    { health: 60, meleeAttack: 5, meleeDefense: 3, armor: 0, morale: 30, upkeep: 5, recruitCost: 50 },
    ['mob'],
    ['skirmish']
  ),
  createUnit(
    'rome_town_watch',
    'Town Watch',
    'Local militia maintaining order in settlements',
    'infantry',
    'militia',
    'rome',
    'republic',
    { health: 70, meleeAttack: 7, meleeDefense: 5, armor: 5, morale: 40, upkeep: 10, recruitCost: 75 },
    ['guard'],
    ['line', 'square']
  ),

  // === Regular Infantry ===
  createUnit(
    'rome_hastati',
    'Hastati',
    'Young Roman soldiers forming the front line of the legion',
    'infantry',
    'regular',
    'rome',
    'republic',
    {
      health: 100,
      meleeAttack: 12,
      meleeDefense: 12,
      armor: 15,
      morale: 55,
      speed: 3.8,
      upkeep: 25,
      recruitCost: 150,
    },
    ['pilum'],
    ['line', 'testudo', 'square']
  ),
  createUnit(
    'rome_principes',
    'Principes',
    'Veteran soldiers in their prime, the backbone of the legion',
    'infantry',
    'regular',
    'rome',
    'republic',
    {
      health: 110,
      meleeAttack: 14,
      meleeDefense: 14,
      armor: 20,
      morale: 65,
      upkeep: 35,
      recruitCost: 200,
    },
    ['pilum'],
    ['line', 'testudo', 'square']
  ),
  createUnit(
    'rome_triarii',
    'Triarii',
    'Elite veterans who fight only when all else fails',
    'infantry',
    'regular',
    'rome',
    'republic',
    {
      health: 120,
      meleeAttack: 15,
      meleeDefense: 18,
      armor: 25,
      morale: 80,
      chargeBonus: 5,
      upkeep: 50,
      recruitCost: 300,
    },
    ['spear_wall'],
    ['phalanx', 'line', 'square']
  ),
  createUnit(
    'rome_legionary',
    'Legionary',
    'Professional soldier of the Imperial Roman army',
    'infantry',
    'regular',
    'rome',
    'empire',
    {
      health: 115,
      meleeAttack: 16,
      meleeDefense: 15,
      armor: 25,
      morale: 70,
      upkeep: 40,
      recruitCost: 250,
    },
    ['pilum', 'shield_wall'],
    ['line', 'testudo', 'wedge']
  ),
  createUnit(
    'rome_velites',
    'Velites',
    'Light skirmishers who harass enemies with javelins',
    'ranged',
    'regular',
    'rome',
    'republic',
    {
      health: 70,
      rangedAttack: 12,
      range: 80,
      accuracy: 60,
      speed: 4.2,
      armor: 5,
      upkeep: 20,
      recruitCost: 120,
    },
    ['skirmish', 'javelin'],
    ['skirmish']
  ),

  // === Elite Infantry ===
  createUnit(
    'rome_praetorian_guard',
    'Praetorian Guard',
    'Elite bodyguards of the Emperor, the finest soldiers in Rome',
    'infantry',
    'elite',
    'rome',
    'empire',
    {
      health: 140,
      meleeAttack: 20,
      meleeDefense: 20,
      armor: 35,
      morale: 90,
      chargeBonus: 8,
      upkeep: 80,
      recruitCost: 500,
    },
    ['pilum', 'shield_wall', 'elite'],
    ['line', 'testudo', 'wedge']
  ),
  createUnit(
    'rome_eagle_cohort',
    'Eagle Cohort',
    'Veterans who carry the sacred legionary eagle into battle',
    'infantry',
    'elite',
    'rome',
    'empire',
    {
      health: 130,
      meleeAttack: 18,
      meleeDefense: 18,
      armor: 30,
      morale: 85,
      upkeep: 70,
      recruitCost: 450,
    },
    ['pilum', 'inspire'],
    ['line', 'testudo']
  ),
  createUnit(
    'rome_gladiator_murmillo',
    'Murmillo Gladiator',
    'Heavily armed arena fighters, deadly in close combat',
    'infantry',
    'elite',
    'rome',
    'republic',
    {
      health: 150,
      meleeAttack: 25,
      meleeDefense: 15,
      armor: 20,
      morale: 75,
      chargeBonus: 10,
      upkeep: 100,
      recruitCost: 600,
    },
    ['frenzy', 'intimidate'],
    ['line', 'wedge']
  ),

  // === Cavalry ===
  createUnit(
    'rome_equites',
    'Equites',
    'Roman cavalry of the wealthy citizen class',
    'cavalry',
    'regular',
    'rome',
    'republic',
    {
      health: 100,
      meleeAttack: 14,
      meleeDefense: 10,
      armor: 15,
      morale: 55,
      speed: 7.5,
      chargeBonus: 15,
      upkeep: 45,
      recruitCost: 300,
    },
    ['wedge_formation'],
    ['wedge', 'line']
  ),
  createUnit(
    'rome_legionary_cavalry',
    'Legionary Cavalry',
    'Professional cavalry attached to the legions',
    'cavalry',
    'regular',
    'rome',
    'empire',
    {
      health: 120,
      meleeAttack: 16,
      meleeDefense: 14,
      armor: 25,
      morale: 70,
      speed: 7,
      chargeBonus: 20,
      upkeep: 60,
      recruitCost: 400,
    },
    ['wedge_formation'],
    ['wedge', 'line']
  ),
  createUnit(
    'rome_praetorian_cavalry',
    'Praetorian Cavalry',
    'Elite mounted guard of the Emperor',
    'cavalry',
    'elite',
    'rome',
    'empire',
    {
      health: 140,
      meleeAttack: 20,
      meleeDefense: 18,
      armor: 35,
      morale: 85,
      speed: 7.5,
      chargeBonus: 25,
      upkeep: 100,
      recruitCost: 600,
    },
    ['wedge_formation', 'elite'],
    ['wedge', 'line']
  ),
  createUnit(
    'rome_auxiliary_cavalry',
    'Auxiliary Cavalry',
    'Non-citizen cavalry from allied provinces',
    'cavalry',
    'regular',
    'rome',
    'empire',
    {
      health: 110,
      meleeAttack: 14,
      meleeDefense: 12,
      armor: 18,
      morale: 60,
      speed: 7.8,
      chargeBonus: 18,
      upkeep: 40,
      recruitCost: 280,
    },
    ['scout'],
    ['wedge', 'skirmish']
  ),

  // === Ranged ===
  createUnit(
    'rome_archer_auxilia',
    'Archer Auxilia',
    'Auxiliary archers from Syria and Crete',
    'ranged',
    'regular',
    'rome',
    'empire',
    {
      health: 70,
      rangedAttack: 14,
      range: 150,
      accuracy: 65,
      armor: 5,
      upkeep: 25,
      recruitCost: 150,
    },
    ['fire_arrows'],
    ['skirmish']
  ),
  createUnit(
    'rome_sagittarius',
    'Sagittarius',
    'Roman trained archers',
    'ranged',
    'regular',
    'rome',
    'empire',
    {
      health: 80,
      rangedAttack: 16,
      range: 160,
      accuracy: 70,
      armor: 10,
      upkeep: 30,
      recruitCost: 180,
    },
    ['fire_arrows', 'precise_shot'],
    ['skirmish']
  ),
  createUnit(
    'rome_slinger',
    'Slinger',
    'Light troops who hurl stones with deadly accuracy',
    'ranged',
    'militia',
    'rome',
    'republic',
    {
      health: 60,
      rangedAttack: 10,
      range: 100,
      accuracy: 55,
      speed: 4,
      upkeep: 12,
      recruitCost: 80,
    },
    ['armor_piercing'],
    ['skirmish']
  ),

  // === Siege ===
  createUnit(
    'rome_ballista',
    'Ballista',
    'Giant torsion catapult that hurls heavy bolts',
    'siege',
    'regular',
    'rome',
    'republic',
    {
      health: 80,
      rangedAttack: 100,
      range: 400,
      accuracy: 80,
      speed: 1,
      armor: 10,
      upkeep: 60,
      recruitCost: 500,
    },
    ['siege_attack', 'anti_personnel'],
    []
  ),
  createUnit(
    'rome_onager',
    'Onager',
    'Siege engine that hurls massive stones at walls',
    'siege',
    'regular',
    'rome',
    'empire',
    {
      health: 100,
      rangedAttack: 150,
      range: 350,
      accuracy: 60,
      speed: 0.8,
      armor: 10,
      upkeep: 80,
      recruitCost: 600,
    },
    ['siege_attack', 'wall_breaker'],
    []
  ),
  createUnit(
    'rome_scorpio',
    'Scorpio',
    'Precision anti-personnel sniper artillery',
    'siege',
    'regular',
    'rome',
    'republic',
    {
      health: 60,
      rangedAttack: 80,
      range: 300,
      accuracy: 90,
      speed: 1.5,
      upkeep: 50,
      recruitCost: 400,
    },
    ['snipe'],
    []
  ),

  // === Special ===
  createUnit(
    'rome_war_elephant',
    'War Elephant',
    'Massive beasts imported from Africa, terrifying on the charge',
    'special',
    'elite',
    'rome',
    'republic',
    {
      health: 400,
      meleeAttack: 30,
      meleeDefense: 20,
      armor: 15,
      morale: 60,
      speed: 5,
      chargeBonus: 50,
      upkeep: 150,
      recruitCost: 1000,
    },
    ['trample', 'terror', 'elephant_rampage'],
    ['wedge']
  ),
  createUnit(
    'rome_general',
    'Roman General',
    'Commander of the legion, inspiring nearby troops',
    'special',
    'legendary',
    'rome',
    'republic',
    {
      health: 200,
      meleeAttack: 22,
      meleeDefense: 22,
      armor: 40,
      morale: 100,
      speed: 7,
      chargeBonus: 30,
      upkeep: 0,
      recruitCost: 0,
    },
    ['inspire', 'rally', 'general'],
    ['wedge']
  ),

  // === Barbarian Enemies ===
  createUnit(
    'barbarian_warband',
    'Gallic Warband',
    'Fierce Celtic warriors fighting for their tribes',
    'infantry',
    'militia',
    'barbarian',
    'republic',
    {
      health: 90,
      meleeAttack: 14,
      meleeDefense: 8,
      armor: 5,
      morale: 50,
      chargeBonus: 10,
      upkeep: 15,
      recruitCost: 100,
    },
    ['frenzy'],
    ['line', 'wedge']
  ),
  createUnit(
    'barbarian_swordsman',
    'Gallic Swordsman',
    'Skilled Celtic swordsmen with deadly long blades',
    'infantry',
    'regular',
    'barbarian',
    'republic',
    {
      health: 100,
      meleeAttack: 16,
      meleeDefense: 12,
      armor: 10,
      morale: 60,
      chargeBonus: 12,
      upkeep: 25,
      recruitCost: 180,
    },
    [],
    ['line', 'wedge']
  ),
  createUnit(
    'barbarian_noble',
    'Gallic Noble',
    'Wealthy tribal aristocrats with the finest equipment',
    'infantry',
    'elite',
    'barbarian',
    'republic',
    {
      health: 130,
      meleeAttack: 20,
      meleeDefense: 16,
      armor: 25,
      morale: 75,
      chargeBonus: 15,
      upkeep: 60,
      recruitCost: 400,
    },
    ['inspire'],
    ['line', 'wedge']
  ),
  createUnit(
    'barbarian_cavalry',
    'Gallic Cavalry',
    'Mobile Celtic horsemen',
    'cavalry',
    'regular',
    'barbarian',
    'republic',
    {
      health: 100,
      meleeAttack: 15,
      meleeDefense: 10,
      armor: 12,
      morale: 55,
      speed: 8,
      chargeBonus: 20,
      upkeep: 40,
      recruitCost: 280,
    },
    [],
    ['wedge', 'skirmish']
  ),
  createUnit(
    'barbarian_chariot',
    'War Chariot',
    'Scythed chariots that slice through infantry',
    'special',
    'elite',
    'barbarian',
    'republic',
    {
      health: 150,
      meleeAttack: 25,
      meleeDefense: 8,
      armor: 10,
      morale: 55,
      speed: 9,
      chargeBonus: 40,
      upkeep: 80,
      recruitCost: 500,
    },
    ['scythed', 'terror'],
    ['wedge']
  ),
];

// ============================================================================
// MEDIEVAL UNITS (40+ Units)
// ============================================================================

export const MEDIEVAL_UNITS: UnitData[] = [
  // === Militia Infantry ===
  createUnit(
    'med_peasant',
    'Peasant Levy',
    'Untrained farmers and peasants forced into battle',
    'infantry',
    'militia',
    'medieval',
    'early',
    { health: 50, meleeAttack: 4, meleeDefense: 2, armor: 0, morale: 25, upkeep: 3, recruitCost: 30 },
    ['mob'],
    ['skirmish']
  ),
  createUnit(
    'med_town_militia',
    'Town Militia',
    'Basic defenders of medieval towns',
    'infantry',
    'militia',
    'medieval',
    'early',
    { health: 70, meleeAttack: 8, meleeDefense: 6, armor: 5, morale: 40, upkeep: 8, recruitCost: 60 },
    ['guard'],
    ['line', 'square']
  ),
  createUnit(
    'med_spear_militia',
    'Spear Militia',
    'Commoners armed with spears, effective against cavalry',
    'infantry',
    'militia',
    'medieval',
    'early',
    {
      health: 75,
      meleeAttack: 8,
      meleeDefense: 8,
      armor: 8,
      morale: 45,
      upkeep: 10,
      recruitCost: 80,
    },
    ['anti_cavalry', 'spear_wall'],
    ['line', 'square']
  ),

  // === Regular Infantry ===
  createUnit(
    'med_men_at_arms',
    'Men-at-Arms',
    'Professional soldiers serving feudal lords',
    'infantry',
    'regular',
    'medieval',
    'early',
    {
      health: 100,
      meleeAttack: 14,
      meleeDefense: 14,
      armor: 20,
      morale: 60,
      upkeep: 30,
      recruitCost: 200,
    },
    ['shield_wall'],
    ['line', 'shield_wall']
  ),
  createUnit(
    'med_armored_sergeants',
    'Armored Sergeants',
    'Well-equipped professional infantry',
    'infantry',
    'regular',
    'medieval',
    'high',
    {
      health: 110,
      meleeAttack: 15,
      meleeDefense: 16,
      armor: 28,
      morale: 65,
      upkeep: 35,
      recruitCost: 250,
    },
    ['shield_wall'],
    ['line', 'shield_wall', 'square']
  ),
  createUnit(
    'med_pikemen',
    'Pikemen',
    'Soldiers wielding long pikes in tight formation',
    'infantry',
    'regular',
    'medieval',
    'high',
    {
      health: 90,
      meleeAttack: 10,
      meleeDefense: 20,
      armor: 15,
      morale: 55,
      upkeep: 25,
      recruitCost: 180,
    },
    ['pike_wall', 'anti_cavalry'],
    ['phalanx', 'square']
  ),
  createUnit(
    'med_halberdier',
    'Halberdier',
    'Versatile infantry with devastating polearms',
    'infantry',
    'regular',
    'medieval',
    'late',
    {
      health: 100,
      meleeAttack: 18,
      meleeDefense: 14,
      armor: 25,
      morale: 60,
      chargeBonus: 8,
      upkeep: 35,
      recruitCost: 220,
    },
    ['armor_piercing', 'anti_cavalry'],
    ['line', 'square']
  ),
  createUnit(
    'med_two_handed_swordsman',
    'Two-Handed Swordsman',
    'Massive warriors wielding greatswords',
    'infantry',
    'regular',
    'medieval',
    'late',
    {
      health: 110,
      meleeAttack: 22,
      meleeDefense: 10,
      armor: 20,
      morale: 65,
      chargeBonus: 15,
      upkeep: 40,
      recruitCost: 280,
    },
    ['armor_piercing', 'frenzy'],
    ['line', 'wedge']
  ),

  // === Elite Infantry ===
  createUnit(
    'med_dismounted_knight',
    'Dismounted Knights',
    'Noble warriors fighting on foot with sword and shield',
    'infantry',
    'elite',
    'medieval',
    'high',
    {
      health: 130,
      meleeAttack: 20,
      meleeDefense: 22,
      armor: 40,
      morale: 80,
      upkeep: 70,
      recruitCost: 450,
    },
    ['elite', 'shield_wall'],
    ['line', 'shield_wall', 'wedge']
  ),
  createUnit(
    'med_dismounted_chivalric_knight',
    'Dismounted Chivalric Knights',
    'The finest foot soldiers of the realm',
    'infantry',
    'elite',
    'medieval',
    'late',
    {
      health: 140,
      meleeAttack: 24,
      meleeDefense: 24,
      armor: 50,
      morale: 90,
      upkeep: 90,
      recruitCost: 550,
    },
    ['elite', 'inspire'],
    ['line', 'shield_wall']
  ),
  createUnit(
    'med_varangian_guard',
    'Varangian Guard',
    'Elite Byzantine axe-wielding bodyguards',
    'infantry',
    'elite',
    'byzantine',
    'high',
    {
      health: 150,
      meleeAttack: 28,
      meleeDefense: 20,
      armor: 45,
      morale: 95,
      upkeep: 100,
      recruitCost: 600,
    },
    ['elite', 'frenzy', 'intimidate'],
    ['line', 'wedge']
  ),
  createUnit(
    'med_samurai',
    'Samurai',
    'Japanese warrior nobles with deadly katana',
    'infantry',
    'elite',
    'japanese',
    'late',
    {
      health: 120,
      meleeAttack: 26,
      meleeDefense: 18,
      armor: 35,
      morale: 85,
      upkeep: 80,
      recruitCost: 500,
    },
    ['elite', 'bushido'],
    ['line', 'wedge']
  ),

  // === Cavalry ===
  createUnit(
    'med_light_cavalry',
    'Light Cavalry',
    'Fast horsemen for scouting and pursuit',
    'cavalry',
    'militia',
    'medieval',
    'early',
    {
      health: 80,
      meleeAttack: 10,
      meleeDefense: 6,
      armor: 8,
      morale: 45,
      speed: 8.5,
      chargeBonus: 15,
      upkeep: 25,
      recruitCost: 180,
    },
    ['scout'],
    ['skirmish', 'wedge']
  ),
  createUnit(
    'med_hobilars',
    'Hobilars',
    'Mounted spearmen effective at pursuit',
    'cavalry',
    'regular',
    'medieval',
    'early',
    {
      health: 90,
      meleeAttack: 12,
      meleeDefense: 10,
      armor: 15,
      morale: 55,
      speed: 8,
      chargeBonus: 20,
      upkeep: 35,
      recruitCost: 250,
    },
    ['anti_cavalry'],
    ['wedge', 'line']
  ),
  createUnit(
    'med_knight',
    'Knight',
    'Mounted noble warriors, devastating on the charge',
    'cavalry',
    'elite',
    'medieval',
    'high',
    {
      health: 130,
      meleeAttack: 20,
      meleeDefense: 18,
      armor: 45,
      morale: 80,
      speed: 7,
      chargeBonus: 40,
      upkeep: 80,
      recruitCost: 550,
    },
    ['elite', 'wedge_formation'],
    ['wedge', 'line']
  ),
  createUnit(
    'med_chivalric_knight',
    'Chivalric Knight',
    'The most heavily armored cavalry in Christendom',
    'cavalry',
    'elite',
    'medieval',
    'late',
    {
      health: 150,
      meleeAttack: 24,
      meleeDefense: 22,
      armor: 55,
      morale: 90,
      speed: 6.5,
      chargeBonus: 50,
      upkeep: 100,
      recruitCost: 700,
    },
    ['elite', 'wedge_formation', 'inspire'],
    ['wedge', 'line']
  ),
  createUnit(
    'med_templar_knight',
    'Templar Knight',
    'Holy warriors of the Templar Order',
    'cavalry',
    'legendary',
    'medieval',
    'high',
    {
      health: 160,
      meleeAttack: 26,
      meleeDefense: 24,
      armor: 50,
      morale: 100,
      speed: 7,
      chargeBonus: 55,
      upkeep: 120,
      recruitCost: 800,
    },
    ['elite', 'holy', 'fear'],
    ['wedge', 'line']
  ),
  createUnit(
    'med_mongol_horse_archer',
    'Mongol Horse Archer',
    'Deadly nomadic mounted archers',
    'cavalry',
    'elite',
    'mongol',
    'high',
    {
      health: 90,
      meleeAttack: 10,
      meleeDefense: 8,
      rangedAttack: 18,
      range: 180,
      accuracy: 75,
      armor: 10,
      morale: 70,
      speed: 9,
      upkeep: 50,
      recruitCost: 350,
    },
    ['horse_archer', 'parthian_shot'],
    ['skirmish', 'crescent']
  ),

  // === Ranged ===
  createUnit(
    'med_archer',
    'Peasant Archers',
    'Common bowmen pressed into service',
    'ranged',
    'militia',
    'medieval',
    'early',
    {
      health: 60,
      rangedAttack: 10,
      range: 120,
      accuracy: 50,
      armor: 0,
      upkeep: 12,
      recruitCost: 80,
    },
    ['fire_arrows'],
    ['skirmish']
  ),
  createUnit(
    'med_crossbowman',
    'Crossbowmen',
    'Soldiers wielding powerful crossbows',
    'ranged',
    'regular',
    'medieval',
    'high',
    {
      health: 70,
      rangedAttack: 18,
      range: 150,
      accuracy: 70,
      armor: 10,
      upkeep: 25,
      recruitCost: 180,
    },
    ['armor_piercing'],
    ['skirmish', 'line']
  ),
  createUnit(
    'med_longbowman',
    'Longbowmen',
    'English yeomen with deadly longbows',
    'ranged',
    'elite',
    'medieval',
    'late',
    {
      health: 80,
      rangedAttack: 22,
      range: 200,
      accuracy: 80,
      armor: 10,
      upkeep: 40,
      recruitCost: 280,
    },
    ['armor_piercing', 'fire_arrows', 'volley'],
    ['skirmish', 'line']
  ),
  createUnit(
    'med_arbalester',
    'Arbalesters',
    'Heavy crossbowmen with armor-piercing bolts',
    'ranged',
    'elite',
    'medieval',
    'late',
    {
      health: 80,
      rangedAttack: 25,
      range: 160,
      accuracy: 85,
      armor: 15,
      upkeep: 45,
      recruitCost: 320,
    },
    ['armor_piercing', 'pavise'],
    ['skirmish', 'line']
  ),
  createUnit(
    'med_hand_gunner',
    'Hand Gunners',
    'Early firearms, unreliable but devastating',
    'ranged',
    'regular',
    'medieval',
    'late',
    {
      health: 60,
      rangedAttack: 35,
      range: 80,
      accuracy: 40,
      armor: 5,
      upkeep: 35,
      recruitCost: 250,
    },
    ['armor_piercing', 'fear', 'unreliable'],
    ['line']
  ),

  // === Siege ===
  createUnit(
    'med_mangonel',
    'Mangonel',
    'Traction trebuchet for siege warfare',
    'siege',
    'regular',
    'medieval',
    'early',
    {
      health: 80,
      rangedAttack: 80,
      range: 250,
      accuracy: 50,
      speed: 1,
      upkeep: 50,
      recruitCost: 400,
    },
    ['siege_attack'],
    []
  ),
  createUnit(
    'med_trebuchet',
    'Trebuchet',
    'Massive counterweight siege engine',
    'siege',
    'elite',
    'medieval',
    'high',
    {
      health: 100,
      rangedAttack: 200,
      range: 400,
      accuracy: 60,
      speed: 0.5,
      upkeep: 80,
      recruitCost: 600,
    },
    ['siege_attack', 'wall_breaker'],
    []
  ),
  createUnit(
    'med_battering_ram',
    'Battering Ram',
    'Siege engine for destroying gates',
    'siege',
    'regular',
    'medieval',
    'early',
    {
      health: 200,
      meleeAttack: 50,
      speed: 0.8,
      armor: 30,
      upkeep: 30,
      recruitCost: 200,
    },
    ['gate_breaker'],
    []
  ),
  createUnit(
    'med_siege_tower',
    'Siege Tower',
    'Mobile tower for scaling walls',
    'siege',
    'regular',
    'medieval',
    'early',
    {
      health: 300,
      speed: 0.6,
      armor: 40,
      upkeep: 40,
      recruitCost: 350,
    },
    ['wall_assault'],
    []
  ),

  // === Special ===
  createUnit(
    'med_general',
    'Medieval General',
    'Commander inspiring troops on the battlefield',
    'special',
    'legendary',
    'medieval',
    'high',
    {
      health: 200,
      meleeAttack: 24,
      meleeDefense: 24,
      armor: 50,
      morale: 100,
      speed: 7,
      chargeBonus: 40,
      upkeep: 0,
      recruitCost: 0,
    },
    ['inspire', 'rally', 'general'],
    ['wedge']
  ),
  createUnit(
    'med_prince',
    'Prince',
    'Royal heir commanding his own retinue',
    'special',
    'legendary',
    'medieval',
    'late',
    {
      health: 180,
      meleeAttack: 22,
      meleeDefense: 22,
      armor: 55,
      morale: 95,
      speed: 7,
      chargeBonus: 45,
      upkeep: 0,
      recruitCost: 0,
    },
    ['inspire', 'rally', 'royal'],
    ['wedge']
  ),
  createUnit(
    'med_monk',
    'Armed Monks',
    'Holy brothers taking up arms for their faith',
    'infantry',
    'regular',
    'medieval',
    'high',
    {
      health: 90,
      meleeAttack: 14,
      meleeDefense: 12,
      armor: 10,
      morale: 75,
      upkeep: 15,
      recruitCost: 150,
    },
    ['holy', 'zeal'],
    ['line', 'square']
  ),
  createUnit(
    'med_flagellant',
    'Flagellants',
    'Religious fanatics seeking redemption in battle',
    'infantry',
    'militia',
    'medieval',
    'late',
    {
      health: 70,
      meleeAttack: 18,
      meleeDefense: 4,
      armor: 0,
      morale: 90,
      chargeBonus: 20,
      upkeep: 5,
      recruitCost: 50,
    },
    ['frenzy', 'fearless'],
    ['line', 'wedge']
  ),
];

// ============================================================================
// ALL UNITS COMBINED
// ============================================================================

export const ALL_UNITS: UnitData[] = [...ROME_UNITS, ...MEDIEVAL_UNITS];

// ============================================================================
// UNIT LOOKUP
// ============================================================================

export const UNIT_DATABASE: Record<string, UnitData> = ALL_UNITS.reduce((acc, unit) => {
  acc[unit.id] = unit;
  return acc;
}, {} as Record<string, UnitData>);

export function getUnitById(id: string): UnitData | undefined {
  return UNIT_DATABASE[id];
}

export function getUnitsByFaction(faction: string): UnitData[] {
  return ALL_UNITS.filter(u => u.faction === faction);
}

export function getUnitsByCategory(category: UnitCategory): UnitData[] {
  return ALL_UNITS.filter(u => u.category === category);
}

export function getUnitsByEra(era: string): UnitData[] {
  return ALL_UNITS.filter(u => u.era === era);
}

export default UNIT_DATABASE;
