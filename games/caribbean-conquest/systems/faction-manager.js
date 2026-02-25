// Caribbean Conquest - Faction Manager System
// Phase 3: Dynamic faction relationships, territories, and AI-driven behavior

class FactionManager {
    constructor(game) {
        this.game = game;
        
        // Faction definitions
        this.factions = {
            pirates: {
                name: 'Pirates',
                color: 0x8B0000, // Dark red
                aggression: 0.9,
                coordination: 0.4,
                wealth: 5000,
                territoryCount: 0,
                shipCount: 0,
                primaryGoal: 'plunder',
                secondaryGoal: 'terror',
                preferredBiomes: ['tropical', 'jungle'],
                hatedFactions: ['navy', 'merchants'],
                alliedFactions: ['smugglers']
            },
            navy: {
                name: 'Royal Navy',
                color: 0x00008B, // Dark blue
                aggression: 0.8,
                coordination: 0.9,
                wealth: 15000,
                territoryCount: 0,
                shipCount: 0,
                primaryGoal: 'order',
                secondaryGoal: 'expansion',
                preferredBiomes: ['tropical', 'desert'],
                hatedFactions: ['pirates', 'smugglers'],
                alliedFactions: ['merchants']
            },
            merchants: {
                name: 'Merchant Guild',
                color: 0x006400, // Dark green
                aggression: 0.1,
                coordination: 0.3,
                wealth: 25000,
                territoryCount: 0,
                shipCount: 0,
                primaryGoal: 'trade',
                secondaryGoal: 'stability',
                preferredBiomes: ['tropical', 'desert'],
                hatedFactions: ['pirates'],
                alliedFactions: ['navy', 'natives']
            },
            natives: {
                name: 'Native Tribes',
                color: 0x8B4513, // Saddle brown
                aggression: 0.6,
                coordination: 0.7,
                wealth: 3000,
                territoryCount: 0,
                shipCount: 0,
                primaryGoal: 'defense',
                secondaryGoal: 'tradition',
                preferredBiomes: ['jungle', 'tropical'],
                hatedFactions: ['pirates', 'navy'],
                alliedFactions: ['merchants']
            },
            smugglers: {
                name: 'Smugglers',
                color: 0x4B0082, // Indigo
                aggression: 0.7,
                coordination: 0.5,
                wealth: 8000,
                territoryCount: 0,
                shipCount: 0,
                primaryGoal: 'contraband',
                secondaryGoal: 'avoidance',
                preferredBiomes: ['volcanic', 'arctic'],
                hatedFactions: ['navy'],
                alliedFactions: ['pirates']
            },
            cultists: {
                name: 'Ancient Cult',
                color: 0x800080, // Purple
                aggression: 0.5,
                coordination: 0.8,
                wealth: 10000,
                territoryCount: 0,
                shipCount: 0,
                primaryGoal: 'ritual',
                secondaryGoal: 'secrecy',
                preferredBiomes: ['volcanic', 'jungle'],
                hatedFactions: ['all'],
                alliedFactions: []
            }
        };
        
        // Relationship matrix (6x6)
        this.relationships = this.initializeRelationships();
        
        // Territory claims
        this.territories = new Map(); // islandId -> faction
        
        // Active wars and alliances
        this.wars = [];
        this.alliances = [];
        
        // Faction economy
        this.economy = {
            resources: {
                gold: 0,
                spices: 0,
                timber: 0,
                iron: 0,
                food: 0
            },
            productionRates: {
                gold: 10,
                spices: 15,
                timber: 20,
                iron: 12,
                food: 30
            }
        };
        
        // Quest generation
        this.pendingQuests = [];
        
        // Event tracking
        this.events = [];
    }
    
    initializeRelationships() {
        // Initialize 6x6 relationship matrix
        const factions = Object.keys(this.factions);
        const matrix = {};
        
        for (const factionA of factions) {
            matrix[factionA] = {};
            for (const factionB of factions) {
                if (factionA === factionB) {
                    matrix[factionA][factionB] = 100; // Self relationship
                } else {
                    // Start with neutral (0)
                    matrix[factionA][factionB] = 0;
                    
                    // Apply initial biases
                    const factionData = this.factions[factionA];
                    if (factionData.hatedFactions.includes(factionB)) {
                        matrix[factionA][factionB] = -50;
                    }
                    if (factionData.alliedFactions.includes(factionB)) {
                        matrix[factionA][factionB] = 50;
                    }
                }
            }
        }
        
        return matrix;
    }
    
