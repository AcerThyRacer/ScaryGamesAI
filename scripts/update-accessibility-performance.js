/**
 * Update Accessibility, Memory & Performance for All Games
 * Adds the required script includes to all game HTML files
 * 
 * Usage: node scripts/update-accessibility-performance.js
 */

const fs = require('fs');
const path = require('path');

// All game directories
const GAMES = [
    'backrooms-pacman', 'blood-tetris', 'cursed-depths', 'cursed-sands',
    'dollhouse', 'freddys-nightmare', 'graveyard-shift', 'haunted-asylum',
    'nightmare-run', 'ritual-circle', 'seance', 'shadow-crawler',
    'the-abyss', 'the-elevator', 'total-zombies-medieval', 'web-of-terror',
    'yeti-run', 'zombie-horde'
];

const GAMES_DIR = path.join(__dirname, '..', 'games');

// Scripts to add
const SCRIPTS_TO_ADD = [
    { src: '/js/accessibility-manager.js', id: 'a11y-js', beforeGame: true },
    { src: '/js/memory-manager.js', id: 'mem-js', beforeGame: true },
    { src: '/js/performance-optimizer.js', id: 'perf-js', beforeGame: true },
];

function updateGameHTML(gameName) {
    const htmlPath = path.join(GAMES_DIR, gameName, 'index.html');

    if (!fs.existsSync(htmlPath)) {
        console.log(`⚠️  ${gameName}: index.html not found`);
        return false;
    }

    let html = fs.readFileSync(htmlPath, 'utf8');
    let modified = false;

    // Check which scripts are missing
    const missingScripts = SCRIPTS_TO_ADD.filter(script => !html.includes(script.src));

    if (missingScripts.length === 0) {
        console.log(`✓  ${gameName}: All scripts present`);
        return false;
    }

    // Find insertion point (before game.js)
    const gameScriptMatch = html.match(/<script\s+src=["']game\.js["']\s*>\s*<\/script>/);

    if (gameScriptMatch) {
        let scriptHTML = '\n    <!-- Accessibility, Memory & Performance -->\n';
        for (const script of missingScripts) {
            scriptHTML += `    <script src="${script.src}" id="${script.id}"></script>\n`;
        }
        scriptHTML += '    <!-- End Core Systems -->\n    ';

        html = html.replace(gameScriptMatch[0], scriptHTML + gameScriptMatch[0]);
        modified = true;
        console.log(`  + Added ${missingScripts.length} scripts`);
    } else {
        console.log(`  ⚠️  Could not find game.js insertion point`);
    }

    if (modified) {
        fs.writeFileSync(htmlPath, html, 'utf8');
        console.log(`✅ ${gameName}: Updated`);
        return true;
    }

    return false;
}

function main() {
    console.log('========================================');
    console.log('  Accessibility & Performance Updater');
    console.log('========================================\n');

    let updated = 0;
    let skipped = 0;

    for (const game of GAMES) {
        console.log(`\n📦 ${game}:`);
        try {
            if (updateGameHTML(game)) {
                updated++;
            } else {
                skipped++;
            }
        } catch (err) {
            console.log(`❌ ${game}: Error - ${err.message}`);
        }
    }

    console.log('\n========================================');
    console.log(`  Updated: ${updated}, Skipped: ${skipped}`);
    console.log('========================================\n');
}

main();
