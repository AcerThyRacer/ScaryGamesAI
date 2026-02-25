/**
 * SCAARY GAMES AI — ENTITY MEMORY FABRIC
 * PHASE 4: EPISODIC MEMORY CONTAGION ENGINE
 * HORIZON δ — SELF-AUTHENTICATING MEMORY FIELDS
 *
 * PURPOSE:
 * Creates a distributed, evolving knowledge base that enables in-game entities
 * to develop persistent episodic memories that evolve over time and spread
 * through the game world via social and environmental contamination vectors.
 *
 * ARCHITECTURE FEATURES:
 * - Entity Capillary Memory Systems: Individual entities retain detailed history
 * - Procedural Memory Contagion: Memories propagate across entities through interaction
 * - Narrative Decay & Mutation: Memories evolve through semantic drift and contamination
 * - Cross-Game Memory Sync: Player memories coalesce into anthological form
 * - Evolutionary Memory Topology: Knowledge structures self-organize into rhizomatic forms
 *
 * STATUS: SPECIFICATION CONVERGENCE — HORIZON δ ACTIVE
 */
const EventHorizonEmitter = require('../utils/event-horizon-emitter');
const MemeticSignature = require('../memetic/MemeticSignature');
const { Vector3D } = require('../utils/spatialEngine');

class EntityMemorySystem {
    /**
     * CONSTRUCTOR: Initialize Memory Fabric Container
     */
    constructor(universeMatrix, options = {}) {
        this.universeMatrix = universeMatrix;
        this.options = {
            memoryDensityIndex: options.memoryDensityIndex || 0.62, // Field saturation quotient
            contaminationQuotient: options.contaminationQuotient || 0.48, // Shared memory propagation potential
            evolutionaryPressure: options.evolutionaryPressure || 0.55, // Mutation stimulation index
            fieldVitalityQuorum: options.fieldVitalityQuorum || 0.7, // Required vitality for propagation
            ...options
        };

        // Core memory architecture
        this.memoryContainer = new Map(); // entityId → MemorySignature[]
        this.playerAnthologyRegistry = new Map(); // playerId → PlayerMemoryAnthology
        this.memoryDefinitionRegistry = new Map(); // memoryId → MemoryDefinition
        this.entityPositioningMap = new Map(); // entityId → Vector3D position
        this.contagionTracking = []; // Active memory contagion vectors
        this.lastContagionPulse = Date.now();

        // Vitality metrics
        this.fieldVitalityIndex = 0.95; // Field health metric (1.0 = pristine)
        this.memoryEvolutionCore = null;

        // Initialize subsystems
        this.initializeMemoryField();
        this.registerUniverseIntegrationHooks();
        this.setupFieldPulseEmitter();
    }

    /**
     * FIELD INITIALIZATION — Create Memory Fabric Topology
     */
    initializeMemoryField() {
        console.info('[MEMSYS] ► Initializing Horizon δ Memory Fabric...');

        // Establish memory field parameters
        this.fieldParameters = {
            dimensionalCapillaryDensity: 7, // 7-dimensional memory propagation topology
            fieldSaturationThreshold: 0.7, // Contagion activation threshold
            memeticUptakeCoefficient: 0.35, // Memory assimilation rate
            memoryRegenerationQuotient: 0.42 // Field auto-regeneration potential
        };

        // Create evolution core
        this.memoryEvolutionCore = new MemoryMutationEngine({
            pressureFactor: this.options.evolutionaryPressure,
            contaminationIndex: this.options.contaminationQuotient
        });

        // Initialize event horizon
        this.eventEmitter = EventHorizonEmitter.createCoreEmitter();
    }

    /**
     * UNIVERSE INTEGRATION — Connect to System-Wide Matrix
     */
    registerUniverseIntegrationHooks() {
        // Register player lifecycle hooks
        this.universeMatrix.registerPlayerEventHook('playerLogin', (payload) =>
            this.onPlayerConnected(payload));

        this.universeMatrix.registerPlayerEventHook('playerLogout', (payload) =>
            this.onPlayerDisconnected(payload));

        // Register narrative creation events
        this.universeMatrix.registerNarrativeEventHook('narrativeGenerated', (payload) =>
            this.handleNarrativeGeneration(payload));

        this.universeMatrix.registerNarrativeEventHook('entityInteraction', (payload) =>
            this.captureEntityInteraction(payload));

        // Create cross-title memory transmission conduit
        this.memoryConduit = this.universeMatrix.createTransmissionConduit(
            'memory-fabric', this.receiveMemoryPayload.bind(this));
    }

