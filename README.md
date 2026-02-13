<p align="center">
  <img src="https://img.shields.io/badge/ScaryGamesAI-Horror%20Gaming-red?style=for-the-badge&logo=ghost&logoColor=white" alt="ScaryGamesAI">
  <br>
  <img src="https://img.shields.io/badge/Games-13-orange?style=flat-square" alt="Games">
  <img src="https://img.shields.io/badge/Engine-Three.js%20%2B%20Canvas-blue?style=flat-square" alt="Engine">
  <img src="https://img.shields.io/badge/License-GPLv3-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js" alt="Node.js">
</p>

<h1 align="center">🎃 ScaryGamesAI</h1>

<p align="center">
  <strong>A collection of 13 browser-based horror games — no installs, no frameworks, just pure terror.</strong><br>
  Built with vanilla JS, Three.js, and Canvas. Runs on a single Node.js server.
</p>

---

## ⚡ Quick Install & Run

### One-Liner (Windows PowerShell)
```powershell
git clone https://github.com/AcerThyRacer/ScaryGamesAI.git && cd ScaryGamesAI && node server.js
```

### One-Liner (Linux / macOS)
```bash
git clone https://github.com/AcerThyRacer/ScaryGamesAI.git && cd ScaryGamesAI && node server.js
```

Then open **http://localhost:9999** in your browser.

---

### Full Install Script — Windows

Save as `install.ps1` and run with `powershell -ExecutionPolicy Bypass -File install.ps1`:

```powershell
# ScaryGamesAI Windows Installer
Write-Host "🎃 Installing ScaryGamesAI..." -ForegroundColor Red

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Install from https://nodejs.org" -ForegroundColor Yellow
    Start-Process "https://nodejs.org"
    exit 1
}

# Clone & start
if (-not (Test-Path "ScaryGamesAI")) {
    git clone https://github.com/AcerThyRacer/ScaryGamesAI.git
}
Set-Location ScaryGamesAI
Write-Host "🚀 Starting server on http://localhost:9999" -ForegroundColor Green
Start-Process "http://localhost:9999"
node server.js
```

### Full Install Script — Linux / macOS

Save as `install.sh` and run with `bash install.sh`:

```bash
#!/bin/bash
# ScaryGamesAI Linux/macOS Installer
echo "🎃 Installing ScaryGamesAI..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing via nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm install --lts
fi

# Clone & start
if [ ! -d "ScaryGamesAI" ]; then
    git clone https://github.com/AcerThyRacer/ScaryGamesAI.git
fi
cd ScaryGamesAI
echo "🚀 Starting server on http://localhost:9999"
xdg-open http://localhost:9999 2>/dev/null || open http://localhost:9999 2>/dev/null &
node server.js
```

---

## 🎮 All 13 Games

### 🟡 Backrooms: Pac-Man
| | |
|---|---|
| **Genre** | 3D First-Person Horror / Survival |
| **Engine** | Three.js (WebGL) |
| **Difficulty** | 4 levels — Easy, Normal, Hard, Nightmare |

You're trapped in the infinite backrooms. A nightmarish, eldritch Pac-Man is hunting you through the yellow corridors. Collect all pellets to escape — but don't let it catch you. On harder difficulties, additional hunters spawn mid-game, your sprint has a stamina limit, and Pac-Man gets faster and smarter. Features a minimap, camera shake, blackout events, and jump scare audio.

---

### 🩸 Blood Tetris
| | |
|---|---|
| **Genre** | Puzzle / Horror |
| **Engine** | Canvas 2D |
| **Difficulty** | Scales with score |

Classic Tetris reimagined with a horror twist. Stack bones, eyeballs, and organs while blood rises from below. Clear lines before the gore overwhelms you. The higher your score, the faster the pieces fall and the more gruesome the visuals become.

---

### 🏚️ Dollhouse
| | |
|---|---|
| **Genre** | Point-and-Click / Puzzle Horror |
| **Engine** | Canvas 2D |
| **Difficulty** | Single |

Explore 5 rooms of a cursed miniature dollhouse. Find items, solve puzzles, and piece together the dark story of what happened to its inhabitants. Escape before the dolls come alive. Atmospheric lighting and creepy sound design.

---

### ⚰️ Graveyard Shift
| | |
|---|---|
| **Genre** | Top-Down Survival Horror |
| **Engine** | Canvas 2D |
| **Difficulty** | Progressive |

You're the night watchman at a haunted cemetery. Investigate disturbances across the graveyard, avoid the undead that rise from their graves, and survive until dawn. Manage your flashlight battery and sanity as the night grows darker.

