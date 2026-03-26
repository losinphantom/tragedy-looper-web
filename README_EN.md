# Tragedy Looper Simulator

An online simulator for the board game *Tragedy Looper*, built with [boardgame.io](https://boardgame.io/) and supporting real-time multiplayer sessions.

[中文版 →](./README.md)

## Project Structure

```
├── apps/
│   ├── server/            Backend — boardgame.io multiplayer server (port 8000)
│   └── tl-simulator/      Frontend — Vite + React SPA (port 5173)
├── packages/
│   ├── domain/            Data models — characters, incidents, scripts, modules
│   ├── game-logic/        Game logic — Game definition, moves, phases (shared)
│   └── rules/             Rules engine
├── docs/
│   ├── game-knowledge/    Game knowledge base — concepts, domain model, rules
│   ├── architecture/      Technical architecture docs
│   └── plans/             Development plans
```

## Quick Start

> Requires Node.js 22.22+ and npm 11+

```bash
# Install dependencies
npm install --legacy-peer-deps

# Terminal 1: Start the backend
npm run serve --workspace=apps/server

# Terminal 2: Start the frontend
npm run dev --workspace=apps/tl-simulator
```

Open http://localhost:5173 to enter the game lobby.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite 5, Tailwind CSS 3, TypeScript |
| Backend | boardgame.io Server, Socket.IO, vite-node |
| Shared | npm workspaces monorepo, ESM |

## Game Flow

1. **Mastermind** creates a room and selects a script module
2. **Protagonist** players join the room
3. Play proceeds in phases: Day Start → Play Cards → Resolve → Abilities → Incidents → Day End
4. After loops end, determine the winner

## Development

```bash
# Run tests
npm test

# Type checking
npm run typecheck
```
