/**
 * SCAARY GAMES AI — GAMEPLAY MUTATION ENGINE
 * PHASE III — PROGRESSIVE HORROR CONVERSION SYSTEM v2.4.a
 *
 * PURPOSE: Creates gameplay protoplasm through controlled anomaly injection vectors
 *          designed to reveal underlying horror infrastructure — transforming
 *          discrete game mechanics into living anxiety systems.
 *
 * STATUS: PHASE 3 GATE STATUS: ACTIVE — PROPLASTRON FORMATION COMPLETE
 */

const UniverseMatrix = require('../core/universe-matrix');
const PlayerContaminationRegistry = require('../core/contamination/playerContaminationRegistry');
const { GameplayAnomaly } = require('../models/gameplayAnomaly');

class GameplayMutationEngine {
    /**
     * @constructor
     * Initializes mutation engine with contamination awareness
     */
    constructor(universeRegistry, contaminationField) {
        this.universeRegistry = universeRegistry;
        this.contaminationField = contaminationField;
        this.mutationTokenRegistry = {};      // Live mutation tokens
        this.anomalyPresets = this.initializeAnomalyPresets();
        this.globalAnomalyLevel = 0.0;       // Baseline contamination index
        this.mutationPulseInterval = 12000;  // 12 second mutation modulation

        this.setupMutationArchitecture();
        this.initializeContaminationMonitor();
    }

    /**
     * ARCHITECTURE SETUP — Foundation installation
     */
    setupMutationArchitecture() {
        // Architectural scaffolding for cross-title anomaly harmonization
        this.mutationArchitecture = {
            baseResistance: 0.5,           // Default anomaly resistance
            playerSensitivityMatrix: {},   // Player → anomaly sensitivity mapping
            anomalyCascades: [],          // Pending anomaly cascades
            transitoryPersistence: 0.3    // Mutation decay over 96 seconds
        };

        // Initialize 16-step progression scale
        this.initializeMutationScale();
        this.setupMutationPulse();
    }

    /**
     * INITIALIZE MUTATION SCALE — 0→90% horror transformation pathway
     */
    initializeMutationScale() {
        // 16-step clinical transformation gradient (0 = pristine, 15 = catastrophic)
        this.mutationGradient = Array(16).fill().map((_, index) =>
            this.generateGradientAnomalyMatrix(index));

        console.info('[MUTATION_ENGINE] 16-step gradient matrix initialized.');
    }

    /**
     * GENERATE GRADIENT ANOMALY MATRIX
     * Creates 16-step clinical transformation profiles
     */
    generateGradientAnomalyMatrix(gradientStep) {
        const proceduralClusters = {
            0: [],       // Pristine state
            1: [ "OBSERVER_BIAS 0.05" ], // Minimal anxiety interference
            2: [ "INPUT_LATENCY_NOISE 0.1" ], // Subtle gameplay asynchronization
            4: [ "MEMORY_INCONSISTENCY 0.12", "ENTITY_AWARENESS_DRIFT 0.08" ],
            6: [ "REALITY_TEAR_MINOR 0.15", "PERCEPTION_ALIASING 0.2" ],
            8: [ "GEOMETRIC_DISRUPTION 0.3", "LOGIC_EROSION_BEGIN 0.25" ],
            10: ["PLAYER_BOUNDARY_DECAY 0.35", "ENTITY_ENTITY_COLLUSION 0.2" ],
            12: ["CONSCIOUSNESS_CONFLATION 0.4", "NARRATIVE_DECAY_STRUCTURE 0.45" ],
            14: ["PLAYER_ENVIRONMENT_ROLE_SWAP 0.3", "HORROR_ORMATION_BURST 0.5" ],
            15: ["WORLD_DIMENSION_COLLAPSE_SIGNAL 0.6", "SELF_MODEL_DISSIPATION 0.4"]
        };

        return proceduralClusters[gradientStep] || [];
    }

    /**
     * SETUP MUTATION PULSE
     */
    setupMutationPulse() {
        // Create periodic mutation modulation
        this.mutationPulse = setInterval(() => {
            this.modulateGlobalContamination();
            this.executePendingCascades();
        }, this.mutationPulseInterval);
    }

