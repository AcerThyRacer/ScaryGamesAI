/* ============================================
   ScaryGamesAI — Leaderboards System
   Per-game top 10, localStorage-based
   ============================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'scarygames_leaderboards';
    const MAX_ENTRIES = 10;

    var boards = {};

    function load() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            boards = raw ? JSON.parse(raw) : {};
        } catch (e) { boards = {}; }
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(boards)); } catch (e) { }
    }

    function submitScore(gameId, playerName, score, meta) {
        if (!boards[gameId]) boards[gameId] = [];
        var entry = {
            name: playerName || 'Anonymous',
            score: score,
            date: new Date().toISOString(),
            meta: meta || null,
        };
        boards[gameId].push(entry);
        // Sort descending
        boards[gameId].sort(function (a, b) { return b.score - a.score; });
        // Trim to top N
        if (boards[gameId].length > MAX_ENTRIES) boards[gameId].length = MAX_ENTRIES;
        save();
        // Return rank (1-based), or 0 if not on board
        var rank = boards[gameId].findIndex(function (e) { return e === entry; });
        return rank >= 0 ? rank + 1 : 0;
    }

    function getBoard(gameId) {
        return (boards[gameId] || []).slice();
    }

    function getAllBoards() {
        return Object.assign({}, boards);
    }

    function getBestScore(gameId) {
        var board = boards[gameId];
        return board && board.length > 0 ? board[0].score : 0;
    }

    function clearBoard(gameId) {
        if (gameId) {
            delete boards[gameId];
        } else {
            boards = {};
        }
        save();
    }

    function generateShareLink(gameId, playerName, score) {
        var base = window.location.origin + '/leaderboards.html';
        var params = '?game=' + encodeURIComponent(gameId) +
            '&name=' + encodeURIComponent(playerName) +
            '&score=' + encodeURIComponent(score);
        return base + params;
    }

    function renderBoard(container, gameId, gameTitle) {
        if (!container) return;
        var board = getBoard(gameId);
        var html = '<div class="lb-board">';
        html += '<h3 class="lb-title">' + (gameTitle || gameId) + '</h3>';
        if (board.length === 0) {
            html += '<p class="lb-empty">No scores yet. Be the first!</p>';
        } else {
            html += '<table class="lb-table"><thead><tr><th>#</th><th>Player</th><th>Score</th><th>Date</th></tr></thead><tbody>';
            board.forEach(function (entry, idx) {
                var medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : (idx + 1)));
                var d = new Date(entry.date);
                var dateStr = d.toLocaleDateString();
                html += '<tr class="' + (idx < 3 ? 'lb-top' : '') + '"><td>' + medal + '</td><td>' + entry.name + '</td><td>' + entry.score + '</td><td>' + dateStr + '</td></tr>';
            });
            html += '</tbody></table>';
        }
        html += '</div>';
        container.innerHTML += html;
    }

    // Export
    window.Leaderboards = {
        submitScore: submitScore,
        getBoard: getBoard,
        getAllBoards: getAllBoards,
        getBestScore: getBestScore,
        clearBoard: clearBoard,
        generateShareLink: generateShareLink,
        renderBoard: renderBoard,
    };

    load();
})();
