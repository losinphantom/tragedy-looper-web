# 🎭 Tragedy Looper Online — Web Simulator

<p align="center">
  <strong>All Modules · Online Multiplayer · Semi-Auto Resolution · Open Source</strong>
</p>

<p align="center">
  <a href="./README.md">中文</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a>
</p>

---

A web-based simulator for **Tragedy Looper**, the deduction board game by BakaFire. Built on [boardgame.io](https://boardgame.io/) with support for 2-4 player real-time sessions and coverage of all official expansion modules.

> In Tragedy Looper, the Mastermind manipulates characters to cause tragedies, while Protagonists use time loops to uncover the truth and prevent disaster.

## ✨ Features

### 🎮 Core Gameplay
- **Complete phase state machine**: Day Start → Play Cards → Resolve → Abilities → Incidents → Day End
- **Semi-automatic resolution engine**: Effects are calculated automatically; key decisions remain with players
- **Seat-level information isolation**: Mastermind and Protagonists only see what they're allowed to
- **2-4 player variant rules**: Automatically adapts card counts, decks, and leader rotation

### 📦 Module Coverage
All **8 official modules + 10th Anniversary expansion** at 100% rule coverage:

| Module | Gate | Module | Gate |
|--------|------|--------|------|
| First Steps (FS) | ✅ 35/35 | Basic Tragedy X (BTX) | ✅ 126/126 |
| Mystery Circle (MC) | ✅ 39/39 | Haunted Stage Actors (HSA) | ✅ 24/24 |
| Weird Mythology (WM) | ✅ 23/23 | Midnight Zone (MZ) | ✅ 37/37 |
| Cosmic Evil (LL) | ✅ 6/6 | Another Horizon Revival (AHR) | ✅ 12/12 |

### 🎴 Engine Capabilities
- Action card resolver: 17+4 registered cards with 4-step priority resolution
- 10th Anniversary engine: Light of Hope, collision downgrade, Ex cards — full pipeline
- Goodwill ability engine: 30+ character abilities with auto-resolution
- Incident system: Includes independent crowd incident detection path
- Mastermind console: Snapshots, hidden identities, loop state management

### 🖥️ Frontend
- Blocking resolution overlay with card-flip animations
- Info sidebar: Character accordion, ability interaction, event timeline
- Mastermind ability panel: Mandatory / optional ability priority handling
- Incident history: Visual tracking (occurred / did not occur / immune)

## 📁 Project Structure

```
├── packages/
│   ├── domain/            Domain layer — types, characters, plots, scripts, modules
│   ├── game-logic/        Game logic — boardgame.io Game definition (moves/phases/FSM)
│   └── rules/             Rules validation
├── apps/
│   ├── server/            Backend — boardgame.io multiplayer server (port 8000)
│   └── tl-simulator/      Frontend — Vite + React SPA (port 5173)
│       └── public/assets/ Game assets — card art, portraits, skins, tokens
└── scripts/               Build, test, and audit scripts
```

## 🚀 Quick Start

> **Requirements**: Node.js ≥ 22 · npm ≥ 11

```bash
# Clone
git clone https://github.com/losinphantom/tragedy-looper-web.git
cd tragedy-looper-web

# Install dependencies
npm install --legacy-peer-deps

# Start backend (port 8000)
npm run serve --workspace=apps/server

# New terminal — start frontend (port 5173)
npm run dev --workspace=apps/tl-simulator
```

Open http://localhost:5173 to enter the game lobby 🎉

## 🎲 Game Flow

```
1. Mastermind creates a room → selects module and script
2. Protagonist players join (2-4 players)
3. Play through phases:
   Day Start → Play Cards → Action Resolution → Mastermind Abilities → Incidents → Day End
4. Loop ends → Final Guess → Determine winner
```

## ⚙️ Architecture

| Layer | Technologies |
|---|---|
| Frontend | React 19 · Vite 6 · Tailwind CSS 3 · Framer Motion · TypeScript |
| Backend | boardgame.io Server · Socket.IO · vite-node |
| Shared | npm workspaces monorepo · ESM · Vitest |

**Design Principles**:
- **Pure state machine**: Game logic is pure state transitions with no browser API dependencies
- **Data-driven**: Rule effects are defined by domain-layer data, not hardcoded in the engine
- **Shared packages**: Code under `packages/` runs on both client and server

## 🧪 Development

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Production build
npm run build --workspace=apps/tl-simulator
```

## 📜 License

MIT

## 🙏 Acknowledgements

- [BakaFire](https://twitter.com/BakaFire_TL) — Tragedy Looper game design
- [boardgame.io](https://boardgame.io/) — Game engine framework