    init() {
        console.log('Faction Manager initialized');
        
        // Load saved faction state
        this.loadFactionState();
        
        // Generate initial territories
        this.generateInitialTerritories();
        
        // Start economy simulation
        this.startEconomySimulation();
        
        return true;
    }
    
    update(dt) {
        // Update faction relationships
        this.updateRelationships(dt);
        
        // Update economy
        this.updateEconomy(dt);
        
        // Check for war/peace events
        this.checkDiplomaticEvents();
        
        // Generate quests
        this.generateQuests(dt);
    }
    
    updateRelationships(dt) {
        const factions = Object.keys(this.factions);
        
        // Simulate relationship changes over time
        for (const factionA of factions) {
            for (const factionB of factions) {
                if (factionA === factionB) continue;
                
                let change = 0;
                
                // Natural drift toward neutral
                const current = this.relationships[factionA][factionB];
                if (current > 0) {
                    change -= 0.1 * dt; // Drift down
                } else if (current < 0) {
                    change += 0.1 * dt; // Drift up
                }
                
                // Territory conflicts
                if (this.areTerritoryNeighbors(factionA, factionB)) {
                    const conflictChance = 0.01 * dt;
                    if (Math.random() < conflictChance) {
                        change -= 5; // Negative from conflicts
                    }
                }
                
                // Shared enemy bonus
                const sharedEnemies = this.getSharedEnemies(factionA, factionB);
                if (sharedEnemies.length > 0) {
                    change += sharedEnemies.length * 0.5 * dt;
                }
                
                // Apply change
                this.relationships[factionA][factionB] += change;
                
                // Clamp between -100 and 100
                this.relationships[factionA][factionB] = Math.max(-100, 
                    Math.min(100, this.relationships[factionA][factionB]));
            }
        }
    }
    
    areTerritoryNeighbors(factionA, factionB) {
        // Check if factions have adjacent territories
        const aTerritories = this.getFactionTerritories(factionA);
        const bTerritories = this.getFactionTerritories(factionB);
        
        // Simplified check - if both have territories
        return aTerritories.length > 0 && bTerritories.length > 0;
    }
    
    getSharedEnemies(factionA, factionB) {
        const enemies = [];
        const factions = Object.keys(this.factions);
        
        for (const factionC of factions) {
            if (factionC === factionA || factionC === factionB) continue;
            
            if (this.relationships[factionA][factionC] < -25 && 
                this.relationships[factionB][factionC] < -25) {
                enemies.push(factionC);
            }
        }
        
        return enemies;
    }
    
    updateEconomy(dt) {
        // Update resource production
        for (const [resource, rate] of Object.entries(this.economy.productionRates)) {
            this.economy.resources[resource] += rate * dt;
        }
        
        // Cap resources
        for (const resource of Object.keys(this.economy.resources)) {
            this.economy.resources[resource] = Math.min(10000, 
                this.economy.resources[resource]);
        }
    }
    
    startEconomySimulation() {
        // Start periodic economy updates
        setInterval(() => {
            this.simulateTrade();
        }, 30000); // Every 30 seconds
    }
    
    simulateTrade() {
        const factions = Object.keys(this.factions);
        
        // Simulate trade between factions
        for (const factionA of factions) {
            for (const factionB of factions) {
                if (factionA === factionB) continue;
                
                const relationship = this.relationships[factionA][factionB];
                
                // Only trade if relationship is positive
                if (relationship > 25) {
                    const tradeAmount = Math.floor(relationship / 10);
                    
                    // Transfer resources
                    this.factions[factionA].wealth += tradeAmount;
                    this.factions[factionB].wealth += tradeAmount;
                    
                    // Improve relationship from successful trade
                    this.relationships[factionA][factionB] += 1;
                    this.relationships[factionB][factionA] += 1;
                }
            }
        }
    }
    
    checkDiplomaticEvents() {
        const factions = Object.keys(this.factions);
        
        for (const factionA of factions) {
            for (const factionB of factions) {
                if (factionA === factionB) continue;
                
                const relationship = this.relationships[factionA][factionB];
                
                // Check for war declaration
                if (relationship < -75 && !this.isAtWar(factionA, factionB)) {
                    this.declareWar(factionA, factionB);
                }
                
                // Check for alliance formation
                if (relationship > 75 && !this.isAllied(factionA, factionB)) {
                    this.formAlliance(factionA, factionB);
                }
                
                // Check for peace treaty
                if (relationship > -25 && this.isAtWar(factionA, factionB)) {
                    this.declarePeace(factionA, factionB);
                }
                
                // Check for alliance breakup
                if (relationship < 25 && this.isAllied(factionA, factionB)) {
                    this.breakAlliance(factionA, factionB);
                }
            }
        }
    }
    
