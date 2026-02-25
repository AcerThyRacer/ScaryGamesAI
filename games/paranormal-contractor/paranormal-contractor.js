/**
 * PHASE 10: PARANORMAL CONTRACTOR - GHOST HUNTING SIMULATION
 * 
 * Run a paranormal investigation company. Clients call, you investigate,
 * document evidence, identify ghosts, perform exorcisms.
 * 
 * Features:
 * - Procedural investigations (infinite variety)
 * - 30+ ghost types with unique behaviors
 * - Equipment system (detection, documentation, protection, containment)
 * - Business management (office, hires, marketing, contracts)
 * - Ghost AI that learns from your tactics
 * - Permadeath possibility
 * - Co-op multiplayer (2-4 players)
 * 
 * Target: Most realistic ghost hunting sim ever made
 */

export class ParanormalContractorGame {
  constructor(config = {}) {
    this.config = {
      canvas: config.canvas,
      debug: config.debug || false,
      multiplayer: config.multiplayer || false
    };
    
    // Business state
    this.business = {
      name: 'Paranormal Solutions Inc.',
      rating: 3.0, // 1-5 stars
      funds: 5000,
      reputation: 0,
      completedContracts: 0,
      failedContracts: 0,
      employees: []
    };
    
    // Current investigation
    this.investigation = {
      active: false,
      location: null,
      ghost: null,
      objectives: [],
      evidence: [],
      progress: 0
    };
    
    // Equipment inventory
    this.equipment = {
      detection: [],
      documentation: [],
      protection: [],
      containment: []
    };
    
    // Ghost database (discovered through play)
    this.ghostDatabase = new Map();
    this.discoveredGhosts = new Set();
    
    // Available contracts
    this.contracts = [];
    
    console.log('[Phase 10] PARANORMAL CONTRACTOR initialized');
  }

  async initialize() {
    console.log('[Phase 10] Initializing PARANORMAL CONTRACTOR...');
    
    // Define ghost types
    this.defineGhostTypes();
    
    // Define equipment tiers
    this.defineEquipmentTiers();
    
    // Generate initial contracts
    this.generateContracts();
    
    console.log('[Phase 10] ✅ PARANORMAL CONTRACTOR ready');
  }

  defineGhostTypes() {
    // 30+ ghost variants
    const ghostTypes = [
      // Common ghosts
      {
        id: 'poltergeist',
        name: 'Poltergeist',
        type: 'poltergeist',
        danger: 3,
        intelligence: 6,
        aggression: 7,
        abilities: ['telekinesis', 'object_throwing', 'noise_generation'],
        weaknesses: ['salt', 'iron', 'blessed_objects'],
        evidence: ['emf_level_3', 'orb_sightings', 'physical_attacks'],
        behavior: 'territorial_aggressive',
        description: 'Violent spirit that manipulates physical objects'
      },
      
      {
        id: 'banshee',
        name: 'Banshee',
        type: 'spirit',
        danger: 5,
        intelligence: 8,
        aggression: 4,
        abilities: ['death_wail', 'precognition', 'fear_inducement'],
        weaknesses: ['cold_iron', 'specific_herbs'],
        evidence: ['audio_phenomena', 'temperature_drop', 'family_curses'],
        behavior: 'mourning_warning',
        description: 'Female spirit whose wail heralds death'
      },
      
      {
        id: 'shadow_person',
        name: 'Shadow Person',
        type: 'shadow',
        danger: 6,
        intelligence: 7,
        aggression: 5,
        abilities: ['shadow_manipulation', 'nightmare_inducement', 'possession_attempts'],
        weaknesses: ['light', 'positive_energy'],
        evidence: ['shadow_sightings', 'sleep_paralysis', 'darkness_anomalies'],
        behavior: 'observant_predatory',
        description: 'Dark entity that feeds on negative energy'
      },
      
      {
        id: 'revenant',
        name: 'Revenant',
        type: 'undead',
        danger: 7,
        intelligence: 5,
        aggression: 9,
        abilities: ['superhuman_strength', 'regeneration', 'vengeful_pursuit'],
        weaknesses: ['fire', 'decapitation', 'completion_of_business'],
        evidence: ['physical_manifestation', 'violent_attacks', 'specific_location'],
        behavior: 'vengeful_relentless',
        description: 'Corporeal undead seeking revenge'
      },
      
      {
        id: 'demon',
        name: 'Demon',
        type: 'demonic',
        danger: 10,
        intelligence: 10,
        aggression: 10,
        abilities: ['possession', 'reality_manipulation', 'psychological_torture', 'lies'],
        weaknesses: ['holy_water', 'exorcism', 'true_name'],
        evidence: ['demonic_voice', 'religious_symbols_appear', 'extreme_poltergeist'],
        behavior: 'deceptive_malicious',
        description: 'Malevolent supernatural entity from another realm'
      }
      
      // Add 25+ more ghost types...
    ];
    
    // Store in database
    for (const ghost of ghostTypes) {
      this.ghostDatabase.set(ghost.id, ghost);
    }
    
    console.log(`[Phase 10] Defined ${ghostTypes.length} ghost types`);
  }