    /**
     * ON PLAYER CONNECTED — Initialize Memory Scaffold
     */
    async onPlayerConnected(playerPayload) {
        const playerId = playerPayload.playerId;
        const gameContext = playerPayload.currentGameContext;

        console.info(`[MEMSYS] ► Player ${playerId} connected — deploying memory scaffold [GAME: ${gameContext.gameId}]`);

        // Initialize player anthology if not exists
        if (!this.playerAnthologyRegistry.has(playerId)) {
            this.playerAnthologyRegistry.set(playerId, new PlayerMemoryAnthology(playerId));
        }

        // Restore player memory legacy
        await this.restorePlayerAnthology(playerId, gameContext);

        // Synchronize memory field
        this.synchronizePlayerMemoryField(playerId, gameContext);

        // Emit field vitality pulse
        const anthologyStats = this.dumpAnthologyStatistics(playerId);
        this.eventEmitter.emit('playerMemoryRestored', { playerId, ...anthologyStats });
    }

    /**
     * RESTORE PLAYER ANTHOLOGY — Recall Episodic Legacy
     */
    async restorePlayerAnthology(playerId, gameContext) {
        try {
            // Retrieve player's memory legacy from persistence layer
            const memoryLegacy = await this.universeMatrix.legacyArchiveService.retrieveMemoryLegacy(playerId);

            if (memoryLegacy) {
                // Restore player anthology state
                this.playerAnthologyRegistry.get(playerId).importAnthology(memoryLegacy);

                // Reconstruct memory field distribution
                const distributionSuccess = this.redistributeMemoriesAcrossField(memoryLegacy);

                console.info(`[MEMSYS] ► Restored ${memoryLegacy.recoveredMemoryCount || 0} memories for ${playerId} — field reconvergence: ${distributionSuccess ? 'SUCCESS' : 'PARTIAL'}`);
            } else {
                // Initialize new player memory scaffold
                this.initializeNewPlayerAnthology(playerId, gameContext);
                console.warn(`[MEMSYS] ► NO LEGACY MEMORIES FOUND for ${playerId} — initialized pristine scaffold.`);
            }
        } catch (restorationError) {
            console.error(`[MEMSYS] ► LEGACY RESTORATION FAILURE for ${playerId}:`, restorationError.message);
            this.initializeNewPlayerAnthology(playerId, gameContext);
        }

        // Field vitality adjustment
        this.adjustFieldVitality(0.3, "PlayerConnected");
    }

    /**
     * INITIALIZE NEW PLAYER ANTHOLOGY
     */
    initializeNewPlayerAnthology(playerId, gameContext) {
        const initialAnthology = this.playerAnthologyRegistry.get(playerId) || new PlayerMemoryAnthology(playerId);

        // Initialize with baseline memory scaffold
        initialAnthology.initializeMemoryScaffold({
            seedGenotype: `[PLAYER_${playerId}:MEMORY_ADAPTIVE_CORE_${Date.now().toString(36)}]`,
            evolutionaryCapacity: this.options.evolutionaryPressure * 0.8,
            narrativeAdaptiveQuotient: 0.6
        });

        if (!this.playerAnthologyRegistry.has(playerId)) {
            this.playerAnthologyRegistry.set(playerId, initialAnthology);
        }
    }

    /**
     * SYNCHRONIZE PLAYER MEMORY FIELD — Cosmic Memory Alignment
     */
    synchronizePlayerMemoryField(playerId, gameContext) {
        const anthology = this.playerAnthologyRegistry.get(playerId);
        const fieldDistribution = anthology.calculateFieldDistribution();

        // Project memory distribution into game field
        fieldDistribution.forEach((distributionVector, memoryId) => {
            this.anchorMemoryInField(memoryId, distributionVector.position, {
                anchoringEntity: playerId,
                temporalPersistence: 0.85,
                semanticCouplingQuotient: distributionVector.couplingIndex
            });
        });

        // Trigger memory contagion pulse
        if (this.fieldParameters.contagionQuotient > 0.5) {
            setTimeout(() => {
                this.triggerCrossEntityContagion(playerId, 0.7);
                this.synchronizeCrossGameMemoryScope(playerId, gameContext);
            }, 2400);
        }
    }

