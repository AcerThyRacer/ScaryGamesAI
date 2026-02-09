/* ============================================
   ScaryGamesAI — Social Features
   Share cards, dare links, score sharing
   ============================================ */
(function () {
    'use strict';

    // Generate a share canvas card image (returns data URL)
    function generateShareCard(gameTitle, score, playerName, opts) {
        var c = document.createElement('canvas');
        c.width = 600; c.height = 320;
        var ctx = c.getContext('2d');

        // Horror background
        var grd = ctx.createLinearGradient(0, 0, 0, 320);
        grd.addColorStop(0, '#0a0a15'); grd.addColorStop(1, '#1a0808');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, 600, 320);

        // Red accent line
        ctx.fillStyle = '#cc1122'; ctx.fillRect(0, 0, 600, 3);
        ctx.fillRect(0, 317, 600, 3);

        // Vignette
        var vig = ctx.createRadialGradient(300, 160, 80, 300, 160, 350);
        vig.addColorStop(0, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = vig; ctx.fillRect(0, 0, 600, 320);

        // Logo
        ctx.font = '600 14px Inter, sans-serif';
        ctx.fillStyle = '#cc1122'; ctx.textAlign = 'left';
        ctx.fillText('ScaryGamesAI', 24, 30);

        // Game title
        ctx.font = '600 28px Creepster, cursive';
        ctx.fillStyle = '#e8e6e3'; ctx.textAlign = 'center';
        ctx.fillText(gameTitle, 300, 80);

        // Score
        ctx.font = '700 64px Inter, sans-serif';
        ctx.fillStyle = '#cc1122';
        ctx.shadowColor = '#cc1122'; ctx.shadowBlur = 20;
        ctx.fillText(String(score), 300, 170);
        ctx.shadowBlur = 0;

        // Label
        ctx.font = '400 16px Inter, sans-serif';
        ctx.fillStyle = '#8a8a9a';
        ctx.fillText(opts && opts.label ? opts.label : 'SCORE', 300, 195);

        // Player name
        ctx.font = '500 18px Inter, sans-serif';
        ctx.fillStyle = '#e8e6e3';
        ctx.fillText(playerName || 'Player', 300, 240);

        // Call to action
        ctx.font = '400 12px Inter, sans-serif';
        ctx.fillStyle = '#555566';
        ctx.fillText('Can you beat this? Play at scarygamesai.com', 300, 290);

        return c.toDataURL('image/png');
    }

    // Generate a dare link
    function generateDareLink(gameId, playerName, score) {
        var base = window.location.origin + '/games/' + gameId + '/';
        var params = '?dare=1&from=' + encodeURIComponent(playerName || 'Someone') +
            '&score=' + encodeURIComponent(score);
        return base + params;
    }

    // Copy text to clipboard
    function copyToClipboard(text, callback) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (callback) callback(true);
            }).catch(function () {
                fallbackCopy(text, callback);
            });
        } else {
            fallbackCopy(text, callback);
        }
    }

    function fallbackCopy(text, callback) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); if (callback) callback(true); }
        catch (e) { if (callback) callback(false); }
        ta.remove();
    }

    // Share button component
    function createShareButtons(container, gameId, gameTitle, score, playerName) {
        if (!container) return;
        container.innerHTML = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'social-share-bar';

        // Share Image
        var imgBtn = document.createElement('button');
        imgBtn.className = 'social-btn social-btn-card';
        imgBtn.innerHTML = '📸 Share Card';
        imgBtn.addEventListener('click', function () {
            var dataUrl = generateShareCard(gameTitle, score, playerName);
            var win = window.open();
            if (win) {
                win.document.write('<img src="' + dataUrl + '" style="max-width:100%"/>');
                win.document.title = gameTitle + ' Score';
            }
        });
        wrapper.appendChild(imgBtn);

        // Copy Dare Link
        var dareBtn = document.createElement('button');
        dareBtn.className = 'social-btn social-btn-dare';
        dareBtn.innerHTML = '🎯 Dare a Friend';
        dareBtn.addEventListener('click', function () {
            var link = generateDareLink(gameId, playerName, score);
            copyToClipboard(link, function (ok) {
                dareBtn.innerHTML = ok ? '✅ Link Copied!' : '❌ Copy Failed';
                setTimeout(function () { dareBtn.innerHTML = '🎯 Dare a Friend'; }, 2000);
            });
        });
        wrapper.appendChild(dareBtn);

        // Copy Score
        var copyBtn = document.createElement('button');
        copyBtn.className = 'social-btn social-btn-copy';
        copyBtn.innerHTML = '📋 Copy Score';
        copyBtn.addEventListener('click', function () {
            var text = '🎮 I scored ' + score + ' in ' + gameTitle + ' on ScaryGamesAI! Can you beat me? ' +
                window.location.origin + '/games/' + gameId + '/';
            copyToClipboard(text, function (ok) {
                copyBtn.innerHTML = ok ? '✅ Copied!' : '❌ Copy Failed';
                setTimeout(function () { copyBtn.innerHTML = '📋 Copy Score'; }, 2000);
            });
        });
        wrapper.appendChild(copyBtn);

        container.appendChild(wrapper);
    }

    // Check for dare parameter on game pages
    function checkDare() {
        var params = new URLSearchParams(window.location.search);
        if (params.get('dare')) {
            var from = params.get('from') || 'Someone';
            var score = params.get('score') || '???';
            var dareBar = document.createElement('div');
            dareBar.className = 'dare-banner';
            dareBar.innerHTML = '🎯 <strong>' + from + '</strong> dared you to beat their score of <strong>' + score + '</strong>!';
            document.body.insertBefore(dareBar, document.body.firstChild);
            setTimeout(function () { dareBar.classList.add('visible'); }, 100);
        }
    }

    // Export
    window.Social = {
        generateShareCard: generateShareCard,
        generateDareLink: generateDareLink,
        copyToClipboard: copyToClipboard,
        createShareButtons: createShareButtons,
        checkDare: checkDare,
    };

    document.addEventListener('DOMContentLoaded', checkDare);
})();
