/**
 * Tragedy Looper — boardgame.io Multiplayer Server
 *
 * Uses the standard boardgame.io Server which provides:
 *   • SocketIO transport for real-time state sync
 *   • Built-in Lobby REST API (/games/tragedy-looper/create, join, leave, etc.)
 *   • Automatic playerView filtering (hides secrets from Protagonists)
 *   • In-memory game state storage (default)
 *
 * Custom additions:
 *   • DELETE /admin/force-delete/:matchID — force-delete a room (Admin only)
 *   • Stale room auto-cleanup (1h threshold, 5min interval)
 *
 * Usage:
 *   npm run serve          # Start on port 8000
 *   PORT=3001 npm run serve  # Start on custom port
 */

import { Server, Origins } from 'boardgame.io/server';
import {
  TIMELINE_CUTOVER_NOTE,
  TIMELINE_SCHEMA_VERSION as GAME_TIMELINE_SCHEMA_VERSION,
  TragedyLooper,
} from '@tragedy/game-logic';

const PORT = Number(process.env.PORT ?? 8000);
const STALE_ROOM_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // check every 5 min
const TIMELINE_SCHEMA_VERSION = GAME_TIMELINE_SCHEMA_VERSION;

// Allow origins from env (comma-separated) or default to localhost
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [Origins.LOCALHOST];

const server = Server({
  games: [TragedyLooper],
  origins: allowedOrigins as any,
});

async function listMatchIDs(): Promise<string[]> {
  const db = (server as any).db;
  if (db && typeof db.listMatches === 'function') {
    return await Promise.resolve(db.listMatches({ gameName: 'tragedy-looper' }));
  }

  const res = await fetch(`http://localhost:${PORT}/games/tragedy-looper`);
  if (!res.ok) return [];
  const data = await res.json() as { matches?: Array<{ matchID: string }> };
  return (data.matches || []).map(match => match.matchID);
}

async function fetchStoredMatchState(matchID: string): Promise<any | null> {
  const db = (server as any).db;
  if (!db || typeof db.fetch !== 'function') return null;

  const result = await Promise.resolve(db.fetch(matchID, { state: true }));
  return (result as any)?.state ?? null;
}

function getTimelineCompatibilityFailure(state: any): string | null {
  const timeline = state?.G?.v1?.timeline;
  if (!timeline) return 'missing G.v1.timeline';
  if (timeline.schemaVersion !== TIMELINE_SCHEMA_VERSION) {
    return `timeline.schemaVersion=${timeline.schemaVersion}`;
  }
  return null;
}

// ── Admin force-delete middleware (pure Koa, no extra deps) ──────────────────
// DELETE /admin/force-delete/:matchID
// Uses boardgame.io's internal db.wipe() to bypass the "all players must leave" check.
const app = (server as any).app;
if (app) {
  app.use(async (ctx: any, next: () => Promise<void>) => {
    const db = (server as any).db;

    if (ctx.method === 'POST' && ctx.path === '/admin/wipe-incompatible-timeline-rooms') {
      if (!db || typeof db.wipe !== 'function') {
        ctx.status = 501;
        ctx.body = { error: 'db.wipe not available' };
        return;
      }

      try {
        const matchIDs = await listMatchIDs();
        const wiped: Array<{ matchID: string; reason: string }> = [];
        const kept: string[] = [];

        for (const matchID of matchIDs) {
          const state = await fetchStoredMatchState(matchID);
          const failure = getTimelineCompatibilityFailure(state);

          if (failure) {
            await Promise.resolve(db.wipe(matchID));
            wiped.push({ matchID, reason: failure });
            console.log(`🧨 Wiped incompatible timeline room: ${matchID} (${failure})`);
          } else {
            kept.push(matchID);
          }
        }

        ctx.status = 200;
        ctx.body = {
          ok: true,
          timelineSchemaVersion: TIMELINE_SCHEMA_VERSION,
          cutoverNote: TIMELINE_CUTOVER_NOTE,
          wiped,
          kept,
        };
        return;
      } catch (e: any) {
        ctx.status = 500;
        ctx.body = { error: e.message };
        return;
      }
    }

    // Match: DELETE /admin/force-delete/<matchID>
    const match = ctx.method === 'DELETE' && ctx.path.match(/^\/admin\/force-delete\/(.+)$/);
    if (!match) return next();

    const matchID = match[1];
    try {
      if (db && typeof db.wipe === 'function') {
        await db.wipe(matchID);
        ctx.status = 200;
        ctx.body = { ok: true, deleted: matchID };
        console.log(`🛡️ Admin force-deleted room: ${matchID}`);
      } else {
        ctx.status = 501;
        ctx.body = { error: 'db.wipe not available' };
      }
    } catch (e: any) {
      ctx.status = 500;
      ctx.body = { error: e.message };
    }
  });
}

server.run(PORT, () => {
  console.log(`🎭 Tragedy Looper server running on http://localhost:${PORT}`);
  console.log(`📋 Lobby API: http://localhost:${PORT}/games/tragedy-looper`);
  console.log(`🛡️ Admin API: DELETE http://localhost:${PORT}/admin/force-delete/:matchID`);
  console.log(`🧨 Timeline wipe API: POST http://localhost:${PORT}/admin/wipe-incompatible-timeline-rooms`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🧹 Stale room cleanup: every ${CLEANUP_INTERVAL_MS / 60000} min, threshold ${STALE_ROOM_MS / 60000} min`);

  // ── Stale room auto-cleanup ────────────────────────────────────────────────
  setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:${PORT}/games/tragedy-looper`);
      if (!res.ok) return;
      const data = await res.json() as { matches: Array<{ matchID: string; updatedAt: number; createdAt: number }> };
      const now = Date.now();
      const db = (server as any).db;
      for (const match of data.matches || []) {
        const lastActivity = match.updatedAt || match.createdAt || 0;
        if (now - lastActivity > STALE_ROOM_MS) {
          if (db && typeof db.wipe === 'function') {
            await db.wipe(match.matchID);
          } else {
            await fetch(`http://localhost:${PORT}/games/tragedy-looper/${match.matchID}`, { method: 'DELETE' });
          }
          console.log(`🧹 Cleaned stale room: ${match.matchID} (inactive ${Math.round((now - lastActivity) / 60000)} min)`);
        }
      }
    } catch (e) {
      // Cleanup errors are non-fatal
    }
  }, CLEANUP_INTERVAL_MS);
});
