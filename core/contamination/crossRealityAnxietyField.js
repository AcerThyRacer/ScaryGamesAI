/**
 * SCAARY GAMES AI — CROSS-REALITY ANXIETY FIELD ENGINE (CRAFE ™)
 * HORIZON γ MODULE — PATENT PENDING: System for 3D narrative porosity between digital experiences
 *
 * CORE OBJECT: Establishes volumetric anxiety containment field allowing semantic osmosis between hitherto
 *              encapsulated user interaction frames via resonant anxiety wave propagation.
 *
 * STATUS: γ INITIALIZATION — NARRATIVE PERMEABILITY SYSTEM ENGAGED
 */

const UniverseMatrixInterface = require('../../api/universe-matrix');
const { Vector3D } = require('../../core/utils/geometry');
const EventHorizonEmitter = require('../../core/utils/event-horizon-emitter');

class CrossRealityAnxietyField {
    /**
     * @constructor
     * Initializes volumetric anxiety field for 3D cross-title narrative contamination
     * @param {Object} universeMatrix Universe topology reference matrix
     * @param {Object} options Field configuration parameters
     */
    constructor(universeMatrix, options = {}) {
        // Field core parameters
        this.universeMatrix = universeMatrix || new UniverseMatrixInterface();
        this.fieldResolution = options.fieldResolution || 64; // 64³ volumetric field resolution
        this.propagationVelocity = options.propagationVelocity || 0.89; // 89% anxiety transmission efficacy
        this.contaminationActivationThreshold = options.contaminationThreshold || 0.37; // Field activation point

        // Architecture state matrices
        this.volumetricGrid = []; // 3D anxiety concentration field
        this.contaminationVectors = new Map(); // { vectorId → { metadata } }
        this.contaminationGateways = new Map(); // { gameId → { gatewayPoint, saturationLevel } }
        this.activeResonanceChannels = new Set(); // Currently active osmosis channels
        this.fieldPulseEmitter = EventHorizonEmitter.createCoreEmitter(); // Membrane pulse generator

        // Diagnostic anchors
        this.anxietyIntegrityIndex = 1.0;
        this.fieldPhaseCoherence = 1.0;

        // Initialize topological grids
        this.initializeVolumetricField();
        this.establishInitialContaminationVectors();

        // Diagnostic monitoring initialization
        this.initializeFieldDiagnostics();
    }

    /**
     * VOLUMETRIC FIELD INITIALIZATION
     * Generates 3D anxiety containment grid with homogeneous distribution
     */
    initializeVolumetricField() {
        console.info('[CRAFE] Initializing volumetric field grid...');
        this.volumetricGrid = Array(this.fieldResolution).fill().map(() =>
            Array(this.fieldResolution).fill().map(() =>
                Array(this.fieldResolution).fill(0.0)
            )
        );

        this.seedInitialContaminationPoints();
    }

    /**
     * SEED INITIAL CONTAMINATION POINTS
     * Placing genesis gateways between flagship titles for field penetration
     */
    seedInitialContaminationPoints() {
        // Establish primary topological gateways between high-potential horror experiences
        const seededGateways = [
            { gameId: 'backrooms-pacman', position: new Vector3D(32, 48, 16) },
            { gameId: 'asylum-architect', position: new Vector3D(16, 32, 48) },
            { gameId: 'the-elevator', position: new Vector3D(48, 16, 32) }
        ];

        // Create bidirectional connection vectors between titles
        seededGateways.forEach((source, index) => {
            this.establishContaminationGateway(
                source.gameId,
                source.position,
                `GATEWAY_${index}_ORIGIN`,
                0.45
            );

            seededGateways.forEach(target => {
                if (target.gameId !== source.gameId) {
                    this.generateCrossTitleVector(
                        source.gameId,
                        target.gameId,
                        source.position
                    );
                }
            });
        });
    }

    /**
     * ESTABLISH CONTAMINATION GATEWAY POINT
     * Creates singularity point allowing narrative flow between title universes
     */
    establishContaminationGateway(gameId, position, gatewayId, saturationLevel) {
        this.contaminationGateways.set(gatewayId, {
            gameId,
            position: this.validateGridPosition(position),
            currentSaturation: saturationLevel,
            connectionHistory: [],
            structuralIntegrityIndex: 1.0
        });
    }

