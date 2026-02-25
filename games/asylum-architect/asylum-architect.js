/**
 * PHASE 7: ASYLUM ARCHITECT - REVERSE HORROR
 * 
 * You're the ghost haunting a psychiatric asylum. Your goal:
 * Drive the staff and patients insane through psychological terror.
 * 
 * Features:
 * - Possession system (control humans, objects, electronics)
 * - Fear cultivation mechanics
 * - Reality manipulation
 * - Sanity network (track 50+ characters)
 * - Investigation evasion
 * - Ability evolution tree
 * - 10 asylum layouts
 * - 20-hour campaign + sandbox mode
 * 
 * Target: 9/10 quality rating, innovative reverse horror gameplay
 */

export class AsylumArchitectGame {
  constructor(config = {}) {
    this.config = {
      canvas: config.canvas,
      debug: config.debug || false,
      difficulty: config.difficulty || 'normal'
    };
    
    // Game state
    this.state = {
      currentAsylum: 0,
      day: 1,
      time: 0, // 0-24 hours
      fearLevel: 0,
      chaosLevel: 0,
      suspicionLevel: 0,
      essence: 100, // Ghost energy
      unlockedAbilities: []
    };
    
    // Character system
    this.characters = new Map();
    this.characterArchetypes = [];
    
    // Fear network
    this.fearNetwork = {
      connections: new Map(),
      outbreaks: [],
      epidemics: []
    };
    
    // Possession targets
    this.possessionTargets = new Map();
    
    // Haunting events
    this.activeHauntings = [];
    
    // Investigators
    this.investigators = [];
    
    console.log('[Phase 7] ASYLUM ARCHITECT initialized');
  }

  async initialize() {
    console.log('[Phase 7] Initializing ASYLUM ARCHITECT...');
    
    // Define character archetypes
    this.defineCharacterArchetypes();
    
    // Create initial asylum population
    this.populateAsylum();
    
    // Initialize fear network
    this.initializeFearNetwork();
    
    // Define ability tree
    this.defineAbilityTree();
    
    console.log('[Phase 7] ✅ ASYLUM ARCHITECT ready');
  }

