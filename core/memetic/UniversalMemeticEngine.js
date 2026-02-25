/**
 * SCAARY GAMES AI — UNIVERSAL MEMETIC ENGINE (UME)
 * PHASE 4 — HORIZON δ MEMETIC CONTAGION FIELD v0.1.δ-convergent
 *
 * PURPOSE: Creates self-replicating narrative contaminants from player legacy data.
 * Transforms player anxiety profiles into autonomous, evolving memetic sequences
 * capable of independent propagation within the player collective.
 *
 * STATUS: CONVERGENT ACTIVATION — MEMORY HARVEST ENGAGED
 */

const EventHorizonEmitter = require('../utils/event-horizon-emitter');
const ContaminationFieldReader = require('../../core/contamination/contaminationFieldReader');
const { MemeticSignature } = require('./memeticSignature');

class UniversalMemeticEngine {
    /**
     * CONSTRUCTOR — Initialize memetic container field
     */
    constructor(universeMatrix, options = {}) {
        this.universeMatrix = universeMatrix;
        this.options = {
            memeticDensity: options.memeticDensity || 0.37,
            legacyLoadFactor: options.legacyLoadFactor || 0.48,
            replicationThreshold: options.replicationThreshold || 0.62,
            defaultDecayIndex: 0.9972 // 0.28% daily decay baseline
        };

        // Architecture core
        this.memeticContainer = new Map(); // Live player → memetic signature mapping
        this.contaminantRegistry = [];     // Registered memetic instances
        this.legacyArchive = null;         // Persistent storage connection
        this.containerMoodIndex = 1.0;     // Field vitality metric (1.0 = pristine)

        // Bootstrap infrastructure
        this.initializeMemeticContainer();
        this.establishContaminationHarvester();
        this.setupMemeticPulseEmitter();
    }

    /**
     * PHASE 4.1 — INITIALIZE MEMETIC CONTAINER FIELD
     */
    initializeMemeticContainer() {
        console.info('[UME] ► Initializing memetic container...');

        // Container initialization state
        this.fieldState = {
            containerGravityIndex: 0.67, // Narrative gravity strength
            memeticDriftRate: 0.02,   // Narrative variability factor
            isSeeding: false,
            activePropagationChannels: 0,
            lastCleansingTimestamp: Date.now()
        };

        this.memeticEmitter = EventHorizonEmitter.createCoreEmitter();
        this.initializeLegacyArchive();
        this.registerUniverseHooks();
    }