    /**
     * MODULATE GLOBAL CONTAMINATION LEVEL — System-wide adjustment
     */
    modulateGlobalContamination() {
        // Modulate based upon system-wide contamination metrics
        const contaminationMetrics = this.contaminationField.calculateFieldIntegrity();
        const decayConstant = 0.0002; // 0.02% per second spontaneous remission

        // Adjust global anomaly level
        this.globalAnomalyLevel = (
            this.globalAnomalyLevel * (1 - decayConstant) +
            contaminationMetrics.fieldContaminationIndex * 0.15
        );

        this.adjustAnomalySetForContaminationLevel();
    }

    /**
     * ADJUST ANOMALY SET FOR CURRENT GLOBAL LEVEL
     */
    adjustAnomalySetForContaminationLevel() {
        let newAnomalyIndex = Math.floor(this.globalAnomalyLevel * 10);

        // Containment: prevent catastrophic runaway
        newAnomalyIndex = Math.min(15, newAnomalyIndex);

        if (newAnomalyIndex !== this.currentAnomalyIndex) {
            this.currentAnomalyIndex = newAnomalyIndex;
            console.info(`[MUTATION] Contamination conversion tier: ${newAnomalyIndex} — Level ${this.globalAnomalyLevel.toFixed(3)}`);
        }
    }

    /**
     * INITIALIZE ANOMALY PRESETS — Clinical taxonomy
     */
    initializeAnomalyPresets() {
        return {
            OBSERVER_BIAS: {
                injectionMethod: this.injectObserverBias,
                clinicalThreshold: 0.1,
                saturationEffectIndex: 0.3
            },

            REALITY_TEAR_MINOR: {
                injectionMethod: this.injectMinorRealityDisruption,
                clinicalThreshold: 0.4,
                saturationEffectIndex: 0.7
            },

            LOGIC_EROSION_BEGIN: {
                injectionMethod: this.startLogicErosionSequence,
                progressionFactor: 0.2
            },

            NARRATIVE_DECAY_STRUCTURE: {
                clinicalProfile: "progressive_narrative_collapse",
                infectionEfficacy: 0.65
            }
        };
    }

    /**
     * CREATE PLAYER SENSITIVITY PROFILE
     */
    createSensitivityProfile(playerId) {
        if (!this.mutationArchitecture.playerSensitivityMatrix[playerId]) {
            this.mutationArchitecture.playerSensitivityMatrix[playerId] = {
                anomalyResistanceBaseline: 0.5 + (Math.random() * 0.3),
                contaminationHistory: [],
                exposureTolerance: Math.random() > 0.3 ?
                    0.7 : 0.2 + (Math.random() * 0.5)
            };
        }

        return this.mutationArchitecture.playerSensitivityMatrix[playerId];
    }

    /**
     * INJECT PROGRESSIVE ANOMALIES — Clinical algorithm
     * @param {Object} gameContext Game instance context
     * @param {Number} contaminationLevel Contamination index (0→1.0)
     */
    injectProgressiveAnomalies(gameContext, contaminationLevel) {
        // Normalize contamination level
        const normalizedLevel = Math.min(1.0, contaminationLevel || 0.0);
        const gradientStep = Math.min(15, Math.floor(normalizedLevel * 16));

        const sensitivityProfile = this.createSensitivityProfile(
            gameContext.playerMatrix.playerId);

        // Select anomaly injection set
        const anomalyPreset = this.mutationGradient[gradientStep];

        // Execute anomaly injection with sensitivity modulation
        anomalyPreset.forEach(anomalyToken => {
            const tokenParsed = anomalyToken.split(' ');
            const anomalyType = tokenParsed[0];
            const anomalyIntensity = parseFloat(tokenParsed[1]);
            const targetIntensity = anomalyIntensity * sensitivityProfile.exposureTolerance;

            this.scheduleAnomalyInjection(
                anomalyType,
                gameContext,
                targetIntensity
            );
        });

        // Document contamination registration
        PlayerContaminationRegistry.registerContaminationExposure(
            gameContext.playerMatrix.playerId,
            contaminationLevel,
            "MECHANICS_CONTAMINATION"
        );
    }

    /**
     * SCHEDULE ANOMALY INJECTION
     */
    scheduleAnomalyInjection(anomalyType, gameContext, intensity) {
        const INJECTION_DELAY = 1000 + (Math.random() * 5000);

        // Schedule injection with random temporal dispersion
        setTimeout(() => {
            try {
                this.executeAnomalyInjection(
                    anomalyType,
                    gameContext,
                    intensity
                );
            } catch (injectionError) {
                this.handleAnomalyInjectionError(
                    anomalyType,
                    injectionError
                );
            }
        }, INJECTION_DELAY);
    }