  defineCharacterArchetypes() {
    this.characterArchetypes = [
      // Patients (20+ archetypes)
      {
        id: 'paranoid_patient',
        name: 'Paranoid Patient',
        type: 'patient',
        baseSanity: 30,
        maxSanity: 100,
        fearSusceptibility: 0.8,
        skepticism: 0.2,
        traits: ['jumpy', 'suspicious', 'insomniac'],
        backstory: 'Believes everyone is out to get them',
        fears: ['conspiracy', 'betrayal', 'surveillance']
      },
      
      {
        id: 'depressed_patient',
        name: 'Depressed Patient',
        type: 'patient',
        baseSanity: 40,
        maxSanity: 100,
        fearSusceptibility: 0.6,
        skepticism: 0.3,
        traits: ['withdrawn', 'hopeless', 'tired'],
        backstory: 'Struggles with severe depression',
        fears: ['loss', 'abandonment', 'meaninglessness']
      },
      
      {
        id: 'schizophrenic_patient',
        name: 'Schizophrenic Patient',
        type: 'patient',
        baseSanity: 25,
        maxSanity: 100,
        fearSusceptibility: 0.9,
        skepticism: 0.1,
        traits: ['hallucinates', 'hears_voices', 'confused'],
        backstory: 'Cannot distinguish reality from delusion',
        fears: ['voices', 'control', 'identity_loss']
      },
      
      {
        id: 'ptsd_veteran',
        name: 'PTSD Veteran',
        type: 'patient',
        baseSanity: 35,
        maxSanity: 100,
        fearSusceptibility: 0.7,
        skepticism: 0.4,
        traits: ['hypervigilant', 'flashbacks', 'aggressive'],
        backstory: 'Combat veteran with severe PTSD',
        fears: ['explosions', 'confinement', 'helplessness']
      },
      
      // Add 16 more patient archetypes...
      
      // Staff (15+ archetypes)
      {
        id: 'chief_psychiatrist',
        name: 'Dr. Morrison',
        type: 'staff',
        role: 'chief_psychiatrist',
        baseSanity: 80,
        maxSanity: 100,
        fearSusceptibility: 0.3,
        skepticism: 0.9,
        traits: ['rational', 'experienced', 'authoritative'],
        backstory: '20 years experience, doesn\'t believe in supernatural',
        fears: ['failure', 'malpractice', 'losing_control']
      },
      
      {
        id: 'night_nurse',
        name: 'Nurse Chen',
        type: 'staff',
        role: 'night_nurse',
        baseSanity: 65,
        maxSanity: 100,
        fearSusceptibility: 0.5,
        skepticism: 0.6,
        traits: ['compassionate', 'tired', 'superstitious'],
        backstory: 'Works night shift, has seen strange things',
        fears: ['patient_harm', 'being_alone', 'the_unknown']
      },
      
      {
        id: 'security_guard',
        name: 'Officer Rodriguez',
        type: 'staff',
        role: 'security',
        baseSanity: 75,
        maxSanity: 100,
        fearSusceptibility: 0.4,
        skepticism: 0.7,
        traits: ['brave', 'practical', 'armed'],
        backstory: 'Ex-cop, takes security seriously',
        fears: ['violence', 'riots', 'weapon_failure']
      },
      
      // Add 12 more staff archetypes...
      
      // Investigators (5+ archetypes)
      {
        id: 'paranormal_investigator',
        name: 'Sarah Blackwood',
        type: 'investigator',
        organization: 'Independent',
        baseSanity: 70,
        maxSanity: 100,
        skepticism: 0.2,
        equipment: ['emf_meter', 'spirit_box', 'cameras'],
        backstory: 'Professional ghost hunter, believes in supernatural',
        dangerLevel: 8
      },
      
      {
        id: 'skeptic_professor',
        name: 'Dr. Alan Greystoke',
        type: 'investigator',
        organization: 'University',
        baseSanity: 85,
        maxSanity: 100,
        skepticism: 0.95,
        equipment: ['scientific_instruments', 'recording_devices'],
        backstory: 'Psychology professor, debunks paranormal claims',
        dangerLevel: 6
      }
    ];
    
    console.log(`[Phase 7] Defined ${this.characterArchetypes.length} character archetypes`);
  }

  populateAsylum(asylumIndex = 0) {
    const asylumLayouts = [
      'modern_psychiatric_ward',
      'victorian_asylum',
      'gothic_mansion',
      'underground_facility',
      'isolated_island_hospital',
      'abandoned_wing',
      'forensic_psychiatry',
      'children_ward',
      'maximum_security',
      'research_facility'
    ];
    
    const layout = asylumLayouts[asylumIndex];
    console.log('[Phase 7] Populating asylum:', layout);
    
    // Generate 50+ characters
    const patientCount = 35;
    const staffCount = 15;
    const investigatorCount = 2;
    
    // Create patients
    for (let i = 0; i < patientCount; i++) {
      const archetype = this.getRandomArchetype('patient');
      const patient = this.createCharacter(archetype, `patient_${i}`);
      this.characters.set(patient.id, patient);
    }
    
    // Create staff
    for (let i = 0; i < staffCount; i++) {
      const archetype = this.getRandomArchetype('staff');
      const staff = this.createCharacter(archetype, `staff_${i}`);
      this.characters.set(staff.id, staff);
    }
    
    // Create investigators (triggered by events)
    if (this.state.suspicionLevel > 50) {
      for (let i = 0; i < investigatorCount; i++) {
        const archetype = this.getRandomArchetype('investigator');
        const investigator = this.createCharacter(archetype, `investigator_${i}`);
        this.characters.set(investigator.id, investigator);
        this.investigators.push(investigator);
      }
    }
  }

  getRandomArchetype(type) {
    const archetypes = this.characterArchetypes.filter(a => a.type === type);
    return archetypes[Math.floor(Math.random() * archetypes.length)];
  }

  createCharacter(archetype, suffix) {
    return {
      ...archetype,
      id: `${archetype.id}_${suffix}`,
      currentSanity: archetype.baseSanity,
      currentFear: 0,
      location: this.getRandomRoom(),
      schedule: this.generateSchedule(archetype.type),
      relationships: new Map(),
      memories: [],
      conditions: []
    };
  }