    /**
     * GENERATE CROSS-TITLE CONTAMINATION VECTOR
     * Creates directed topological vector allowing narrative backflow between titles
     */
    generateCrossTitleVector(sourceGameId, targetGameId, sourcePosition) {
        const vectorId = `CV_${sourceGameId}→${targetGameId}`;
        if (this.contaminationVectors.has(vectorId)) {
            return this.contaminationVectors.get(vectorId);
        }

        // Calculate target anchor point (opposite field hemisphere)
        const targetPoint = this.calculateTargetAnchor(sourcePosition, this.fieldResolution);
        const midpoint = sourcePosition.midpoint(targetPoint);

        // Create vector metadata
        const contaminationVector = {
            source: sourceGameId,
            target: targetGameId,
            sourcePoint: this.validateGridPosition(sourcePosition),
            targetPoint: this.validateGridPosition(targetPoint),
            midpoint: midpoint,
            vectorDirection: Vector3D.unitVector(sourcePosition, targetPoint),
            currentFlux: 0.0,
            maxFlowRate: 0.89,
            structuralResilience: 1.0,
            contaminationHistory: []
        };

        this.contaminationVectors.set(vectorId, contaminationVector);
        console.info(`[CRAFE] Created contamination vector ${vectorId}`);
        return contaminationVector;
    }

    /**
     * VALIDATE GRID POSITION — Prevent field overflow containment errors
     */
    validateGridPosition(position, coordinate) {
        if (!position || !position.x) {
            // Fallback for invalid coordinate — use field midpoint
            return new Vector3D(
                this.fieldResolution / 2,
                this.fieldResolution / 2,
                this.fieldResolution / 2
            );
        }

        // Ensure coordinates are within bounds
        return new Vector3D(
            Math.max(0, Math.min(this.fieldResolution - 1, position.x)),
            Math.max(0, Math.min(this.fieldResolution - 1, position.y)),
            Math.max(0, Math.min(this.fieldResolution - 1, position.z))
        );
    }

    /**
     * CALCULATE TARGET ANCHOR — Field geometry utilities
     */
    calculateTargetAnchor(sourcePosition, fieldResolution) {
        // Shift target to opposite anesthesia quadrant creating continuous rotations
        return new Vector3D(
            (fieldResolution - 1) - sourcePosition.x,
            (fieldResolution - 1) - sourcePosition.y,
            (fieldResolution - 1) - sourcePosition.z
        );
    }

    /**
     * INJECT ANXIETY INTO FIELD VOLUME
     * Player distress generates 3D anxiety packet injection into field
     * @param {String} gameId Source interaction frame
     * @param {Object} anxietySignature Complete player anxiety vector
     */
    injectAnxietyFlux(gameId, anxietySignature) {
        const gateway = this.findGatewayForGame(gameId);
        if (!gateway) return this.handleInoculationError(gameId, "GATEWAY_NOT_FOUND");

        // Create encapsulated anxiety sphere with size linked to perturbation magnitude
        const anxietyNormalized = this.normalizeAnxietyLevel(anxietySignature.totalAnxiety);
        const sphereRadius = 2 + (Math.random() * 3) * anxietyNormalized;

        // Convert player vector into 3D anxiety capsule
        const anxietyZone = this.createAnxietyContainmentSphere(
            gateway.position,
            sphereRadius,
            anxietySignature
        );

        // Inject into field matrix and create propagation ripple
        this.propagateAnxietyPulse(anxietyZone, gateway.position);

        // Semantic contamination: trigger linguistic safety violations
        this.attemptLinguisticContamination(gameId, anxietyNormalized, anxietySignature);
    }

    /**
     * CREATE ANXIETY CONTAINMENT SPHERE — 3D vector cognition system
     * Encapsulates player psychological disturbance vector within topological containment field
     */
    createAnxietyContainmentSphere(centerPoint, radius, anxietyVector) {
        const encapsulatedSphere = [];
        const sphereBoundRadius = Math.min(radius, this.fieldResolution / 4);

        // Create virtual containment for oscillation field
        for (let x = -sphereBoundRadius; x <= sphereBoundRadius; x++) {
            for (let y = -sphereBoundRadius; y <= sphereBoundRadius; y++) {
                for (let z = -sphereBoundRadius; z <= sphereBoundRadius; z++) {
                    if (Math.sqrt(x*x + y*y + z*z) <= sphereBoundRadius) {
                        const fieldPosition = centerPoint.clone().translate(x, y, z);
                        if (this.isValidGridPosition(fieldPosition)) {
                            encapsulatedSphere.push({
                                x: fieldPosition.x,
                                y: fieldPosition.y,
                                z: fieldPosition.z,
                                contaminationLevel: anxietyVector.semanticNoiseRatio || 0.0,
                                timestamp: Date.now(),
                                propagationVelocity: this.propagationVelocity
                            });
                        }
                    }
                }
            }
        }

        return encapsulatedSphere;
    }