---

### 🌙 Nightmare Run
| | |
|---|---|
| **Genre** | Endless Runner / Horror |
| **Engine** | Canvas 2D |
| **Difficulty** | Scales with distance |

An endless nightmare you can't wake from. Run through twisted, procedurally-generated landscapes while horrific creatures chase you. Dodge obstacles, collect power-ups, and survive as long as possible. The further you run, the more distorted reality becomes.

---

### 🔮 Séance
| | |
|---|---|
| **Genre** | Word / Puzzle Horror |
| **Engine** | Canvas 2D |
| **Difficulty** | Single |

Use the planchette on a Ouija board to communicate with restless spirits. Spell their names correctly to free them — but be careful. Anger the wrong spirit and the séance takes a terrifying turn. Atmospheric candle lighting and eerie sound effects.

---

### 🕷️ Shadow Crawler
| | |
|---|---|
| **Genre** | 2D Dungeon Crawler / Horror |
| **Engine** | Canvas 2D |
| **Difficulty** | Progressive |

Your torch is dying. Navigate a procedurally-generated dungeon, collect keys, and find the exit before the shadows consume you. Enemies lurk in the darkness and your light radius shrinks over time. Every step could be your last.

---

### 🌊 The Abyss
| | |
|---|---|
| **Genre** | 3D Underwater Horror / Exploration |
| **Engine** | Three.js (WebGL) + Post-Processing |
| **Difficulty** | 4 levels |

Dive into the deepest ocean trench. Physics-based swimming with momentum and drag. Ancient anglerfish creatures stalk you with advanced AI — they lure, stalk, hunt, and charge. Collect artifacts, find air pockets to refill oxygen, and navigate procedurally-generated cave systems. Features bioluminescent flora, bloom effects, flare mechanics, a save system, achievements, multiple game modes (Campaign, Endless, Time Attack, Hardcore, Zen), and a full settings menu.

---

### 🛗 The Elevator
| | |
|---|---|
| **Genre** | Psychological Horror / Mystery |
| **Engine** | Canvas 2D |
| **Difficulty** | Single |

A never-ending elevator. Each floor reveals a new horror. Find Floor 0 to escape — but the elevator has a mind of its own. Strange events, cryptic messages, and unsettling encounters await behind every door. Will you ever reach the ground floor?

---

### ⚔️ Total Zombies: Medieval
| | |
|---|---|
| **Genre** | Real-Time Strategy / Tower Defense |
| **Engine** | Canvas 2D |
| **Difficulty** | 5 campaign levels |

Command your medieval army through 5 epic battles against the undead zombie horde. Train knights, archers, and siege units. Place formations, upgrade your troops, and hold the line against increasingly powerful waves of the undead. Features a full campaign with unique maps and objectives.

---

### 🕸️ Web of Terror
| | |
|---|---|
| **Genre** | 3D First-Person Horror |
| **Engine** | Three.js (WebGL) |
| **Difficulty** | Progressive |

Spider-infested mines await. Navigate dark tunnels filled with webs, avoid spider swarms, and find the exit before you're cocooned. First-person perspective with flashlight mechanics, procedural web placement, and increasingly aggressive spider AI.

---

### ❄️ Yeti Run
| | |
|---|---|
| **Genre** | 3D Endless Runner / Horror |
| **Engine** | Three.js (WebGL) |
| **Difficulty** | Scales with distance |

A massive Yeti is chasing you through a frozen mountain pass. Sprint downhill, dodge trees and boulders, jump over crevasses, and don't look back. The Yeti gets faster the further you run. Features dynamic weather, snow particles, and cinematic chase camera.

---

### 🧟 Zombie Horde
| | |
|---|---|
| **Genre** | Top-Down Tower Defense / Survival |
| **Engine** | Canvas 2D |
| **Difficulty** | Wave-based |

Waves of undead swarm from all sides. Place turrets and barricades strategically to survive. Upgrade your defenses between rounds, unlock new weapon types, and hold out as long as possible against an ever-growing zombie horde.

---

## 🏗️ Project Structure