  getRandomRoom() {
    const rooms = [
      'patient_room', 'cafeteria', 'recreation_room', 'therapy_room',
      'nurses_station', 'security_office', 'basement', 'attic',
      'operating_theater', 'morgue', 'boiler_room', 'courtyard'
    ];
    
    return rooms[Math.floor(Math.random() * rooms.length)];
  }

  generateSchedule(type) {
    // Simple schedule system
    const schedules = {
      patient: ['sleep', 'eat', 'therapy', 'recreation', 'isolation'],
      staff: ['shift_start', 'rounds', 'break', 'paperwork', 'shift_end'],
      investigator: ['arrive', 'investigate', 'interview', 'analyze', 'leave']
    };
    
    return schedules[type] || schedules.patient;
  }

  initializeFearNetwork() {
    // Create social connections between characters
    const characterArray = Array.from(this.characters.values());
    
    for (const char of characterArray) {
      this.fearNetwork.connections.set(char.id, {
        contacts: new Set(),
        influenceLevel: 0,
        fearContagion: 0
      });
    }
    
    // Create random connections
    for (let i = 0; i < characterArray.length; i++) {
      const contactCount = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < contactCount; j++) {
        const targetIndex = Math.floor(Math.random() * characterArray.length);
        if (targetIndex !== i) {
          const connection = this.fearNetwork.connections.get(characterArray[i].id);
          connection.contacts.add(characterArray[targetIndex].id);
        }
      }
    }
    