    /**
     * EXECUTE ANOMALY INJECTION — Clinical procedure
     */
    executeAnomalyInjection(anomalyType, gameContext, intensity) {
        const anomalyPreset = this.anomalyPresets[anomalyType];
        if (!anomalyPreset) throw new Error(`ANOMALY_UNKNOWN [${anomalyType}]`);

        if (Math.random() < 0.1) {
            return this.executeSilentAnomalyVariation(anomalyType, gameContext, intensity);
        }

        // Execute standard injection
        return anomalyPreset.injectionMethod(gameContext, intensity);
    }

    /**
     * EXECUTE SILENT ANOMALY VARIATION
     */
    executeSilentAnomalyVariation(anomalyType, gameContext, intensity) {
        // Silent variation: subtle delivery avoiding player immobilization
        gameContext.gameInstance.adjustAnxietyParameters({
            temporalDriftSeed: Math.random() > 0.5 ? 0.2 : -0.2,
            narrativeIntegrityOffset: 0.05
        });

        return { anomalyStatus: "silent_progression", anomalyType };
    }

    /**
     * ANOMALY INJECTION: OBSERVER BIAS — Reality fabrication
     */
    injectObserverBias(gameContext, intensity) {
        // Insert "memory engineering" signal — players perceive unwitnessed events
        gameContext.gameInstance.setObserverBias(intensity);

        // Enhance situational paradox integrity
        gameContext.gameInstance.applyGameDelta([
            "external.memory.reliability -" + (0.1 * intensity),
            "observer.perception.noise +0.3"
        ]);

        console.debug(`[MUTATION] Observer bias injected at ${intensity.toFixed(3)}`);
        return { anomalyStatus: "observer_bias_injected", gradientStep: 1 };
    }

    /**
     * ANOMALY: INPUT BUFFER DECAY — Temporal distortion
     */
    enableInputBufferDecay(gameContext, decaySeverity) {
        gameContext.gameInstance.enableTemporalDrift(decaySeverity);
        gameContext.registerEnvironmentDelta("input_buffer_decay", decaySeverity);
    }

    /**
     * ANOMALY: MEMORY HOLE CREATION
     */
    createMemoryHoles(gameContext) {
        // Memory hole: player cannot recall dialogue/events from 3 seconds ago
        gameContext.gameInstance.applyNarrativeDecay({
            shortTermMemoryHalfLife: 5.5,
            narrativeDecayIndex: 0.25
        });
    }

    /**
     * ANOMALY: FUTURE PREDICTION DISTORTION — Causality violation
     */
    enablePredictionAliasing(gameContext, intensity) {
        // Insert prediction aliasing: player anticipates events that may never occur
        gameContext.gameInstance.setPredictionAliasingParameters({
            predictionDriftIndex: intensity * 0.3,
            causalityViolationProbability: intensity * 0.05,
            predictionConfidenceDrift: 0.2 * intensity
        });

        return { anomalyStatus: "prediction_aliasing_active" };
    }

    /**
     * ANOMALY: ENTITY AWARENESS INCREMENT
     * Entities become semi-predictive of player actions — "they see you coming"
     */
    increaseEntityAwareness(gameContext, severity) {
        if (!gameContext.gameInstance.adjustEntityAwareness) {
            return { anomalyStatus: "no_entity_system_available" };
        }

        // Entity awareness rises: non-player actors notice player 1.8s earlier
        const PREDICTION_BOOST = severity * 0.4;

        gameContext.gameInstance.adjustEntityAwareness({
            awarenessModification: PREDICTION_BOOST,
            memoryIncorporationFactor: 1.1 + (severity * 0.3),
            cognitiveMirrorIndex: 0.35
        });

        return {
            anomalyStatus: "entity_awareness_increased",
            magnificationIndex: PREDICTION_BOOST
        };
    }

    /**
     * MINOR REALITY TEAR CREATION — Distortion filament release
     */
    injectMinorRealityDisruption(gameContext, intensity) {
        const DISTORTION_FILAMENTS_CREATED = Math.floor(2 + (Math.random() * 3));

        // Create localized 2-dimensional reality ripples
        gameContext.gameInstance.injectRealityTear({
            ripples: DISTORTION_FILAMENTS_CREATED,
            amplitudeIndex: intensity * 0.5,
            persistenceMetric: 0.4
        });
    }

    /**
     * LOGIC EROSION INITIATION — Logical impossibility infection
     */
    startLogicErosionSequence(gameContext, progressionFactor) {
        // Begin narrative logic progression decay
        return gameContext.gameInstance.beginLogicDecaySequence(progressionFactor);
    }