    /**
     * ANCHOR MEMORY IN FIELD — Establish Spatial-Temporal Fixation
     */
    anchorMemoryInField(memoryId, positionVector, anchoringParameters) {
        if (!this.memoryDefinitionRegistry.has(memoryId)) {
            return false;
        }

        const memoryDefinition = this.memoryDefinitionRegistry.get(memoryId);

        // Calculate quantum anchoring matrix
        const anchoringQuotient = this.calculateAnchoringQuotient(
            memoryDefinition, positionVector, anchoringParameters);

        // Establish memory capillary
        this.entityPositioningMap.set(memoryId, positionVector);

        // Store anchoring parameters
        memoryDefinition.anchoringParameters = anchoringParameters;
        memoryDefinition.fieldPosition = positionVector.clone();

        // Inject into field vitality matrix
        this.fieldVitalityIndex = Math.min(0.98, this.fieldVitalityIndex + (0.01 * anchoringQuotient));

        return true;
    }

    /**
     * CALCULATE ANCHORING QUOTIENT — Field Integration Rating
     */
    calculateAnchoringQuotient(memoryDefinition, positionVector, anchoringParameters) {
        // Memory complexity to field coupling
        const complexityCoupling = Math.min(1.0, memoryDefinition.memeticComplexity * 0.6);
        const temporalPersistence = (anchoringParameters.temporalPersistence || 0.7) * 0.4;
        const semanticCoupling = (anchoringParameters.semanticCouplingQuotient || 0.5) * 0.6;
        const spatialCoherence = this.calculateSpatialCoherence(positionVector);

        // Combined anchoring quotient
        return (complexityCoupling + temporalPersistence + semanticCoupling) * spatialCoherence;
    }

    /**
     * CALCULATE SPATIAL COHERENCE — Positional Memory Gravity
     */
    calculateSpatialCoherence(positionVector) {
        // Maintain spatial coherence above field stability threshold
        return Math.max(0.35, 1.0 - (positionVector.distanceFromOrigin() / 500));
    }

    /**
     * HANDLE NARRATIVE GENERATION — Auto-Capture Generated Narratives
     */
    handleNarrativeGeneration(narrativePayload) {
        const { narrativeId, narrativeContent, contextualParameters, generationMetadata } = narrativePayload;

        // Only capture significant narratives
        if (this.shouldCaptureNarrative(narrativePayload.significanceScore || 0)) {
            const memoirSignature = this.createMemorySignatureFromNarrative(narrativeContent, {
                narrativeType: generationMetadata.narrativeType || 'perceptiveFragment',
                perceptualFramework: generationMetadata.perceptualFramework || 'qualiaEcho',
                temporalStability: generationMetadata.temporalStability || 0.8,
                entityContext: generationMetadata.generatorEntityId,
                atmosphericContext: generationMetadata.atmosphericIndex,
                thematicDimensionality: generationMetadata.thematicVector || [0.5, 0.5, 0.5]
            });

            this.registerNarrativeMemory(memoirSignature, contextualParameters);
        }
    }

    /**
     * SHOULD CAPTURE NARRATIVE — Significance Threshold Filter
     */
    shouldCaptureNarrative(significanceScore) {
        // Random sampling for narrative storage (more significant = more likely)
        const captureProbability = 0.3 + (0.7 * Math.min(1.0, significanceScore));
        return Math.random() < captureProbability;
    }

