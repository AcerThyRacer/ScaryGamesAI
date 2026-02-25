/**
 * Multi-Agent Pac-Man System
 * Implements flocking behavior, pack hunting, and coordinated attacks
 */

var MultiAgentPacman = (function() {
    'use strict';

    var config = {
        maxAgents: 5,
        separationDistance: 2.5,
        alignmentDistance: 4.0,
        cohesionDistance: 5.0,
        separationWeight: 2.5,
        alignmentWeight: 1.5,
        cohesionWeight: 1.2,
        chaseWeight: 3.0,
        maxSpeed: 3.5,
        maxForce: 0.15
    };

    var agents = [];
    var alphaIndex = 0;
    var scene = null;
    var maze = null;
    var playerPos = null;
    var enabled = true;

    function init(threeScene, mazeGrid, playerPosition) {
        scene = threeScene;
        maze = mazeGrid;
        playerPos = playerPosition;
        agents = [];
        console.log('[MultiAgentPacman] Initialized with max', config.maxAgents, 'agents');
    }

    function createAgent(position, variantType) {
        if (agents.length >= config.maxAgents) return null;

        var agent = {
            position: position.clone(),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
            ),
            acceleration: new THREE.Vector3(),
            variant: variantType || 'classic',
            mesh: null,
            isAlpha: agents.length === 0,
            state: 'hunt',
            targetPosition: null,
            lastKnownPlayerPos: null,
            memory: {
                lastSeenPlayer: null,
                suspectedPositions: [],
                noiseHistory: []
            }
        };

        // Create mesh based on variant
        agent.mesh = createAgentMesh(agent);
        if (agent.mesh) {
            scene.add(agent.mesh);
        }

        agents.push(agent);

        if (agents.length === 1) {
            alphaIndex = 0;
            agents[0].isAlpha = true;
        }

        return agent;
    }

    function createAgentMesh(agent) {
        var colors = {
            classic: 0xffff00,
            ghost_pac: 0x88ff88,
            berserker: 0xff0000,
            hunter: 0x8800ff,
            swarm: 0xff8800,
            shadow: 0x220022
        };

        var geometry = new THREE.SphereGeometry(0.8, 16, 16);
        var material = new THREE.MeshStandardMaterial({
            color: colors[agent.variant] || 0xffff00,
            emissive: colors[agent.variant] || 0xffff00,
            emissiveIntensity: 0.3,
            roughness: 0.4,
            metalness: 0.6
        });

        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(agent.position);

        // Add eyes
        var eyeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        var eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        var leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.25, 0.2, 0.65);
        mesh.add(leftEye);

        var rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.25, 0.2, 0.65);
        mesh.add(rightEye);

        // Add point light
        var light = new THREE.PointLight(
            colors[agent.variant] || 0xffff00,
            0.5,
            8
        );
        light.position.set(0, 0.3, 0);
        mesh.add(light);
        agent.light = light;

        return mesh;
    }

    function separate(agent) {
        var steer = new THREE.Vector3();
        var count = 0;

        for (var i = 0; i < agents.length; i++) {
            var other = agents[i];
            if (other === agent) continue;

            var d = agent.position.distanceTo(other.position);

            if (d > 0 && d < config.separationDistance) {
                var diff = new THREE.Vector3().subVectors(
                    agent.position,
                    other.position
                );
                diff.normalize();
                diff.divideScalar(d);
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer.divideScalar(count);
            steer.normalize();
            steer.multiplyScalar(config.maxSpeed);
            steer.sub(agent.velocity);
            steer.clampLength(0, config.maxForce);
        }

        return steer;
    }

    function align(agent) {
        var sum = new THREE.Vector3();
        var count = 0;

        for (var i = 0; i < agents.length; i++) {
            var other = agents[i];
            if (other === agent) continue;

            var d = agent.position.distanceTo(other.position);

            if (d > 0 && d < config.alignmentDistance) {
                sum.add(other.velocity);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count);
            sum.normalize();
            sum.multiplyScalar(config.maxSpeed);
            var steer = sum.sub(agent.velocity);
            steer.clampLength(0, config.maxForce);
            return steer;
        }

        return new THREE.Vector3();
    }

    function cohesion(agent) {
        var sum = new THREE.Vector3();
        var count = 0;

        for (var i = 0; i < agents.length; i++) {
            var other = agents[i];
            if (other === agent) continue;

            var d = agent.position.distanceTo(other.position);

            if (d > 0 && d < config.cohesionDistance) {
                sum.add(other.position);
                count++;
            }
        }

        if (count > 0) {
            sum.divideScalar(count);
            return seek(agent, sum);
        }

        return new THREE.Vector3();
    }

    function seek(agent, target) {
        var desired = new THREE.Vector3().subVectors(target, agent.position);
        desired.normalize();
        desired.multiplyScalar(config.maxSpeed);

        var steer = new THREE.Vector3().subVectors(desired, agent.velocity);
        steer.clampLength(0, config.maxForce);
        return steer;
    }

    function chase(agent, targetPos) {
        return seek(agent, targetPos);
    }

    function updateAgent(agent, deltaTime, playerPosition, pacmanPosition) {
        if (!agent.mesh) return;

        var forces = new THREE.Vector3();

        // Flocking behaviors
        forces.add(separate(agent).multiplyScalar(config.separationWeight));
        forces.add(align(agent).multiplyScalar(config.alignmentWeight));
        forces.add(cohesion(agent).multiplyScalar(config.cohesionWeight));

        // Alpha leads, others follow
        if (!agent.isAlpha && agents[alphaIndex]) {
            var alphaPos = agents[alphaIndex].position;
            var followForce = seek(agent, alphaPos);
            followForce.multiplyScalar(0.8);
            forces.add(followForce);
        }

        // Chase player
        if (playerPosition) {
            var chaseForce = chase(agent, playerPosition);
            chaseForce.multiplyScalar(config.chaseWeight);
            forces.add(chaseForce);

            // Update memory
            agent.memory.lastSeenPlayer = Date.now();
            agent.memory.lastKnownPlayerPos = playerPosition.clone();
        }

        // Apply forces
        agent.acceleration.add(forces);
        agent.velocity.add(agent.acceleration);
        agent.velocity.clampLength(0, config.maxSpeed);
        agent.position.add(agent.velocity.clone().multiplyScalar(deltaTime));
        agent.acceleration.set(0, 0, 0);

        // Keep on ground
        agent.position.y = 0.8;

        // Update mesh
        agent.mesh.position.copy(agent.position);

        // Look at direction of movement
        if (agent.velocity.lengthSq() > 0.01) {
            var target = agent.position.clone().add(agent.velocity);
            agent.mesh.lookAt(target);
        }

        // Variant-specific behavior
        applyVariantBehavior(agent, deltaTime, playerPosition);
    }

    function applyVariantBehavior(agent, deltaTime, playerPosition) {
        switch (agent.variant) {
            case 'berserker':
                // Speed up when close to player
                if (playerPosition && agent.position.distanceTo(playerPosition) < 8) {
                    config.maxSpeed = 5.0;
                    agent.light.intensity = 1.0;
                } else {
                    config.maxSpeed = 3.5;
                    agent.light.intensity = 0.5;
                }
                break;

            case 'ghost_pac':
                // Fade in/out
                var opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.3;
                agent.mesh.material.transparent = true;
                agent.mesh.material.opacity = opacity;
                break;

            case 'shadow':
                // Teleport when far from player
                if (playerPosition && agent.position.distanceTo(playerPosition) > 15) {
                    if (Math.random() < 0.02) {
                        agent.position.copy(playerPosition);
                        agent.position.x += (Math.random() - 0.5) * 10;
                        agent.position.z += (Math.random() - 0.5) * 10;
                        agent.mesh.position.copy(agent.position);
                    }
                }
                break;
        }
    }

    function update(deltaTime, playerPosition, pacmanPosition) {
        if (!enabled || agents.length === 0) return;

        for (var i = 0; i < agents.length; i++) {
            updateAgent(agents[i], deltaTime, playerPosition, pacmanPosition);
        }

        // Update alpha if current alpha dies or despawns
        if (!agents[alphaIndex] && agents.length > 0) {
            alphaIndex = 0;
            agents[0].isAlpha = true;
        }
    }

    function removeAgent(agent) {
        var index = agents.indexOf(agent);
        if (index !== -1) {
            if (agent.mesh) {
                scene.remove(agent.mesh);
                agent.mesh.geometry.dispose();
                agent.mesh.material.dispose();
            }
            agents.splice(index, 1);

            if (index === alphaIndex && agents.length > 0) {
                alphaIndex = 0;
                agents[0].isAlpha = true;
            }
        }
    }

    function clearAll() {
        for (var i = 0; i < agents.length; i++) {
            var agent = agents[i];
            if (agent.mesh) {
                scene.remove(agent.mesh);
                agent.mesh.geometry.dispose();
                agent.mesh.material.dispose();
            }
        }
        agents = [];
        alphaIndex = 0;
    }

    function setEnabled(value) {
        enabled = value;
        for (var i = 0; i < agents.length; i++) {
            if (agents[i].mesh) {
                agents[i].mesh.visible = value;
            }
        }
    }

    function getAgents() {
        return agents;
    }

    function getAgentCount() {
        return agents.length;
    }

    return {
        init: init,
        createAgent: createAgent,
        update: update,
        removeAgent: removeAgent,
        clearAll: clearAll,
        setEnabled: setEnabled,
        getAgents: getAgents,
        getAgentCount: getAgentCount,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.MultiAgentPacman = MultiAgentPacman;
}
