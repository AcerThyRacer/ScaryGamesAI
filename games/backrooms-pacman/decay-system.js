/**
 * Weathering & Decay System for Backrooms Pacman
 * Implements: Environmental degradation, blood splatters, footprint trails
 * 
 * @author ScaryGamesAI
 * @version 1.0
 */

var DecaySystem = (function() {
    'use strict';

    // Configuration
    var config = {
        decayRate: 0.001,          // How fast environment decays per second
        maxDecay: 0.8,             // Maximum decay level (0-1)
        bloodDecayRate: 0.0005,    // How fast blood fades
        footprintDecayRate: 0.02,  // How fast footprints fade
        maxBloodSplatters: 100,
        maxFootprints: 200,
        enableDecay: true,
        enableBlood: true,
        enableFootprints: true
    };

    // State
    var scene = null;
    var decayLevel = 0;            // Overall decay level (0 to maxDecay)
    var decayTime = 0;
    var bloodSplatters = [];
    var footprints = [];
    var wallDecals = [];
    var floorDecals = [];
    var enabled = true;

    // Texture cache
    var bloodTexture = null;
    var footprintTexture = null;
    var crackTexture = null;

    /**
     * Initialize decay system
     */
    function init(threeScene) {
        scene = threeScene;
        decayLevel = 0;
        decayTime = 0;

        // Create procedural textures
        createDecalTextures();

        console.log('[DecaySystem] Initialized');
    }

    /**
     * Create procedural decal textures
     */
    function createDecalTextures() {
        // Blood splatter texture
        bloodTexture = createBloodTexture();

        // Footprint texture
        footprintTexture = createFootprintTexture();

        // Crack texture
        crackTexture = createCrackTexture();
    }

    /**
     * Create blood splatter texture procedurally
     */
    function createBloodTexture() {
        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        var ctx = canvas.getContext('2d');

        // Clear
        ctx.clearRect(0, 0, 256, 256);

        // Create splatter
        var centerX = 128;
        var centerY = 128;
        var numDrops = 30 + Math.random() * 20;

        for (var i = 0; i < numDrops; i++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = Math.random() * 100;
            var dropX = centerX + Math.cos(angle) * distance;
            var dropY = centerY + Math.sin(angle) * distance;
            var dropSize = 5 + Math.random() * 20;

            // Blood drop
            var gradient = ctx.createRadialGradient(dropX, dropY, 0, dropX, dropY, dropSize);
            gradient.addColorStop(0, 'rgba(139, 0, 0, 0.9)');
            gradient.addColorStop(0.5, 'rgba(100, 0, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(50, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(dropX, dropY, dropSize, dropSize * 0.7, angle, 0, Math.PI * 2);
            ctx.fill();
        }

        // Central pool
        var poolGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
        poolGradient.addColorStop(0, 'rgba(139, 0, 0, 0.95)');
        poolGradient.addColorStop(0.7, 'rgba(100, 0, 0, 0.5)');
        poolGradient.addColorStop(1, 'rgba(50, 0, 0, 0)');

        ctx.fillStyle = poolGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
        ctx.fill();

        var texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Create footprint texture
     */
    function createFootprintTexture() {
        var canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 256;
        var ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 128, 256);

        // Foot outline
        ctx.fillStyle = 'rgba(40, 35, 20, 0.8)';
        ctx.beginPath();

        // Heel
        ctx.ellipse(64, 40, 35, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arch
        ctx.fillRect(35, 70, 58, 80);

        // Ball
        ctx.ellipse(64, 170, 40, 35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Toes
        for (var i = 0; i < 5; i++) {
            var toeX = 64 + (i - 2) * 12;
            var toeY = 210 + Math.abs(i - 2) * 3;
            var toeSize = 10 - Math.abs(i - 2) * 1.5;
            ctx.beginPath();
            ctx.arc(toeX, toeY, toeSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dirt/smudge effect
        ctx.globalAlpha = 0.3;
        for (var j = 0; j < 20; j++) {
            var smudgeX = 30 + Math.random() * 68;
            var smudgeY = 30 + Math.random() * 200;
            var smudgeSize = 3 + Math.random() * 8;
            ctx.fillStyle = 'rgba(50, 45, 30, 0.5)';
            ctx.beginPath();
            ctx.arc(smudgeX, smudgeY, smudgeSize, 0, Math.PI * 2);
            ctx.fill();
        }

        var texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Create crack texture
     */
    function createCrackTexture() {
        var canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        var ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 512, 512);

        // Generate crack pattern
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.8)';
        ctx.lineWidth = 2;

        var cracks = 5 + Math.floor(Math.random() * 5);
        for (var i = 0; i < cracks; i++) {
            var startX = Math.random() * 512;
            var startY = Math.random() * 512;

            ctx.beginPath();
            ctx.moveTo(startX, startY);

            var x = startX;
            var y = startY;
            var segments = 10 + Math.floor(Math.random() * 20);

            for (var j = 0; j < segments; j++) {
                x += (Math.random() - 0.5) * 40;
                y += (Math.random() - 0.5) * 40;
                ctx.lineTo(x, y);

                // Branch occasionally
                if (Math.random() < 0.2 && j > 5) {
                    var branchX = x;
                    var branchY = y;
                    for (var k = 0; k < 5; k++) {
                        branchX += (Math.random() - 0.5) * 30;
                        branchY += (Math.random() - 0.5) * 30;
                        ctx.lineTo(branchX, branchY);
                    }
                }
            }

            ctx.stroke();
        }

        var texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Add blood splatter at position
     */
    function addBloodSplatter(position, normal, size, intensity) {
        if (!enabled || !config.enableBlood) return;
        if (bloodSplatters.length >= config.maxBloodSplatters) {
            // Remove oldest
            var old = bloodSplatters.shift();
            if (old && old.mesh) {
                scene.remove(old.mesh);
                old.mesh.geometry.dispose();
                old.mesh.material.dispose();
            }
        }

        // Create decal mesh
        var decalGeometry = new THREE.PlaneGeometry(size, size);
        var decalMaterial = new THREE.MeshBasicMaterial({
            map: bloodTexture,
            transparent: true,
            opacity: intensity || 0.8,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });

        var decal = new THREE.Mesh(decalGeometry, decalMaterial);
        decal.position.copy(position);
        decal.lookAt(position.clone().add(normal));
        decal.rotation.z = Math.random() * Math.PI * 2;

        scene.add(decal);

        bloodSplatters.push({
            mesh: decal,
            intensity: intensity || 0.8,
            age: 0
        });

        return bloodSplatters[bloodSplatters.length - 1];
    }

    /**
     * Add footprint at position
     */
    function addFootprint(position, rotation, isLeft) {
        if (!enabled || !config.enableFootprints) return;
        if (footprints.length >= config.maxFootprints) {
            // Remove oldest
            var old = footprints.shift();
            if (old && old.mesh) {
                scene.remove(old.mesh);
                old.mesh.geometry.dispose();
                old.mesh.material.dispose();
            }
        }

        // Create footprint decal
        var decalGeometry = new THREE.PlaneGeometry(0.3, 0.6);
        var decalMaterial = new THREE.MeshBasicMaterial({
            map: footprintTexture,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });

        var decal = new THREE.Mesh(decalGeometry, decalMaterial);
        decal.position.copy(position);
        decal.position.y += 0.01; // Slightly above floor
        decal.rotation.z = rotation;
        if (!isLeft) {
            decal.scale.x = -1; // Mirror for right foot
        }

        scene.add(decal);

        footprints.push({
            mesh: decal,
            age: 0
        });

        return footprints[footprints.length - 1];
    }

    /**
     * Add wall crack
     */
    function addWallCrack(position, normal, size) {
        if (!enabled) return;

        var decalGeometry = new THREE.PlaneGeometry(size, size);
        var decalMaterial = new THREE.MeshBasicMaterial({
            map: crackTexture,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1
        });

        var decal = new THREE.Mesh(decalGeometry, decalMaterial);
        decal.position.copy(position);
        decal.lookAt(position.clone().add(normal));
        decal.rotation.z = Math.random() * Math.PI * 2;

        scene.add(decal);

        wallDecals.push({
            mesh: decal,
            age: 0
        });

        return wallDecals[wallDecals.length - 1];
    }

    /**
     * Update decay system
     */
    function update(deltaTime, playerPosition, pacmanPosition, sanityLevel) {
        if (!enabled || !config.enableDecay) return;

        decayTime += deltaTime;

        // Increase decay over time
        if (decayLevel < config.maxDecay) {
            decayLevel += config.decayRate * deltaTime;
        }

        // Decay rate increases when Pac-Man is nearby
        if (pacmanPosition) {
            var distToPacman = new THREE.Vector3(
                playerPosition.x - pacmanPosition.x,
                0,
                playerPosition.z - pacmanPosition.z
            ).length();

            if (distToPacman < 10) {
                decayLevel += config.decayRate * 2 * deltaTime;
            }
        }

        // Decay increases at low sanity
        if (sanityLevel < 50) {
            decayLevel += config.decayRate * (1 - sanityLevel / 50) * deltaTime;
        }

        // Update blood splatters (fade over time)
        for (var i = bloodSplatters.length - 1; i >= 0; i--) {
            var splatter = bloodSplatters[i];
            splatter.age += deltaTime;
            splatter.intensity -= config.bloodDecayRate * deltaTime;

            if (splatter.mesh) {
                splatter.mesh.material.opacity = splatter.intensity;
            }

            if (splatter.intensity <= 0) {
                if (splatter.mesh) {
                    scene.remove(splatter.mesh);
                    splatter.mesh.geometry.dispose();
                    splatter.mesh.material.dispose();
                }
                bloodSplatters.splice(i, 1);
            }
        }

        // Update footprints (fade and disappear)
        for (var j = footprints.length - 1; j >= 0; j--) {
            var footprint = footprints[j];
            footprint.age += deltaTime;
            var footprintOpacity = 0.6 * (1 - footprint.age / 30);

            if (footprint.mesh) {
                footprint.mesh.material.opacity = Math.max(0, footprintOpacity);
            }

            if (footprint.age > 30) {
                if (footprint.mesh) {
                    scene.remove(footprint.mesh);
                    footprint.mesh.geometry.dispose();
                    footprint.mesh.material.dispose();
                }
                footprints.splice(j, 1);
            }
        }

        // Update wall decals
        for (var k = wallDecals.length - 1; k >= 0; k--) {
            var decal = wallDecals[k];
            decal.age += deltaTime;

            // Wall cracks are permanent
            if (decal.age > 300) { // 5 minutes
                if (decal.mesh) {
                    scene.remove(decal.mesh);
                    decal.mesh.geometry.dispose();
                    decal.mesh.material.dispose();
                }
                wallDecals.splice(k, 1);
            }
        }
    }

    /**
     * Get current decay level
     */
    function getDecayLevel() {
        return decayLevel;
    }

    /**
     * Reset decay (for new game)
     */
    function reset() {
        decayLevel = 0;
        decayTime = 0;

        // Clear all decals
        for (var i = 0; i < bloodSplatters.length; i++) {
            if (bloodSplatters[i].mesh) {
                scene.remove(bloodSplatters[i].mesh);
                bloodSplatters[i].mesh.geometry.dispose();
                bloodSplatters[i].mesh.material.dispose();
            }
        }

        for (var j = 0; j < footprints.length; j++) {
            if (footprints[j].mesh) {
                scene.remove(footprints[j].mesh);
                footprints[j].mesh.geometry.dispose();
                footprints[j].mesh.material.dispose();
            }
        }

        for (var k = 0; k < wallDecals.length; k++) {
            if (wallDecals[k].mesh) {
                scene.remove(wallDecals[k].mesh);
                wallDecals[k].mesh.geometry.dispose();
                wallDecals[k].mesh.material.dispose();
            }
        }

        bloodSplatters = [];
        footprints = [];
        wallDecals = [];
    }

    /**
     * Enable/disable system
     */
    function setEnabled(value) {
        enabled = value;
    }

    /**
     * Get statistics
     */
    function getStats() {
        return {
            decayLevel: decayLevel,
            decayTime: decayTime,
            bloodSplatters: bloodSplatters.length,
            footprints: footprints.length,
            wallDecals: wallDecals.length
        };
    }

    // Public API
    return {
        init: init,
        addBloodSplatter: addBloodSplatter,
        addFootprint: addFootprint,
        addWallCrack: addWallCrack,
        update: update,
        getDecayLevel: getDecayLevel,
        reset: reset,
        setEnabled: setEnabled,
        getStats: getStats,
        config: config
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.DecaySystem = DecaySystem;
}
