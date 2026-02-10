/* ============================================
   The Abyss - Procedural Animation & IK System
   Inverse Kinematics for creatures, tentacles, fins
   Phase 1 Implementation
   ============================================ */

const ProceduralAnimation = (function() {
    'use strict';

    // Animation configurations
    const CONFIG = {
        ikIterations: 10,
        tentacleSegments: 20,
        swimFrequency: 2,
        swimAmplitude: 0.5,
        smoothness: 0.1
    };

    // ============================================
    // INVERSE KINEMATICS SOLVER
    // ============================================
    class IKSolver {
        constructor(bones, target) {
            this.bones = bones; // Array of Object3D representing joints
            this.target = target; // Target position
            this.iterations = CONFIG.ikIterations;
            this.threshold = 0.01;
        }

        // FABRIK (Forward And Backward Reaching Inverse Kinematics)
        solve() {
            if (this.bones.length === 0) return;

            const targetPos = this.target.clone();
            const bonePositions = this.bones.map(b => b.position.clone());
            const boneLengths = [];

            // Calculate bone lengths
            for (let i = 0; i < this.bones.length - 1; i++) {
                boneLengths.push(bonePositions[i].distanceTo(bonePositions[i + 1]));
            }

            const totalLength = boneLengths.reduce((a, b) => a + b, 0);
            const rootToTarget = bonePositions[0].distanceTo(targetPos);

            // If target is unreachable, stretch to it
            if (rootToTarget > totalLength) {
                const direction = new THREE.Vector3().subVectors(targetPos, bonePositions[0]).normalize();
                for (let i = 1; i < this.bones.length; i++) {
                    bonePositions[i] = bonePositions[i - 1].clone()
                        .add(direction.clone().multiplyScalar(boneLengths[i - 1]));
                }
            } else {
                // FABRIK iterations
                for (let iter = 0; iter < this.iterations; iter++) {
                    // Forward reaching
                    bonePositions[bonePositions.length - 1] = targetPos.clone();
                    for (let i = this.bones.length - 2; i >= 0; i--) {
                        const direction = new THREE.Vector3()
                            .subVectors(bonePositions[i], bonePositions[i + 1])
                            .normalize();
                        bonePositions[i] = bonePositions[i + 1].clone()
                            .add(direction.multiplyScalar(boneLengths[i]));
                    }

                    // Backward reaching
                    bonePositions[0] = this.bones[0].parent?.localToWorld(this.bones[0].position.clone())
                        || bonePositions[0];
                    for (let i = 0; i < this.bones.length - 1; i++) {
                        const direction = new THREE.Vector3()
                            .subVectors(bonePositions[i + 1], bonePositions[i])
                            .normalize();
                        bonePositions[i + 1] = bonePositions[i].clone()
                            .add(direction.multiplyScalar(boneLengths[i]));
                    }

                    // Check convergence
                    if (bonePositions[bonePositions.length - 1].distanceTo(targetPos) < this.threshold) {
                        break;
                    }
                }
            }

            // Apply positions and calculate rotations
            for (let i = 0; i < this.bones.length; i++) {
                if (i > 0) {
                    const direction = new THREE.Vector3()
                        .subVectors(bonePositions[i], bonePositions[i - 1])
                        .normalize();
                    this.bones[i - 1].lookAt(bonePositions[i]);
                }
                this.bones[i].position.copy(this.bones[i].parent?.worldToLocal(bonePositions[i].clone())
                    || bonePositions[i]);
            }
        }

        setTarget(target) {
            this.target = target.clone();
        }
    }

    // ============================================
    // TENTACLE CONTROLLER
    // ============================================
    class TentacleController {
        constructor(scene, config = {}) {
            this.scene = scene;
            this.segmentCount = config.segments || CONFIG.tentacleSegments;
            this.segmentLength = config.segmentLength || 0.5;
            this.baseRadius = config.baseRadius || 0.2;
            this.tipRadius = config.tipRadius || 0.05;
            this.color = config.color || 0x220033;

            this.segments = [];
            this.joints = [];
            this.time = 0;

            this.createTentacle();
        }

        createTentacle() {
            // Create root
            const rootGeometry = new THREE.SphereGeometry(this.baseRadius, 8, 8);
            const material = new THREE.MeshStandardMaterial({
                color: this.color,
                roughness: 0.4,
                metalness: 0.1
            });

            this.root = new THREE.Mesh(rootGeometry, material);
            this.scene.add(this.root);
            this.joints.push(this.root);

            // Create segments
            let parent = this.root;
            for (let i = 0; i < this.segmentCount; i++) {
                const t = i / (this.segmentCount - 1);
                const radius = THREE.MathUtils.lerp(this.baseRadius, this.tipRadius, t);
                const nextRadius = THREE.MathUtils.lerp(this.baseRadius, this.tipRadius,
                    (i + 1) / (this.segmentCount - 1));

                // Create capsule-like segment
                const geometry = new THREE.CylinderGeometry(nextRadius, radius, this.segmentLength, 8);
                geometry.translate(0, this.segmentLength / 2, 0); // Pivot at base
                geometry.rotateX(Math.PI / 2);

                const segment = new THREE.Mesh(geometry, material);
                segment.position.set(0, 0, this.segmentLength);

                parent.add(segment);
                this.segments.push(segment);
                this.joints.push(segment);
                parent = segment;
            }

            // Add tip
            const tipGeometry = new THREE.SphereGeometry(this.tipRadius, 8, 8);
            const tip = new THREE.Mesh(tipGeometry, material);
            tip.position.set(0, 0, this.segmentLength);
            parent.add(tip);
            this.tip = tip;
        }

        animate(deltaTime, elapsedTime, target = null) {
            this.time += deltaTime;

            if (target) {
                // IK mode - reach for target
                this.animateIK(target);
            } else {
                // Procedural swimming mode
                this.animateProcedural(elapsedTime);
            }
        }

        animateIK(target) {
            // Simple CCD (Cyclic Coordinate Descent) IK
            const targetPos = target.clone();

            // Iterate from tip to base
            for (let i = this.joints.length - 1; i >= 0; i--) {
                const joint = this.joints[i];
                const jointWorldPos = new THREE.Vector3();
                joint.getWorldPosition(jointWorldPos);

                const tipWorldPos = new THREE.Vector3();
                this.tip.getWorldPosition(tipWorldPos);

                // Calculate angles to target
                const toTarget = new THREE.Vector3().subVectors(targetPos, jointWorldPos).normalize();
                const toTip = new THREE.Vector3().subVectors(tipWorldPos, jointWorldPos).normalize();

                // Rotation axis
                const axis = new THREE.Vector3().crossVectors(toTip, toTarget).normalize();
                const angle = Math.acos(Math.max(-1, Math.min(1, toTip.dot(toTarget))));

                // Apply rotation with damping
                if (axis.lengthSq() > 0.001 && angle > 0.01) {
                    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle * 0.5);
                    joint.quaternion.slerp(rotation.multiply(joint.quaternion), 0.3);
                }
            }
        }

        animateProcedural(elapsedTime) {
            // Sine wave propagation for swimming
            for (let i = 0; i < this.joints.length; i++) {
                const t = i / this.joints.length;
                const phase = t * Math.PI * 2 + elapsedTime * CONFIG.swimFrequency;

                const x = Math.sin(phase) * CONFIG.swimAmplitude * (1 - t * 0.5);
                const y = Math.cos(phase * 0.7) * CONFIG.swimAmplitude * 0.5 * (1 - t * 0.5);

                this.joints[i].rotation.x = y;
                this.joints[i].rotation.y = x;
            }
        }

        setColor(color) {
            this.segments.forEach(seg => {
                if (seg.material) seg.material.color.setHex(color);
            });
        }

        dispose() {
            this.scene.remove(this.root);
            this.segments.forEach(seg => {
                seg.geometry.dispose();
                seg.material.dispose();
            });
        }
    }

    // ============================================
    // FIN CONTROLLER
    // ============================================
    class FinController {
        constructor(parent, config = {}) {
            this.parent = parent;
            this.side = config.side || 'left'; // 'left' or 'right'
            this.size = config.size || 1;
            this.frequency = config.frequency || 3;
            this.amplitude = config.amplitude || 0.3;

            this.fin = this.createFin();
            this.time = 0;
        }

        createFin() {
            // Create fin geometry
            const shape = new THREE.Shape();
            shape.moveTo(0, 0);
            shape.quadraticCurveTo(0.5, 0.5, 1, 0);
            shape.quadraticCurveTo(0.5, -0.2, 0, 0);

            const geometry = new THREE.ExtrudeGeometry(shape, {
                depth: 0.1,
                bevelEnabled: true,
                bevelThickness: 0.02,
                bevelSize: 0.02,
                bevelSegments: 2
            });

            const material = new THREE.MeshStandardMaterial({
                color: 0x224466,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });

            const fin = new THREE.Mesh(geometry, material);
            fin.scale.setScalar(this.size);

            // Position based on side
            const xOffset = this.side === 'left' ? -0.5 : 0.5;
            fin.position.set(xOffset, 0, 0);
            fin.rotation.y = this.side === 'left' ? Math.PI / 4 : -Math.PI / 4;

            this.parent.add(fin);
            return fin;
        }

        animate(deltaTime, speed) {
            this.time += deltaTime * this.frequency * (1 + speed);

            // Flapping motion
            const flap = Math.sin(this.time) * this.amplitude;
            this.fin.rotation.z = flap;

            // Slight twist for realism
            this.fin.rotation.x = Math.cos(this.time * 0.5) * this.amplitude * 0.3;
        }

        dispose() {
            this.parent.remove(this.fin);
            this.fin.geometry.dispose();
            this.fin.material.dispose();
        }
    }

    // ============================================
    // SWIMMING ANIMATOR
    // ============================================
    class SwimmingAnimator {
        constructor(creature) {
            this.creature = creature;
            this.fins = [];
            this.tentacles = [];
            this.tail = null;
            this.time = 0;

            this.setupAnimations();
        }

        setupAnimations() {
            // Add fins
            this.fins.push(new FinController(this.creature, { side: 'left', size: 0.8 }));
            this.fins.push(new FinController(this.creature, { side: 'right', size: 0.8 }));

            // Add tail if applicable
            if (this.creature.userData.hasTail) {
                this.tail = new TentacleController(this.creature, {
                    segments: 8,
                    segmentLength: 0.3,
                    baseRadius: 0.3,
                    tipRadius: 0.05
                });
            }
        }

        animate(deltaTime, velocity) {
            this.time += deltaTime;
            const speed = velocity.length();
            const normalizedSpeed = Math.min(speed / 10, 1);

            // Animate fins
            this.fins.forEach(fin => fin.animate(deltaTime, normalizedSpeed));

            // Animate tail
            if (this.tail) {
                this.tail.animate(deltaTime, this.time, null);
            }

            // Body undulation
            if (this.creature.userData.bodySegments) {
                this.animateBodyUndulation(normalizedSpeed);
            }
        }

        animateBodyUndulation(speed) {
            const segments = this.creature.userData.bodySegments;
            const frequency = 3 + speed * 2;
            const amplitude = 0.1 + speed * 0.2;

            for (let i = 0; i < segments.length; i++) {
                const t = i / segments.length;
                const phase = this.time * frequency + t * Math.PI * 2;

                segments[i].rotation.y = Math.sin(phase) * amplitude * (1 - t);
            }
        }

        dispose() {
            this.fins.forEach(fin => fin.dispose());
            this.tentacles.forEach(tentacle => tentacle.dispose());
            if (this.tail) this.tail.dispose();
        }
    }

    // ============================================
    // FABRIC/SOFT BODY SIMULATION
    // ============================================
    class SoftBodySimulation {
        constructor(geometry, config = {}) {
            this.geometry = geometry;
            this.originalPositions = geometry.attributes.position.array.slice();
            this.vertexCount = geometry.attributes.position.count;

            this.stiffness = config.stiffness || 0.5;
            this.damping = config.damping || 0.9;
            this.mass = config.mass || 1;

            this.velocities = new Float32Array(this.vertexCount * 3);
            this.forces = new Float32Array(this.vertexCount * 3);

            this.pinnedVertices = new Set(config.pinnedVertices || []);
        }

        applyForce(vertexIndex, force) {
            if (this.pinnedVertices.has(vertexIndex)) return;

            const i3 = vertexIndex * 3;
            this.forces[i3] += force.x;
            this.forces[i3 + 1] += force.y;
            this.forces[i3 + 2] += force.z;
        }

        applyGlobalForce(force) {
            for (let i = 0; i < this.vertexCount; i++) {
                this.applyForce(i, force);
            }
        }

        update(deltaTime) {
            const positions = this.geometry.attributes.position.array;

            for (let i = 0; i < this.vertexCount; i++) {
                if (this.pinnedVertices.has(i)) continue;

                const i3 = i * 3;

                // Calculate spring force back to original shape
                const originalX = this.originalPositions[i3];
                const originalY = this.originalPositions[i3 + 1];
                const originalZ = this.originalPositions[i3 + 2];

                const currentX = positions[i3];
                const currentY = positions[i3 + 1];
                const currentZ = positions[i3 + 2];

                const springForceX = (originalX - currentX) * this.stiffness;
                const springForceY = (originalY - currentY) * this.stiffness;
                const springForceZ = (originalZ - currentZ) * this.stiffness;

                this.forces[i3] += springForceX;
                this.forces[i3 + 1] += springForceY;
                this.forces[i3 + 2] += springForceZ;

                // Integrate
                const invMass = 1 / this.mass;
                this.velocities[i3] += this.forces[i3] * invMass * deltaTime;
                this.velocities[i3 + 1] += this.forces[i3 + 1] * invMass * deltaTime;
                this.velocities[i3 + 2] += this.forces[i3 + 2] * invMass * deltaTime;

                // Damping
                this.velocities[i3] *= this.damping;
                this.velocities[i3 + 1] *= this.damping;
                this.velocities[i3 + 2] *= this.damping;

                // Update position
                positions[i3] += this.velocities[i3] * deltaTime;
                positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
                positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

                // Reset forces
                this.forces[i3] = 0;
                this.forces[i3 + 1] = 0;
                this.forces[i3 + 2] = 0;
            }

            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.computeVertexNormals();
        }

        dispose() {
            // Cleanup if needed
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    return {
        // Classes
        IKSolver,
        TentacleController,
        FinController,
        SwimmingAnimator,
        SoftBodySimulation,

        // Configuration
        getConfig: () => ({ ...CONFIG }),
        setConfig: (newConfig) => Object.assign(CONFIG, newConfig)
    };
})();

// Global access
window.ProceduralAnimation = ProceduralAnimation;
