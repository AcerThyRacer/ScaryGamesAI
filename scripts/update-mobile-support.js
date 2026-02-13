/**
 * Update Mobile Support for All Games
 * Run this script to add mobile support to all game HTML files
 * 
 * Usage: node scripts/update-mobile-support.js
 */

const fs = require('fs');
const path = require('path');

// All game directories
const GAMES = [
    'backrooms-pacman',
    'blood-tetris',
    'cursed-depths',
    'cursed-sands',
    'dollhouse',
    'freddys-nightmare',
    'graveyard-shift',
    'haunted-asylum',
    'nightmare-run',
    'ritual-circle',
    'seance',
    'shadow-crawler',
    'the-abyss',
    'the-elevator',
    'total-zombies-medieval',
    'web-of-terror',
    'yeti-run',
    'zombie-horde'
];

const GAMES_DIR = path.join(__dirname, '..', 'games');

// Mobile scripts to include (in order, before game.js)
const MOBILE_SCRIPTS = [
    { src: '/js/mobile-setup.js', id: 'mobile-setup-js' },
    { src: '/js/mobile-controls.js', id: 'mc-js' },
    { src: '/js/mobile-game-bindings.js', id: 'mc-bindings-js' },
    { src: '/js/mobile-universal-init.js', id: 'mc-init-js' },
    { src: '/js/mobile-patcher.js', id: 'mc-patcher-js' },
];

// Mobile CSS to include
const MOBILE_CSS = [
    { href: '/css/mobile-controls.css', id: 'mc-css' },
    { href: '/css/mobile-enhancements.css', id: 'mc-enhance-css' },
];

function updateGameHTML(gameName) {
    const htmlPath = path.join(GAMES_DIR, gameName, 'index.html');
    
    if (!fs.existsSync(htmlPath)) {
        console.log(`⚠️  ${gameName}: index.html not found`);
        return false;
    }

    let html = fs.readFileSync(htmlPath, 'utf8');
    let modified = false;

    // Add mobile CSS to head if not present
    for (const css of MOBILE_CSS) {
        if (!html.includes(css.href)) {
            const cssLink = `    <link rel="stylesheet" href="${css.href}" id="${css.id}">\n`;
            // Insert before </head>
            html = html.replace('</head>', cssLink + '</head>');
            modified = true;
            console.log(`  + Added CSS: ${css.href}`);
        }
    }

    // Add viewport-fix meta if mobile setup not present
    if (!html.includes('mobile-setup.js')) {
        // Find game.js script tag
        const gameScriptMatch = html.match(/<script\s+src=["']game\.js["']\s*>\s*<\/script>/);
        
        if (gameScriptMatch) {
            // Build mobile scripts HTML
            let scriptsHTML = '\n    <!-- Mobile Support -->\n';
            for (const script of MOBILE_SCRIPTS) {
                scriptsHTML += `    <script src="${script.src}" id="${script.id}"></script>\n`;
            }
            scriptsHTML += '    <!-- End Mobile Support -->\n    ';
            
            // Insert before game.js
            html = html.replace(gameScriptMatch[0], scriptsHTML + gameScriptMatch[0]);
            modified = true;
            console.log(`  + Added mobile scripts before game.js`);
        } else {
            // Try to find any game.js reference
            const altMatch = html.match(/src=["']game\.js["']/);
            if (altMatch) {
                console.log(`  ⚠️  Found game.js but couldn't insert (unusual format)`);
            } else {
                // No game.js, insert before </body>
                let scriptsHTML = '\n    <!-- Mobile Support -->\n';
                for (const script of MOBILE_SCRIPTS) {
                    scriptsHTML += `    <script src="${script.src}" id="${script.id}"></script>\n`;
                }
                scriptsHTML += '    <!-- End Mobile Support -->\n';
                html = html.replace('</body>', scriptsHTML + '</body>');
                modified = true;
                console.log(`  + Added mobile scripts before </body>`);
            }
        }
    } else {
        console.log(`  ✓ Mobile scripts already present`);
    }

    // Update viewport meta
    const viewportMatch = html.match(/<meta\s+name=["']viewport["'][^>]*>/);
    if (viewportMatch) {
        const idealViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">';
        if (!html.includes('viewport-fit=cover')) {
            html = html.replace(viewportMatch[0], idealViewport);
            modified = true;
            console.log(`  + Updated viewport meta`);
        }
    }

    // Save if modified
    if (modified) {
        fs.writeFileSync(htmlPath, html, 'utf8');
        console.log(`✅ ${gameName}: Updated`);
        return true;
    } else {
        console.log(`✓  ${gameName}: No changes needed`);
        return false;
    }
}

function main() {
    console.log('========================================');
    console.log('  Mobile Support Updater');
    console.log('  Updating all 18 games...');
    console.log('========================================\n');

    let updated = 0;
    let skipped = 0;
    let failed = 0;

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
            failed++;
        }
    }

    console.log('\n========================================');
    console.log('  Summary');
    console.log('========================================');
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed:  ${failed}`);
    console.log('========================================\n');
}

main();