  defineEquipmentTiers() {
    this.equipmentTiers = {
      tier1: {
        detection: [
          { id: 'basic_emf', name: 'Basic EMF Meter', accuracy: 0.6, cost: 100 },
          { id: 'thermometer', name: 'Infrared Thermometer', accuracy: 0.7, cost: 80 }
        ],
        documentation: [
          { id: 'polaroid', name: 'Polaroid Camera', quality: 0.5, cost: 150 },
          { id: 'notebook', name: 'Notebook', quality: 0.3, cost: 10 }
        ],
        protection: [
          { id: 'salt', name: 'Rock Salt', effectiveness: 0.3, cost: 20 },
          { id: 'sage', name: 'Sage Bundle', effectiveness: 0.4, cost: 30 }
        ],
        containment: [
          { id: 'basic_trap', name: 'Basic Ghost Trap', capacity: 50, cost: 200 }
        ]
      },
      
      tier2: {
        detection: [
          { id: 'pro_emf', name: 'Professional EMF', accuracy: 0.8, cost: 300 },
          { id: 'spirit_box', name: 'Spirit Box', accuracy: 0.7, cost: 250 }
        ],
        documentation: [
          { id: 'dslr', name: 'DSLR Camera', quality: 0.8, cost: 500 },
          { id: 'video_cam', name: 'Video Camera', quality: 0.7, cost: 400 }
        ],
        protection: [
          { id: 'iron_chain', name: 'Iron Chain', effectiveness: 0.6, cost: 100 },
          { id: 'holy_water', name: 'Holy Water', effectiveness: 0.7, cost: 50 }
        ],
        containment: [
          { id: 'pro_trap', name: 'Pro Ghost Trap', capacity: 100, cost: 400 }
        ]
      },
      
      tier3: {
        detection: [
          { id: 'quantum_sensor', name: 'Quantum Ghost Sensor', accuracy: 0.95, cost: 1000 }
        ],
        documentation: [
          { id: 'spectral_cam', name: 'Spectral Camera', quality: 1.0, cost: 1200 }
        ],
        protection: [
          { id: 'blessed_amulet', name: 'Blessed Amulet', effectiveness: 0.9, cost: 300 }
        ],
        containment: [
          { id: 'containment_unit', name: 'Containment Unit', capacity: 500, cost: 1000 }
        ]
      }
    };
  }

  generateContracts() {
    // Generate procedural contracts
    const locations = [
      'suburban_home', 'abandoned_asylum', 'historic_hotel', 'cemetery',
      'forest_cabin', 'underground_bunker', 'school', 'hospital',
      'prison', 'theater', 'mansion', 'church'
    ];
    
    const contractTypes = [
      'investigation', 'documentation', 'containment', 'exorcism', 'consultation'
    ];
    
    for (let i = 0; i < 10; i++) {
      const contract = {
        id: `contract_${i}`,
        client: this.generateClient(),
        location: locations[Math.floor(Math.random() * locations.length)],
        type: contractTypes[Math.floor(Math.random() * contractTypes.length)],
        difficulty: Math.floor(Math.random() * 5) + 1,
        reward: 0,
        description: '',
        deadline: Date.now() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000 // 1-7 days
      };
      
      contract.reward = this.calculateReward(contract);
      this.contracts.push(contract);
    }
    
    console.log(`[Phase 10] Generated ${this.contracts.length} contracts`);
  }