```
ScaryGamesAI/
├── server.js              # Node.js static file server (port 9999)
├── package.json           # Project config
├── index.html             # Main homepage
├── games.html             # Game gallery page
├── achievements.html      # Global achievements page
├── leaderboards.html      # Leaderboards page
├── css/
│   └── styles.css         # Global styles, themes, effects
├── js/
│   ├── main.js            # Homepage scripts
│   ├── game-utils.js      # Shared game utilities (difficulty, pause, state)
│   ├── audio.js           # HorrorAudio system (Web Audio API)
│   ├── achievements.js    # Achievement tracking
│   ├── leaderboards.js    # Score leaderboards
│   ├── profiles.js        # Player profiles
│   ├── daily.js           # Daily challenges
│   ├── social.js          # Social features
│   └── customizer.js      # Theme & effects customizer
├── assets/                # Videos and media
└── games/
    ├── backrooms-pacman/  # 3D Pac-Man horror
    ├── blood-tetris/      # Horror Tetris
    ├── dollhouse/         # Puzzle horror
    ├── graveyard-shift/   # Cemetery survival
    ├── nightmare-run/     # Endless runner
    ├── seance/            # Ouija board game
    ├── shadow-crawler/    # Dungeon crawler
    ├── the-abyss/         # 3D underwater horror
    ├── the-elevator/      # Psychological horror
    ├── total-zombies-medieval/  # RTS zombie battles
    ├── web-of-terror/     # Spider mine horror
    ├── yeti-run/          # 3D yeti chase
    └── zombie-horde/      # Tower defense
```

## 🛠️ Requirements

- **Node.js 18+** (only dependency — zero npm packages needed)
- Modern browser with **WebGL** support (Chrome, Firefox, Edge, Safari)
- No build step, no bundler, no framework — just `node server.js`

## 🗄️ Optional PostgreSQL + Redis Foundation (Phase 1.1)

The platform continues to run with the default JSON data layer. PostgreSQL and Redis are additive, optional foundations.

1. Copy [`./.env.example`](.env.example) to `.env`.
2. Configure PostgreSQL:
   - Set `DB_PROVIDER=postgres`
   - Set `DATABASE_URL=postgres://user:pass@host:5432/dbname`
3. (Optional) Configure Redis:
   - Set `REDIS_URL=redis://localhost:6379`
4. Run migrations:

```bash
npm run db:migrate
```

If PostgreSQL or Redis are unavailable, the app gracefully falls back to JSON storage and in-memory cache.

## 🔐 Branch Protection and Required Quality Gates (Phase 6)

Branch protection is enforced through the `quality` GitHub Actions check and CODEOWNERS policy.

- Workflow: [`ci-cd.yml`](.github/workflows/ci-cd.yml)
- Runbook: [`branch-protection.md`](docs/runbooks/branch-protection.md)
- Automation script: [`enforce-branch-protection.js`](scripts/enforce-branch-protection.js)
- Ownership policy: [`CODEOWNERS`](.github/CODEOWNERS)

Apply protection via script:

```bash
GITHUB_TOKEN=ghp_xxx GITHUB_OWNER=your-org-or-user GITHUB_REPO=ScaryGamesAI npm run branch:protect
```

## 📊 Observability + Feature Flags (Phase 6)

- Observability bootstrap: [`observability.js`](services/observability.js)
- Frontend Sentry loader: [`observability-client.js`](js/observability-client.js)
- Feature flag API: [`feature-flags.js`](api/feature-flags.js)
- Observability runbook: [`observability.md`](docs/runbooks/observability.md)
- Schema migration: [`007_phase6_observability_and_flags.sql`](db/migrations/007_phase6_observability_and_flags.sql)

Run migration and optional JSON backfill:

```bash
npm run db:migrate
npm run db:backfill:phase6
```

Quality and regression-protection entrypoints:

```bash
npm run ci:guardrails
npm run ci:quality
```

`ci:guardrails` runs fast static guard checks (script wiring, CI gates, telemetry hooks), while `ci:quality` runs the full lint/test/build/budget/guardrail chain.

## 🎯 Shared Features

All games share a common infrastructure:

- **4 Difficulty Levels** — Easy 💀, Normal 💀💀, Hard 💀💀💀, Nightmare ☠️
- **Pause Menu** — ESC to pause with resume/restart/quit
- **Fullscreen Mode** — One-click fullscreen toggle
- **HorrorAudio System** — Procedural drones, heartbeat, jump scares via Web Audio API
- **Theme System** — Multiple scary website themes with live preview
- **Visual Effects** — Vignettes, blood drips, static, scanlines overlays
- **Achievements** — Cross-game achievement tracking
- **Leaderboards** — Local high score tracking
- **Responsive** — Works on desktop and mobile browsers

---

<p align="center">
  <strong>Made with 🩸 by <a href="https://github.com/AcerThyRacer">AcerThyRacer</a></strong>
</p>
