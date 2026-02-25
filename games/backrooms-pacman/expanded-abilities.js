/**
 * Expanded Abilities System - 3 new powerful abilities
 */

var ExpandedAbilities = (function() {
    'use strict';

    var newAbilities = {
        timeDilation: {
            id: 'timeDilation',
            name: 'Time Dilation',
            hotkey: '6',
            cooldown: 25,
            duration: 5,
            description: 'Slow down time for 5 seconds',
            icon: '⏰',
            color: '#00ffff'
        },
        possession: {
            id: 'possession',
            name: 'Possession',
            hotkey: '7',
            cooldown: 35,
            duration: 8,
            description: 'Control Pac-Man briefly',
            icon: '👁️',
            color: '#ff00ff'
        },
        blackoutBomb: {
            id: 'blackoutBomb',
            name: 'Blackout Bomb',
            hotkey: '8',
            cooldown: 20,
            duration: 10,
            description: 'Create localized darkness',
            icon: '💣',
            color: '#000000'
        }
    };

    var activeEffects = {};
    var cooldowns = {};
    var scene = null;
    var camera = null;

    function init(threeScene, threeCamera) {
        scene = threeScene;
        camera = threeCamera;
        console.log('[ExpandedAbilities] Initialized with 3 new abilities');
    }

    function activateTimeDilation() {
        if (activeEffects.timeDilation) return false;

        console.log('[ExpandedAbilities] Time Dilation activated');

        activeEffects.timeDilation = {
            startTime: Date.now(),
            duration: newAbilities.timeDilation.duration * 1000,
            originalSpeed: 1.0
        };

        // Slow down all enemies
        if (typeof window !== 'undefined') {
            window.gameTimeScale = 0.3;
        }

        // Visual effect - blue tint
        createAbilityOverlay(newAbilities.timeDilation.color, 'TIME SLOWED');

        setTimeout(function() {
            deactivateTimeDilation();
        }, newAbilities.timeDilation.duration * 1000);

        return true;
    }

    function deactivateTimeDilation() {
        if (!activeEffects.timeDilation) return;

        window.gameTimeScale = 1.0;
        delete activeEffects.timeDilation;

        console.log('[ExpandedAbilities] Time Dilation ended');
    }

    function activatePossession() {
        if (activeEffects.possession || !pacman) return false;

        console.log('[ExpandedAbilities] Possession activated');

        activeEffects.possession = {
            startTime: Date.now(),
            duration: newAbilities.possession.duration * 1000,
            originalAI: true
        };

        // Take control of Pac-Man
        if (pacman) {
            pacman.userData.possessed = true;
            pacman.userData.possessionControl = {
                target: playerPos.clone()
            };
        }

        // Visual effect - purple tint
        createAbilityOverlay(newAbilities.possession.color, 'POSSESSED');

        setTimeout(function() {
            deactivatePossession();
        }, newAbilities.possession.duration * 1000);

        return true;
    }

    function deactivatePossession() {
        if (!activeEffects.possession) return;

        if (pacman) {
            pacman.userData.possessed = false;
            delete pacman.userData.possessionControl;
        }

        delete activeEffects.possession;
        console.log('[ExpandedAbilities] Possession ended');
    }

    function controlPossessedPacman(targetPosition) {
        if (!activeEffects.possession || !pacman) return;

        var possessedData = pacman.userData.possessionControl;
        if (possessedData) {
            possessedData.target.copy(targetPosition);
        }
    }

    function activateBlackoutBomb(position) {
        if (!position) position = playerPos.clone();

        console.log('[ExpandedAbilities] Blackout Bomb activated at', position);

        // Create darkness sphere
        var radius = 15;
        var darknessGeo = new THREE.SphereGeometry(radius, 32, 32);
        var darknessMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });

        var darknessSphere = new THREE.Mesh(darknessGeo, darknessMat);
        darknessSphere.position.copy(position);
        darknessSphere.position.y = radius / 2;
        scene.add(darknessSphere);

        // Add point light that turns OFF nearby lights
        var blackoutLight = new THREE.PointLight(0x000000, -2, radius);
        blackoutLight.position.copy(position);
        scene.add(blackoutLight);

        activeEffects.blackoutBomb = {
            startTime: Date.now(),
            duration: newAbilities.blackoutBomb.duration * 1000,
            mesh: darknessSphere,
            light: blackoutLight
        };

        // Visual effect
        createAbilityOverlay(newAbilities.blackoutBomb.color, 'BLACKOUT BOMB');

        setTimeout(function() {
            deactivateBlackoutBomb();
        }, newAbilities.blackoutBomb.duration * 1000);

        return true;
    }

    function deactivateBlackoutBomb() {
        if (!activeEffects.blackoutBomb) return;

        if (activeEffects.blackoutBomb.mesh) {
            scene.remove(activeEffects.blackoutBomb.mesh);
            activeEffects.blackoutBomb.mesh.geometry.dispose();
            activeEffects.blackoutBomb.mesh.material.dispose();
        }

        if (activeEffects.blackoutBomb.light) {
            scene.remove(activeEffects.blackoutBomb.light);
        }

        delete activeEffects.blackoutBomb;
        console.log('[ExpandedAbilities] Blackout Bomb ended');
    }

    function createAbilityOverlay(color, text) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;background:' + color + ';opacity:0.3;animation:abilityFlash 0.3s ease-out;';
        document.body.appendChild(overlay);

        var label = document.createElement('div');
        label.textContent = text;
        label.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%, -50%);color:#fff;font-size:2rem;font-weight:bold;text-shadow:0 0 20px #000;z-index:10000;';
        document.body.appendChild(label);

        setTimeout(function() {
            overlay.remove();
            label.remove();
        }, 1000);
    }

    function useAbility(abilityId, position) {
        if (cooldowns[abilityId] && Date.now() < cooldowns[abilityId]) {
            console.log('[ExpandedAbilities] Ability on cooldown');
            return false;
        }

        var success = false;

        switch (abilityId) {
            case 'timeDilation':
                success = activateTimeDilation();
                break;
            case 'possession':
                success = activatePossession();
                break;
            case 'blackoutBomb':
                success = activateBlackoutBomb(position);
                break;
        }

        if (success) {
            var ability = newAbilities[abilityId];
            cooldowns[abilityId] = Date.now() + (ability.cooldown * 1000);
        }

        return success;
    }

    function getCooldown(abilityId) {
        if (!cooldowns[abilityId]) return 0;
        var remaining = cooldowns[abilityId] - Date.now();
        return Math.max(0, remaining / 1000);
    }

    function getActiveEffects() {
        return activeEffects;
    }

    function getAllAbilities() {
        return Object.assign({}, newAbilities);
    }

    function reset() {
        deactivateTimeDilation();
        deactivatePossession();
        deactivateBlackoutBomb();
        activeEffects = {};
        cooldowns = {};
    }

    return {
        init: init,
        useAbility: useAbility,
        getCooldown: getCooldown,
        getActiveEffects: getActiveEffects,
        getAllAbilities: getAllAbilities,
        controlPossessedPacman: controlPossessedPacman,
        reset: reset,
        newAbilities: newAbilities
    };
})();

if (typeof window !== 'undefined') {
    window.ExpandedAbilities = ExpandedAbilities;
}
