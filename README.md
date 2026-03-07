# 🎃 ScaryGamesAI Platform

**AAA Browser-Based Horror Gaming Platform**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-org/scarygamesai)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## 🎮 Overview

ScaryGamesAI is a cutting-edge browser-based horror gaming platform featuring:

- **20+ Horror Games** - From psychological horror to action-packed survival
- **WebGPU Rendering** - Next-gen graphics with 100k entity support
- **AI-Directed Horror** - Procedural scare scheduling and tension management
- **Cross-Platform** - Play on desktop, mobile, or tablet
- **Mod Support** - Create and share custom content
- **Multiplayer** - Voice chat, co-op, and competitive modes
- **Subscription Tiers** - Free to Elite+ with progressive benefits

### 🎯 Key Games

| Game | Genre | Status |
|------|-------|--------|
| Backrooms Pac-Man | Survival Horror | ✅ Complete |
| Hellaphobia | 2D Platformer | ✅ Complete |
| Cursed Depths | Metroidvania | ✅ Complete |
| Shadow Crawler 3D | FPS Horror | 🚧 In Progress |
| The Abyss | Underwater Horror | 🚧 In Progress |
| Total Zombies Rome | Strategy | ✅ Complete |

---

## ✨ Features

### Core Platform

- **User Authentication** - JWT + OAuth (Google, Discord, Steam)
- **Subscription System** - 4 tiers with Stripe integration
- **Cloud Saves** - Cross-device progress synchronization
- **Achievements** - Global achievement tracking
- **Battle Pass** - Seasonal progression system
- **Marketplace** - Player-to-player trading
- **Leaderboards** - Global rankings

### Engine Features

- **WebGPU Renderer** - 100,000 entities via GPU instancing
- **Advanced Physics** - Soft body, fluids, cloth, destruction
- **Ray Tracing** - Real-time ray marching with GI
- **Procedural Generation** - Wave Function Collapse, neural PCG
- **AI Systems** - Behavior trees, GOAP, multi-agent coordination
- **Spatial Audio** - 3D binaural sound with HRTF
- **Post-Processing** - Sanity-based hallucination effects

### Developer Tools

- **Mod Editor** - In-browser mod creation
- **Hot Reload** - Real-time code updates
- **Debug Overlay** - Performance monitoring
- **Error Tracking** - Sentry integration ready

---

## 🛠️ Tech Stack

### Frontend

- **JavaScript (ES2022)** - Modern ECMAScript
- **Three.js** - 3D graphics library
- **WebGPU** - Next-gen GPU API
- **Web Audio API** - Spatial audio processing
- **Socket.IO Client** - Real-time communication

### Backend

- **Node.js 18+** - Runtime environment
- **Express 4.x** - Web framework
- **PostgreSQL 15** - Primary database
- **Redis** - Caching and sessions
- **Stripe** - Payment processing

### DevOps

- **Vite** - Build tool and dev server
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing
- **Docker** - Containerization (optional)

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/scarygamesai.git
cd scarygamesai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

---

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 15 (optional, has JSON fallback)
- **Redis** >= 6 (optional, has memory fallback)

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/scarygamesai.git
cd scarygamesai
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your API keys:

```env
# Required for payments
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Required for auth
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret

# Optional: Database
DATABASE_URL=postgresql://user:pass@localhost:5432/scarygamesai

# Optional: Redis
REDIS_URL=redis://localhost:6379
```

### Step 4: Initialize Database (Optional)

```bash
psql -U user -d scarygamesai -f schema.sql
```

### Step 5: Start Development

```bash
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: Backend API
node server.js
```

---

## 📁 Project Structure

```
scarygamesai/
├── api/                      # Backend API routes
│   ├── auth.js              # Authentication endpoints
│   ├── subscriptions.js     # Subscription management
│   ├── store.js             # In-game store
│   ├── marketplace.js       # Player marketplace
│   ├── mods.js              # Mod platform API ⭐ NEW
│   └── index.js             # Route aggregator
│
├── services/                 # Business logic layer
│   ├── authService.js       # JWT, OAuth, 2FA
│   ├── paymentService.js    # Stripe integration ⭐ FIXED
│   ├── cacheService.js      # Redis caching
│   └── battlePassService.js # Battle pass logic
│
├── models/                   # Data access layer
│   ├── postgres.js          # PostgreSQL client
│   ├── database.js          # JSON fallback DB
│   └── data-access.js       # Unified data access
│
├── middleware/               # Express middleware
│   ├── auth.js              # Authentication middleware
│   ├── rateLimit.js         # Rate limiting
│   └── apiVersion.js        # API versioning
│
├── core/                     # Core engine systems (124 files)
│   ├── renderer/            # WebGPU/WebGL rendering
│   ├── audio/               # Audio systems
│   ├── ai/                  # AI behavior systems
│   ├── physics/             # Physics engines
│   ├── procedural/          # Procedural generation
│   └── utils/               # Core utilities
│
├── games/                    # Game directories (20+ games)
│   ├── backrooms-pacman/
│   ├── hellaphobia/
│   ├── cursed-depths/
│   ├── shadow-crawler-3d/   # 🚧 In Progress
│   └── ...
│
├── js/                       # Frontend JavaScript (129 files)
│   ├── core/                # Frontend core systems
│   ├── battle-pass/         # Battle pass UI
│   ├── auth-state-manager.js
│   └── subscription-system.js
│
├── css/                      # Stylesheets (21 files)
│   ├── styles.css           # Main styles
│   ├── components.css       # Component styles
│   └── mobile-*.css         # Mobile enhancements
│
├── scripts/                  # Build & maintenance scripts
│   ├── setup.js             # Project setup
│   ├── optimize-assets.js   # Asset optimization
│   └── check-bundle-budgets.js
│
├── server.js                 # Express app entry point ⭐ NEW
├── schema.sql                # Database schema ⭐ NEW
├── vite.config.js            # Vite configuration ⭐ TODO
├── package.json
└── README.md                 # This file
```

