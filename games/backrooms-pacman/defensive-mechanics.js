/**
 * Defensive Mechanics - Hiding, traps, barricades
 */

var DefensiveMechanics = (function() {
    'use strict';

    var config = {
        maxTraps: 10,
        maxBarricades: 5,
        barricadeHealth: 100,
        trapDamage: 50,
        trapCooldown: 3,
        hideSpots: []
    };

    var state = {
        isHiding: false,
        hidingSpot: null,
        hideTimer: 0,
        traps: [],
        barricades: []
    };

    var scene = null;

    function init(threeScene) {
        scene = threeScene;
        state.hideSpots = [];
        console.log('[DefensiveMechanics] Initialized');
    }

    function findHidingSpots(maze, playerPos) {
        state.hideSpots = [];

        var CELL = 4;
        for (var z = 0; z < maze.length; z++) {
            for (var x = 0; x < maze[z].length; x++) {
                if (maze[z][x] === 8) {
                    state.hideSpots.push({
                        gridPos: { x: x, z: z },
                        worldPos: new THREE.Vector3(
                            x * CELL + CELL / 2,
                            0,
                            z * CELL + CELL / 2
                        ),
                        occupied: false
                    });
                }
            }
        }

        console.log('[DefensiveMechanics] Found', state.hideSpots.length, 'hiding spots');
        return state.hideSpots;
    }

    function startHiding(position) {
        if (state.isHiding) return false;

        var spot = findNearestHidingSpot(position);
        if (!spot || spot.occupied) {
            console.log('[DefensiveMechanics] No available hiding spot');
            return false;
        }

        state.isHiding = true;
        state.hidingSpot = spot;
        spot.occupied = true;
        state.hideTimer = 0;

        console.log('[DefensiveMechanics] Player hiding');
        return true;
    }

    function stopHiding() {
        if (!state.isHiding) return;

        if (state.hidingSpot) {
            state.hidingSpot.occupied = false;
        }

        state.isHiding = false;
        state.hidingSpot = null;
        state.hideTimer = 0;

        console.log('[DefensiveMechanics] Player stopped hiding');
    }

    function updateHiding(deltaTime, playerPos) {
        if (!state.isHiding || !state.hidingSpot) return;

        state.hideTimer += deltaTime;

        var dist = playerPos.distanceTo(state.hidingSpot.worldPos);
        if (dist > 2) {
            stopHiding();
        }
    }

    function findNearestHidingSpot(position) {
        var nearest = null;
        var nearestDist = Infinity;

        for (var i = 0; i < state.hideSpots.length; i++) {
            var spot = state.hideSpots[i];
            var dist = position.distanceTo(spot.worldPos);

            if (dist < nearestDist && !spot.occupied) {
                nearestDist = dist;
                nearest = spot;
            }
        }

        return nearest;
    }

    function placeTrap(position, type) {
        if (state.traps.length >= config.maxTraps) {
            console.log('[DefensiveMechanics] Max traps reached');
            return null;
        }

        var trap = {
            id: 'trap_' + Date.now(),
            type: type || 'stun',
            position: position.clone(),
            armed: true,
            cooldown: 0,
            mesh: null
        };

        trap.mesh = createTrapMesh(trap);
        if (trap.mesh) {
            scene.add(trap.mesh);
        }

        state.traps.push(trap);
        console.log('[DefensiveMechanics] Placed trap:', type);

        return trap;
    }

    function createTrapMesh(trap) {
        var group = new THREE.Group();

        var baseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.1, 16);
        var baseMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        var base = new THREE.Mesh(baseGeo, baseMat);
        group.add(base);

        var lightGeo = new THREE.SphereGeometry(0.1, 8, 8);
        var lightMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        var light = new THREE.Mesh(lightGeo, lightMat);
        light.position.y = 0.15;
        group.add(light);

        group.position.copy(trap.position);
        group.position.y = 0.05;

        trap.mesh = group;
        trap.mesh.userData.light = light;

        return group;
    }

    function updateTraps(deltaTime, enemies) {
        for (var i = 0; i < state.traps.length; i++) {
            var trap = state.traps[i];

            if (trap.cooldown > 0) {
                trap.cooldown -= deltaTime;
            }

            if (trap.armed && trap.mesh && trap.mesh.userData.light) {
                var blink = Math.sin(Date.now() * 0.005) > 0;
                trap.mesh.userData.light.visible = blink;
            }

            if (trap.armed && enemies) {
                for (var j = 0; j < enemies.length; j++) {
                    var enemy = enemies[j];
                    var enemyPos = enemy.position || enemy.mesh?.position;

                    if (enemyPos && trap.position.distanceTo(enemyPos) < 1) {
                        triggerTrap(trap, enemy);
                        break;
                    }
                }
            }
        }
    }

    function triggerTrap(trap, enemy) {
        if (!trap.armed || trap.cooldown > 0) return;

        console.log('[DefensiveMechanics] Trap triggered!');

        trap.armed = false;
        trap.cooldown = config.trapCooldown;

        if (trap.mesh && trap.mesh.userData.light) {
            trap.mesh.userData.light.material.color.setHex(0x00ff00);
            trap.mesh.userData.light.material.opacity = 1.0;
        }

        if (trap.type === 'stun') {
            if (enemy.stun) {
                enemy.stun(config.trapDamage / 10);
            }
        }

        setTimeout(function() {
            if (trap.mesh) {
                trap.armed = true;
                trap.mesh.userData.light.material.color.setHex(0xff0000);
            }
        }, config.trapCooldown * 1000);
    }

    function placeBarricade(position, direction) {
        if (state.barricades.length >= config.maxBarricades) {
            console.log('[DefensiveMechanics] Max barricades reached');
            return null;
        }

        var barricade = {
            id: 'barricade_' + Date.now(),
            position: position.clone(),
            direction: direction || new THREE.Vector3(0, 0, 1),
            health: config.barricadeHealth,
            mesh: null
        };

        barricade.mesh = createBarricadeMesh(barricade);
        if (barricade.mesh) {
            scene.add(barricade.mesh);
        }

        state.barricades.push(barricade);
        console.log('[DefensiveMechanics] Placed barricade');

        return barricade;
    }

    function createBarricadeMesh(barricade) {
        var group = new THREE.Group();

        var plankGeo = new THREE.BoxGeometry(2, 0.1, 0.3);
        var plankMat = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9
        });

        for (var i = 0; i < 5; i++) {
            var plank = new THREE.Mesh(plankGeo, plankMat);
            plank.position.y = i * 0.4;
            plank.rotation.y = barricade.direction ? Math.atan2(barricade.direction.x, barricade.direction.z) : 0;
            group.add(plank);
        }

        group.position.copy(barricade.position);
        group.position.y = 1;

        return group;
    }

    function damageBarricade(barricade, damage) {
        if (!barricade) return false;

        barricade.health -= damage;
        console.log('[DefensiveMechanics] Barricade health:', barricade.health);

        if (barricade.health <= 0) {
            removeBarricade(barricade);
            return true;
        }

        return false;
    }

    function removeBarricade(barricade) {
        var index = state.barricades.indexOf(barricade);
        if (index !== -1) {
            if (barricade.mesh) {
                scene.remove(barricade.mesh);
                barricade.mesh.geometry.dispose();
                barricade.mesh.material.dispose();
            }
            state.barricades.splice(index, 1);
            console.log('[DefensiveMechanics] Barricade removed');
        }
    }

    function getHidingStatus() {
        return {
            isHiding: state.isHiding,
            hidingSpot: state.hidingSpot,
            hideTimer: state.hideTimer
        };
    }

    function getTraps() {
        return state.traps;
    }

    function getBarricades() {
        return state.barricades;
    }

    function reset() {
        stopHiding();

        state.traps.forEach(function(trap) {
            if (trap.mesh) {
                scene.remove(trap.mesh);
                trap.mesh.geometry.dispose();
                trap.mesh.material.dispose();
            }
        });
        state.traps = [];

        state.barricades.forEach(function(barricade) {
            if (barricade.mesh) {
                scene.remove(barricade.mesh);
                barricade.mesh.geometry.dispose();
                barricade.mesh.material.dispose();
            }
        });
        state.barricades = [];
    }

    return {
        init: init,
        findHidingSpots: findHidingSpots,
        startHiding: startHiding,
        stopHiding: stopHiding,
        updateHiding: updateHiding,
        placeTrap: placeTrap,
        updateTraps: updateTraps,
        placeBarricade: placeBarricade,
        damageBarricade: damageBarricade,
        removeBarricade: removeBarricade,
        getHidingStatus: getHidingStatus,
        getTraps: getTraps,
        getBarricades: getBarricades,
        reset: reset,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.DefensiveMechanics = DefensiveMechanics;
}
