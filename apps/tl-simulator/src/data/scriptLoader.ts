/**
 * Script Loader — bridges @tragedy/domain ScriptDef into the tl-simulator.
 *
 * Responsibilities:
 *   • Convert a ScriptDef into the initial TragedyGameState.v1 shape
 *   • Map character starting locations from domain data
 *   • Populate loop/day counts and incident schedule
 *   • Remain pure — no side effects, no @tragedy/domain import leaking to callers
 */

import type { ScriptDef } from '@tragedy/domain';
import type { TragedyGameState } from '../game/game';
import { buildMastermindDeck, buildProtagonistDeck } from './cardService';
import type { LocationId } from './boardGraph';
import { ALL_LOCATIONS } from './boardGraph';

// ── Character starting locations (mapped from domain) ────────────────────
import { CHARACTERS } from '@tragedy/domain';

// ── Script → Game State ──────────────────────────────────────────────────────

export interface ScriptSetupResult {
  maxLoops: number;
  daysPerLoop: number;
  characters: TragedyGameState['v1']['characters'];
  locations: TragedyGameState['v1']['locations'];
  seatHands: Record<string, string[]>;
  scheduledIncidents: Array<{ day: number; incidentId: string }>;
  scriptOpen: {
    title: string;
    tragedySetId: string;
    loops: number;
    daysPerLoop: number;
    specialRules: string[];
    incidentSchedule: Array<{ day: number; incidentId: string }>;
  };
  scriptSecret: {
    mainPlotId: string;
    subplotIds: string[];
    cast: ScriptDef['cast'];
    incidents: ScriptDef['incidents'];
  };
}

/**
 * Convert a ScriptDef into a full initial game state setup.
 * Call this from game.ts setup() instead of hardcoding.
 */
export function loadScript(script: ScriptDef): ScriptSetupResult {
  // ── Characters ──
  const characters: TragedyGameState['v1']['characters'] = {};
  for (const entry of script.cast) {
    const characterData = CHARACTERS[entry.characterId];
    const startLoc = (characterData?.startingLocations?.[0] as LocationId) || 'city';
    characters[entry.characterId] = {
      locationId: startLoc,
      tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 },
      alive: true,
    };
  }

  // ── Locations ──
  const locations: TragedyGameState['v1']['locations'] = {};
  for (const loc of ALL_LOCATIONS) {
    locations[loc] = { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } };
  }

  // ── Hands ──
  const seatHands: Record<string, string[]> = {
    '0': buildMastermindDeck(),
    '1': buildProtagonistDeck(),
    '2': buildProtagonistDeck(),
    '3': buildProtagonistDeck(),
  };

  // ── Incident schedule (Public, no culprits) ──
  const scheduledIncidents = script.incidents.map((inc) => ({
    day: inc.day,
    incidentId: inc.incidentId,
  }));

  // ── Open script view (visible to all) ──
  const scriptOpen = {
    title: script.title,
    tragedySetId: script.tragedySetId,
    loops: script.loops,
    daysPerLoop: script.daysPerLoop,
    specialRules: script.specialRules,
    incidentSchedule: script.incidents.map((inc) => ({
      day: inc.day,
      incidentId: inc.incidentId,
    })),
  };

  // ── Secret script view (mastermind only) ──
  const scriptSecret = {
    mainPlotId: script.mainPlotId,
    subplotIds: script.subplotIds,
    cast: script.cast,
    incidents: script.incidents,
  };

  return {
    maxLoops: script.loops,
    daysPerLoop: script.daysPerLoop,
    characters,
    locations,
    seatHands,
    scheduledIncidents,
    scriptOpen,
    scriptSecret,
  };
}