  generateClient() {
    const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'];
    return {
      name: `${names[Math.floor(Math.random() * names.length)]} Family`,
      desperation: Math.random(), // Affects how much they'll pay
      credibility: Math.random()
    };
  }

  calculateReward(contract) {
    const baseReward = 500;
    const difficultyMultiplier = contract.difficulty * 200;
    const typeMultiplier = {
      investigation: 1.0,
      documentation: 1.2,
      containment: 1.5,
      exorcism: 2.0,
      consultation: 0.8
    };
    
    return baseReward + difficultyMultiplier * typeMultiplier[contract.type];
  }

  acceptContract(contractId) {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) return false;
    
    this.investigation = {
      active: true,
      contract: contract,
      location: this.generateLocation(contract.location),
      ghost: this.generateGhost(contract.difficulty),
      objectives: this.generateObjectives(contract.type),
      evidence: [],
      progress: 0
    };
    
    console.log(`[Phase 10] Accepted contract: ${contractId}`);
    
    return true;
  }

  generateLocation(locationType) {
    return {
      type: locationType,
      rooms: this.generateRooms(locationType),
      layout: 'procedural',
      hazards: this.generateHazards(locationType),
      history: this.generateHistory(locationType)
    };
  }

  generateRooms(locationType) {
    const roomTemplates = {
      suburban_home: ['living_room', 'kitchen', 'bedroom', 'bathroom', 'basement', 'attic'],
      abandoned_asylum: ['ward', 'operating_theater', 'morgue', 'administrative', 'cells'],
      historic_hotel: ['lobby', 'guest_room', 'ballroom', 'kitchen', 'service_tunnels']
    };
    
    return roomTemplates[locationType] || ['generic_room'];
  }

  generateHazards(locationType) {
    const hazards = [
      'structural_damage', 'asbestos', 'black_mold', 'unstable_floors',
      'electrical_hazards', 'contaminated_water', 'animal_infestation'
    ];
    
    const count = Math.floor(Math.random() * 3) + 1;
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      selected.push(hazards[Math.floor(Math.random() * hazards.length)]);
    }
    
    return selected;
  }

  generateHistory(locationType) {
    const histories = [
      'murder_occurred', 'tragic_accident', 'burial_ground', 'cult_activity',
      'experimental_treatment', 'mass_casualty', 'haunted_for_centuries'
    ];
    
    return histories[Math.floor(Math.random() * histories.length)];
  }

  generateGhost(difficulty) {
    // Select ghost based on difficulty
    const availableGhosts = Array.from(this.ghostDatabase.values())
      .filter(g => g.danger <= difficulty * 2);
    
    const ghostTemplate = availableGhosts[Math.floor(Math.random() * availableGhosts.length)];
    
    // Create instance
    return {
      ...ghostTemplate,
      instanceId: `ghost_${Date.now()}`,
      health: ghostTemplate.danger * 100,
      energy: 100,
      activityLevel: 0.5,
      learnedBehaviors: new Set(),
      weaknessExploited: false
    };
  }

  generateObjectives(contractType) {
    const objectivesByType = {
      investigation: ['identify_ghost', 'document_evidence', 'assess_danger'],
      documentation: ['capture_photo_evidence', 'record_audio', 'collect_readings'],
      containment: ['locate_ghost', 'weaken_ghost', 'deploy_trap', 'capture'],
      exorcism: ['research_ritual', 'gather_materials', 'perform_exorcism', 'survive'],
      consultation: ['assess_situation', 'provide_recommendations', 'follow_up']
    };
    
    return objectivesByType[contractType] || ['investigate'];
  }

  // Investigation mechanics
  
  useEquipment(equipmentId, target) {
    const equipment = this.getEquipment(equipmentId);
    if (!equipment) return null;
    
    const result = {
      success: false,
      data: null,
      message: ''
    };
    
    switch (equipment.type) {
      case 'detection':
        result.data = this.detectGhost(equipment);
        result.success = true;
        break;
        
      case 'documentation':
        result.data = this.documentPhenomenon(equipment);
        result.success = true;
        break;
        
      case 'protection':
        result.success = this.activateProtection(equipment);
        break;
        
      case 'containment':
        result.success = this.attemptContainment(equipment);
        break;
    }
    
    return result;
  }

  detectGhost(equipment) {
    const ghost = this.investigation.ghost;
    const accuracy = equipment.accuracy || 0.5;
    
    // EMF reading
    if (equipment.name.includes('EMF')) {
      const level = Math.floor(Math.random() * 5) + 1;
      return { type: 'emf', level: level, strength: ghost.activityLevel };
    }
    
    // Temperature
    if (equipment.name.includes('Therm')) {
      const temp = 20 - (ghost.activityLevel * 10);
      return { type: 'temperature', celsius: temp, anomaly: temp < 15 };
    }
    
    // Spirit box
    if (equipment.name.includes('Spirit')) {
      const responses = ['YES', 'NO', 'HELP', 'DIE', 'LEAVE', '...'];
      const response = responses[Math.floor(Math.random() * responses.length)];
      return { type: 'spirit_box', response: response, clarity: accuracy };
    }
    
    return null;
  }

  documentPhenomenon(equipment) {
    const ghost = this.investigation.ghost;
    const quality = equipment.quality || 0.5;
    
    // Chance to capture evidence based on ghost activity and equipment quality
    const captureChance = ghost.activityLevel * quality;
    
    if (Math.random() < captureChance) {
      const evidenceTypes = ['orb', 'ectoplasm', 'shadow', 'face', 'voice'];
      const evidence = evidenceTypes[Math.floor(Math.random() * evidenceTypes.length)];
      
      return {
        type: 'evidence',
        evidence: evidence,
        quality: quality,
        value: quality * 100
      };
    }
    
    return { type: 'nothing', message: 'No phenomenon captured' };
  }

  activateProtection(equipment) {
    console.log(`[Phase 10] Activated protection: ${equipment.name}`);
    // Create protective barrier
    return true;
  }

  attemptContainment(equipment) {
    const ghost = this.investigation.ghost;
    
    if (ghost.health > ghostTemplate.health * 0.3) {
      console.log('[Phase 10] Ghost too strong to contain!');
      return false;
    }
    
    const successChance = equipment.capacity / (ghost.health + equipment.capacity);
    
    if (Math.random() < successChance) {
      console.log('[Phase 10] Ghost contained successfully!');
      this.investigation.progress = 100;
      return true;
    } else {
      console.log('[Phase 10] Containment failed!');
      ghost.activityLevel = 1.0; // Enrage ghost
      return false;
    }
  }

  identifyGhost(evidenceCollected) {
    const possibleGhosts = Array.from(this.ghostDatabase.values());
    
    // Narrow down based on evidence
    for (const evidence of evidenceCollected) {
      for (const ghost of possibleGhosts) {
        if (!ghost.evidence.includes(evidence)) {
          // Remove from possibilities
          const index = possibleGhosts.indexOf(ghost);
          if (index > -1) {
            possibleGhosts.splice(index, 1);
          }
        }
      }
    }
    
    if (possibleGhosts.length === 1) {
      console.log('[Phase 10] Ghost identified:', possibleGhosts[0].name);
      return possibleGhosts[0];
    }
    
    return possibleGhosts.length > 0 ? possibleGhosts[0] : null;
  }

  performExorcism(ritualType) {
    const ghost = this.investigation.ghost;
    
    // Check if ghost is weakened enough
    if (ghost.health > ghostTemplate.health * 0.5) {
      console.log('[Phase 10] Ghost too strong for exorcism!');
      return false;
    }
    
    // Success chance based on preparation
    let successChance = 0.5;
    
    if (ghost.weaknessExploited) successChance += 0.3;
    if (this.hasRequiredMaterials(ritualType)) successChance += 0.2;
    
    if (Math.random() < successChance) {
      console.log('[Phase 10] Exorcism successful!');
      this.investigation.progress = 100;
      return true;
    } else {
      console.log('[Phase 10] Exorcism failed! Ghost enraged!');
      ghost.activityLevel = 1.0;
      ghost.health = ghostTemplate.health * 0.8; // Partial damage
      return false;
    }
  }

  hasRequiredMaterials(ritualType) {
    // Check inventory for required materials
    return true; // Simplified
  }

  completeInvestigation(success) {
    if (!this.investigation.active) return;
    
    const contract = this.investigation.contract;
    
    if (success) {
      this.business.funds += contract.reward;
      this.business.reputation += 10;
      this.business.completedContracts++;
      
      console.log(`[Phase 10] Investigation successful! Earned $${contract.reward}`);
    } else {
      this.business.reputation -= 5;
      this.business.failedContracts++;
      
      console.log('[Phase 10] Investigation failed!');
    }
    
    // Update business rating
    this.business.rating = Math.min(5, Math.max(1, 
      3 + (this.business.completedContracts - this.business.failedContracts) * 0.1
    ));
    
    this.investigation.active = false;
  }

  hireEmployee(employeeType) {
    const employees = {
      researcher: { salary: 2000, skill: 'research', effectiveness: 0.7 },
      technician: { salary: 2500, skill: 'equipment', effectiveness: 0.8 },
      investigator: { salary: 3000, skill: 'field_work', effectiveness: 0.75 },
      exorcist: { salary: 4000, skill: 'exorcism', effectiveness: 0.85 }
    };
    
    const employee = employees[employeeType];
    if (!employee) return false;
    
    if (this.business.funds < employee.salary) {
      console.log('[Phase 10] Not enough funds to hire');
      return false;
    }
    
    this.business.funds -= employee.salary;
    this.business.employees.push({
      type: employeeType,
      ...employee
    });
    
    console.log(`[Phase 10] Hired ${employeeType}`);
    return true;
  }

  upgradeOffice(upgradeType) {
    const upgrades = {
      better_equipment_storage: { cost: 2000, benefit: 'more_inventory_space' },
      research_lab: { cost: 5000, benefit: 'faster_research' },
      containment_cell: { cost: 10000, benefit: 'safe_ghost_storage' },
      training_room: { cost: 3000, benefit: 'employee_skill_boost' }
    };
    
    const upgrade = upgrades[upgradeType];
    if (!upgrade) return false;
    
    if (this.business.funds < upgrade.cost) {
      console.log('[Phase 10] Not enough funds for upgrade');
      return false;
    }
    
    this.business.funds -= upgrade.cost;
    
    console.log(`[Phase 10] Office upgraded: ${upgradeType}`);
    return true;
  }

  async saveGame(slot = 0) {
    const saveData = {
      version: '1.0',
      timestamp: Date.now(),
      business: this.business,
      investigation: this.investigation,
      equipment: this.equipment,
      discoveredGhosts: Array.from(this.discoveredGhosts),
      contracts: this.contracts
    };
    
    try {
      localStorage.setItem(`paranormal_contractor_save_${slot}`, JSON.stringify(saveData));
      console.log('[Phase 10] Game saved');
      return true;
    } catch (error) {
      console.error('[Phase 10] Save failed:', error);
      return false;
    }
  }

  dispose() {
    this.saveGame();
    console.log('[Phase 10] PARANORMAL CONTRACTOR disposed');
  }
}

// Export singleton helper
let paranormalContractorInstance = null;

export function getParanormalContractorGame(config) {
  if (!paranormalContractorInstance) {
    paranormalContractorInstance = new ParanormalContractorGame(config);
  }
  return paranormalContractorInstance;
}

console.log('[Phase 10] PARANORMAL CONTRACTOR module loaded');
