/**
 * PHASE 2: AI SYSTEMS INTEGRATION MODULE
 * Integrates Multi-Agent Pacman, AI Learner, Enemy Variants, and Threat Assessment
 * into a unified, intelligent enemy system with emotional states and squad tactics
 */

var Phase2AIIntegration = (function() {
    'use strict';

    var config = {
        // Emotional State Machine
        emotions: {
            NEUTRAL: 'neutral',
            AGGRESSIVE: 'aggressive',
            CAUTIOUS: 'cautious',
            PLAYFUL: 'playful',
            FRUSTRATED: 'frustrated',
            FEARFUL: 'fearful'
        },
        
        // Emotion transition thresholds
        emotionThresholds: {
            aggressiveMinDistance: 8,
            cautiousSanityThreshold: 50,
            playfulStressThreshold: 30,
            frustratedTimeWithoutKill: 120,
            fearfulAbilityThreshold: 2
        },

        // Squad tactics configuration
        squadRoles: {
            LEADER: 'leader',
            FLANKER: 'flanker',
            BLOCKER: 'blocker',
            SCOUT: 'scout'
        },

        // Difficulty scaling
        difficultyScaling: {
            novice: { aiReactionTime: 1.5, coordination: 0.5, adaptation: 0.3 },
            standard: { aiReactionTime: 1.0, coordination: 0.7, adaptation: 0.6 },
            hard: { aiReactionTime: 0.7, coordination: 0.85, adaptation: 0.8 },
            nightmare: { aiReactionTime: 0.5, coordination: 0.95, adaptation: 0.95 },
            impossible: { aiReactionTime: 0.3, coordination: 1.0, adaptation: 1.0 }
        }
    };

    var state = {
        currentDifficulty: 'standard',
        elapsedTime: 0,
        timeSinceLastKill: 0,
        playerDeathCount: 0,
        
        // Emotional state per agent
        agentEmotions: {},
        
        // Squad formation
        activeSquad: null,
        
        // Player behavior profile
        playerProfile: {
            playstyle: 'unknown', // aggressive, cautious, explorer, speedrunner
            preferredRoutes: [],
            hidingSpotUsage: {},
            sprintFrequency: 0,
            averageSpeed: 0,
            panicResponses: [] // freeze, fight, flight
        },
        
        // Learning data
        learningData: {
            playerPositions: [],
            chaseOutcomes: [],
            ambushSuccesses: 0,
            predictionAccuracy: 0
        }
    };

    var scene = null;
    var maze = null;
    var enabled = true;

    /**
     * Initialize Phase 2 AI Integration
     */
    function init(threeScene, mazeGrid, difficulty) {
        scene = threeScene;
        maze = mazeGrid;
        state.currentDifficulty = difficulty || 'standard';
        state.elapsedTime = 0;
        
        console.log('[Phase2AI] Initialized with difficulty:', state.currentDifficulty);
        
        // Initialize subsystems
        if (typeof MultiAgentPacman !== 'undefined') {
            MultiAgentPacman.init(scene, maze, { x: 0, z: 0 });
        }
        
        if (typeof AILearner !== 'undefined') {
            console.log('[Phase2AI] AI Learner ready');
        }
        
        if (typeof EnemyVariants !== 'undefined') {
            console.log('[Phase2AI] Enemy Variants ready');
        }
        
        if (typeof ThreatAssessment !== 'undefined') {
            ThreatAssessment.update(0);
            console.log('[Phase2AI] Threat Assessment ready');
        }
    }

    /**
     * Main update loop - integrates all AI systems
     */
    function update(deltaTime, playerPos, pacmanPos, extraPacmans, gameState) {
        if (!enabled) return;
        
        state.elapsedTime += deltaTime;
        state.timeSinceLastKill += deltaTime;
        
        // Update player profile
        updatePlayerProfile(playerPos, deltaTime, gameState);
        
        // Update emotional states
        updateEmotionalStates(playerPos, pacmanPos, extraPacmans);
        
        // Execute squad tactics
        executeSquadTactics(playerPos, pacmanPos, extraPacmans);
        
        // Run AI learner predictions
        runAILearning(playerPos, pacmanPos);
        
        // Apply difficulty scaling
        applyDifficultyScaling();
        
        // Update threat assessment
        if (typeof ThreatAssessment !== 'undefined') {
            ThreatAssessment.update(deltaTime);
            if (pacmanPos) {
                ThreatAssessment.updatePlayerSighting(playerPos);
            }
        }
        
        // Update multi-agent system
        if (typeof MultiAgentPacman !== 'undefined') {
            MultiAgentPacman.update(deltaTime, playerPos, pacmanPos);
            
            // Apply emotional modifiers to agents
            applyEmotionalModifiers(playerPos);
        }
        
        // Update enemy variants
        if (typeof EnemyVariants !== 'undefined') {
            var activeVariants = EnemyVariants.getActiveVariants();
            for (var i = 0; i < activeVariants.length; i++) {
                var variant = activeVariants[i];
                
                // Apply emotional state to variant
                if (state.agentEmotions[variant.id]) {
                    applyVariantEmotionBehavior(variant, playerPos, deltaTime);
                }
                
                EnemyVariants.updateVariant(variant, deltaTime, playerPos);
            }
        }
    }

    /**
     * Update player behavior profile
     */
    function updatePlayerProfile(playerPos, deltaTime, gameState) {
        // Track positions for route analysis
        state.learningData.playerPositions.push({
            pos: playerPos.clone(),
            time: Date.now()
        });
        
        // Keep only last 60 seconds of data
        var cutoff = Date.now() - 60000;
        state.learningData.playerPositions = state.learningData.playerPositions.filter(
            p => p.time > cutoff
        );
        
        // Detect playstyle
        detectPlaystyle(gameState);
        
        // Track sprint usage
        if (gameState && gameState.isRunning) {
            state.playerProfile.sprintFrequency += deltaTime;
        }
        
        // Analyze preferred routes
        if (state.learningData.playerPositions.length > 50) {
            analyzePreferredRoutes();
        }
    }

    /**
     * Detect player's current playstyle
     */
    function detectPlaystyle(gameState) {
        var recentPositions = state.learningData.playerPositions.slice(-20);
        
        if (recentPositions.length < 10) return;
        
        // Calculate average speed
        var totalDist = 0;
        for (var i = 1; i < recentPositions.length; i++) {
            totalDist += recentPositions[i].pos.distanceTo(recentPositions[i-1].pos);
        }
        var avgSpeed = totalDist / recentPositions.length;
        
        state.playerProfile.averageSpeed = avgSpeed;
        
        // Classify playstyle
        if (avgSpeed > 3.5 || state.playerProfile.sprintFrequency > 0.7) {
            state.playerProfile.playstyle = 'speedrunner';
        } else if (avgSpeed < 1.5) {
            state.playerProfile.playstyle = 'cautious';
        } else if (gameState && gameState.nearEnemies > 2) {
            state.playerProfile.playstyle = 'aggressive';
        } else {
            state.playerProfile.playstyle = 'explorer';
        }
    }

    /**
     * Analyze player's preferred routes
     */
    function analyzePreferredRoutes() {
        // Cluster frequently visited positions
        var positions = state.learningData.playerPositions;
        var clusters = {};
        
        for (var i = 0; i < positions.length; i++) {
            var gridKey = Math.floor(positions[i].pos.x / 4) + '_' + 
                         Math.floor(positions[i].pos.z / 4);
            
            if (!clusters[gridKey]) {
                clusters[gridKey] = 0;
            }
            clusters[gridKey]++;
        }
        
        // Find top 5 most visited areas
        var sortedClusters = Object.entries(clusters)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        state.playerProfile.preferredRoutes = sortedClusters.map(c => c[0]);
    }

    /**
     * Update emotional states for all agents
     */
    function updateEmotionalStates(playerPos, pacmanPos, extraPacmans) {
        var allAgents = [];
        
        if (pacmanPos) {
            allAgents.push({ id: 'main', pos: pacmanPos });
        }
        
        if (extraPacmans) {
            extraPacmans.forEach((pac, idx) => {
                allAgents.push({ id: 'extra_' + idx, pos: pac.position });
            });
        }
        
        allAgents.forEach(agent => {
            var distance = playerPos ? playerPos.distanceTo(agent.pos) : 20;
            var newEmotion = determineEmotion(agent, distance, playerPos);
            
            state.agentEmotions[agent.id] = newEmotion;
        });
    }

    /**
     * Determine emotion based on game state
     */
    function determineEmotion(agent, distance, playerPos) {
        // Check for aggressive (close to player)
        if (distance < config.emotionThresholds.aggressiveMinDistance) {
            return config.emotions.AGGRESSIVE;
        }
        
        // Check for frustrated (long time without kill)
        if (state.timeSinceLastKill > config.emotionThresholds.frustratedTimeWithoutKill) {
            return config.emotions.FRUSTATED;
        }
        
        // Check for playful (player using abilities frequently)
        if (typeof ExpandedAbilities !== 'undefined') {
            var activeEffects = ExpandedAbilities.getActiveEffects();
            if (Object.keys(activeEffects).length >= config.emotionThresholds.fearfulAbilityThreshold) {
                return config.emotions.PLAYFUL;
            }
        }
        
        // Default to neutral
        return config.emotions.NEUTRAL;
    }

    /**
     * Apply emotional modifiers to agent behavior
     */
    function applyEmotionalModifiers(playerPos) {
        var agents = MultiAgentPacman.getAgents();
        
        agents.forEach(agent => {
            var emotion = state.agentEmotions[agent.id] || config.emotions.NEUTRAL;
            
            switch (emotion) {
                case config.emotions.AGGRESSIVE:
                    // Increased speed, reduced separation
                    agent.maxSpeed = config.maxSpeed * 1.3;
                    agent.separationWeight = 1.5;
                    break;
                    
                case config.emotions.FRUSTATED:
                    // More erratic movement, higher cohesion
                    agent.maxSpeed = config.maxSpeed * 1.1;
                    agent.cohesionWeight = 2.0;
                    break;
                    
                case config.emotions.PLAYFUL:
                    // Unpredictable patterns
                    if (Math.random() < 0.05) {
                        agent.velocity.multiplyScalar(-1); // Random direction change
                    }
                    break;
                    
                default:
                    // Normal behavior
                    break;
            }
        });
    }

    /**
     * Apply emotion-specific behavior to variants
     */
    function applyVariantEmotionBehavior(variant, playerPos, deltaTime) {
        var emotion = state.agentEmotions[variant.id] || config.emotions.NEUTRAL;
        
        switch (variant.type) {
            case 'berserker':
                if (emotion === config.emotions.AGGRESSIVE) {
                    // Go berserk when close
                    variant.speed *= 1.5;
                }
                break;
                
            case 'hunter':
                if (emotion === config.emotions.FRUSTATED) {
                    // Set more traps when frustrated
                    if (Math.random() < 0.1) {
                        // Place trap logic here
                        console.log('[Phase2AI] Hunter setting trap');
                    }
                }
                break;
                
            case 'shadow':
                if (emotion === config.emotions.PLAYFUL) {
                    // Teleport more often
                    variant.teleportCooldown *= 0.5;
                }
                break;
        }
    }

    /**
     * Execute coordinated squad tactics
     */
    function executeSquadTactics(playerPos, pacmanPos, extraPacmans) {
        var agentCount = 1 + (extraPacmans ? extraPacmans.length : 0);
        
        if (agentCount < 2) return; // Need at least 2 for tactics
        
        // Assign roles based on count
        var roleAssignment = assignSquadRoles(agentCount);
        
        // Execute tactic based on roles
        if (roleAssignment.leader && roleAssignment.flanker) {
            executePincerMovement(playerPos, pacmanPos, extraPacmans, roleAssignment);
        }
        
        if (roleAssignment.blocker) {
            executeBlockingTactic(playerPos, pacmanPos, extraPacmans, roleAssignment);
        }
        
        if (roleAssignment.scout) {
            executeScoutingTactic(playerPos, pacmanPos, extraPacmans, roleAssignment);
        }
    }

    /**
     * Assign squad roles
     */
    function assignSquadRoles(count) {
        var roles = {
            leader: 0,
            flanker: -1,
            blocker: -1,
            scout: -1
        };
        
        if (count >= 1) roles.leader = 0;
        if (count >= 3) roles.flanker = 1;
        if (count >= 4) roles.blocker = 2;
        if (count >= 5) roles.scout = 3;
        
        return roles;
    }

    /**
     * Pincer movement: leader chases, flanker cuts off escape
     */
    function executePincerMovement(playerPos, pacmanPos, extraPacmans, roles) {
        if (!playerPos) return;
        
        // Leader continues direct chase (handled by base AI)
        
        // Flanker tries to get ahead of player
        if (roles.flanker >= 0 && extraPacmans && extraPacmans[roles.flanker - 1]) {
            var flanker = extraPacmans[roles.flanker - 1];
            
            // Calculate interception point
            var playerVelocity = calculatePlayerVelocity();
            var interceptPoint = playerPos.clone().add(
                playerVelocity.multiplyScalar(2) // Predict 2 seconds ahead
            );
            
            // Move towards intercept point
            if (typeof EnemyVariants !== 'undefined') {
                EnemyVariants.moveTo(flanker, interceptPoint);
            }
        }
    }

    /**
     * Blocking tactic: cut off escape routes
     */
    function executeBlockingTactic(playerPos, pacmanPos, extraPacmans, roles) {
        if (!playerPos || !maze) return;
        
        if (roles.blocker >= 0 && extraPacmans && extraPacmans[roles.blocker - 1]) {
            var blocker = extraPacmans[roles.blocker - 1];
            
            // Find corridor between player and nearest exit
            var blockingPosition = findBlockingPosition(playerPos);
            
            if (blockingPosition) {
                if (typeof EnemyVariants !== 'undefined') {
                    EnemyVariants.moveTo(blocker, blockingPosition);
                }
            }
        }
    }

    /**
     * Scouting tactic: reveal player position to pack
     */
    function executeScoutingTactic(playerPos, pacmanPos, extraPacmans, roles) {
        if (!playerPos) return;
        
        if (roles.scout >= 0 && extraPacmans && extraPacmans[roles.scout - 1]) {
            var scout = extraPacmans[roles.scout - 1];
            
            // Scout maintains distance but keeps visual contact
            var scoutDistance = 12; // Stay far enough to not spook
            var direction = new THREE.Vector3()
                .subVectors(scout.position, playerPos)
                .normalize();
            
            var idealPosition = playerPos.clone().add(
                direction.multiplyScalar(scoutDistance)
            );
            
            if (typeof EnemyVariants !== 'undefined') {
                EnemyVariants.moveTo(scout, idealPosition);
            }
            
            // Share player position with pack (already done via ThreatAssessment)
        }
    }

    /**
     * Calculate player velocity from position history
     */
    function calculatePlayerVelocity() {
        var positions = state.learningData.playerPositions;
        
        if (positions.length < 2) {
            return new THREE.Vector3();
        }
        
        var recent = positions[0];
        var older = positions[Math.min(10, positions.length - 1)];
        
        var timeDiff = (recent.time - older.time) / 1000; // seconds
        if (timeDiff <= 0) return new THREE.Vector3();
        
        var displacement = new THREE.Vector3()
            .subVectors(recent.pos, older.pos)
            .divideScalar(timeDiff);
        
        return displacement;
    }

    /**
     * Find optimal blocking position
     */
    function findBlockingPosition(playerPos) {
        // Simple implementation: block the path to maze center
        var mazeCenter = new THREE.Vector3(
            (maze[0].length * 4) / 2,
            0,
            (maze.length * 4) / 2
        );
        
        // Position between player and center
        var direction = new THREE.Vector3()
            .subVectors(mazeCenter, playerPos)
            .normalize();
        
        return playerPos.clone().add(direction.multiplyScalar(6));
    }

    /**
     * Run AI learning algorithms
     */
    function runAILearning(playerPos, pacmanPos) {
        if (typeof AILearner === 'undefined') return;
        
        // Record player position for pattern learning
        AILearner.recordPlayerPosition(playerPos, Date.now());
        
        // Get prediction
        var prediction = AILearner.predictNextPosition(playerPos, 1/60);
        
        if (prediction) {
            // Store prediction accuracy for later analysis
            state.learningData.predictionAccuracy = AILearner.getConfidence();
            
            // Use prediction for ambush setup
            setupAmbush(prediction, playerPos);
        }
        
        // Adapt AI strategy based on learning
        adaptAIStrategy();
    }

    /**
     * Setup ambush at predicted player location
     */
    function setupAmbush(predictedPos, currentPos) {
        // Try to spawn variant at predicted location
        if (typeof EnemyVariants !== 'undefined' && Math.random() < 0.3) {
            var variantType = ['hunter', 'shadow'][Math.floor(Math.random() * 2)];
            
            // Only ambush if prediction confidence is high
            if (state.learningData.predictionAccuracy > 0.7) {
                console.log('[Phase2AI] Setting ambush at predicted location');
                // Spawn logic would go here
            }
        }
    }

    /**
     * Adapt AI strategy based on player behavior
     */
    function adaptAIStrategy() {
        var profile = state.playerProfile;
        
        // Counter speedrunners with blockers
        if (profile.playstyle === 'speedrunner') {
            // Increase blocker priority
            console.log('[Phase2AI] Countering speedrunner with blockers');
        }
        
        // Counter cautious players with hunters
        if (profile.playstyle === 'cautious') {
            // Deploy hunter variants to flush out
            console.log('[Phase2AI] Countering cautious player with hunters');
        }
        
        // Counter aggressive players with traps
        if (profile.playstyle === 'aggressive') {
            // Set more traps
            console.log('[Phase2AI] Countering aggressive player with traps');
        }
    }

    /**
     * Apply difficulty-based scaling to AI
     */
    function applyDifficultyScaling() {
        var scaling = config.difficultyScaling[state.currentDifficulty];
        
        if (!scaling) return;
        
        // Adjust AI parameters based on difficulty
        if (typeof MultiAgentPacman !== 'undefined') {
            var multConfig = MultiAgentPacman.config;
            
            // Faster reaction on higher difficulties
            multConfig.maxForce = scaling.coordination * 0.15;
            multConfig.chaseWeight = scaling.adaptation * 3.0;
        }
    }

    /**
     * Spawn enemy variant with proper integration
     */
    function spawnIntegratedEnemy(variantType, position) {
        if (typeof EnemyVariants === 'undefined') return null;
        
        var variant = EnemyVariants.createVariant(variantType, position);
        
        if (variant) {
            // Initialize emotional state
            state.agentEmotions[variant.id] = config.emotions.NEUTRAL;
            
            // Add to threat assessment
            if (typeof ThreatAssessment !== 'undefined') {
                ThreatAssessment.registerEnemy(variant);
            }
        }
        
        return variant;
    }

    /**
     * Get comprehensive AI state
     */
    function getAIState() {
        return {
            elapsedTime: state.elapsedTime,
            playerProfile: state.playerProfile,
            agentEmotions: state.agentEmotions,
            predictionAccuracy: state.learningData.predictionAccuracy,
            difficulty: state.currentDifficulty
        };
    }

    /**
     * Enable/disable AI systems
     */
    function setEnabled(value) {
        enabled = value;
        
        if (typeof MultiAgentPacman !== 'undefined') {
            MultiAgentPacman.setEnabled(value);
        }
    }

    /**
     * Report player death for learning
     */
    function reportPlayerDeath(killerAgent) {
        state.playerDeathCount++;
        state.timeSinceLastKill = 0;
        
        // Record what led to death
        state.learningData.chaseOutcomes.push({
            outcome: 'death',
            killer: killerAgent,
            time: Date.now(),
            playerSanity: typeof SanitySystem !== 'undefined' ? SanitySystem.getSanity() : 100
        });
        
        // Keep only last 100 outcomes
        if (state.learningData.chaseOutcomes.length > 100) {
            state.learningData.chaseOutcomes.shift();
        }
    }

    /**
     * Report ability usage for adaptation
     */
    function reportAbilityUsed(abilityType, effectiveness) {
        state.playerProfile.panicResponses.push({
            ability: abilityType,
            effectiveness: effectiveness,
            time: Date.now()
        });
        
        // Adapt to counter effective abilities
        if (effectiveness > 0.8) {
            console.log('[Phase2AI] Player effectively using', abilityType, '- adapting counter-strategy');
        }
    }

    // Public API
    return {
        init: init,
        update: update,
        spawnIntegratedEnemy: spawnIntegratedEnemy,
        getAIState: getAIState,
        setEnabled: setEnabled,
        reportPlayerDeath: reportPlayerDeath,
        reportAbilityUsed: reportAbilityUsed,
        config: config,
        state: state
    };
})();

// Export to global scope
if (typeof window !== 'undefined') {
    window.Phase2AIIntegration = Phase2AIIntegration;
}

console.log('[Phase2AI] Module loaded - Ready for integration');
