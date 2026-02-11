/* ============================================
   ScaryGamesAI — Scroll FX System (320 Animations)
   Tier-gated packs with preference UI
   ============================================ */
(function () {
    'use strict';

    // ═══════════════ ANIMATION PACKS ═══════════════
    var PACKS = [
        {
            id: 'classic', name: 'Classic Horror', icon: '🩸', tier: 'none',
            anims: [
                'anim-ghost-float', 'anim-zombie-lurch', 'anim-demon-slam', 'anim-blood-rise',
                'anim-crypt-door', 'anim-spider-drop', 'anim-fog-reveal', 'anim-heartbeat-in',
                'anim-glitch-snap', 'anim-shadow-creep', 'anim-whisper-fade', 'anim-chains-drag',
                'anim-mirror-crack', 'anim-vampire-dash', 'anim-grave-dig', 'anim-possessed-shake',
                'anim-banshee-scream', 'anim-warp-reality', 'anim-flicker-in', 'anim-darkness-consume',
                'anim-haunted-sway', 'anim-ectoplasm', 'anim-tombstone', 'anim-bat-swarm', 'anim-cursed-reveal'
            ]
        },
        {
            id: 'death', name: 'Death & Decay', icon: '💀', tier: 'lite',
            anims: [
                'anim-skull-roll', 'anim-corpse-rise', 'anim-coffin-lid', 'anim-bone-shatter',
                'anim-decay-spread', 'anim-rot-fade', 'anim-worm-crawl', 'anim-grave-push',
                'anim-death-rattle', 'anim-skeleton-assemble', 'anim-plague-cloud', 'anim-morgue-slab',
                'anim-zombie-arm', 'anim-crypt-creak', 'anim-necrotic-pulse', 'anim-embalm',
                'anim-catacombs', 'anim-reaper', 'anim-blood-drip-in', 'anim-bat-swarm'
            ]
        },
        {
            id: 'occult', name: 'Occult', icon: '🔮', tier: 'pro',
            anims: [
                'anim-pentagram-spin', 'anim-exorcism-twist', 'anim-ritual-circle', 'anim-rune-glow',
                'anim-ouija-slide', 'anim-hex-curse', 'anim-cauldron-bubble', 'anim-witch-hex',
                'anim-demonic-summon', 'anim-cursed-scroll', 'anim-spirit-orb', 'anim-altar-rise',
                'anim-voodoo', 'anim-dark-incantation', 'anim-moon-phase', 'anim-grimoire',
                'anim-blood-sigil', 'anim-coven', 'anim-crystal-ball', 'anim-eclipse-reveal'
            ]
        },
        {
            id: 'psych', name: 'Psychological', icon: '👁️', tier: 'pro',
            anims: [
                'anim-eye-open', 'anim-nightmare-warp', 'anim-phantom-phase', 'anim-dread-pulse',
                'anim-soul-rip', 'anim-paranoia', 'anim-hallucination', 'anim-insomnia',
                'anim-vertigo', 'anim-memory-flash', 'anim-dissociate', 'anim-anxiety-tremor',
                'anim-deja-vu', 'anim-sleep-paralysis', 'anim-mind-fracture', 'anim-shadow-self',
                'anim-time-lapse', 'anim-psychic-blast', 'anim-paranormal-static', 'anim-unreality'
            ]
        },
        {
            id: 'infernal', name: 'Infernal', icon: '🔥', tier: 'max',
            anims: [
                'anim-hell-portal', 'anim-inferno-burst', 'anim-lava-flow', 'anim-brimstone',
                'anim-demon-wings', 'anim-hellfire-rain', 'anim-abyss-maw', 'anim-poltergeist-toss',
                'anim-claw-scratch', 'anim-volcanic-erupt', 'anim-damnation', 'anim-chaos-surge',
                'anim-soul-drain', 'anim-infernal-chains', 'anim-ash-scatter', 'anim-dark-ascend',
                'anim-wrath-smash', 'anim-torment', 'anim-sinister-vortex', 'anim-perdition'
            ]
        },
        {
            id: 'elemental', name: 'Elemental Fury', icon: '⚡', tier: 'lite',
            anims: [
                'anim-fire-blast', 'anim-ice-shatter', 'anim-thunder-strike', 'anim-tornado-spin',
                'anim-earthquake-rumble', 'anim-flood-surge', 'anim-meteor-impact', 'anim-frost-bite',
                'anim-volcanic-ash', 'anim-lightning-chain', 'anim-magma-rise', 'anim-blizzard-whip',
                'anim-acid-splash', 'anim-sandstorm-blur', 'anim-crystal-grow', 'anim-tsu-wave',
                'anim-static-discharge', 'anim-ember-float', 'anim-glacial-slide', 'anim-storm-surge'
            ]
        },
        {
            id: 'dimensional', name: 'Dimensional Rift', icon: '🌀', tier: 'pro',
            anims: [
                'anim-portal-open', 'anim-dimension-tear', 'anim-time-warp', 'anim-void-collapse',
                'anim-gravity-well', 'anim-space-fold', 'anim-quantum-flicker', 'anim-rifter-slice',
                'anim-cosmic-pulse', 'anim-nebula-drift', 'anim-black-hole-spin', 'anim-reality-glitch',
                'anim-starburst-in', 'anim-mirror-dim', 'anim-phase-shift', 'anim-dark-matter',
                'anim-wormhole-stretch', 'anim-entropy-decay', 'anim-antimatter-pop', 'anim-tesseract-fold'
            ]
        },
        {
            id: 'abomination', name: 'Abomination', icon: '🧬', tier: 'max',
            anims: [
                'anim-tentacle-grab', 'anim-flesh-melt', 'anim-horror-crawl', 'anim-skin-peel',
                'anim-eye-stalk', 'anim-mutant-pulse', 'anim-spore-cloud', 'anim-parasite-squirm',
                'anim-blob-absorb', 'anim-hive-mind', 'anim-venom-drip', 'anim-coco-split',
                'anim-alien-birth', 'anim-web-trap', 'anim-toxic-ooze', 'anim-metamorph',
                'anim-swarm-rise', 'anim-chitin', 'anim-necro-bloom', 'anim-predator'
            ]
        },
        {
            id: 'cinematic', name: 'Cinematic Horror', icon: '🎬', tier: 'pro',
            anims: [
                'anim-film-burn', 'anim-jump-scare', 'anim-dolly-zoom', 'anim-vhs-distort',
                'anim-slow-reveal', 'anim-dutch-angle', 'anim-negative-flash', 'anim-cine-scope',
                'anim-hitchcock', 'anim-grindhouse', 'anim-found-footage', 'anim-retro-horror',
                'anim-silent-film', 'anim-projector', 'anim-noir-shadow', 'anim-zoom-enhance',
                'anim-film-grain', 'anim-drama-pan', 'anim-splatter-in', 'anim-title-card'
            ]
        },
        {
            id: 'mythic', name: 'Mythic Beasts', icon: '🐉', tier: 'max',
            anims: [
                'anim-dragon-breath', 'anim-kraken-rise', 'anim-werewolf-lunge', 'anim-phoenix-rise',
                'anim-medusa-gaze', 'anim-hydra-strike', 'anim-cerberus-charge', 'anim-banshee-wail',
                'anim-leprechaun-pop', 'anim-siren-call', 'anim-minotaur-smash', 'anim-griffin-soar',
                'anim-golem-assemble', 'anim-vampire-cloak', 'anim-gargoyle-wake', 'anim-chimera-flux',
                'anim-djinn-smoke', 'anim-naga-coil', 'anim-reaper-sweep', 'anim-troll-smash'
            ]
        },
        {
            id: 'survival', name: 'Survival Horror', icon: '🔦', tier: 'lite',
            anims: [
                'anim-flashlight-reveal', 'anim-door-slam', 'anim-board-up', 'anim-heart-monitor',
                'anim-ammo-check', 'anim-radio-crackle', 'anim-barricade', 'anim-emergency-light',
                'anim-lock-pick', 'anim-hide-in-closet', 'anim-item-pickup', 'anim-footstep-dread',
                'anim-sirens-wail', 'anim-stair-creak', 'anim-safe-room', 'anim-typewriter-reveal',
                'anim-gas-leak', 'anim-blood-smear', 'anim-puzzle-solve', 'anim-escape-panic'
            ]
        },
        {
            id: 'undead', name: 'Undead Rising', icon: '🧟', tier: 'lite',
            anims: [
                'anim-zombie-burst', 'anim-lich-emerge', 'anim-mummy-unravel', 'anim-skeleton-march',
                'anim-ghoul-lunge', 'anim-revenant-phase', 'anim-undead-horde', 'anim-necro-raise',
                'anim-death-knight', 'anim-corpse-explode', 'anim-bone-cage', 'anim-soul-harvest',
                'anim-graveyard-shift', 'anim-tombstone-fall', 'anim-death-fog', 'anim-wraith-wail',
                'anim-phantom-chains', 'anim-decay-bloom', 'anim-rot-wave', 'anim-crypt-slam'
            ]
        },
        {
            id: 'cataclysm', name: 'Cataclysm', icon: '🌋', tier: 'pro',
            anims: [
                'anim-seismic-rupture', 'anim-tidal-crash', 'anim-volcanic-rain', 'anim-sinkhole-drop',
                'anim-avalanche-rush', 'anim-tornado-tear', 'anim-meteor-shower', 'anim-fissure-crack',
                'anim-tsunami-surge', 'anim-wildfire-spread', 'anim-landslide-rumble', 'anim-whirlpool-spin',
                'anim-hailstone-barrage', 'anim-earthquake-split', 'anim-dust-devil', 'anim-flood-rush',
                'anim-lightning-storm', 'anim-solar-flare', 'anim-comet-strike', 'anim-pyroclasm'
            ]
        },
        {
            id: 'machine', name: 'Corrupted Machine', icon: '⚙️', tier: 'max',
            anims: [
                'anim-gear-crunch', 'anim-circuit-fry', 'anim-piston-slam', 'anim-static-overload',
                'anim-wire-whip', 'anim-servo-glitch', 'anim-rust-spread', 'anim-power-surge',
                'anim-motor-grind', 'anim-hydraulic-press', 'anim-arc-welder', 'anim-malfunction',
                'anim-overclock', 'anim-data-bleed', 'anim-memory-dump', 'anim-core-meltdown',
                'anim-assembly-fail', 'anim-defrag-scatter', 'anim-kernel-panic', 'anim-reboot-flash'
            ]
        },
        {
            id: 'asylum', name: 'Asylum', icon: '🏚️', tier: 'pro',
            anims: [
                'anim-padded-bounce', 'anim-strobe-flash', 'anim-corridor-stretch', 'anim-cell-slam',
                'anim-straight-jacket', 'anim-patient-twitch', 'anim-gurney-roll', 'anim-flatline',
                'anim-sedation-blur', 'anim-isolation-shrink', 'anim-lobotomy-slice', 'anim-ward-flicker',
                'anim-intercom-crackle', 'anim-catatonic-freeze', 'anim-manic-shake', 'anim-electroshock',
                'anim-mirror-shatter', 'anim-drip-count', 'anim-scalpel-cut', 'anim-asylum-door'
            ]
        },
        {
            id: 'deepocean', name: 'Deep Ocean', icon: '🦑', tier: 'lite',
            anims: [
                'anim-depth-pressure', 'anim-biolum-pulse', 'anim-kelp-sway', 'anim-bubble-rise',
                'anim-trench-descent', 'anim-angler-lure', 'anim-kraken-grab', 'anim-coral-grow',
                'anim-current-drift', 'anim-submarine-creak', 'anim-sonar-ping', 'anim-pressure-crush',
                'anim-barnacle-crust', 'anim-anchor-drop', 'anim-shipwreck-reveal', 'anim-abyss-gaze',
                'anim-deep-pulse', 'anim-riptide-pull', 'anim-pearl-gleam', 'anim-leviathan-shadow'
            ]
        }
    ];

    var EFFECTS = [
        'fx-red-puff', 'fx-red-flash', 'fx-blood-mist', 'fx-ghost-trail', 'fx-shadow-burst',
        'fx-cursed-glow', 'fx-ember-rise', 'fx-static-burst', 'fx-shadow-veil', 'fx-dark-ripple'
    ];

    var TARGETS = [
        '.game-card', '.section-header', '.hero-title', '.hero-subtitle', '.hero-cta',
        '.featured-game', '.daily-card', '.pricing-card', '.testimonial-card',
        '.lb-board', '.ach-card', '.hero-desc', '.scroll-animate', '.faq-item',
        '.tier-lore-card', '.comparison-section', '.filter-btn', '.billing-toggle-wrap',
        '.comparison-title'
    ];

    var TIER_LEVELS = { none: 0, lite: 1, pro: 2, max: 3 };
    var TIER_NAMES = { none: 'Free', lite: 'Survivor', pro: 'Hunter', max: 'Elder God' };

    // ═══════════════ STATE ═══════════════
    var prefs = loadPrefs();
    var recentAnims = [];
    var RECENT_TRACK = 6;
    var dropdownOpen = false;

    function getUserTier() {
        return localStorage.getItem('sgai-sub-tier') || 'none';
    }

    function canAccessPack(pack) {
        var userLevel = TIER_LEVELS[getUserTier()] || 0;
        var reqLevel = TIER_LEVELS[pack.tier] || 0;
        return userLevel >= reqLevel;
    }

    function loadPrefs() {
        try {
            var saved = JSON.parse(localStorage.getItem('sgai-anim-prefs'));
            if (saved && saved.enabledPacks) return saved;
        } catch (e) { /* ignore */ }
        return { enabledPacks: ['classic'], speed: 1 };
    }

    function savePrefs() {
        localStorage.setItem('sgai-anim-prefs', JSON.stringify(prefs));
    }

    // ═══════════════ ANIMATION POOL ═══════════════
    function getActiveAnimations() {
        var pool = [];
        PACKS.forEach(function (pack) {
            if (canAccessPack(pack) && prefs.enabledPacks.indexOf(pack.id) >= 0) {
                pool = pool.concat(pack.anims);
            }
        });
        // Fallback to classic if nothing enabled
        if (pool.length === 0) pool = PACKS[0].anims.slice();
        // Deduplicate
        var unique = [];
        pool.forEach(function (a) { if (unique.indexOf(a) < 0) unique.push(a); });
        return unique;
    }

    function pickUnique(arr) {
        var pick, attempts = 0;
        do {
            pick = arr[Math.floor(Math.random() * arr.length)];
            attempts++;
        } while (recentAnims.indexOf(pick) !== -1 && attempts < 15);
        recentAnims.push(pick);
        if (recentAnims.length > RECENT_TRACK) recentAnims.shift();
        return pick;
    }

    // ═══════════════ OBSERVER (OVERHAULED — fast & scary) ═══════════════
    var staggerCounter = 0;
    var lastBatchTime = 0;

    var observer = new IntersectionObserver(function (entries, obs) {
        var now = performance.now();
        // Reset stagger counter for new scroll batches (>300ms gap)
        if (now - lastBatchTime > 300) staggerCounter = 0;
        lastBatchTime = now;

        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var el = entry.target;
                var pool = getActiveAnimations();
                var anim = pickUnique(pool);
                var effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];

                // Smooth cascading stagger: 0ms, 60ms, 120ms, 180ms...
                var delay = staggerCounter * 60;
                staggerCounter++;

                // Smooth satisfying duration: 0.55–0.85s (speed-adjusted)
                var baseDuration = 0.55 + Math.random() * 0.3;
                var duration = baseDuration / (prefs.speed || 1);

                // GPU-accelerated setup
                el.style.willChange = 'transform, opacity, filter';
                el.style.animationDelay = delay + 'ms';
                el.style.animationDuration = duration.toFixed(2) + 's';
                el.style.animationTimingFunction = 'cubic-bezier(0.22, 1, 0.36, 1)';

                el.classList.remove('scroll-anim-init');
                el.classList.add(anim);
                el.classList.add(effect);
                el.classList.add('scroll-anim');

                // Clean up will-change after animation to free GPU memory
                var cleanupMs = (delay + duration * 1000) + 100;
                setTimeout(function () { el.style.willChange = 'auto'; }, cleanupMs);

                obs.unobserve(el);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    function observeElements() {
        var elements = document.querySelectorAll(TARGETS.join(', '));
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (!el.classList.contains('scroll-anim-init') && !el.classList.contains('scroll-anim')) {
                el.classList.add('scroll-anim-init');
                observer.observe(el);
            }
        }
    }

    var mutationObserver = new MutationObserver(function (mutations) {
        var shouldUpdate = false;
        for (var i = 0; i < mutations.length; i++) {
            if (mutations[i].addedNodes.length > 0) { shouldUpdate = true; break; }
        }
        if (shouldUpdate) setTimeout(observeElements, 100);
    });

    // ═══════════════ UI ═══════════════
    function buildUI() {
        var nav = document.querySelector('.customizer-btns');
        if (!nav) {
            nav = document.querySelector('.nav-inner');
            if (!nav) return;
        }

        var wrap = document.createElement('div');
        wrap.className = 'anim-pref-btn-wrap';

        var btn = document.createElement('button');
        btn.className = 'anim-pref-btn';
        btn.title = 'Animation Styles';
        btn.textContent = '💀';
        wrap.appendChild(btn);

        var dropdown = document.createElement('div');
        dropdown.className = 'anim-pref-dropdown';
        dropdown.id = 'anim-pref-dropdown';

        var tier = getUserTier();
        var tierLevel = TIER_LEVELS[tier] || 0;
        var totalAccessible = 0;
        var totalAnims = 0;
        PACKS.forEach(function (p) {
            totalAnims += p.anims.length;
            if (canAccessPack(p)) totalAccessible += p.anims.length;
        });

        var html = '<div class="anim-pref-header"><span>💀 Animation Styles</span><button class="anim-pref-close" id="anim-pref-close">✕</button></div>';

        // Packs section
        html += '<div class="anim-pref-section"><div class="anim-pref-section-title">Animation Packs (' + totalAccessible + '/' + totalAnims + ' unlocked)</div>';

        PACKS.forEach(function (pack) {
            var accessible = canAccessPack(pack);
            var enabled = prefs.enabledPacks.indexOf(pack.id) >= 0;
            var lockLabel = !accessible ? '<span class="anim-pack-lock">🔒 Requires ' + TIER_NAMES[pack.tier] + '</span>' : '';
            var toggleCls = (accessible && enabled) ? 'on' : '';
            html += '<div class="anim-pack-item' + (!accessible ? ' locked' : '') + '" data-pack="' + pack.id + '">' +
                '<div class="anim-pack-icon">' + pack.icon + '</div>' +
                '<div class="anim-pack-info">' +
                '<div class="anim-pack-name">' + pack.name + ' ' + lockLabel + '</div>' +
                '<div class="anim-pack-count">' + pack.anims.length + ' animations</div>' +
                '</div>' +
                '<div class="anim-pack-toggle ' + toggleCls + '"></div>' +
                '</div>';
        });
        html += '</div>';

        // Speed section
        html += '<div class="anim-pref-section"><div class="anim-pref-section-title">Animation Speed</div>';
        html += '<div class="anim-speed-wrap">';
        html += '<span class="anim-speed-label">Slow</span>';
        html += '<input type="range" class="anim-speed-slider" id="anim-speed-slider" min="0.3" max="2" step="0.1" value="' + (prefs.speed || 1) + '">';
        html += '<span class="anim-speed-label">Fast</span>';
        html += '</div></div>';

        // Preview button
        html += '<div class="anim-pref-section">';
        html += '<button class="anim-preview-btn" id="anim-preview-btn">✨ Preview Random Animation</button>';
        html += '</div>';

        // Upgrade hint for non-max users
        if (tierLevel < 3) {
            html += '<div class="anim-upgrade-hint">🔓 <a href="/subscription.html">Upgrade</a> to unlock ' + (totalAnims - totalAccessible) + ' more animations!</div>';
        }

        dropdown.innerHTML = html;
        wrap.appendChild(dropdown);
        nav.appendChild(wrap);

        // Events
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownOpen = !dropdownOpen;
            dropdown.classList.toggle('open', dropdownOpen);
        });

        document.getElementById('anim-pref-close').addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownOpen = false;
            dropdown.classList.remove('open');
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('.anim-pref-btn-wrap')) {
                dropdownOpen = false;
                dropdown.classList.remove('open');
            }
        });

        // Pack toggles
        dropdown.querySelectorAll('.anim-pack-item').forEach(function (item) {
            item.addEventListener('click', function () {
                var packId = item.dataset.pack;
                var pack = PACKS.find(function (p) { return p.id === packId; });
                if (!pack || !canAccessPack(pack)) return;

                var idx = prefs.enabledPacks.indexOf(packId);
                if (idx >= 0) {
                    // Don't allow disabling all packs
                    if (prefs.enabledPacks.length <= 1) return;
                    prefs.enabledPacks.splice(idx, 1);
                } else {
                    prefs.enabledPacks.push(packId);
                }
                savePrefs();
                var toggle = item.querySelector('.anim-pack-toggle');
                toggle.classList.toggle('on', prefs.enabledPacks.indexOf(packId) >= 0);
            });
        });

        // Speed slider
        document.getElementById('anim-speed-slider').addEventListener('input', function (e) {
            prefs.speed = parseFloat(e.target.value);
            savePrefs();
        });

        // Preview button
        document.getElementById('anim-preview-btn').addEventListener('click', function () {
            var target = document.querySelector('.hero-title') || document.querySelector('.section-header') || document.querySelector('.game-card');
            if (!target) return;

            // Remove old animation classes
            var classList = target.className.split(' ');
            classList.forEach(function (cls) {
                if (cls.indexOf('anim-') === 0 || cls.indexOf('fx-') === 0) {
                    target.classList.remove(cls);
                }
            });
            target.classList.remove('scroll-anim');

            // Force reflow
            void target.offsetWidth;

            // Apply new random animation
            var pool = getActiveAnimations();
            var anim = pool[Math.floor(Math.random() * pool.length)];
            var effect = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
            var duration = (0.7 + Math.random() * 0.8) / (prefs.speed || 1);
            target.style.animationDuration = duration.toFixed(2) + 's';
            target.classList.add(anim);
            target.classList.add(effect);
            target.classList.add('scroll-anim');
        });
    }

    // ═══════════════ INIT ═══════════════
    function init() {
        // Auto-enable accessible packs on first load
        var tier = getUserTier();
        var tierLevel = TIER_LEVELS[tier] || 0;
        if (!localStorage.getItem('sgai-anim-prefs')) {
            prefs.enabledPacks = [];
            PACKS.forEach(function (pack) {
                if (canAccessPack(pack)) prefs.enabledPacks.push(pack.id);
            });
            savePrefs();
        }

        observeElements();
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        buildUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
