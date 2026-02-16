/* Backrooms: Pac-Man - A* pathfinding worker
   Offloads path computation off the main thread. */

(function () {
    'use strict';

    var ROWS = 0;
    var COLS = 0;
    var walls = null; // Uint8Array, 1 = wall, 0 = open

    function idx(r, c) { return r * COLS + c; }

    function findPath(sr, sc, er, ec) {
        if (!walls || ROWS <= 0 || COLS <= 0) return [];
        if (sr === er && sc === ec) return [];
        if (sr < 0 || sr >= ROWS || sc < 0 || sc >= COLS) return [];
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) return [];
        if (walls[idx(sr, sc)] === 1) return [];
        if (walls[idx(er, ec)] === 1) return [];

        var size = ROWS * COLS;
        var s = idx(sr, sc);
        var e = idx(er, ec);

        var open = [s];
        var inOpen = new Uint8Array(size);
        inOpen[s] = 1;

        var closed = new Uint8Array(size);
        var cameFrom = new Int32Array(size);
        for (var i = 0; i < size; i++) cameFrom[i] = -1;

        var gScore = new Float32Array(size);
        var fScore = new Float32Array(size);
        for (var j = 0; j < size; j++) { gScore[j] = 1e20; fScore[j] = 1e20; }

        gScore[s] = 0;
        fScore[s] = Math.abs(sr - er) + Math.abs(sc - ec);

        var dirs = [
            { dr: 0, dc: 1 },
            { dr: 0, dc: -1 },
            { dr: 1, dc: 0 },
            { dr: -1, dc: 0 }
        ];

        while (open.length > 0) {
            // Find lowest f in open set (small grid => linear scan is fine)
            var bestIdx = 0;
            var bestF = fScore[open[0]];
            for (var oi = 1; oi < open.length; oi++) {
                var id = open[oi];
                var f = fScore[id];
                if (f < bestF) { bestF = f; bestIdx = oi; }
            }

            var current = open.splice(bestIdx, 1)[0];
            inOpen[current] = 0;

            if (current === e) {
                var path = [];
                var cur = current;
                while (cur !== s && cameFrom[cur] !== -1) {
                    path.unshift({ r: Math.floor(cur / COLS), c: cur % COLS });
                    cur = cameFrom[cur];
                }
                return path;
            }

            closed[current] = 1;

            var cr = Math.floor(current / COLS);
            var cc = current % COLS;

            for (var d = 0; d < dirs.length; d++) {
                var nr = cr + dirs[d].dr;
                var nc = cc + dirs[d].dc;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
                var nid = idx(nr, nc);
                if (walls[nid] === 1) continue;
                if (closed[nid]) continue;

                var tentativeG = gScore[current] + 1;
                if (tentativeG < gScore[nid]) {
                    cameFrom[nid] = current;
                    gScore[nid] = tentativeG;
                    fScore[nid] = tentativeG + Math.abs(nr - er) + Math.abs(nc - ec);
                    if (!inOpen[nid]) {
                        open.push(nid);
                        inOpen[nid] = 1;
                    }
                }
            }
        }

        return [];
    }

    self.onmessage = function (ev) {
        var msg = ev.data || {};
        if (msg.type === 'init') {
            ROWS = msg.rows | 0;
            COLS = msg.cols | 0;
            walls = msg.walls; // transferred Uint8Array
            self.postMessage({ type: 'ready' });
            return;
        }

        if (msg.type === 'path') {
            var path = findPath(msg.sr | 0, msg.sc | 0, msg.er | 0, msg.ec | 0);
            self.postMessage({ type: 'path', id: msg.id, path: path });
            return;
        }
    };
})();