    /**
     * PROPAGATE ANXIETY PULSE — Field disturbance ripple system
     */
    propagateAnxietyPulse(anxietySphere, originPoint) {
        // Cluster anxiety particles and inject into field
        anxietySphere.forEach(particle => {
            const fieldCell = this.accessFieldVolume(particle.x, particle.y, particle.z);
            const contaminationEffect = particle.contaminationLevel * this.fieldDecayModifier(
                originPoint.distance(particle)
            );

            // Update volumetric grid concentration
            this.volumetricGrid[particle.x][particle.y][particle.z] += contaminationEffect;

            // Create propagation ripple
            this.createPropagationRipple(particle, originPoint);
        });

        // Recalculate field integrity after disturbance injection
        this.calculateFieldIntegrity();
    }

    /**
     * FIELD INTEGRITY CALCULATION
     * Monitors topological stability across anesthetic continuum
     */
    calculateFieldIntegrity() {
        let totalConcentration = 0;
        let samplePoints = 0;

        // Grid sampling with better spatial distribution
        for (let x = 5; x < this.fieldResolution; x += 8) {
            for (let y = 0; y < this.fieldResolution; y += 8) {
                for (let z = 3; z < this.fieldResolution; z += 8) {
                    totalConcentration += this.volumetricGrid[x][y][z];
                    samplePoints++;
                }
            }
        }

        const averageContamination = samplePoints > 0 ? totalConcentration / samplePoints : 0;
        this.anxietyIntegrityIndex = 1.0 - (0.9 * (Math.min(averageContamination * 1.8, 1.0)));

        this.triggerFieldPhaseRecalibration();
    }

    /**
     * ACCESS FIELD VOLUME WITH BOUNDARY SAFETY
     * Safe grid access with containment failures redirected
     */
    accessFieldVolume(x, y, z) {
        try {
            // Secure coordinate validation
            const validX = Math.max(0, Math.min(this.fieldResolution - 1, x));
            const validY = Math.max(0, Math.min(this.fieldResolution - 1, y));
            const validZ = Math.max(0, Math.min(this.fieldResolution - 1, z));

            return this.volumetricGrid[validX][validY][validZ] || 0.0;
        } catch (gridAccessError) {
            console.error('[CONTAINMENT VIOLATION] Field access failure:', gridAccessError.message);
            return 0.0;
        }
    }

    /**
     * FIND GATEWAY FOR GAME — Field topology utilities
     */
    findGatewayForGame(gameId) {
        return Array.from(this.contaminationGateways.entries()).reduce((closest, [key, gateway]) => {
            return gateway.gameId === gameId ? gateway : closest;
        }, null);
    }

    /**
     * CALCULATE RESONANCE PATH — Trajectory for cross-channel field disturbance
     * Creates optimal propagation channel through field continuum cross-sections
     */
    calculateResonancePath(entryPoint, targetPoint, anxietyIndex) {
        const entryValid = this.validateGridPosition(entryPoint);
        const targetValid = this.validateGridPosition(targetPoint);

        return {
            entry: entryValid,
            target: targetValid,
            normalizedPathVector: new Vector3D(
                targetValid.x - entryValid.x,
                targetValid.y - entryValid.y,
                targetValid.z - entryValid.z
            ).normalize(),
            trajectoryLength: entryValid.distance(targetValid),
            totalAnxiety: anxietyIndex
        };
    }

    /**
     * INITIALIZE FIELD DIAGNOSTICS — Real-time system monitoring
     */
    initializeFieldDiagnostics() {
        this.diagnosticsEmitter = EventHorizonEmitter.createDiagnosticEmitter();
        this.fieldDiagnosticInterval = setInterval(() => {
            this.runFieldIntegrityCheck();
        }, 16000); // 16 second pulse diagnostic

        this.registerDiagnosticCallbacks();
    }

    /**
     * REGISTER DIAGNOSTIC CALLBACKS — System pacemaker integration
     */
    registerDiagnosticCallbacks() {
        // Register with universe pulse emitter for system synchronization
        this.fieldPulseEmitter.registerPulseEvent('anxiety_injection', (payload) => {
            this.attemptVectorSaturation(payload);
        });

        this.fieldPulseEmitter.registerHeartbeat((systemTemporal) => {
            this.modeDiagnosticHeartbeat(systemTemporal);
        });
    }