    /**
     * CREATE MEMORY SIGNATURE FROM NARRATIVE
     */
    createMemorySignatureFromNarrative(narrativeContent, metadata) {
        // Memory episodic encoding
        const memeticSignature = new MemeticSignature({
            memeticId: `MEMORY:${Date.now()}-${Math.random().toString(36).toString().substring(2, 6).toUpperCase()}`,
            sourceNarrative: narrativeContent,
            contaminationSource: 'narrative_generation',
            sourceEntityId: metadata.entityContext || 'NARRATIVE_ENGINE',
            signatureProfile: this.constructMemeticMemoryProfile(narrativeContent, metadata),
            propagationVectors: this.createMemoryPropagationVectors(narrativeContent, metadata),
            decayChain: this.createMemoryDecayChain(metadata.temporalStability)
        });

        // Calculate vitality based upon thematic resilience
        const thematicVitality = this.calculateThematicVitality(
            metadata.thematicDimensionality || [0.5, 0.5, 0.5]);
        memeticSignature.vitalityIndex = 0.4 + (0.6 * thematicVitality);

        return memeticSignature;
    }

    /**
     * CONSTRUCT MEMETIC MEMORY PROFILE
     */
    constructMemeticMemoryProfile(narrativeContent, metadata) {
        const narrativeComplexity = calculateNarrativeComplexity(narrativeContent);
        const emotionalSignature = analyzeEmotionalSignature(narrativeContent);
        const thematicVector = metadata.thematicDimensionality || [0.5, 0.5, 0.5];

        // Memory architecture blueprint
        return {
            narrativeDNA: `[MEMORY_CORE:${this.generateMemeticDNA(narrativeContent)}]`,
            narrativeComplexityIndex: narrativeComplexity,
            emotionalSignature: emotionalSignature,
            thematicResonanceVector: thematicVector,
            awarenessQuotient: calculateAwarenessQuotient(narrativeContent, metadata.perceptualFramework),
            indexicalMemoryStructure: this.modelIndexicalStructure(narrativeContent, metadata.narrativeType),
            memoryEntropyScore: calculateMemoryEntropy(narrativeContent),
            atmosphericEmbeddingIndex: this.calculateAtmosphericEmbedding(narrativeContent, metadata.atmosphericContext || 0)
        };
    }

    /**
     * CALCULATE ATMOSPHERIC EMBEDDING
     */
    calculateAtmosphericEmbedding(narrativeContent, atmosphericIndex) {
        const atmosphericComplexity = Math.min(1.0, atmosphericIndex * 0.8);
        const linguisticAtmosphere = this.calculateLinguisticAtmosphere(narrativeContent);

        return (atmosphericComplexity * 0.6) + (linguisticAtmosphere * 0.4);
    }

    /**
     * CALCULATE LINGUISTIC ATMOSPHERE
     */
    calculateLinguisticAtmosphere(text) {
        // Atmospheric suggestions through vocabulary choices
        const atmosphericWords = ['fog', 'shadow', 'paranoia', 'whisper', 'echo', 'void', 'precognition', 'uncanny'];

        const foundCount = atmosphericWords.reduce((count, word) =>
            text.toLowerCase().includes(word) ? count + 1 : count, 0);

        return Math.min(1.0, foundCount * 0.1);
    }

    /**
     * CAPTURE ENTITY INTERACTION — Witness Event Recording
     */
    captureEntityInteraction(interactionPayload) {
        const { interactionId, entitiesInvolved, interactionType, interactionContext, gameContext } = interactionPayload;

        // Create witness testimony from interaction
        const witnessTestimony = this.generateWitnessTestimony(interactionContext, entitiesInvolved);

        // Construct composite memory
        const interactionMemory = new EntityInteractionMemory({
            interactionId,
            witnesses: entitiesInvolved,
            interactionContent: witnessTestimony,
            interactionType,
            contextualParameters: interactionContext,
            temporalIndex: 0.7 + (0.3 * (interactionContext.interactionIntensity || 0)),
            entityContext: entitiesInvolved[0]
        });

        // Memetic encoding
        const memorySignature = this.createMemoryFromInteraction(interactionMemory);

        // Register across interacting entities
        this.registerInteractionGroupMemory(interactionMemory, entitiesInvolved);

        // Attempt cross-entity contagion
        if (Math.random() < this.fieldParameters.fieldContaminationQuotient) {
            this.attemptEntityContagion(entitiesInvolved, interactionMemory.getMemeticSignature());
        }

        // Adjust field vitality
        this.adjustFieldVitality(0.2, 'InteractionRecorded');
    }