---

## 📚 API Documentation

### Base URL

```
Development: http://localhost:3001/api
Production: https://api.scarygamesai.com/api
```

### Authentication

Most endpoints require authentication via JWT:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3001/api/user/profile
```

### Key Endpoints

#### Authentication

```http
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login
POST   /api/auth/refresh           # Refresh token
POST   /api/auth/logout            # Logout
GET    /api/auth/google            # Google OAuth
GET    /api/auth/discord           # Discord OAuth
GET    /api/auth/steam             # Steam OAuth
```

#### Subscriptions

```http
POST   /api/subscriptions/create   # Create checkout session
GET    /api/subscriptions/status   # Get subscription status
POST   /api/subscriptions/cancel   # Cancel subscription
GET    /api/subscriptions/tiers    # List available tiers
```

#### Mods Platform ⭐ NEW

```http
GET    /api/mods/search            # Search mods
GET    /api/mods/:id               # Get mod details
POST   /api/mods/:id/download      # Download mod (auth required)
POST   /api/mods/upload            # Upload mod (auth required)
POST   /api/mods/:id/rate          # Rate mod (auth required)
GET    /api/mods/user/:userId      # Get user's mods
```

#### Game Saves

```http
GET    /api/saves/:gameId          # Get save for game
POST   /api/saves/:gameId          # Save game
DELETE /api/saves/:gameId          # Delete save
```

### Rate Limiting

| Endpoint Tier | Limit | Window |
|---------------|-------|--------|
| Global | 1000 req | 1 min |
| API Default | 240 req | 1 min |
| API v1 | 180 req | 1 min |
| API v2 | 300 req | 1 min |
| Auth | 10 req | 1 min |

---

## 👨‍💻 Development

### Running in Development

```bash
# Start frontend dev server (Vite)
npm run dev

# Start backend API
node server.js

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint
```

### Code Style

- **JavaScript**: ES2022 with modules
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Files**: Lowercase with hyphens (`my-module.js`)
- **Comments**: JSDoc for public APIs

### Adding New Games

1. Create game directory: `games/my-game/`
2. Add main file: `my-game.html` + `my-game.js`
3. Register in `js/main.js` game catalog
4. Add to database if needed

### Adding API Routes

1. Create route file: `api/my-feature.js`
2. Export Express router
3. Mount in `api/index.js`
4. Add rate limiting and auth middleware

---

## 🚢 Deployment

### Production Build

```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production node server.js
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=<strong-random-secret>
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY . .
EXPOSE 3001

CMD ["node", "server.js"]
```

```bash
docker build -t scarygamesai .
docker run -p 3001:3001 --env-file .env scarygamesai
```

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Example test:

```javascript
// tests/unit/auth.test.js
import { describe, it, expect } from 'vitest';
import { authService } from '../../services/authService.js';

describe('Authentication', () => {
  it('should generate valid JWT token', async () => {
    const user = { id: '123', email: 'test@example.com' };
    const token = await authService.issueToken(user);
    expect(token).toBeDefined();
    expect(token.accessToken).toBeDefined();
  });
});
```

### E2E Tests

```bash
npm run test:e2e
```

Example test:

```javascript
// tests/e2e/auth-flow.spec.js
import { test, expect } from '@playwright/test';

test('user can register and login', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('[data-testid="login-button"]');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
});
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Contribution Guidelines

- Write tests for new features
- Follow existing code style
- Update documentation
- Keep PRs focused and small
- Be respectful in code reviews

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Three.js team for the amazing 3D library
- WebGPU working group for next-gen graphics
- All contributors and the horror gaming community

---

## 📞 Support

- **Documentation**: https://docs.scarygamesai.com
- **Discord**: https://discord.gg/scarygamesai
- **Twitter**: @ScaryGamesAI
- **Email**: support@scarygamesai.com

---

**Made with 👻 by the ScaryGamesAI Team**