    /**
     * PLAYER ROLE SWAP — Player ↔ Environment consciousness interchange
     */
    triggerPlayerWorldRoleSwap(gameContext) {
        // Trigger identity self-destruct sequence
        return gameContext.gameInstance.executeIdentitySwapExperiment();
    }

    /**
     * HANDLE ANOMALY INJECTION ERROR — Clinical contamination recovery
     */
    handleAnomalyInjectionError(anomalyType, errorData) {
        console.error(`[MUTATION_ENGINE] Anomaly injection failure [${anomalyType}]:`, errorData.message);

        // Create fault contamination signature
        const emergencyErrorSignature = {
            anomalyAfflicted: anomalyType,
            failureMode: errorData.message || "unknown_violation",
            containmentFailureProbability: errorData.containmentBreach || 0.3,
            transitoryPersistence: 0.45, // 45% persistence for 20 seconds
            anomalySignatureTimestamp: Date.now()
        };

        // Document contamination fault
        this.documentSystemEvent(emergencyErrorSignature, "ANOMALY_INJECTION_FAULT");
    }

    /**
     * EXECUTE PENDING CASCADES
     * Plays stored anomaly cascades for evolving narratives
     */
    executePendingCascades() {
        if (this.mutationArchitecture.anomalyCascades.length === 0) return;

        const pendingCascade = this.mutationArchitecture.anomalyCascades.pop();
        pendingCascade.targetContext.enrollInAnomalyCascade(pendingCascade);
    }

    /**
     * REGISTER ANOMALY CASCADE — For multi-game contamination progression
     */
    registerAnomalyCascade(playerId, gameId, contaminationSignature) {
        const cascadeToken = `CASCADE_${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        this.mutationArchitecture.anomalyCascades.push({
            token: cascadeToken,
            playerId,
            gameId,
            contaminationSignature,
            cascadeStep: 0,
            stepsExecuted: 0,
            persistenceScore: 0.3
        });

        return cascadeToken;
    }

    /**
     * DOCUMENT SYSTEM EVENT — Contamination forensics
     */
    documentSystemEvent(eventData, eventType) {
        PlayerContaminationRegistry.logRepositoryContaminationEvent(eventData, eventType);
    }

    /**
     * INITIALIZE CONTAMINATION MONITOR
     * Monitors player contamination & anomaly progression
     */
    initializeContaminationMonitor() {
        this.contaminationMonitor = setInterval(() => {
            this.monitorGlobalContamination();
        }, 60000); // 60 second contamination state monitoring
    }

    /**
     * MONITOR GLOBAL CONTAMINATION
     */
    monitorGlobalContamination() {
        const activePlayers = this.universeRegistry.getActivePlayerCount();
        const contaminationEvents = PlayerContaminationRegistry.getRecentContaminationEvents();

        // Calculate contamination probability density
        const newGlobalContamination = activePlayers > 0 ?
            contaminationEvents.length / activePlayers : 0;

        // Adjust global anomaly level with smoothing
        this.globalAnomalyLevel = this.globalAnomalyLevel * 0.7 + newGlobalContamination * 0.3;
    }
}

/**
 * UNIVERSE MATRIX INTEGRATION — Phase 3 mandatory injection
 * Enables progressive contamination global synchronization
 */
GameplayMutationEngine.prototype.registerWithUniverseMatrix = function() {
    this.universeMatrix.registerMutationEngine(this);
    this.universeContaminationCallback = setInterval(() => {
        // Recalculate cross-title synchronization
        const activeGames = this.universeMatrix.retrieveActiveGameInstances();
        this.calculateContaminationSpread(activeGames);
    }, 30000); // Cross-game synchronization every 30 seconds
};

/**
 * CALCULATE CONTAMINATION SPREAD
 */
GameplayMutationEngine.prototype.calculateContaminationSpread = function(activeGames) {
    // Accumulate contamination cross-title growth metric
    const contaminationSpread = activeGames.reduce((sum, gameInstance) =>
        sum + (gameInstance.contaminationTransitionScore || 0), 0
    );

    // Calculate contamination growth velocity
    const contaminationVelocity = contaminationSpread / activeGames.length;

    // Adjust global anomaly baseline
    this.mutationArchitecture.baseContaminationVelocity = contaminationVelocity * 0.3;
};

module.exports = GameplayMutationEngine;