    isAtWar(factionA, factionB) {
        return this.wars.some(war => 
            (war.faction1 === factionA && war.faction2 === factionB) ||
            (war.faction1 === factionB && war.faction2 === factionA)
        );
    }
    
    isAllied(factionA, factionB) {
        return this.alliances.some(alliance => 
            (alliance.faction1 === factionA && alliance.faction2 === factionB) ||
            (alliance.faction1 === factionB && alliance.faction2 === factionA)
        );
    }
    
    declareWar(factionA, factionB) {
        this.wars.push({
            faction1: factionA,
            faction2: factionB,
            startTime: Date.now(),
            casualties: { [factionA]: 0, [factionB]: 0 }
        });
        
        console.log(`War declared: ${factionA} vs ${factionB}`);
        
        // Notify player if they have reputation with either faction
        if (this.game.skillTree) {
            const playerRepA = this.game.skillTree.getReputationStatus(factionA);
            const playerRepB = this.game.skillTree.getReputationStatus(factionB);
            
            if (playerRepA !== 'neutral' || playerRepB !== 'neutral') {
                this.game.hud?.showNotification(
                    'War Declaration',
                    `${this.factions[factionA].name} declared war on ${this.factions[factionB].name}`
                );
            }
        }
    }
    
    formAlliance(factionA, factionB) {
        this.alliances.push({
            faction1: factionA,
            faction2: factionB,
            formationTime: Date.now()
        });
        
        console.log(`Alliance formed: ${factionA} + ${factionB}`);
    }
    
    declarePeace(factionA, factionB) {
        this.wars = this.wars.filter(war => 
            !((war.faction1 === factionA && war.faction2 === factionB) ||
              (war.faction1 === factionB && war.faction2 === factionA))
        );
        
        console.log(`Peace treaty: ${factionA} and ${factionB}`);
    }
    
    breakAlliance(factionA, factionB) {
        this.alliances = this.alliances.filter(alliance => 
            !((alliance.faction1 === factionA && alliance.faction2 === factionB) ||
              (alliance.faction1 === factionB && alliance.faction2 === factionA))
        );
        
        console.log(`Alliance broken: ${factionA} - ${factionB}`);
    }
    
    generateInitialTerritories() {
        // Claim some initial territories from existing islands
        if (this.game.islandGenerator) {
            const islands = this.game.islandGenerator.islands;
            let islandCount = 0;
            
            for (const island of islands.values()) {
                if (islandCount >= 10) break; // Limit initial claims
                
                const factions = Object.keys(this.factions);
                const randomFaction = factions[Math.floor(Math.random() * factions.length)];
                
                this.claimTerritory(island.id, randomFaction);
                islandCount++;
            }
        }
    }
    
    claimTerritory(islandId, faction) {
        this.territories.set(islandId, faction);
        this.factions[faction].territoryCount++;
        
        console.log(`${faction} claimed territory: ${islandId}`);
    }
    
    getFactionTerritories(faction) {
        const territories = [];
        for (const [islandId, owningFaction] of this.territories) {
            if (owningFaction === faction) {
                territories.push(islandId);
            }
        }
        return territories;
    }
    
    generateQuests(dt) {
        // Generate quests based on faction goals and player reputation
        if (!this.game.skillTree) return;
        
        const factions = Object.keys(this.factions);
        const questChance = 0.01 * dt; // 1% chance per second
        
        if (Math.random() < questChance) {
            const faction = factions[Math.floor(Math.random() * factions.length)];
            const playerRep = this.game.skillTree.getReputationStatus(faction);
            
            // Only generate quests for factions player has some relationship with
            if (playerRep !== 'neutral') {
                const quest = this.createFactionQuest(faction, playerRep);
                this.pendingQuests.push(quest);
                
                // Notify player
                this.game.hud?.showNotification(
                    'New Quest Available',
                    `${this.factions[faction].name} needs your help`
                );
            }
        }
    }
    
