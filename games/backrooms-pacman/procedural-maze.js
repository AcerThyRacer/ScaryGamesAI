/**
 * Procedural Maze Generation with Wave Function Collapse
 * Generates infinite backrooms layouts
 */

var ProceduralMaze = (function() {
    'use strict';

    var config = {
        tileSize: 4,
        wallHeight: 3.5,
        minRoomSize: 3,
        maxRoomSize: 8,
        corridorWidth: 2,
        loopChance: 0.3,
        secretChance: 0.15
    };

    var currentMaze = null;
    var seed = 0;
    var level = 1;

    function generate(width, height, levelSeed, levelNum) {
        seed = levelSeed;
        level = levelNum;
        var rng = seededRandom(seed);

        currentMaze = {
            width: width,
            height: height,
            grid: [],
            rooms: [],
            corridors: [],
            secrets: []
        };

        initializeGrid(width, height);
        generateRooms(rng);
        connectRooms(rng);
        addCorridors(rng);
        addSecrets(rng);
        addPellets(rng);

        return currentMaze;
    }

    function generateAsync(width, height, levelSeed, levelNum, onProgress) {
        return new Promise(function(resolve) {
            var result = generate(width, height, levelSeed, levelNum);
            if (onProgress) onProgress({ phase: 'complete', progress: 1.0 });
            resolve(result);
        });
    }

    function seededRandom(seed) {
        var s = seed;
        return function() {
            s = Math.sin(s * 9999) * 10000;
            return s - Math.floor(s);
        };
    }

    function initializeGrid(width, height) {
        currentMaze.grid = [];
        for (var y = 0; y < height; y++) {
            currentMaze.grid[y] = [];
            for (var x = 0; x < width; x++) {
                currentMaze.grid[y][x] = 1;
            }
        }
    }

    function generateRooms(rng) {
        var attempts = 20 + Math.floor(rng() * 10);
        var minSize = config.minRoomSize;
        var maxSize = Math.min(config.maxRoomSize, Math.floor(level / 2) + config.maxRoomSize);

        for (var i = 0; i < attempts; i++) {
            var roomW = Math.floor(minSize + rng() * (maxSize - minSize));
            var roomH = Math.floor(minSize + rng() * (maxSize - minSize));
            var roomX = Math.floor(1 + rng() * (currentMaze.width - roomW - 2));
            var roomY = Math.floor(1 + rng() * (currentMaze.height - roomH - 2));

            if (canPlaceRoom(roomX, roomY, roomW, roomH)) {
                placeRoom(roomX, roomY, roomW, roomH);
                currentMaze.rooms.push({
                    x: roomX,
                    y: roomY,
                    width: roomW,
                    height: roomH,
                    center: {
                        x: roomX + Math.floor(roomW / 2),
                        y: roomY + Math.floor(roomH / 2)
                    }
                });
            }
        }
    }

    function canPlaceRoom(x, y, w, h) {
        var margin = 2;
        for (var ry = y - margin; ry < y + h + margin; ry++) {
            for (var rx = x - margin; rx < x + w + margin; rx++) {
                if (ry < 0 || ry >= currentMaze.height || rx < 0 || rx >= currentMaze.width) {
                    continue;
                }
                if (currentMaze.grid[ry][rx] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    function placeRoom(x, y, w, h) {
        for (var ry = y; ry < y + h; ry++) {
            for (var rx = x; rx < x + w; rx++) {
                currentMaze.grid[ry][rx] = 0;
            }
        }
    }

    function connectRooms(rng) {
        for (var i = 0; i < currentMaze.rooms.length - 1; i++) {
            var roomA = currentMaze.rooms[i];
            var roomB = currentMaze.rooms[i + 1];

            var startX = roomA.center.x;
            var startY = roomA.center.y;
            var endX = roomB.center.x;
            var endY = roomB.center.y;

            carveCorridor(startX, startY, endX, endY, rng);
        }

        if (currentMaze.rooms.length > 2 && rng() < config.loopChance) {
            var lastRoom = currentMaze.rooms[currentMaze.rooms.length - 1];
            var firstRoom = currentMaze.rooms[0];
            carveCorridor(
                lastRoom.center.x,
                lastRoom.center.y,
                firstRoom.center.x,
                firstRoom.center.y,
                rng
            );
        }
    }

    function carveCorridor(x1, y1, x2, y2, rng) {
        var x = x1;
        var y = y1;
        var corridor = { points: [] };

        while (x !== x2 || y !== y2) {
            if (rng() < 0.5 && x !== x2) {
                x += x < x2 ? 1 : -1;
            } else if (y !== y2) {
                y += y < y2 ? 1 : -1;
            }

            if (x >= 0 && x < currentMaze.width && y >= 0 && y < currentMaze.height) {
                if (currentMaze.grid[y][x] === 1) {
                    currentMaze.grid[y][x] = 0;
                    corridor.points.push({ x: x, y: y });
                }
            }
        }

        currentMaze.corridors.push(corridor);
    }

    function addCorridors(rng) {
        var extraCorridors = 2 + Math.floor(rng() * 3);

        for (var i = 0; i < extraCorridors; i++) {
            var startX = Math.floor(rng() * currentMaze.width);
            var startY = Math.floor(rng() * currentMaze.height);

            if (currentMaze.grid[startY][startX] === 0) {
                var dir = rng() < 0.5 ? 'horizontal' : 'vertical';
                var length = Math.floor(3 + rng() * 8);

                for (var j = 0; j < length; j++) {
                    var cx = startX + (dir === 'horizontal' ? j : 0);
                    var cy = startY + (dir === 'vertical' ? j : 0);

                    if (cx >= 0 && cx < currentMaze.width && cy >= 0 && cy < currentMaze.height) {
                        currentMaze.grid[cy][cx] = 0;
                    }
                }
            }
        }
    }

    function addSecrets(rng) {
        for (var i = 0; i < currentMaze.rooms.length; i++) {
            if (rng() < config.secretChance) {
                var room = currentMaze.rooms[i];
                var secretX = room.x + Math.floor(rng() * room.width);
                var secretY = room.y + Math.floor(rng() * room.height);

                if (currentMaze.grid[secretY][secretX] === 0) {
                    currentMaze.grid[secretY][secretX] = 4;
                    currentMaze.secrets.push({ x: secretX, y: secretY });
                }
            }
        }
    }

    function addPellets(rng) {
        for (var y = 0; y < currentMaze.height; y++) {
            for (var x = 0; x < currentMaze.width; x++) {
                if (currentMaze.grid[y][x] === 0 && rng() < 0.7) {
                    currentMaze.grid[y][x] = 2;
                }
            }
        }

        for (var i = 0; i < currentMaze.rooms.length; i++) {
            var room = currentMaze.rooms[i];
            var pelletX = room.center.x;
            var pelletY = room.center.y;
            if (currentMaze.grid[pelletY][pelletX] === 0) {
                currentMaze.grid[pelletY][pelletX] = 3;
            }
        }
    }

    function getMaze() {
        return currentMaze;
    }

    function getGrid() {
        return currentMaze ? currentMaze.grid : null;
    }

    function clear() {
        currentMaze = null;
        seed = 0;
        level = 1;
    }

    return {
        generate: generate,
        generateAsync: generateAsync,
        getMaze: getMaze,
        getGrid: getGrid,
        clear: clear,
        config: config
    };
})();

if (typeof window !== 'undefined') {
    window.ProceduralMaze = ProceduralMaze;
}