    /**
     * GENERATE WITNESS TESTIMONY — Heterogeneous Perspective Mimicry
     */
    generateWitnessTestimony(interactionContext, witnessEntities) {
        // Entity-specific perceptual variables
        const witnessPerspectives = witnessEntities.map(entity => {
            const perceptualModel = this.retrieveEntityPerceptualModel(entity);

            return {
                entityId: entity,
                perceptualAngle: perceptualModel.focalAngle || 45,
                blindnessQuotient: perceptualModel.blindnessMap?.witnessAffinity || 0,
                narrativeStyle: perceptualModel.narrativeStyle || 'uncanny_memory',
                memoryFidelity: perceptualModel.memoryFidelity || 0.6
            };
        });

        // Create composite narrative
        const compositeNarrative = witnessPerspectives.map(perspective => {
            return this.renderPerceptualMemory({
                rawEvent: interactionContext.rawEventDescription || "Something happened near me.",
                perceptualModel: perspective,
                linguisticFramework: 'witness_testimony',
                contaminationFactor: 1.0 - perspective.memoryFidelity
            });
        }).join("\n\n[WITNESS INTERJECTION]\n");

        // Contaminate with other perspectives
        return this.contaminateWithPerspectiveFilters(compositeNarrative, witnessPerspectives);
    }

    /**
     * RENDER PERCEPTUAL MEMORY — Entity-Specific Memory Enactment
     */
    renderPerceptualMemory({ rawEvent, perceptualModel, linguisticFramework, contaminationFactor }) {
        // Retrieve narrative template
        const template = this.retrieveMemoryTemplate(
            linguisticFramework, perceptualModel.narrativeStyle);

        // Calculate perceptual distortion
        const perceptualDistortion = calculatePerceptualDistortion(perceptualModel, contaminationFactor);

        // Render with distortion
        const renderedMemory = template.render({
            eventDescription: rawEvent,
            distortionMatrix: perceptualDistortion,
            stylisticContamination: contaminationFactor,
            narrativeBias: perceptualModel.narrativeBias || 0
        });

        return this.applyMemoryDegradation(renderedMemory, perceptualModel.memoryFidelity);
    }

    /**
     * CREATE MEMORY FROM INTERACTION — Memetic Encoding
     */
    createMemoryFromInteraction(interactionMemory) {
        const { interactionType, interactionContent, temporalIndex, entityContext } = interactionMemory;

        const memeticProfile = {
            narrativeDNA: this.generateInteractionDNA(interactionMemory),
            interactionTypeSignature: interactionType,
            witnessConsensusIndex: this.calculateWitnessConsensus(interactionMemory.witnessAgreements),
            temporalCoherenceIndex: temporalIndex,
            eventContagionIndex: 0.4 + (0.6 * (interactionMemory.interactionIntensity || 0)),
            memoryStructureComplexity: this.calculateMemoryStructuralComplexity(interactionContent),
            socialContagionCoefficient: calculateSocialContagionFactor(interactionMemory.witnesses.length)
        };

        const propagationVectors = this.createInteractionPropagationVectors(interactionMemory);

        return new MemeticSignature({
            memeticId: interactionMemory.memoryId,
            contaminationSource: `INTERACTION:${interactionMemory.interactionId}`,
            sourceEntityId: entityContext,
            signatureProfile: memeticProfile,
            propagationVectors,
            decayChain: this.createDecayChainFromInteraction(temporalIndex),
            vitalityIndex: 0.4 + (0.6 * memeticProfile.eventContagionIndex)
        });
    }

    /**
     * CREATE DECAY CHAIN FROM INTERACTION
     */
    createDecayChainFromInteraction(temporalIndex) {
        // Temporal events have more stable memory fixations
        const baseDecay = 0.007 * (1.0 - (0.3 * temporalIndex));
        const empiricalContagion = 0.5 * temporalIndex * this.options.evolutionaryPressure;

        return {
            dailyDecayFactor: baseDecay * (0.9 + (Math.random() * 0.2)),
            incrementalDriftMagnitude: 0.08 + (0.06 * (1 - temporalIndex)),