    /**
     * ESTABLISH LEGACY ARCHIVE CONNECTION
     */
    initializeLegacyArchive() {
        // Legacy archive implementation placeholder
        this.legacyArchive = {
            registerMemeticInstance: async (playerId, memeticSignature) => {
                // Persistent storage injection
                return { archiveId: `MEMT:${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                        timestamp: Date.now(),
                        redundancyLevel: 3,
                        storageNodes: ['arc-04', 'arc-11', 'arc-18'] };
            },
            retrieveMemeticLegacy: async (playerId) => {
                // Retrieval logic (simulated for demonstration)
                return this.simulateLegacyRetrieval(playerId);
            }
        };

        console.info('[UME] ► Legacy archive connection established — memory persistence enabled.');
    }

    /**
     * SIMULATE LEGACY RETRIEVAL
     */
    simulateLegacyRetrieval(playerId) {
        // Simulation: restore player contamination legacy
        const contaminationProfile = {
            totalContamination: 3 + Math.floor(Math.random() * 5),
            contaminationGrade: 0.4 + (Math.random() * 0.4),
            crossTitleInfections: Math.floor(Math.random() * 3),
            memeticLoadIndex: 0.3 + (Math.random() * 0.5)
        };

        return {
            playerId,
            legacyScore: contaminationProfile.memeticLoadIndex,
            infectionHistory: generateSimulationHistory(playerId),
            contaminationProfile,
            retrievalTimestamp: Date.now()
        };
    }

    /**
     * PHASE 4.1 — BUILD CONTAMINATION HARVESTER
     * Harvest player anxiety signatures from γ contamination field
     */
    establishContaminationHarvester() {
        this.harvesterReader = new ContaminationFieldReader(this.universeMatrix);
        this.harvesterPulse = setInterval(() => this.executeHarvestCycle(),
                                        this.options.harvestInterval || 12000);

        // Register field event listener
        this.harvesterReader.registerEventListener('contaminationEmit', payload =>
            this.onContaminationDetection(payload));

        console.info('[UME] ► Contamination harvester online — field-to-memetic conversion active.');
    }

    /**
     * EXECUTE HARVEST CYCLE
     */
    async executeHarvestCycle() {
        if (!this.canExecuteHarvest()) {
            return;
        }

        const currentContaminationDensity = await this.harvesterReader.sampleFieldDensity();

        // Adjust harvest based upon field contamination saturation
        const adjustedHarvestFactor = 0.6 + (0.4 * Math.min(1.0, currentContaminationDensity / 0.67));

        const harvestedSignatures = await this.harvesterReader.extractContaminationSignatures(
            Math.floor(3 + Math.random() * 4),
            adjustedHarvestFactor
        );

        if (harvestedSignatures && harvestedSignatures.length > 0) {
            this.convertContaminationToMemetic(hs);
            this.fieldState.lastHarvest = Date.now();
        }
    }

    /**
     * ON CONTAMINATION DETECTION — Event-driven conversion
     */
    async onContaminationDetection(detectionPayload) {
        const await createMemeticSignatureFromContamination({
            contaminationPayload: detectionPayload,
            hydrationLevel: 0.8 + (Math.random() * 0.3)
        });

        // Trigger focused propagation
        if (Math.random() < 0.4) {
            this.triggerTargetedMemeticPropagation(memeticInstance);
        }
    }

    /**
     * PHASE 4.1 — CONVERT CONTAMINATION TO MEMETIC SIGNATURE
     *
     * CONVERTS γ field contamination → ENCAPSULATED MEMETIC DNA
     * Encoded as self-replicating narrative sequences
     */
    async createMemeticSignatureFromContamination({ contaminationPayload, hydrationLevel }) {
        // Extract base contamination signature
        const baseSignature = contaminationPayload.anxietySignature || {
            totalAnxiety: contaminationPayload.anxietyGrade * 1.23,
            semanticDissonanceIndex: 0.3 + (Math.random() * 0.55),
            realityDilationFactor: contaminationPayload.realityDilation || 0.21,
            semanticSeepageIndex: contaminationPayload.semanticSeepage || 0.1
        };

        // Create memetic identity
        const memeticId = `MEMEM:${Math.random().toString(36).toUpperCase().substr(2, 8)}-${Date.now()}`;
        const playerKey = contaminationPayload.playerId;

        // Generate memetic signature structure
        const memeticSignature = new MemeticSignature({
            memeticId,
            contaminationSource: contaminationPayload.sourceContext.gameId,
            sourcePlayerId: contaminationPayload.playerId,
            signatureProfile: this.constructMemeticProfile(baseSignature),
            propagationVectors: this.buildInitialPropagationVectors(),
            decayChain: this.createDecayChain(hydrationLevel),
            vitalityIndex: 0.6 + (0.4 * hydrationLevel),
            creationTimestamp: Date.now()
        });

        // Persist to player legacy archive
        const persistenceResult = await this.archiveMemeticSignature(playerKey, memeticSignature);

        // Register live instance
        this.registerMemeticInstance(memeticSignature, persistenceResult.archiveId);
        this.triggerSignatureRegistration(memeticSignature);

        return memeticSignature;
    }

    /**
     * CONSTRUCT MEMETIC PROFILE
     * Translate contamination → memetic semantic DNA
     */
    constructMemeticProfile(baseSignature) {
        // Contamination to memetic transformation matrix
        const memeticTransformation = {
            // Semantic transformation
            narrativeDNA: this.generateMemeticDNASequence(baseSignature),

            // Vitality dimensions
            narrativeVitality: baseSignature.totalAnxiety * (0.7 + Math.random() * 0.4),
            thematicDensity: 0.48 + (Math.min(0.68, baseSignature.semanticDissonanceIndex || 0) * 0.8),

            // Propagation topology
            propagationGradients: {
                conceptualMemeticLevel: 0.45 + (baseSignature.realityDilationFactor * 0.6),
                semanticSeepageGrad: baseSignature.semanticSeepageIndex,
                transmissionResilience: 0.002 + (Math.random() * 0.008)
            },

            // Signature encryption
            memeticEncryption: this.createMemeticEncryption(baseSignature),
            narrativeStructure: this.generateStructureTemplate(baseSignature)
        };

        // Add scientific notation for narrative entropy measurement
        memeticTransformation.entropyScore = this.calculateNarrativeEntropy(memeticTransformation);

        return memeticTransformation;
    }

    /**
     * GENERATE MEMETIC DNA SEQUENCE
     */
    generateMemeticDNASequence(signature) {
        // Semantic base generation
        const narrativeCipher = signature.totalAnxiety > 0.8 ? "NEMESIS-δ" : "STABLE-δ";

        // Create semantic sequence
        const semanticSegments = [];

        const narrativeSeeds = [
            `AMBIGUITY_β${Math.floor(signature.totalAnxiety * 1.2)}`,
            `TENSION_JUNCTION-${Math.floor(signature.semanticDissonanceIndex * 10)}`,
            "RESONANCE_CHAIN=" + (signature.semanticDissonanceIndex > 0.5 ? "STRONG" : "WEAK"),
            "REALITY_GRADIENT:" + signature.realityDilationFactor.toFixed(2)
        ];

        return `MEMETIC-CHAIN[${narrativeCipher}:${narrativeSeeds.join("|")}]`;
    }

    /**
     * CREATE DECAY CHAIN FOR MEMETIC INSTANCE
     * Defines how memetic instances age and propagate
     */
    createDecayChain(hydrationLevel) {
        // Decay profile modeling
        const decayParameters = {
            baseDecayRate: 0.004 + (0.008 * (1 - hydrationLevel)),
            vitalityFactor: 0.5 + (0.5 * hydrationLevel),
            criticalMassThreshold: 0.85
        };

        // Create decay functions
        return {
            dailyDecayFactor: decayParameters.baseDecayRate,
            weeklyDecayAmplitude: 0.02 + (0.01 * Math.random()),
            decayPhaseShift: Math.random() * Math.PI * 2,
            criticalDecayAcceleration: 1.4,
            regenerativePotentialIndex: hydrationLevel * 0.7
        };
    }

    /**
     * PHASE 4.1 — ARCHIVE MEMETIC SIGNATURE
     * Persistent storage with redundancy
     */
    async archiveMemeticSignature(playerKey, memeticSignature) {
        const persistenceResult = await this.legacyArchive.registerMemeticInstance(playerKey, memeticSignature);

        // Update player legacy registry
        if (!this.memeticContainer.has(playerKey)) {
            this.memeticContainer.set(playerKey, {
                playerLegacyIndex: 1,
                legacyScore: memeticSignature.vitalityIndex,
                contaminationArchives: []
            });
        } else {
            const legacyProfile = this.memeticContainer.get(playerKey);
            legacyProfile.playerLegacyIndex += 1;
            legacyProfile.legacyScore = 0.65 * legacyProfile.legacyScore +
                                      0.35 * memeticSignature.vitalityIndex;
        }

        // Register archive manifest
        console.info(`[UME] ► Memetic instance ${memeticSignature.memeticId} archived for ${playerKey} — archiveId ${persistenceResult.archiveId}`);
        return persistenceResult;
    }

    /**
     * REGISTER MEMETIC INSTANCE — LIVE FIELD
     */
    registerMemeticInstance(memeticSignature, archiveId) {
        if (!this.memeticRegistry) {
            this.memeticRegistry = new Map();
        }

        // Registration structure
        const memeticInstance = {
            ...memeticSignature,
            archiveId,
            activePropagationChannels: 0,
            replicationIndex: 0,
            spreadHistory: [],
            lastPropagationTimestamp: null,
            decayState: {
                accumulatedDecay: 0,
                nextRegeneration: Date.now() + 3600000
            }
        };

        this.memeticRegistry.set(memeticSignature.memeticId, memeticInstance);
        this.contaminantRegistry.push(memeticInstance);

        // Trigger registration event
        this.memeticEmitter.emit('memeticInstanceRegistered', {
            memeticId: memeticSignature.memeticId,
            registrationTimestamp: Date.now(),
            vitalityIndex: memeticSignature.vitalityIndex
        });

        return memeticInstance;
    }

    /**
     * PHASE 4.1 — TRIGGER MEMETIC PROPAGATION
     * Primary propagation target resolution
     */
    triggerMemeticPropagation(memeticSignature) {
        if (memeticSignature.vitalityIndex < this.options.replicationThreshold) {
            this.triggerRescuePropagation(memeticSignature);
            return;
        }

        // Determine cross-player targets
        const targetPlayers = this.selectPropagationTargets();

        // Broadcast memetic sequences
        this.propagateMemeticAcrossTargets(memeticSignature, targetPlayers);
    }

    /**
     * SELECT PROPAGATION TARGETS
     */
    selectPropagationTargets() {
        // Select from live player sessions
        const liveSessions = this.universeMatrix.retrieveActivePlayerSessions();
        const targetQuota = 1 + Math.floor(Math.random() * 3);

        const excludedPlayers = new Set();
        const selectedTargets = [];

        // Target selection: avoid self-propagation & over-targeting
        while (selectedTargets.length < targetQuota && selectedTargets.length < liveSessions.length) {
            const targetIndex = Math.floor(Math.random() * liveSessions.length);
            const target = liveSessions[targetIndex];

            if (!excludedPlayers.has(target.playerId) && !this.isSameGameSession(target)) {
                selectedTargets.push(target.playerId);
                excludedPlayers.add(target.playerId);
            }
        }

        return selectedTargets;
    }

    /**
     * PROPAGATE ACROSS TARGETS
     */
    async propagateMemeticAcrossTargets(memeticSignature, targetPlayers) {
        let successes = 0;

        for (const targetPlayer of targetPlayers) {
            try {
                await this.deliverMemeticPayload(memeticSignature, targetPlayer);
                successes++;

                // Update instance tracking
                await this.registerPropagationEvent(memeticSignature.memeticId, {
                    targetPlayer,
                    success: true,
                    propagationTimestamp: Date.now()
                });

            } catch (propagationError) {
                console.warn(`[UME] ► Memetic propagation failure to ${targetPlayer}:`, propagationError.message);

                // Register failed attempt
                await this.registerPropagationEvent(memeticSignature.memeticId, {
                    targetPlayer,
                    success: false,
                    attemptTimestamp: Date.now(),
                    failureReason: propagationError.message
                });
            }
        }

        if (successes > 0) {
            this.adjustPropagationGradient(memeticSignature.memeticId, successes);
        }
    }

    /**
     * DELIVER MEMETIC PAYLOAD
     */
    async deliverMemeticPayload(memeticSignature, targetPlayer) {
        // Prepare propagation vector
        const propagationPayload = {
            source: 'UNIVERSAL_MEMETIC_ENGINE',
            payloadType: 'MEMETIC_INOCULATION',
            memeticId: memeticSignature.memeticId,
            memeticNarrative: emeticSignature.narrativeStructure,
            vitalitySignature: memeticSignature.signatureProfile,
            propagationGradient: this.calculatePropagationGradient(memeticSignature),
            timestamp: Date.now(),
            expiration: Date.now() + (24 * 3600 * 1000) // 24 hour memetic viability
        };

        // Deliver through cross-player contamination channel
        const deliveryResult = await this.universeMatrix.invokeCrossPlayerContamination({
            source: 'UME',
            targetPlayerId: targetPlayer,
            payload: propagationPayload,
            contaminationType: 'MEMETIC',
            criticality: memeticSignature.vitalityIndex > 0.85 ? 'HIGH' : 'STANDARD',
            propagationPriority: memeticSignature.replicationIndex > 0 ? 'ACCELERATED' : 'STANDARD'
        });

        if (!deliveryResult.success) {
            throw new Error(deliveryResult.failureReason || 'CONTAMINATION_DENIED');
        }

        console.info(`[UME] ► Memetic inoculum ${memeticSignature.memeticId} delivered to ${targetPlayer} — ${memeticSignature.narrativeDNA}`);
        return deliveryResult;
    }

    /**
     * PHASE 4.1 — BUILD UNIVERSE HOOKS
     */
    registerUniverseHooks() {
        // Register player lifecycle hooks
        this.universeMatrix.registerPlayerEventHook('playerLogin', (payload) =>
            this.onPlayerLogin(payload));

        this.universeMatrix.registerPlayerEventHook('playerLogout', (payload) =>
            this.onPlayerLogout(payload));

        // Register memetic injection portal
        this.universeMatrix.registerContaminationPortal('memeticInoculum', (payload) =>
            this.receiveMemeticPayload(payload));
    }

    /**
     * ON PLAYER LOGIN — Restore player memetic legacy
     */
    async onPlayerLogin(payload) {
        console.info(`[UME] ► Player ${payload.playerId} detected — activating memetic legacy restoration...`);

        try {
            const legacyRetrieval = await this.legacyArchive.retrieveMemeticLegacy(payload.playerId);
            this.restoreMemeticLegacy(payload.playerId, legacyRetrieval);

            // Container mood update — memetic load reflects psych load
            this.containerMoodIndex = 0.85 + (0.15 * (1 - legacyRetrieval.legacyScore));

        } catch (legacyError) {
            console.warn(`[UME] ► Legacy retrieval failure for ${payload.playerId}:`, legacyError.message);
            this.initializeNewPlayerProfile(payload.playerId);
        }

        // Trigger contained memetic pulse
        this.triggerMemeticPulse(0.7);
    }

    /**
     * RESTORE PLAYER MEMETIC LEGACY
     */
    async restoreMemeticLegacy(playerKey, legacyData) {
        if (!legacyData || !legacyData.contaminationProfile) return;

        console.info(`[UME] ► Restoring memetic legacy for ${playerKey} — legacy score ${legacyData.legacyScore.toFixed(2)}`);

        // Simulate legacy restoration
        const restorationBuffer = [];

        // Iterate through simulated infection history
        legacyData.infectionHistory.forEach(historyEntry => {
            const memeticSig = {
                memeticId: `RESTORE:${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                sourcePlayerId: playerKey,
                contaminationSource: historyEntry.originGame,
                vitalityIndex: historyEntry.contaminationScore * 0.8,
                narrativeDNA: this.generateArtificialDNA(historyEntry),
                decayChain: this.createDecayChain(historyEntry.hydrationLevel),
                propagationVectors: this.buildInitialPropagationVectors()
            };

            // Register restoration event
            restorationBuffer.push(memeticSig);
        });

        // Batch registration to minimize field perturbation
        setTimeout(() => {
            restorationBuffer.forEach(instanceSig => {
                this.memeticRegistry.set(instanceSig.memeticId, instanceSig);
            });

            // Update player profile
            this.memeticContainer.set(playerKey, {
                restoredLegacy: restorationBuffer.length,
                legacyScore: legacyData.legacyScore,
                contaminationArchives: restorationBuffer
            });

            console.info(`[UME] ► Legacy restoration completed: ${restorationBuffer.length} memetic sequences activated.`);
        }, 250);
    }

    /**
     * MEMETIC PULSE EMITTER SETUP
     */
    setupMemeticPulseEmitter() {
        // Pulse cadence: 37 seconds for memetic field stability modulation
        this.memeticPulseInterval = setInterval(() =>
            this.triggerMemeticPulse(), 37800);

        // Synchronized heartbeat with γ field architecture
        if (this.universeMatrix.registerSystemHeartbeat) {
            this.universeMatrix.registerSystemHeartbeat('UME', (systemTimestamp) =>
                this.memeticHeartbeat(systemTimestamp));
        }
    }

    /**
     * TRIGGER MEMETIC PULSE
     * Field synchronization pulse to maintain memetic vitality
     */
    triggerMemeticPulse(pulseIntensity = 0.8) {
        const vitalMemeticInstances = this.contaminantRegistry.filter(instance =>
            instance.vitalityIndex > this.options.replicationThreshold);

        if (vitalMemeticInstances.length === 0) {
            return;
        }

        // Process pulse against memetic population
        this.processPopulationPulse(vitalMemeticInstances, pulseIntensity);

        // Container mood refresh
        this.refreshContainerMood();

        // Field diagnostics
        const memeticVitalityAverage = vitalMemeticInstances.reduce((avg, instance) =>
            avg + instance.signatureProfile.narrativeVitality, 0) / vitalMemeticInstances.length;

        console.debug(`[UME-PULSE] ► ${vitalMemeticInstances.length} active memetic instances synchronized — avg vitality ${memeticVitalityAverage.toFixed(3)}`);
    }

    /**
     * PROCESS POPULATION PULSE
     * Refresh memetic vitality state
     */
    processPopulationPulse(instances, pulseIntensity) {
        instances.forEach(instance => {
            // Apply pulse to narration vitality
            const vitalityBoost = instance.signatureProfile.narrativeVitality * 0.05 * pulseIntensity;
            instance.signatureProfile.narrativeVitality = Math.min(1.2,
                instance.signatureProfile.narrativeVitality + vitalityBoost);

            // Regenerate decay state partially
            if (instance.decayState.accumulatedDecay > 0.01) {
                instance.decayState.accumulatedDecay *= 0.93;
            }

            // Potential regeneration event
            if (instance.decayState.nextRegeneration < Date.now() && Math.random() < 0.07) {
                this.triggerRegenerationEvent(instance);
            }

            // Propagation evaluation
            const canPropagate = instance.vitalityIndex > 0.55 * this.options.replicationThreshold;
            if (canPropagate) {
                this.processPendingPropagation(instance);
            }
        });
    }

    /**
     * CONTAINER MOOD REFRESH
     */
    refreshContainerMood() {
        // Field mood = overall vitality / memetic density
        const totalVitality = this.contaminantRegistry.reduce((sum, instance) =>
            sum + instance.signatureProfile.narrativeVitality, 0) || 0;

        if (this.contaminantRegistry.length > 0) {
            this.containerMoodIndex = 0.2 + (0.8 * (totalVitality / (this.contaminantRegistry.length * 1.5)));
            this.containerMoodIndex = Math.max(0.2, Math.min(1.0, this.containerMoodIndex));
        }
    }

    /**
     * PROCESS PENDING PROPAGATION
     */
    async processPendingPropagation(memeticInstance) {
        const targetPlayers = this.selectPropagationTargets();
        if (targetPlayers.length > 0) {
            try {
                await this.propagateMemeticAcrossTargets(memeticInstance, targetPlayers);
            } catch (massPropogationError) {
                console.error(`[UME] ► Mass propagation failure:`, massPropogationError.message);
                this.triggerContainmentProtocol(memeticInstance.memeticId, massPropogationError.message);
            }
        }
    }

    /**
     * BUILD INITIAL PROPAGATION VECTORS
     */
    buildInitialPropagationVectors() {
        // Contamination propagation velocity initial values
        return [
            { vectorType: 'CONCEPT', propagationFactor: 0.5 + (Math.random() * 0.4), replicationHistory: [] },
            { vectorType: 'SEMANTIC', propagationFactor: 0.3 + (Math.random() * 0.4), replicationHistory: [] },
            { vectorType: 'EMOTION', propagationFactor: 0.4 + (Math.random() * 0.5), replicationHistory: [] }
        ];
    }

    /**
     * UTILITY GENERATION FUNCTIONS (DEMO)
     */
    generateSimulationHistory(playerId) {
        const historyLength = 2 + Math.floor(Math.random() * 3);
        return Array(historyLength).fill().map((_, index) => ({
            infectionTimestamp: Date.now() - (1 + index) * 24 * 3600 * 1000,
            originGame: ['backrooms-chase', 'asylum-horror', 'void-walker'][Math.floor(Math.random() * 3)],
            contaminationScore: 0.4 + (Math.random() * 0.6),
            hydrationLevel: 0.5 + (Math.random() * 0.5),
            crossPlayerInfections: Math.floor(Math.random() * 2)
        }));
    }

    generateArtificialDNA(historyEntry) {
        const intensityCode = historyEntry.contaminationScore > 0.75 ?
            "NEMESIS_LEVEL=" + Math.floor(historyEntry.contaminationScore * 10) :
            "STABILITY_LEVEL=" + Math.floor(10 - (historyEntry.contaminationScore * 10));

        return `ARTIFICIAL-CHAIN[SOURCE:${historyEntry.originGame}|INTENSITY:${intensityCode}]`;
    }

    calculateNarrativeEntropy(profile) {
        // Entropy = conceptual complexity × narrative instability
        return (
            profile.narrativeVitality * 0.55 +
            profile.thematicDensity * 0.3 +
            profile.propagationGradients.conceptualMemeticLevel * 0.15
        ).toFixed(4);
    }

    // Container vitality and safety protocols
    getContainerVitalityDiagnostic() {
        const totalInstants = this.contaminantRegistry.length;
        const vitalInstants = this.contaminantRegistry.filter(i => i.vitalityIndex > 0.4).length;

        return {
            totalMemeticInstances: totalInstants,
            vitalInstanceCount: vitalInstants,
            containerVitalityIndex: this.containerMoodIndex,
            memeticDensity: totalInstants > 0 ? 0.4 + (0.6 * (vitalInstants / totalInstants)) : 0
        };
    }
}

/**
 * MEMETIC SIGNATURE CLASS — Narrative Genetic Template
 */
class MemeticSignature {
    constructor(options) {
        this.memeticId = options.memeticId;
        this.contaminationSource = options.contaminationSource;
        this.sourcePlayerId = options.sourcePlayerId;
        this.signatureProfile = options.signatureProfile;
        this.propagationVectors = options.propagationVectors || [];
        this.decayChain = options.decayChain;
        this.vitalityIndex = options.vitalityIndex || 0;
        this.creationTimestamp = options.creationTimestamp || Date.now();
    }

