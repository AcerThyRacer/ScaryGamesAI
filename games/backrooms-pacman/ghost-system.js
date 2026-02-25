/**
 * Ghost System - Dead players become haunting ghosts
 */

var GhostSystem = (function() {
    'use strict';

    var config = {
        ghostSpeed: 8.0,
        possessDuration: 5,
        scareCooldown: 10,
        maxGhosts: 10
    };

    var ghosts = {};
    var scene = null;
    var enabled = true;

    function init(threeScene) {
        scene = threeScene;
        ghosts = {};
        console.log('[GhostSystem] Initialized');
    }

    function createGhost(playerId, playerData) {
        if (Object.keys(ghosts).length >= config.maxGhosts) {
            console.log('[GhostSystem] Max ghosts reached');
            return null;
        }

        var ghost = {
            id: 'ghost_' + playerId,
            originalPlayerId: playerId,
            position: new THREE.Vector3(
                playerData.position.x,
                playerData.position.y + 1,
                playerData.position.z
            ),
            velocity: new THREE.Vector3(),
            mesh: null,
            state: 'idle',
            scareCooldown: 0,
            possessTarget: null
        };

        ghost.mesh = createGhostMesh(ghost.position);
        if (ghost.mesh) {
            scene.add(ghost.mesh);
        }

        ghosts[playerId] = ghost;
        console.log('[GhostSystem] Created ghost for player', playerId);

        return ghost;
    }

    function createGhostMesh(position) {
        var group = new THREE.Group();

        var geometry = new THREE.SphereGeometry(0.6, 16, 16);
        var material = new THREE.MeshStandardMaterial({
            color: 0x8888ff,
            transparent: true,
            opacity: 0.6,
            emissive: 0x4444aa,
            emissiveIntensity: 0.5
        });

        var body = new THREE.Mesh(geometry, material);
        group.add(body);

        var tailGeometry = new THREE.ConeGeometry(0.4, 0.8, 8);
        var tail = new THREE.Mesh(tailGeometry, material.clone());
        tail.position.y = -0.6;
        tail.rotation.x = Math.PI;
        group.add(tail);

        var eyes = [];
        for (var i = -1; i <= 1; i += 2) {
            var eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
            var eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            var eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(i * 0.2, 0.1, 0.5);
            group.add(eye);
            eyes.push(eye);
        }

        group.position.copy(position);
        group.userData.eyes = eyes;

        return group;
    }

    function updateGhost(ghost, deltaTime, livingPlayers) {
        if (!ghost.mesh || !enabled) return;

        if (ghost.scareCooldown > 0) {
            ghost.scareCooldown -= deltaTime;
        }

        var time = Date.now() * 0.002;
        ghost.mesh.position.y = ghost.position.y + Math.sin(time) * 0.2;
        ghost.mesh.rotation.y += deltaTime * 0.5;

        if (ghost.mesh.userData.eyes) {
            ghost.mesh.userData.eyes.forEach(function(eye) {
                eye.material.emissive = new THREE.Color(0x222222);
            });
        }

        if (livingPlayers && livingPlayers.length > 0) {
            var nearestPlayer = findNearestPlayer(ghost, livingPlayers);
            if (nearestPlayer) {
                moveTowards(ghost, nearestPlayer.position, deltaTime);

                if (ghost.scareCooldown <= 0 && ghost.position.distanceTo(nearestPlayer.position) < 3) {
                    scarePlayer(ghost, nearestPlayer);
                }
            }
        }

        ghost.mesh.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;
    }

    function findNearestPlayer(ghost, players) {
        var nearest = null;
        var nearestDist = Infinity;

        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            if (player.state !== 'alive') continue;

            var dist = ghost.position.distanceTo(
                new THREE.Vector3(player.position.x, player.position.y, player.position.z)
            );

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = player;
            }
        }

        return nearest;
    }

    function moveTowards(ghost, targetPos, deltaTime) {
        var direction = new THREE.Vector3().subVectors(targetPos, ghost.position).normalize();
        ghost.position.add(direction.multiplyScalar(config.ghostSpeed * deltaTime));
    }

    function scarePlayer(ghost, player) {
        console.log('[GhostSystem] Ghost', ghost.id, 'scaring player', player.id);

        ghost.scareCooldown = config.scareCooldown;

        if (typeof StressSystem !== 'undefined') {
            StressSystem.modifySanity(-5, 'ghost_scare');
        }

        if (typeof JumpscareSystem !== 'undefined') {
            JumpscareSystem.triggerFakeJumpscare('ghost');
        }

        if (ghost.mesh && ghost.mesh.userData.eyes) {
            ghost.mesh.userData.eyes.forEach(function(eye) {
                eye.material.emissive = new THREE.Color(0xff0000);
            });

            setTimeout(function() {
                if (ghost.mesh && ghost.mesh.userData.eyes) {
                    ghost.mesh.userData.eyes.forEach(function(eye) {
                        eye.material.emissive = new THREE.Color(0x222222);
                    });
                }
            }, 500);
        }
    }

    function possessObject(ghost, object) {
        if (!ghost || !object) return false;

        ghost.possessTarget = object;
        ghost.state = 'possessing';

        console.log('[GhostSystem] Ghost possessing object');

        setTimeout(function() {
            if (ghost.possessTarget) {
                if (object.userData && object.userData.onGhostPossess) {
                    object.userData.onGhostPossess();
                }
            }
            ghost.state = 'idle';
            ghost.possessTarget = null;
        }, config.possessDuration * 1000);

        return true;
    }

    function removeGhost(playerId) {
        var ghost = ghosts[playerId];
        if (ghost) {
            if (ghost.mesh) {
                scene.remove(ghost.mesh);
                ghost.mesh.geometry.dispose();
                ghost.mesh.material.dispose();
            }
            delete ghosts[playerId];
            console.log('[GhostSystem] Removed ghost for player', playerId);
        }
    }

    function clearAllGhosts() {
        for (var playerId in ghosts) {
            removeGhost(playerId);
        }
        ghosts = {};
    }

    function getGhosts() {
        return ghosts;
    }

    function getGhostCount() {
        return Object.keys(ghosts).length;
    }

    function setEnabled(value) {
        enabled = value;
    }

    return {
        init: init,
        createGhost: createGhost,
        updateGhost: updateGhost,
        removeGhost: removeGhost,
        clearAllGhosts: clearAllGhosts,
        possessObject: possessObject,
        getGhosts: getGhosts,
        getGhostCount: getGhostCount,
        setEnabled: setEnabled,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.GhostSystem = GhostSystem;
}
