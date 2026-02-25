/**
 * Story Elements - Notes, audio logs, environmental clues
 */

var StoryElements = (function() {
    'use strict';

    var storyItems = {
        notes: [
            {
                id: 'note_1',
                title: 'First Entry',
                content: 'Day 1: I found myself here. The yellow walls stretch endlessly. I hear something moving...',
                location: { x: 10, z: 10 },
                episode: 1
            },
            {
                id: 'note_2',
                title: 'Warning',
                content: 'Day 3: Don\'t trust the shadows. They move when you\'re not looking. Stay in the light.',
                location: { x: 15, z: 8 },
                episode: 2
            },
            {
                id: 'note_3',
                title: 'Research Notes',
                content: 'The creatures... they\'re not just monsters. They\'re evolving. Learning our patterns.',
                location: { x: 12, z: 20 },
                episode: 4
            },
            {
                id: 'note_4',
                title: 'Final Warning',
                content: 'If you find this, don\'t go deeper. The sewers below are worse than anything up here.',
                location: { x: 25, z: 15 },
                episode: 7
            }
        ],
        audioLogs: [
            {
                id: 'audio_1',
                speaker: 'Dr. Martinez',
                duration: 45,
                transcript: 'Log 47: Subject shows increased aggression in dark environments. Recommend avoiding low-light areas.',
                location: { x: 8, z: 12 },
                episode: 2
            },
            {
                id: 'audio_2',
                speaker: 'Unknown',
                duration: 30,
                transcript: 'They\'re not just chasing us. They\'re herding us. Towards something.',
                location: { x: 20, z: 18 },
                episode: 5
            },
            {
                id: 'audio_3',
                speaker: 'Dr. Martinez',
                duration: 60,
                transcript: 'The truth about the Backrooms... it\'s not a place. It\'s a organism. And we\'re inside it.',
                location: { x: 30, z: 25 },
                episode: 9
            }
        ],
        wallMessages: [
            {
                id: 'wall_1',
                text: 'HELP US',
                location: { x: 5, z: 7 },
                visible: false,
                episode: 1
            },
            {
                id: 'wall_2',
                text: 'THEY SEE YOU',
                location: { x: 18, z: 12 },
                visible: false,
                episode: 3
            },
            {
                id: 'wall_3',
                text: 'RUN',
                location: { x: 22, z: 20 },
                visible: false,
                episode: 6
            },
            {
                id: 'wall_4',
                text: 'THE TRUTH IS BELOW',
                location: { x: 28, z: 15 },
                visible: false,
                episode: 8
            }
        ]
    };

    var collectedItems = [];
    var scene = null;
    var meshes = [];

    function init(threeScene) {
        scene = threeScene;
        collectedItems = [];
        console.log('[StoryElements] Initialized');
    }

    function spawnStoryItems(maze, episodeNum) {
        // Spawn notes
        storyItems.notes.forEach(function(note) {
            if (note.episode === episodeNum || episodeNum === 'all') {
                spawnNote(note);
            }
        });

        // Spawn audio logs
        storyItems.audioLogs.forEach(function(log) {
            if (log.episode === episodeNum || episodeNum === 'all') {
                spawnAudioLog(log);
            }
        });

        // Mark wall messages
        storyItems.wallMessages.forEach(function(msg) {
            if (msg.episode === episodeNum || episodeNum === 'all') {
                msg.visible = true;
            }
        });
    }

    function spawnNote(note) {
        var geometry = new THREE.PlaneGeometry(0.4, 0.5);
        var material = new THREE.MeshBasicMaterial({
            color: 0xffffdd,
            side: THREE.DoubleSide
        });

        var noteMesh = new THREE.Mesh(geometry, material);
        var CELL = 4;
        noteMesh.position.set(
            note.location.x * CELL + CELL / 2,
            1.2,
            note.location.z * CELL + CELL / 2
        );
        noteMesh.rotation.x = -Math.PI / 2;
        noteMesh.userData.storyItem = {
            type: 'note',
            data: note
        };

        scene.add(noteMesh);
        meshes.push(noteMesh);
    }

    function spawnAudioLog(log) {
        var geometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
        var material = new THREE.MeshStandardMaterial({
            color: 0x333333,
            emissive: 0xff4400,
            emissiveIntensity: 0.5
        });

        var logMesh = new THREE.Mesh(geometry, material);
        var CELL = 4;
        logMesh.position.set(
            log.location.x * CELL + CELL / 2,
            0.8,
            log.location.z * CELL + CELL / 2
        );
        logMesh.userData.storyItem = {
            type: 'audio',
            data: log
        };

        scene.add(logMesh);
        meshes.push(logMesh);
    }

    function checkCollection(playerPos, radius) {
        var collected = [];

        for (var i = meshes.length - 1; i >= 0; i--) {
            var mesh = meshes[i];
            var dist = mesh.position.distanceTo(playerPos);

            if (dist < radius && mesh.userData.storyItem) {
                var item = mesh.userData.storyItem;
                collectItem(item);
                collected.push(item);

                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                meshes.splice(i, 1);
            }
        }

        return collected;
    }

    function collectItem(item) {
        if (collectedItems.find(function(i) { return i.id === item.data.id; })) {
            return false;
        }

        collectedItems.push({
            id: item.data.id,
            type: item.type,
            data: item.data,
            collectedAt: Date.now()
        });

        console.log('[StoryElements] Collected:', item.type, item.data.id);

        // Show item content
        showItemContent(item);

        return true;
    }

    function showItemContent(item) {
        var overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:rgba(0,0,0,0.95);padding:30px;max-width:500px;border:2px solid #666;border-radius:8px;z-index:9999;color:#fff;font-family:monospace;';

        var content = '';
        if (item.type === 'note') {
            content = '<h2 style="color:#ffff88;">📝 ' + item.data.title + '</h2>' +
                     '<p style="line-height:1.6;">' + item.data.content + '</p>';
        } else if (item.type === 'audio') {
            content = '<h2 style="color:#ff8844;">🎙️ Audio Log - ' + item.data.speaker + '</h2>' +
                     '<p style="line-height:1.6;">"' + item.data.transcript + '"</p>' +
                     '<p style="color:#888;">Duration: ' + item.data.duration + 's</p>';
        }

        overlay.innerHTML = content + '<button onclick="this.parentElement.remove()" style="margin-top:20px;padding:10px 20px;background:#666;color:#fff;border:none;cursor:pointer;">Close</button>';

        document.body.appendChild(overlay);
    }

    function renderWallMessages(camera) {
        storyItems.wallMessages.forEach(function(msg) {
            if (!msg.visible) return;

            var CELL = 4;
            var worldPos = new THREE.Vector3(
                msg.location.x * CELL + CELL / 2,
                1.6,
                msg.location.z * CELL + CELL / 2
            );

            var dist = worldPos.distanceTo(camera.position);
            if (dist < 15) {
                // Would render 3D text in production
                console.log('[StoryElements] Wall message visible:', msg.text);
            }
        });
    }

    function getCollectedItems() {
        return collectedItems;
    }

    function getCollectedNotes() {
        return collectedItems.filter(function(i) { return i.type === 'note'; });
    }

    function getCollectedAudioLogs() {
        return collectedItems.filter(function(i) { return i.type === 'audio'; });
    }

    function reset() {
        collectedItems = [];

        meshes.forEach(function(mesh) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        });
        meshes = [];

        storyItems.wallMessages.forEach(function(msg) {
            msg.visible = false;
        });
    }

    return {
        init: init,
        spawnStoryItems: spawnStoryItems,
        checkCollection: checkCollection,
        collectItem: collectItem,
        showItemContent: showItemContent,
        renderWallMessages: renderWallMessages,
        getCollectedItems: getCollectedItems,
        getCollectedNotes: getCollectedNotes,
        getCollectedAudioLogs: getCollectedAudioLogs,
        reset: reset
    };
})();

if (typeof window !== 'undefined') {
    window.StoryElements = StoryElements;
}