    createFactionQuest(faction, playerRepStatus) {
        const factionData = this.factions[faction];
        const questTypes = this.getQuestTypesForFaction(faction);
        const questType = questTypes[Math.floor(Math.random() * questTypes.length)];
        
        return {
            id: `quest_${faction}_${Date.now()}`,
            faction: faction,
            type: questType,
            title: this.generateQuestTitle(faction, questType),
            description: this.generateQuestDescription(faction, questType, playerRepStatus),
            objectives: this.generateQuestObjectives(faction, questType),
            rewards: this.generateQuestRewards(faction, playerRepStatus),
            expiration: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
    }
    
    getQuestTypesForFaction(faction) {
        const questMap = {
            pirates: ['plunder', 'assassination', 'ship_theft', 'port_raid'],
            navy: ['patrol', 'pirate_hunt', 'escort', 'blockade'],
            merchants: ['delivery', 'protection', 'trade_route', 'smuggling'],
            natives: ['artifact_recovery', 'ritual_assistance', 'defense', 'hunting'],
            smugglers: ['contraband_delivery', 'avoid_navy', 'hidden_cache', 'bribery'],
            cultists: ['ritual_completion', 'artifact_collection', 'sacrifice', 'temple_defense']
        };
        
        return questMap[faction] || ['generic'];
    }
    
    generateQuestTitle(faction, questType) {
        const titles = {
            plunder: 'Plunder the Merchant Ship',
            assassination: 'Eliminate the Rival Captain',
            ship_theft: 'Steal the Navy Frigate',
            port_raid: 'Raid the Port Settlement',
            patrol: 'Patrol the Trade Routes',
            pirate_hunt: 'Hunt Down Pirate Ships',
            escort: 'Escort the Merchant Convoy',
            blockade: 'Enforce Naval Blockade',
            delivery: 'Deliver Cargo to Port',
            protection: 'Protect Trade Route',
            trade_route: 'Establish New Trade Route',
            smuggling: 'Smuggle Contraband Goods'
        };
        
        return titles[questType] || `${this.factions[faction].name} Quest`;
    }
    
    generateQuestDescription(faction, questType, playerRepStatus) {
        const factionName = this.factions[faction].name;
        const descriptions = {
            friendly: `Our ${factionName} allies need assistance with ${questType}.`, 
            hostile: `The ${factionName} have offered a temporary truce for ${questType}.`,
            neutral: `The ${factionName} are seeking help with ${questType}.`
        };
        
        return descriptions[playerRepStatus] || `Help the ${factionName} with ${questType}.`;
    }
    
    generateQuestObjectives(faction, questType) {
        // Simplified objectives
        return [
            { type: 'travel', target: 'random_island', count: 1 },
            { type: 'combat', target: 'enemy_ships', count: 3 },
            { type: 'collect', target: 'resources', count: 5 }
        ];
    }
    
    generateQuestRewards(faction, playerRepStatus) {
        const baseReward = 100;
        const reputationBonus = {
            ally: 50,
            friendly: 25,
            neutral: 0,
            hostile: -25,
            enemy: -50
        };
        
        return {
            gold: baseReward + reputationBonus[playerRepStatus],
            reputation: 10,
            items: ['treasure_map', 'rare_resource']
        };
    }
    
    loadFactionState() {
        try {
            const data = localStorage.getItem('caribbean_conquest_factions');
            if (data) {
                const parsed = JSON.parse(data);
                this.relationships = parsed.relationships || this.relationships;
                this.territories = new Map(parsed.territories || []);
                this.wars = parsed.wars || [];
                this.alliances = parsed.alliances || [];
                console.log('Faction state loaded from storage');
            }
        } catch (e) {
            console.error('Failed to load faction state:', e);
        }
    }
    
    saveFactionState() {
        try {
            const data = {
                relationships: this.relationships,
                territories: Array.from(this.territories.entries()),
                wars: this.wars,
                alliances: this.alliances
            };
            localStorage.setItem('caribbean_conquest_factions', JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save faction state:', e);
        }
    }
    
    // Get relationship status between two factions
    getRelationshipStatus(factionA, factionB) {
        const value = this.relationships[factionA][factionB];
        if (value >= 75) return 'allied';
        if (value >= 25) return 'friendly';
        if (value >= -25) return 'neutral';
        if (value >= -75) return 'hostile';
        return 'at_war';
    }
    
    // Get all factions at war with a faction
    getFactionsAtWarWith(faction) {
        const warsWith = [];
        for (const war of this.wars) {
            if (war.faction1 === faction) warsWith.push(war.faction2);
            if (war.faction2 === faction) warsWith.push(war.faction1);
        }
        return warsWith;
    }
    
    // Get all factions allied with a faction
    getAlliesOf(faction) {
        const allies = [];
        for (const alliance of this.alliances) {
            if (alliance.faction1 === faction) allies.push(alliance.faction2);
            if (alliance.faction2 === faction) allies.push(alliance.faction1);
        }
        return allies;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FactionManager;
}