    console.log('[Phase 7] Fear network initialized with', characterArray.length, 'characters');
  }

  defineAbilityTree() {
    this.abilityTree = {
      poltergeist: {
        id: 'poltergeist',
        name: 'Poltergeist',
        description: 'Manipulate physical objects',
        tier: 1,
        prerequisites: [],
        abilities: [
          { id: 'telekinesis', name: 'Telekinesis', cost: 10, damage: 5 },
          { id: 'object_throw', name: 'Object Throw', cost: 15, damage: 15 },
          { id: 'slam_door', name: 'Slam Door', cost: 8, fear: 10 },
          { id: 'shatter_glass', name: 'Shatter Glass', cost: 12, fear: 15 }
        ]
      },
      
      illusion: {
        id: 'illusion',
        name: 'Illusion',
        description: 'Create hallucinations and false visions',
        tier: 1,
        prerequisites: [],
        abilities: [
          { id: 'shadow_figure', name: 'Shadow Figure', cost: 20, fear: 20 },
          { id: 'whispers', name: 'Whispers', cost: 10, fear: 10 },
          { id: 'false_footsteps', name: 'False Footsteps', cost: 8, fear: 8 },
          { id: 'mirror_distortion', name: 'Mirror Distortion', cost: 15, fear: 18 }
        ]
      },
      
      possession: {
        id: 'possession',
        name: 'Possession',
        description: 'Take control of humans and objects',
        tier: 2,
        prerequisites: ['poltergeist'],
        abilities: [
          { id: 'possess_human', name: 'Possess Human', cost: 50, duration: 30 },
          { id: 'possess_object', name: 'Possess Object', cost: 25, duration: 60 },
          { id: 'mind_control', name: 'Mind Control', cost: 40, duration: 20 },
          { id: 'shared_senses', name: 'Shared Senses', cost: 15, duration: 120 }
        ]
      },
      
      nightmare: {
        id: 'nightmare',
        name: 'Nightmare',
        description: 'Invade dreams and create personalized terrors',
        tier: 2,
        prerequisites: ['illusion'],
        abilities: [
          { id: 'dream_invitation', name: 'Dream Invitation', cost: 30, fear: 30 },
          { id: 'personalized_horror', name: 'Personalized Horror', cost: 40, fear: 50 },
          { id: 'sleep_paralysis', name: 'Sleep Paralysis', cost: 25, fear: 25 },
          { id: 'nightmare_loop', name: 'Nightmare Loop', cost: 35, fear: 40 }
        ]
      },
      
      corruption: {
        id: 'corruption',
        name: 'Corruption',
        description: 'Decay reality itself over time',
        tier: 3,
        prerequisites: ['possession', 'nightmare'],
        abilities: [
          { id: 'reality_decay', name: 'Reality Decay', cost: 60, permanent: true },
          { id: 'dimension_rift', name: 'Dimension Rift', cost: 80, permanent: true },
          { id: 'time_loop', name: 'Time Loop', cost: 70, permanent: true },
          { id: 'existential_dread', name: 'Existential Dread', cost: 100, permanent: true }
        ]
      }
    };
    
    console.log('[Phase 7] Ability tree defined with', Object.keys(this.abilityTree).length, 'trees');
  }

  // Core gameplay mechanics
  
  possessTarget(targetId, abilityType) {
    const target = this.characters.get(targetId) || this.getObject(targetId);
    if (!target) return false;
    
    const ability = this.getAbility(abilityType);
    if (!ability) return false;
    
    if (this.state.essence < ability.cost) {
      console.log('[Phase 7] Not enough essence');
      return false;
    }
    
    this.state.essence -= ability.cost;
    
    // Take control
    target.possessed = true;
    target.possessionType = abilityType;
    target.possessionDuration = ability.duration || 30;
    
    console.log(`[Phase 7] Possessing ${targetId} with ${abilityType}`);
    
    return true;
  }

  cultivateFear(characterId, fearType) {
    const character = this.characters.get(characterId);
    if (!character) return;
    
    // Check if fear matches character's fears
    const effectiveness = character.fears.includes(fearType) ? 2.0 : 1.0;
    
    // Apply fear
    character.currentFear += 20 * effectiveness;
    character.currentSanity -= 15 * effectiveness;
    
    // Spread fear through network
    this.spreadFear(characterId, fearType);
    
    // Check for breakdown
    if (character.currentSanity <= 0) {
      this.triggerMentalBreakdown(character);
    }
    
    console.log(`[Phase 7] Cultivated ${fearType} fear in ${characterId}`);
  }

  spreadFear(sourceId, fearType) {
    const connection = this.fearNetwork.connections.get(sourceId);
    if (!connection) return;
    
    // Spread to contacts
    for (const contactId of connection.contacts) {
      const contact = this.characters.get(contactId);
      if (!contact) continue;
      
      // Fear transmission chance based on relationship strength
      const transmissionChance = 0.3;
      
      if (Math.random() < transmissionChance) {
        contact.currentFear += 10;
        contact.currentSanity -= 5;
        
        console.log(`[Phase 7] Fear spread from ${sourceId} to ${contactId}`);
      }
    }
    
    // Check for fear epidemic
    this.checkFearEpidemic();
  }

  checkFearEpidemic() {
    const highFearCharacters = Array.from(this.characters.values())
      .filter(c => c.currentFear > 70);
    
    if (highFearCharacters.length > this.characters.size * 0.3) {
      // 30%+ of population in high fear = epidemic
      this.triggerFearEpidemic();
    }
  }

  triggerFearEpidemic() {
    console.log('[Phase 7] FEAR EPIDEMIC TRIGGERED!');
    
    // Mass hysteria event
    for (const character of this.characters.values()) {
      character.currentFear = Math.min(100, character.currentFear + 20);
      character.currentSanity = Math.max(0, character.currentSanity - 10);
    }
    
    this.state.chaosLevel = 100;
  }

  triggerMentalBreakdown(character) {
    console.log(`[Phase 7] MENTAL BREAKDOWN: ${character.id}`);
    
    const breakdownTypes = [
      'catatonic_state',
      'violent_outburst',
      'hysterical_episode',
      'complete_withdrawal',
      'suicide_attempt'
    ];
    
    const breakdown = breakdownTypes[Math.floor(Math.random() * breakdownTypes.length)];
    character.breakdownType = breakdown;
    
    // Effects based on breakdown type
    switch (breakdown) {
      case 'violent_outburst':
        // Attack nearby characters
        this.attackNearbyCharacters(character);
        break;
      case 'hysterical_episode':
        // Spread more fear
        this.spreadFear(character.id, 'hysteria');
        break;
    }
    
    // Increase suspicion
    this.state.suspicionLevel += 10;
  }

  manipulateReality(manipulationType, intensity) {
    const manipulations = {
      'move_objects': { cost: 5, fear: 5 },
      'change_lighting': { cost: 8, fear: 8 },
      'alter_temperature': { cost: 10, fear: 10 },
      'distort_time': { cost: 20, fear: 25 },
      'phase_through_walls': { cost: 15, fear: 15 },
      'levitate': { cost: 12, fear: 12 }
    };
    
    const manipulation = manipulations[manipulationType];
    if (!manipulation) return false;
    
    if (this.state.essence < manipulation.cost) return false;
    
    this.state.essence -= manipulation.cost;
    this.state.fearLevel += manipulation.fear * intensity;
    
    console.log(`[Phase 7] Reality manipulation: ${manipulationType}`);
    return true;
  }

  evadeInvestigators() {
    if (this.investigators.length === 0) return;
    
    for (const investigator of this.investigators) {
      // Investigators use equipment to detect you
      const detectionChance = this.calculateDetectionChance(investigator);
      
      if (Math.random() < detectionChance) {
        this.state.suspicionLevel += 5;
        console.log('[Phase 7] Investigator detected paranormal activity!');
      }
      
      // Can banish investigator if suspicion too high
      if (this.state.suspicionLevel >= 100) {
        this.banishInvestigator(investigator);
      }
    }
  }

  calculateDetectionChance(investigator) {
    let chance = 0.1; // Base chance
    
    // Equipment modifiers
    if (investigator.equipment.includes('emf_meter')) chance += 0.2;
    if (investigator.equipment.includes('spirit_box')) chance += 0.15;
    if (investigator.equipment.includes('cameras')) chance += 0.1;
    
    // Activity level modifier
    chance += (this.state.chaosLevel / 100) * 0.3;
    
    return Math.min(0.9, chance);
  }

  banishInvestigator(investigator) {
    console.log(`[Phase 7] Banishing investigator: ${investigator.id}`);
    
    // Remove from game
    this.investigators = this.investigators.filter(i => i !== investigator);
    this.characters.delete(investigator.id);
    
    this.state.suspicionLevel = 0;
  }

  upgradeAbility(abilityTreeId, abilityId) {
    const tree = this.abilityTree[abilityTreeId];
    if (!tree) return false;
    
    const ability = tree.abilities.find(a => a.id === abilityId);
    if (!ability) return false;
    
    // Check prerequisites
    if (tree.prerequisites.length > 0) {
      const hasPrereqs = tree.prerequisites.every(prereq => 
        this.state.unlockedAbilities.includes(prereq)
      );
      
      if (!hasPrereqs) {
        console.log('[Phase 7] Missing prerequisites');
        return false;
      }
    }
    
    // Unlock ability
    if (!this.state.unlockedAbilities.includes(abilityId)) {
      this.state.unlockedAbilities.push(abilityId);
      console.log(`[Phase 7] Unlocked ability: ${abilityId}`);
      return true;
    }
    
    return false;
  }

  completeDay() {
    console.log(`[Phase 7] Day ${this.state.day} complete`);
    
    // Reset some stats
    this.state.time = 0;
    this.state.essence = Math.min(100, this.state.essence + 50); // Regenerate essence
    
    // Progress story
    this.state.day++;
    
    // Save progress
    this.saveGame();
  }

  async saveGame(slot = 0) {
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      state: this.state,
      characters: Array.from(this.characters.entries()),
      fearNetwork: {
        connections: Array.from(this.fearNetwork.connections.entries()),
        outbreaks: this.fearNetwork.outbreaks,
        epidemics: this.fearNetwork.epidemics
      },
      investigators: this.investigators,
      unlockedAbilities: this.state.unlockedAbilities
    };
    
    try {
      localStorage.setItem(`asylum_architect_save_${slot}`, JSON.stringify(saveData));
      console.log('[Phase 7] Game saved');
      return true;
    } catch (error) {
      console.error('[Phase 7] Save failed:', error);
      return false;
    }
  }

  dispose() {
    this.saveGame();
    console.log('[Phase 7] ASYLUM ARCHITECT disposed');
  }
}

// Export singleton helper
let asylumArchitectInstance = null;

export function getAsylumArchitectGame(config) {
  if (!asylumArchitectInstance) {
    asylumArchitectInstance = new AsylumArchitectGame(config);
  }
  return asylumArchitectInstance;
}

console.log('[Phase 7] ASYLUM ARCHITECT module loaded');