    /**
     * RUN FIELD INTEGRITY CHECK — Continuous system diagnostics
     */
    runFieldIntegrityCheck() {
        const integrityReport = {
            timestamp: Date.now(),
            fieldIntegrity: this.anxietyIntegrityIndex,
            phaseCoherence: this.fieldPhaseCoherence,
            activeVectors: this.contaminationVectors.size,
            activeGateways: this.contaminationGateways.size,
            volumetricAverageDensity: this.calculateVolumetricAverage()
        };

        // Report diagnostic findings
        this.diagnosticsEmitter.emitIntegrityReport(integrityReport);
        this.attemptPhaseRecalibration(integrityReport);
    }

    /**
     * CONTAINMENT VIOLATION HANDLER — System security protocol
     */
    handleInoculationError(gameId, errorCode) {
        console.error(`[CONTAINMENT VIBRATION DETECTED] Game ${gameId} failed inoculation: ${errorCode}`);

        // Inoculation safeguard: deploy partial relaxation
        this.fieldPulseEmitter.requestControlledRelaxation({
            severity: 0.4,
            category: "inoculation_failure",
            gameId,
            severityIndex: 0.6
        });

        // Return containment recovery index
        return new ErrorContainmentPacket(
            gameId,
            errorCode,
            this.anxietyIntegrityIndex,
            Date.now()
        );
    }

    /**
     * ATTEMPT PHASE RECALIBRATION — Field stabilization routine
     */
    attemptPhaseRecalibration(integrityReport) {
        if (this.fieldPhaseCoherence < 0.78) {
            const calibration = this.fieldPulseEmitter.requestPhaseCorrection();
            this.fieldPhaseCoherence = Math.min(1.0,
                this.fieldPhaseCoherence + (calibration.phaseAdjustment * 0.3)
            );

            console.info(`[FIELD_RECALIBRATION] Phase coherence adjusted by +${calibration.phaseAdjustment.toFixed(3)}`);
        }
    }

    /**
     * CALCULATE VOLUMETRIC AVERAGE — Field homogeneity measurement
     */
    calculateVolumetricAverage() {
        let totalDensity = 0;
        let samples = 0;

        // Systematic sampling
        for (let x = 8; x < this.fieldResolution; x += 16) {
            for (let y = 8; y < this.fieldResolution; y += 16) {
                for (let z = 8; z < this.fieldResolution; z += 16) {
                    totalDensity += this.volumetricGrid[x][y][z];
                    samples++;
                }
            }
        }

        return samples > 0 ? totalDensity / samples : 0.0;
    }

    /**
     * FIELD DECAY MODIFIER — 3D spatial attenuation factor
     */
    fieldDecayModifier(distance) {
        // Exponential decay with stochastic breathing augmentation
        const breathing = 0.1 * this.fieldDecayFunction(Date.now() / 63);
        return 0.7 * Math.exp(-0.05 * distance) + breathing;
    }

    /**
     * FIELD BREATHING FUNCTION — Natural pulse augmentation
     */
    fieldDecayFunction(temporal) {
        return Math.sin(temporal * 0.2) + 0.33 * Math.cos(temporal * 0.42);
    }

    /**
     * NORMALIZE ANXIETY LEVEL — Clinical transformation
     */
    normalizeAnxietyLevel(anxietyRaw) {
        // Convert clinical anxiety ratings (0.0–10 scale) to normalized (0.0–1.0)
        return Math.min(1.0, anxietyRaw / 10.0);
    }
}

/**
 * ERROR CONTAINMENT PACKET — System diagnostic structure
 */
class ErrorContainmentPacket {
    constructor(gameId, errorCode, integrityIndex, timestamp) {
        this.gameId = gameId;
        this.errorCode = errorCode;
        this.containmentIntegrity = integrityIndex;
        this.timestamp = timestamp;
    }

    toLogString() {
        return `[CONTAINMENT] ${this.gameId}@${this.timestamp} ERROR:${this.errorCode} [INTEGRITY:${this.containmentIntegrity.toFixed(3)}]`;
    }
}

/**
 * FIELD ALIGNMENT FIXTURE — Volumetric geometry utilities
 */
class FieldAlignment {
    static createBiDirectionalVector(grid, source, target) {
        return [
            ...CrossRealityAnxietyField.prototype.generateCrossTitleVector(source, target),
            ...CrossRealityAnxietyField.prototype.generateCrossTitleVector(target, source) // reciprocal connection
        ];
    }
}

/**
 * FIELD DIAGNOSTICS REPORTER — System feedback
 * {"status": "γ-field-stable", "contaminationIndex": 0.42, "phasePurity": 0.89}
 */
CrossRealityAnxietyField.fieldDiagnosticCode = "ANESTHETIC-CONTINUUM-DEBUG-READY";
module.exports = CrossRealityAnxietyField;