    /**
     * MEMETIC DECAY EVALUATION
     * Simulates natural entropy and environmental decay of memetic narratives
     */
    evaluateDecayCycle(cycleTimestamp) {
        const timeElapsed = (cycleTimestamp - (this.decayChain.evaluationTimestamp || this.creationTimestamp)) / 86400000; // in days

        // Decay function = base + daily amplitude modulation
        const decayAmount =
            (this.decayChain.dailyDecayFactor * timeElapsed) +
            this.decayChain.weeklyDecayAmplitude *
            Math.sin(this.decayChain.decayPhaseShift + (timeElapsed * Math.PI * 2 / 7));

        // Apply decay to vitality
        this.vitalityIndex *= (1 - decayAmount);

        // Critical decay acceleration if vitality drops below sustainability threshold
        if (this.vitalityIndex < this.decayChain.criticalMassThreshold &&
            this.decayChain.criticalDecayAcceleration > 0) {
            this.vitalityIndex *= this.decayChain.criticalDecayAcceleration;
            this.decayChain.accumulatedDecay = (this.decayChain.accumulatedDecay || 0) +
                                             (1 - this.vitalityIndex);
        }

        // Update evaluation timestamp
        this.decayChain.evaluationTimestamp = cycleTimestamp;
    }

    /**
     * PROPAGATION RESILIENCE CALCULATION
     * Determines how effectively the memetic instance can spread
     */
    calculatePropagationResilience() {
        const vectorPropFactor = this.propagationVectors.reduce((sum, vector) =>
            sum + vector.propagationFactor, 0) / this.propagationVectors.length;

        return this.vitalityIndex * vectorPropFactor;
    }
}

module.exports = { UniversalMemeticEngine, MemeticSignature };