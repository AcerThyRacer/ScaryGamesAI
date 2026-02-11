# 🎃 ScaryGamesAI Subscription System v2.0
## Complete 5-Phase Implementation Documentation

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Phase 1: Foundation & Conversion](#phase-1-foundation--conversion)
3. [Phase 2: Gamification & Engagement](#phase-2-gamification--engagement)
4. [Phase 3: AI & Personalization](#phase-3-ai--personalization)
5. [Phase 4: Social & Community](#phase-4-social--community)
6. [Phase 5: Metaverse & Advanced](#phase-5-metaverse--advanced)
7. [Installation](#installation)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)

---

## Overview

The ScaryGamesAI Subscription System is a comprehensive, gamified subscription platform featuring:

- **3 Tiers**: Survivor ($2/mo), Hunter ($5/mo), Elder God ($8/mo)
- **Battle Pass**: XP-based progression with 100+ levels
- **AI Recommendations**: Personalized horror game suggestions
- **Referral System**: Multi-tier rewards for bringing new souls
- **Community Goals**: Server-wide unlocks based on subscriber count
- **Cult System**: Social features and leaderboards

---

## Phase 1: Foundation & Conversion

### Payment Infrastructure
- **Stripe Integration**: Full checkout flow with webhooks
- **Annual Discounts**: 17% savings on annual subscriptions
- **Prorated Upgrades**: Seamless tier switching
- **Referral Discounts**: Automatic 20% off for referred users

### Urgency Mechanics
```javascript
// Limited spots counter (decreases throughout day)
Limited Spots: Only 47 Elder God slots remaining

// Flash sales (4-hour randomized windows)
Flash Sale: 35% OFF - Expires in 4:32:18

// Exit intent modal
Exit Offer: 20% off with code DONTLEAVE
```

### Dynamic Pricing
- Personalized discounts based on engagement
- High churn risk = Higher discount (up to 50%)
- Loyalty rewards for engaged users (10% off)

---

## Phase 2: Gamification & Engagement

### Battle Pass System

#### XP Sources
| Source | Base XP | Multiplier |
|--------|---------|------------|
| Daily Login | 50 | +10% per streak day |
| Game Played | 10 | +0.01 per minute |
| Achievement | 100 | - |
| Referral | 200 | - |
| Challenge | 75 | - |

#### Reward Tiers
| Level | Reward Type | Value |
|-------|-------------|-------|
| 1 | Cursor Skin | Blood-Stained |
| 5 | Currency | 100 Horror Coins |
| 10 | Mini-Game | Escape the Cellar |
| 25 | Subscription | Free week upgrade |
| 50 | Title | "Eternal" Status |
| 100 | Exclusive | Lifetime Perks |

### Referral System

#### Reward Structure
| Referrals | Reward | Status |
|-----------|--------|--------|
| 1 | 1 Week Free | Summoner |
| 3 | Skin Pack | Acolyte |
| 5 | 1 Month Free | Cult Leader |
| 10 | Permanent 20% Off | High Priest |

---

## Phase 3: AI & Personalization

### Horror Profile Analysis

The AI analyzes:
- **Horror Tolerance**: Based on difficulty preference, death rate, session length
- **Fear Profile**: Primary triggers, avoidance patterns, coping mechanisms
- **Play Patterns**: Preferred times, binge tendency, consistency
- **Genre Preferences**: Most played genres and satisfaction scores

### Player Archetypes

| Archetype | Traits | Recommended Tier |
|-----------|--------|------------------|
| Methodical Survivor | cautious, strategic, prepared | Survivor |
| Thrill Seeker | impulsive, adrenaline-driven | Hunter |
| Completionist | perfectionist, achievement-oriented | Elder God |
| Night Wanderer | nocturnal, immersive | Hunter |

### Adaptive Themes

System automatically applies themes based on profile:
- **Blood Moon**: High tolerance + aggressive play
- **Spectral**: Night owl preference
- **Void**: Elder God tier + max tolerance

---

## Phase 4: Social & Community

### Cult System

| Tier | Cult Name | Max Members | Benefits |
|------|-----------|-------------|----------|
| Survivor | The Trembling | 100 | Basic chat |
| Hunter | Moonlit Blades | 50 | Voting rights |
| Elder God | Void Council | 20 | Governance |

### Community Goals

| Subscribers | Reward | Status |
|-------------|--------|--------|
| 1,000 | Blood Moon Theme | 🔓 |
| 5,000 | Secret Laboratory Mini-Game | 🔒 |
| 10,000 | Community Boss | 🔒 |
| 50,000 | New Full Game | 🔒 |

### Leaderboards

- **Eternal Rankings**: By subscription streak
- **Summoners**: By successful referrals
- **Achievers**: By Battle Pass level

---

## Phase 5: Metaverse & Advanced

### Cross-Platform Sync

Platforms supported:
- Web (all tiers)
- Mobile (Hunter+)
- Desktop (Hunter+)
- VR (Elder God only)

### Future Features (Placeholder)

- **NFT Integration**: Soul-binding tokens
- **VR Previews**: WebXR tier visualization
- **DAO Governance**: Community voting
- **AI-Generated Content**: Personal nightmare generation

---

## Installation

### Prerequisites
- Node.js 18+
- Stripe account (for payments)

### Setup

```bash
# Install dependencies
npm install

# Run setup script
npm run setup

# Edit environment variables
cp .env.example .env
# Edit .env with your Stripe keys

# Start server
npm start
```

### Environment Variables

```env
PORT=9999
DOMAIN=http://localhost:9999
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET=your_secret
```

---

## API Reference

### Subscriptions

```http
POST   /api/subscriptions/create-checkout
GET    /api/subscriptions/status
POST   /api/subscriptions/cancel
POST   /api/subscriptions/change-tier
GET    /api/subscriptions/battle-pass
POST   /api/subscriptions/claim-reward
POST   /api/subscriptions/daily-login
GET    /api/subscriptions/leaderboard
GET    /api/subscriptions/profile
GET    /api/subscriptions/dashboard
GET    /api/subscriptions/community-goals
GET    /api/subscriptions/pricing
```

### Referrals

```http
GET    /api/referrals/my-code
GET    /api/referrals/stats
POST   /api/referrals/track-click
GET    /api/referrals/leaderboard
```

### Webhooks

```http
POST   /api/webhooks/stripe
```

---

## Database Schema

### Collections

#### users
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "authToken": "string",
  "horrorCoins": "number",
  "inventory": "array",
  "title": "string",
  "isEternal": "boolean",
  "createdAt": "ISO date"
}
```

#### subscriptions
```json
{
  "id": "string",
  "userId": "string",
  "tier": "survivor|hunter|elder",
  "billingCycle": "monthly|annual",
  "status": "pending|active|canceled",
  "stripeSubscriptionId": "string",
  "startedAt": "ISO date",
  "expiresAt": "ISO date",
  "streakDays": "number",
  "totalDays": "number"
}
```

#### battlepass
```json
{
  "id": "string",
  "userId": "string",
  "level": "number",
  "xp": "number",
  "rewardsClaimed": "array",
  "streakDays": "number",
  "lastLogin": "ISO date"
}
```

#### referrals
```json
{
  "id": "string",
  "referrerId": "string",
  "code": "string",
  "referredEmail": "string",
  "converted": "boolean",
  "convertedUserId": "string",
  "rewardValue": "number"
}
```

---

## Frontend Components

### Subscription System JavaScript

Main class: `SubscriptionSystem`

Key methods:
- `loadUserData()` - Fetches all user data
- `initializeUrgencyMechanics()` - Starts urgency systems
- `renderBattlePass()` - Updates BP widget
- `renderPersonalGrimoire()` - Shows AI profile
- `handleSubscribe(tier)` - Initiates checkout

### CSS Classes

```css
/* Urgency */
.urgency-meter          /* Limited spots display */
.flash-sale-inner       /* Flash sale banner */
.exit-modal-overlay     /* Exit intent modal */

/* Battle Pass */
.bp-widget              /* Main BP container */
.bp-progress-bar        /* XP progress */
.bp-streak              /* Login streak */

/* Social */
.cult-leaderboard       /* Rankings */
.community-goals        /* Milestone tracker */
.referral-widget        /* Referral UI */

/* AI */
.grimoire-personal      /* Horror profile */
.archetype-card         /* Player type */
.ai-recommendation      /* AI suggestions */
```

---

## Troubleshooting

### Common Issues

**Payment not processing**
- Check Stripe keys in .env
- Ensure webhook endpoint is accessible
- Verify price IDs match Stripe dashboard

**Battle Pass not updating**
- Check localStorage for 'sgai-token'
- Verify API is responding at /api/health
- Check browser console for errors

**Visual effects not working**
- Ensure canvas elements have dimensions
- Check for JavaScript errors
- Verify CSS is loaded

---

## License

GPL-3.0-or-later

---

## Support

For issues and feature requests, please use the GitHub issue tracker.

**Made with 🩸 by ScaryGamesAI**
