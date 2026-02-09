/* ============================================
   ScaryGamesAI — Challenges UI Logic
   Renders the challenges and handles interactions.
   ============================================ */
(function () {
    'use strict';

    function init() {
        if (!window.ChallengeManager) {
            console.error('ChallengeManager not found!');
            return;
        }
        renderAll();
    }

    function renderAll() {
        renderRank();
        renderWeekly();
        renderDaily();
    }

    function renderRank() {
        var state = ChallengeManager.state;
        var rank = ChallengeManager.getRank();
        var next = ChallengeManager.getNextRank();

        document.getElementById('rank-icon').textContent = rank.icon;
        document.getElementById('rank-title').textContent = rank.title;
        document.getElementById('total-cp').textContent = state.cp;

        var progress = 100;
        var needed = 'MAX';
        var nextTitle = 'Max Rank';

        if (next) {
            var prevCp = rank.cp;
            var nextCp = next.cp;
            var current = state.cp;
            progress = Math.max(0, Math.min(100, ((current - prevCp) / (nextCp - prevCp)) * 100));
            needed = (nextCp - current);
            nextTitle = next.title;
        }

        document.getElementById('rank-progress').style.width = progress + '%';
        document.getElementById('next-rank').textContent = nextTitle;
        document.getElementById('cp-needed').textContent = needed;
    }

    function createCard(challengeObj, isWeekly, index) {
        var def = ChallengeManager.getChallengeDef(challengeObj.id);
        if (!def) return document.createElement('div');

        var card = document.createElement('div');
        card.className = 'challenge-card' + (challengeObj.completed ? ' completed' : '') + (challengeObj.claimed ? ' claimed' : '') + (isWeekly ? ' weekly-card' : '');

        var pct = Math.min(100, Math.floor((challengeObj.progress / def.target) * 100));

        var btnHtml = '';
        if (challengeObj.claimed) {
            btnHtml = '<span style="color:#666;font-size:0.8rem;">CLAIMED</span>';
        } else if (challengeObj.completed) {
            btnHtml = '<button class="chal-btn chal-btn-claim" onclick="window.ChallengesUI.claim(\'' + (isWeekly ? 'weekly' : index) + '\')">CLAIM ' + def.reward + ' CP</button>';
        } else {
            // If not completed, show play or reroll
            var rerollBtn = (!isWeekly && ChallengeManager.state.rerolls > 0)
                ? '<button class="chal-btn chal-btn-reroll" onclick="window.ChallengesUI.reroll(' + index + ')" title="Reroll Challenge">🎲</button>'
                : '';

            var playUrl = '/games/' + def.gameId + '/';
            // If the game ID is generic or special, handle it? No, gameId is folder name.

            btnHtml = '<div style="display:flex;gap:8px;">' + rerollBtn +
                      '<a href="' + playUrl + '" class="chal-btn chal-btn-play">PLAY ▶</a></div>';
        }

        card.innerHTML = `
            <div class="chal-header">
                <div>
                    <div class="chal-game">${def.gameId.replace(/-/g, ' ')}</div>
                    <div class="chal-title">${def.title}</div>
                </div>
                <div class="chal-reward">💎 ${def.reward}</div>
            </div>
            <div class="chal-desc">${def.desc}</div>
            <div class="chal-progress-wrap">
                <div class="chal-progress-text">
                    <span>${challengeObj.completed ? 'COMPLETED' : 'PROGRESS'}</span>
                    <span>${challengeObj.progress} / ${def.target}</span>
                </div>
                <div class="chal-progress-bar">
                    <div class="chal-progress-fill" style="width: ${pct}%"></div>
                </div>
            </div>
            <div class="chal-footer">
                ${btnHtml}
            </div>
        `;

        return card;
    }

    function renderWeekly() {
        var container = document.getElementById('weekly-container');
        if (!container) return;
        container.innerHTML = '';

        if (ChallengeManager.state.weekly) {
            container.appendChild(createCard(ChallengeManager.state.weekly, true, -1));
        } else {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#666;">No active weekly challenge.</div>';
        }
    }

    function renderDaily() {
        var container = document.getElementById('daily-container');
        if (!container) return;
        container.innerHTML = '';

        document.getElementById('rerolls-count').textContent = ChallengeManager.state.rerolls;

        ChallengeManager.state.active.forEach(function(c, i) {
            container.appendChild(createCard(c, false, i));
        });
    }

    // Actions
    function reroll(index) {
        if (ChallengeManager.rerollChallenge(index)) {
            renderDaily();
        } else {
            // maybe shake effect or alert
            if (ChallengeManager.state.rerolls <= 0) alert("No rerolls left today!");
        }
    }

    function claim(ref) {
        // ref is 'weekly' or index
        var c = (ref === 'weekly') ? ChallengeManager.state.weekly : ChallengeManager.state.active[ref];
        if (ChallengeManager.claimReward(c)) {
            renderAll();
            ChallengeManager.showNotification("Reward Claimed!", "+" + ChallengeManager.getChallengeDef(c.id).reward + " CP", "💎");
        }
    }

    window.ChallengesUI = {
        init: init,
        render: renderAll,
        reroll: reroll,
        claim: claim
    };

    document.addEventListener('DOMContentLoaded', init);

})();
