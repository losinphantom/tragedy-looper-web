/**
 * Game Moves — controlled player actions.
 *
 * ## Security model (boardgame.io convention)
 * - Moves run on both client (optimistic) and server (authoritative).
 * - All validation must happen inside the move body using G and ctx.
 * - Return INVALID_MOVE to reject illegal actions.
 *
 * ## Validation rules for playCard:
 *   • Cards must exist in the player's hand (seat-specific)
 *   • Once-per-loop cards cannot be replayed within the same loop
 *   • Mastermind plays max 3 cards per day
 *   • Each Protagonist plays max 1 card per day
 *   • No duplicate targets from the same seat in one day
 *   • Must be in the correct phase (mastermind_plan or protagonist_plan)
 */

import type { Move } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { TargetSlot, TragedyGameState } from './game';
import { canPhaseAdvanceViaMove, getManualPhaseAdvanceDecision } from './phaseAdvancePolicy';
import { addToken } from './utils/tokenHelpers';
import { applyCharacterTokenDelta } from './rules/ahrState';
import { getSeatColor } from './data/cardService';
import { getLocalizedTerm } from './data/translationService';
import { getProtagonistSeats, getMaxCardsForSeat, detectPlayerCount } from './playerConfig';
import { CHARACTERS, getIncidentById, getRoleById, getScriptById, getTragedySetById } from '@tragedy/domain';
import {
  loadScript,
  buildActiveRules,
  buildIncidentInstanceKey,
  getScriptRuntimeCapability,
} from './scriptLoader';
import { setActiveRules, getProcessor, resolveTimingWindow } from './ruleEngine';
import { getIncidentTriggerStatus } from './engine/autoResolve';
import {
  getGoodwillTrait,
  isImmuneToRejection,
  executeGoodwillAbility,
  isOncePerLoopGoodwillAbility,
  markAbilityUsed,
} from './engine/goodwillResolver';
import { validatePlayCard, validateRecallCard } from './action-cards';
import { applyIncidentExDelta, configureExForSet } from './rules/incidentEx';
import {
  getModuleIncidentRequiredSlotIds,
  isModuleCrossPhaseAbility,
  validateModuleIncidentSelections,
} from './rules/moduleInteraction';
import { markWorldShiftThisDay } from './rules/ahrWorldShift';
import { applyModuleLoopResultEffects, runModuleLifecycle } from './rules/moduleLifecycle';

import { buildIncidentTargetSlots } from './runtime/incidents';
import { canCharacterMoveBetween } from './runtime/movementRestrictions';
import {
  buildGoodwillInteraction,
  clearPendingInteractions,
  enqueueButterflyChoiceInteraction,
  getPendingGoodwillInteraction,
  getPendingIncidentResolutionInteractionBySource,
  getPendingButterflyChoiceInteraction,
  getPendingLoopResultResolutionInteraction,
  hasPendingButterflyChoiceInteraction,
  hasPendingIncidentResolutionInteractions,
  removePendingInteractionBySource,
  setPendingGoodwillInteraction,
  syncPendingIncidentCompatibilitySlice,
  syncPendingInteractionsFromLegacyState,
} from './runtime/interactions';
import { buildLoopOutcomeAnnouncement, pushResultAnnouncement } from './resultAnnouncements';
import type { TimelineJsonValue } from './timeline/factSchema';
import {
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
  createSeatPrivateTimelineVisibility,
  type TimelineVisibility,
} from './timeline/factVisibility';
import {
  appendProjectedTimelineFact,
  appendProjectedTimelineFacts,
  buildTimelineCompatibilityMetadata,
} from './timeline/legacyHistoryProjection';
import { startTimelineFlow } from './timeline/factWriter';

function hasLoopUsageFlag(G: TragedyGameState, key: string): boolean {
  return !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

type SnapshotPayload = {
  scriptOpen: TragedyGameState['scriptOpen'];
  scriptSecret: TragedyGameState['scriptSecret'];
  tragedySet: TragedyGameState['tragedySet'];
  loopIndex: number;
  maxLoops: number;
  day: number;
  daysPerLoop: number;
  leaderSeat: string | null;
  publicLog: string[];
  fullLog: string[];
  seatHands: TragedyGameState['seatHands'];
  board: TragedyGameState['board'];
  v1: Omit<TragedyGameState['v1'], 'mastermindConsole'>;
};

const CONSOLE_PHASES = [
  'time_spiral',
  'loop_setup',
  'day_start',
  'mastermind_plan',
  'protagonist_plan',
  'resolve_cards',
  'mastermind_abilities',
  'goodwill_window',
  'incidents',
  'day_end',
  'loop_end_check',
  'final_guess',
  'match_end',
] as const;

const uid = () => Math.random().toString(36).slice(2, 11);
const LOBBY_PROTAGONIST_SEATS = ['1', '2', '3'] as const;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toTimelineJsonValue(value: unknown): TimelineJsonValue {
  return JSON.parse(JSON.stringify(value)) as TimelineJsonValue;
}

function toTimelineActorCharacterId(characterId: string | null | undefined): string | undefined {
  return characterId && characterId.length > 0 ? characterId : undefined;
}

function getLatestFactIdForFlow(G: TragedyGameState, flowId: string): string | null {
  for (let index = G.v1.timeline.facts.length - 1; index >= 0; index -= 1) {
    const fact = G.v1.timeline.facts[index];
    if (fact?.flowId === flowId) return fact.factId;
  }
  return null;
}

function appendMoveResolutionFact(args: {
  G: TragedyGameState;
  sourceId: string;
  flowId?: string;
  causedByFactIds?: string[];
  phase?: string;
  phaseStep: string;
  outcome: string;
  summary: string;
  visibility: TimelineVisibility;
  compatibility?: Parameters<typeof buildTimelineCompatibilityMetadata>[0];
  changes?: Array<{
    targetType: 'character' | 'location' | 'global' | 'card' | 'interaction' | 'rule';
    targetId: string;
    field: string;
    delta?: number;
    previousValue?: TimelineJsonValue;
    nextValue?: TimelineJsonValue;
    reason?: string;
  }>;
}) {
  return appendProjectedTimelineFact(args.G, {
    type: 'state_change',
    flowId: args.flowId,
    causedByFactIds: args.causedByFactIds,
    source: {
      system: 'move',
      id: args.sourceId,
      ...(args.phase ? { phase: args.phase } : {}),
    },
    actor: null,
    visibility: args.visibility,
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: args.outcome,
      summary: args.summary,
      changes: args.changes ?? [],
      metadata: args.compatibility ? buildTimelineCompatibilityMetadata(args.compatibility) : {},
    },
    gameTime: {
      phase: args.phase ?? null,
      phaseStep: args.phaseStep,
    },
  });
}

// ── 能力结算事后通知辅助 ─────────────────────────────────────────────────────

interface StateSnapshot {
  chars: Record<string, { locationId: string; alive: boolean; tokens: Record<string, number> }>;
  locs: Record<string, { tokens: Record<string, number> }>;
}

function snapshotGameState(G: TragedyGameState): StateSnapshot {
  const chars: StateSnapshot['chars'] = {};
  for (const [id, ch] of Object.entries(G.v1.characters)) {
    chars[id] = { locationId: ch.locationId, alive: ch.alive, tokens: { ...ch.tokens } };
  }
  const locs: StateSnapshot['locs'] = {};
  for (const [id, loc] of Object.entries(G.v1.locations)) {
    locs[id] = { tokens: { ...loc.tokens } };
  }
  return { chars, locs };
}

function emitAbilityResolveEffects(
  G: TragedyGameState,
  flowId: string,
  phase: string | undefined,
  before: StateSnapshot,
): void {
  let emittedAny = false;

  for (const [charId, beforeChar] of Object.entries(before.chars)) {
    const afterChar = G.v1.characters[charId];
    if (!afterChar) continue;

    const effects: Array<{ kind: string; counter?: string; delta?: number; reason?: string }> = [];
    const allTokenKeys = new Set([...Object.keys(beforeChar.tokens), ...Object.keys(afterChar.tokens)]);
    for (const token of allTokenKeys) {
      const beforeVal = (beforeChar.tokens[token] as number) ?? 0;
      const afterVal = (afterChar.tokens as Record<string, number>)[token] ?? 0;
      const delta = afterVal - beforeVal;
      if (delta !== 0) {
        effects.push({ kind: 'counter', counter: token, delta });
      }
    }
    if (beforeChar.alive && !afterChar.alive) {
      effects.push({ kind: 'no_effect', reason: '角色死亡' });
    } else if (!beforeChar.alive && afterChar.alive) {
      effects.push({ kind: 'no_effect', reason: '角色复活' });
    }

    if (effects.length > 0) {
      appendMoveResolutionFact({
        G, sourceId: 'confirmAbility', flowId, phase,
        phaseStep: 'ability-resolve-effect',
        outcome: 'ability_effect_applied',
        summary: `能力效果作用于 ${charId}`,
        visibility: createPublicTimelineVisibility(),
        compatibility: {
          eventLogs: [{ type: 'resolve_effect', payload: toTimelineJsonValue({ targetType: 'character', targetId: charId, effects }) }],
        },
      });
      emittedAny = true;
    }

    if (beforeChar.locationId !== afterChar.locationId) {
      appendMoveResolutionFact({
        G, sourceId: 'confirmAbility', flowId, phase,
        phaseStep: 'ability-resolve-move',
        outcome: 'ability_move_applied',
        summary: `${charId}: ${beforeChar.locationId} → ${afterChar.locationId}`,
        visibility: createPublicTimelineVisibility(),
        compatibility: {
          eventLogs: [{ type: 'resolve_move', payload: toTimelineJsonValue({ targetType: 'character', targetId: charId, charId, from: beforeChar.locationId, to: afterChar.locationId }) }],
        },
      });
      emittedAny = true;
    }
  }

  for (const [locId, beforeLoc] of Object.entries(before.locs)) {
    const afterLoc = G.v1.locations[locId];
    if (!afterLoc) continue;
    const effects: Array<{ kind: string; counter?: string; delta?: number; reason?: string }> = [];
    const allTokenKeys = new Set([...Object.keys(beforeLoc.tokens), ...Object.keys(afterLoc.tokens)]);
    for (const token of allTokenKeys) {
      const beforeVal = (beforeLoc.tokens[token] as number) ?? 0;
      const afterVal = (afterLoc.tokens as Record<string, number>)[token] ?? 0;
      const delta = afterVal - beforeVal;
      if (delta !== 0) {
        effects.push({ kind: 'counter', counter: token, delta });
      }
    }
    if (effects.length > 0) {
      appendMoveResolutionFact({
        G, sourceId: 'confirmAbility', flowId, phase,
        phaseStep: 'ability-resolve-effect',
        outcome: 'ability_effect_applied',
        summary: `能力效果作用于地点 ${locId}`,
        visibility: createPublicTimelineVisibility(),
        compatibility: {
          eventLogs: [{ type: 'resolve_effect', payload: toTimelineJsonValue({ targetType: 'location', targetId: locId, effects }) }],
        },
      });
      emittedAny = true;
    }
  }

  if (!emittedAny) {
    appendMoveResolutionFact({
      G, sourceId: 'confirmAbility', flowId, phase,
      phaseStep: 'ability-resolve-effect',
      outcome: 'ability_no_visible_effect',
      summary: '能力已结算，无可见变化',
      visibility: createPublicTimelineVisibility(),
      compatibility: {
        eventLogs: [{ type: 'resolve_effect', payload: toTimelineJsonValue({ targetType: 'character', targetId: 'unknown', effects: [{ kind: 'no_effect', reason: '能力已结算，无可见变化' }] }) }],
      },
    });
  }
}

function appendMoveManualFact(args: {
  G: TragedyGameState;
  sourceId: string;
  flowId?: string;
  causedByFactIds?: string[];
  phase?: string;
  phaseStep: string;
  operation: string;
  summary: string;
  visibility: TimelineVisibility;
  compatibility?: Parameters<typeof buildTimelineCompatibilityMetadata>[0];
  changes?: Array<{
    targetType: 'character' | 'location' | 'global' | 'card' | 'interaction' | 'rule';
    targetId: string;
    field: string;
    delta?: number;
    previousValue?: TimelineJsonValue;
    nextValue?: TimelineJsonValue;
    reason?: string;
  }>;
}) {
  return appendProjectedTimelineFact(args.G, {
    type: 'manual_adjustment',
    flowId: args.flowId,
    causedByFactIds: args.causedByFactIds,
    source: {
      system: 'move',
      id: args.sourceId,
      ...(args.phase ? { phase: args.phase } : {}),
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
    },
    visibility: args.visibility,
    payload: {
      family: 'manual',
      type: 'manual_adjustment',
      operation: args.operation,
      summary: args.summary,
      changes: args.changes ?? [],
      metadata: args.compatibility ? buildTimelineCompatibilityMetadata(args.compatibility) : {},
    },
    gameTime: {
      phase: args.phase ?? null,
      phaseStep: args.phaseStep,
    },
  });
}

function rebuildActiveRulesForCurrentScript(G: TragedyGameState): void {
  const setId = G.scriptOpen?.tragedySetId;
  if (!setId) return;
  const activeRules = buildActiveRules(
    setId,
    G.v1.activePlots || [],
    G.v1.hiddenRoles || {},
    G.v1.scheduledIncidents || [],
    G.v1.ahrVariableRoles || {},
  );
  setActiveRules(G, activeRules);
}

function getCastDefinition(G: TragedyGameState, charId: string) {
  return (G.v1.castDefinitions || []).find(def => def.characterId === charId);
}

function getFinalGuessAnswer(
  G: TragedyGameState,
  charId: string,
): { requiresDualGuess: boolean; roleId?: string; frontRoleId?: string; backRoleId?: string } {
  const castDef = getCastDefinition(G, charId);
  if (castDef) {
    const frontRoleId = castDef.roleId || 'person';
    const backRoleId = castDef.backRoleId || 'person';
    if (castDef.backRoleId && backRoleId !== frontRoleId) {
      return {
        requiresDualGuess: true,
        frontRoleId,
        backRoleId,
      };
    }
    return {
      requiresDualGuess: false,
      roleId: frontRoleId,
    };
  }

  const variableAssignment = G.v1.ahrVariableRoles?.[charId];
  if (variableAssignment && variableAssignment.backRoleId !== variableAssignment.frontRoleId) {
    return {
      requiresDualGuess: true,
      frontRoleId: variableAssignment.frontRoleId || 'person',
      backRoleId: variableAssignment.backRoleId || 'person',
    };
  }

  return {
    requiresDualGuess: false,
    roleId: G.v1.hiddenRoles?.[charId] || 'person',
  };
}

function syncScriptSecretRole(
  G: TragedyGameState,
  characterId: string,
  roleId: string | null,
): void {
  const cast = (G.scriptSecret as any)?.cast;
  if (!Array.isArray(cast)) return;
  const entry = cast.find((item: any) => item.characterId === characterId);
  if (entry) entry.roleId = roleId;
}

function syncScriptSecretIncident(
  G: TragedyGameState,
  day: number,
  incidentId: string,
  culpritId: string | null,
  occurrenceIndex: number,
): void {
  const incidents = (G.scriptSecret as any)?.incidents;
  if (!Array.isArray(incidents)) return;
  let seen = 0;
  const entry = incidents.find((item: any) => {
    if (item.day !== day || item.incidentId !== incidentId) return false;
    if (seen === occurrenceIndex) return true;
    seen += 1;
    return false;
  });
  if (entry) {
    entry.culpritCharacterId = culpritId ?? undefined;
  }
}

function canEditTableTimeAtPhase(phase: string | null | undefined): boolean {
  return phase === 'time_spiral';
}

function hasPendingPhaseCheckpointWork(
  G: TragedyGameState,
  phase: string,
): boolean {
  const hasBlockingRuntimeInteraction = (G.v1.pendingInteractions || []).some(
    interaction => interaction.blocking && interaction.kind !== 'time_spiral_discussion',
  );
  const hasPendingGoodwillInteraction = !!G.v1.goodwillInteraction
    && G.v1.goodwillInteraction.phase !== 'idle'
    && G.v1.goodwillInteraction.phase !== 'done';
  const hasPendingMastermindAbilities = (G.v1.pendingAbilities?.length || 0) > 0;
  const hasPendingIncidentInteractions = hasPendingIncidentResolutionInteractions(G);

  return hasPendingButterflyChoiceInteraction(G)
    || hasBlockingRuntimeInteraction
    || (phase === 'goodwill_window' && hasPendingGoodwillInteraction)
    || ((phase === 'mastermind_abilities' || phase === 'day_end') && hasPendingMastermindAbilities)
    || (phase === 'incidents' && hasPendingIncidentInteractions);
}

function getPendingAbilityPhase(
  ability: TragedyGameState['v1']['pendingAbilities'][number],
): 'mastermind_abilities' | 'day_end' {
  return ability.phase || 'mastermind_abilities';
}

function getPendingAbilityTiming(
  ability: TragedyGameState['v1']['pendingAbilities'][number],
): 'mastermind_ability' | 'day_end' {
  return ability.timing || (getPendingAbilityPhase(ability) === 'day_end' ? 'day_end' : 'mastermind_ability');
}

function clearPendingAbilityInteractions(
  G: TragedyGameState,
): void {
  removePendingInteractionBySource(G, 'mastermind_ability');
}

function canResolvePendingAbilityAtPhase(
  G: TragedyGameState,
  ability: TragedyGameState['v1']['pendingAbilities'][number],
  phase: string,
): boolean {
  if (getPendingAbilityPhase(ability) === phase) return true;
  return phase !== 'mastermind_abilities' && isCrossPhasePendingAbility(G, ability);
}

function canDeclareLoopLossAtPhase(phase: string | null | undefined): boolean {
  return [
    'day_start',
    'mastermind_plan',
    'protagonist_plan',
    'resolve_cards',
    'mastermind_abilities',
    'goodwill_window',
    'incidents',
    'day_end',
  ].includes(phase || '');
}

function canAdjustPlayerCountAtPhase(phase: string | null | undefined): boolean {
  return phase === 'lobby_wait' || phase === 'time_spiral';
}

function getJoinedLobbyProtagonistSeats(G: TragedyGameState): string[] {
  return LOBBY_PROTAGONIST_SEATS.filter(seat => G.v1.joinedProtagonists?.[seat]);
}

function hasTransientConsoleState(G: TragedyGameState): boolean {
  return G.v1.playedCards.length > 0
    || Object.values(G.v1.readyPlayers || {}).some(Boolean)
    || (G.v1.pendingAbilities?.length || 0) > 0
    || hasPendingIncidentResolutionInteractions(G)
    || hasPendingButterflyChoiceInteraction(G)
    || !!G.v1.goodwillInteraction?.currentDeclaration
    || (G.v1.goodwillInteraction?.phase !== 'idle' && G.v1.goodwillInteraction?.phase !== 'done');
}

function buildSnapshotPayload(G: TragedyGameState): SnapshotPayload {
  const { mastermindConsole: _console, ...restV1 } = G.v1;
  return deepClone({
    scriptOpen: G.scriptOpen,
    scriptSecret: G.scriptSecret,
    tragedySet: G.tragedySet,
    loopIndex: G.loopIndex,
    maxLoops: G.maxLoops,
    day: G.day,
    daysPerLoop: G.daysPerLoop,
    leaderSeat: G.leaderSeat,
    publicLog: G.publicLog,
    fullLog: G.fullLog,
    seatHands: G.seatHands,
    board: G.board,
    v1: restV1,
  });
}

function saveSnapshot(
  G: TragedyGameState,
  phase: string | null,
  label?: string,
): void {
  const snapshotId = G.v1.mastermindConsole.nextSnapshotId || 1;
  G.v1.mastermindConsole.lastSnapshot = {
    label: label || `Snapshot L${G.loopIndex + 1} D${G.day}`,
    capturedAt: `#${snapshotId} · L${G.loopIndex + 1} D${G.day} · ${phase || 'unknown'}`,
    phase,
    payload: buildSnapshotPayload(G),
  };
  G.v1.mastermindConsole.nextSnapshotId = snapshotId + 1;
}

function restoreSnapshotPayload(
  G: TragedyGameState,
  payload: SnapshotPayload,
): void {
  const preservedConsole = G.v1.mastermindConsole;
  const restored = deepClone(payload);

  G.scriptOpen = restored.scriptOpen;
  G.scriptSecret = restored.scriptSecret;
  G.tragedySet = restored.tragedySet;
  G.loopIndex = restored.loopIndex;
  G.maxLoops = restored.maxLoops;
  G.day = restored.day;
  G.daysPerLoop = restored.daysPerLoop;
  G.leaderSeat = restored.leaderSeat;
  G.publicLog = restored.publicLog;
  G.fullLog = restored.fullLog;
  G.seatHands = restored.seatHands;
  G.board = restored.board;
  Object.assign(G.v1, restored.v1);
  G.v1.mastermindConsole = preservedConsole;
}

// ── advancePhase: advances the game phase ─────────────────────────────────────
//
// This move is intentionally thin. All state mutations (day increment, card
// return, loop reset, leader rotation) live in phases.ts onBegin hooks.
// advancePhase only does:
//   1. Permission check (who can push which phase)
//   2. Card-count enforcement (must play required cards)
//   3. Ready-gate for protagonist simultaneous play
//   4. events.endPhase() — phases.ts `next` handles the routing

const advancePhase: Move<TragedyGameState> = ({ G, ctx, events, playerID }) => {
  if (!playerID) return INVALID_MOVE;
  const phase = ctx.phase || '';
  const isMastermind = playerID === '0';
  if (!canPhaseAdvanceViaMove(phase)) return INVALID_MOVE;

  if (phase !== 'mastermind_plan' && phase !== 'protagonist_plan') {
    const hasPendingAbilitiesForPhase = (phase === 'mastermind_abilities' || phase === 'day_end')
      && (G.v1.pendingAbilities?.length || 0) > 0;
    const hasMandatoryPendingAbilities = (phase === 'mastermind_abilities' || phase === 'day_end')
      && (G.v1.pendingAbilities || []).some(ability => ability.mandatory);
    const advanceDecision = getManualPhaseAdvanceDecision({
      isMastermind,
      isLeader: playerID === G.v1.leader,
      phase,
      hasPendingAbilitiesForPhase,
      hasMandatoryPendingAbilities,
      goodwillInteractionPhase: G.v1.goodwillInteraction?.phase || 'idle',
      hasBlockingLoopResult: !!getPendingLoopResultResolutionInteraction(G),
    });
    if (!advanceDecision.canAdvance || advanceDecision.action !== 'advancePhase') {
      return INVALID_MOVE;
    }
  }

  if (hasPendingPhaseCheckpointWork(G, phase)) {
    return INVALID_MOVE;
  }

  // ── 出牌阶段：必须出满牌 ──
  if (phase === 'mastermind_plan') {
    if (!isMastermind) return INVALID_MOVE;
    const mmPlayed = G.v1.playedCards.filter(c => c.playedBySeat === '0').length;
    if (mmPlayed < 3) return INVALID_MOVE;
  }

  if (phase === 'protagonist_plan') {
    if (!isMastermind) {
      const myPlayed = G.v1.playedCards.filter(c => c.playedBySeat === playerID).length;
      const requiredCards = getMaxCardsForSeat(G, playerID);
      if (myPlayed < requiredCards) return INVALID_MOVE;

      if (G.v1.settings.leaderMode) {
        // 串行模式：只有当前轮次玩家可以确认
        const currentSeat = G.v1.leaderTurnOrder[G.v1.leaderTurnIndex];
        if (playerID !== currentSeat) return INVALID_MOVE;

        G.v1.readyPlayers[playerID] = true;
        G.v1.leaderTurnIndex++;

        if (G.v1.leaderTurnIndex < G.v1.leaderTurnOrder.length) {
          return; // 等下一位主角出牌
        }
      } else {
        // 并行模式：原有 ready-gate 逻辑
        G.v1.readyPlayers[playerID] = true;
        const pSeats = getProtagonistSeats(G);
        const allPlayed = pSeats.every(
          seat => G.v1.playedCards.some(c => c.playedBySeat === seat),
        );
        if (!allPlayed) return;
        const allReady = pSeats.every(s => G.v1.readyPlayers[s]);
        if (!allReady) return; // 标记 ready 但等其他人
      }
    } else {
      // 剧作家不能推进主角出牌阶段
      return INVALID_MOVE;
    }
  }

  // ── loopLost：phases.ts 的 next 函数会路由到 loop_end_check ──
  // 不需要手动 setPhase，endPhase 后 next 函数会检查 loopLost

  // ── 推进到下一阶段 ──
  events.endPhase();
};

// ── selectScript: Mastermind picks a script before game starts ────────────────

const selectScript: Move<TragedyGameState> = ({ G, ctx, events, playerID }, scriptId: string) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'script_select') return INVALID_MOVE;

  const entry = getScriptById(scriptId);
  if (!entry) return INVALID_MOVE;

  const script = loadScript(entry.def);
  const runtimeCapability = getScriptRuntimeCapability(scriptId, script);
  if (!runtimeCapability.canLoad) {
    appendMoveResolutionFact({
      G,
      sourceId: 'selectScript',
      phase: ctx.phase || undefined,
      phaseStep: 'select-script-blocked',
      outcome: 'script_load_blocked',
      summary: `⚠️ 剧本接入未完成，拒绝载入: ${runtimeCapability.loadBlockReasons.join(', ')}`,
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`⚠️ 剧本接入未完成，拒绝载入: ${runtimeCapability.loadBlockReasons.join(', ')}`],
      },
    });
    return INVALID_MOVE;
  }

  const previousScriptId = G.v1.currentScriptId;
  const previousAutoResolve = G.v1.settings.autoResolve;
  G.maxLoops = script.maxLoops;
  G.daysPerLoop = script.daysPerLoop;
  G.seatHands = script.seatHands;
  G.scriptOpen = script.scriptOpen;
  G.scriptSecret = script.scriptSecret;
  G.v1.characters = script.characters;
  G.v1.locations = script.locations;
  G.v1.scheduledIncidents = script.scheduledIncidents;
  G.v1.hiddenRoles = script.hiddenRoles;
  G.v1.ahrVariableRoles = script.ahrVariableRoles;
  G.v1.incidentCulprits = script.incidentCulprits;
  G.v1.activePlots = script.activePlots;
  G.v1.loopState = script.loopState;
  G.v1.castDefinitions = script.castDefinitions;
  G.v1.currentScriptId = scriptId;
  G.leaderSeat = G.v1.leader;
  configureExForSet(G, script.scriptOpen.tragedySetId);
  if (!runtimeCapability.canAutoResolve) {
    G.v1.settings.autoResolve = false;
  }
  G.v1.playedCards = [];
  G.v1.readyToAdvance = true;

  // 注册剧本的活跃规则到 G.v1.activeRuleDefinitions（避免全局变量串局）
  // 统一注册 plot + role + incident 三类规则
  const activeRules = buildActiveRules(
    script.scriptOpen.tragedySetId,
    script.activePlots,
    script.hiddenRoles,
    script.scheduledIncidents,
    script.ahrVariableRoles,
    script.manifestResourceScope,
  );
  setActiveRules(G, activeRules);
  appendMoveManualFact({
    G,
    sourceId: 'selectScript',
    phase: ctx.phase || undefined,
    phaseStep: 'select-script',
    operation: 'select_script',
    summary: `剧本已选定：${scriptId}`,
    visibility: createPublicTimelineVisibility(),
    compatibility: {
      publicLog: [
        !runtimeCapability.canAutoResolve
          ? `📜 剧本已选定（自动结算不可用：${runtimeCapability.autoResolveBlockReasons.join(', ') || 'runtime_playability_gate'}）`
          : '📜 剧本已选定',
      ],
      fullLog: [
        ...(runtimeCapability.informationalReasons.length > 0
          ? [`ℹ️ 剧本接入提示: ${runtimeCapability.informationalReasons.join(', ')}`]
          : []),
        `🔧 已注册 ${activeRules.length} 条活跃规则（plot+role+incident）`,
      ],
    },
    changes: [{
      targetType: 'global',
      targetId: 'script',
      field: 'currentScriptId',
      previousValue: previousScriptId,
      nextValue: scriptId,
    }, {
      targetType: 'global',
      targetId: 'settings',
      field: 'autoResolve',
      previousValue: previousAutoResolve,
      nextValue: G.v1.settings.autoResolve,
    }],
  });

  // 推进到 lobby_wait 阶段
  events.endPhase();
};

// ── startGame: Mastermind starts after all players are ready ──────────────────

const startGame: Move<TragedyGameState> = ({ G, ctx, events, playerID }) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'lobby_wait') return INVALID_MOVE;
  if (G.v1.characters.boss && !G.v1.characters.boss.territoryLocationId) return INVALID_MOVE;

  const joinedProtagonists = getJoinedLobbyProtagonistSeats(G);
  if (joinedProtagonists.length === 0) return INVALID_MOVE;
  const unreadyJoinedSeats = joinedProtagonists.filter(seat => !G.v1.readyPlayers[seat]);
  if (unreadyJoinedSeats.length > 0) return INVALID_MOVE;

  // 自动检测人数并设置 playerCount
  const readyJoined = Object.fromEntries(joinedProtagonists.map(seat => [seat, true])) as Record<string, boolean>;
  const detectedCount = detectPlayerCount(readyJoined);
  const previousPlayerCount = G.v1.settings.playerCount;
  G.v1.settings.playerCount = detectedCount;
  appendMoveManualFact({
    G,
    sourceId: 'startGame',
    phase: ctx.phase || undefined,
    phaseStep: 'start-game',
    operation: 'start_game',
    summary: `检测到 ${detectedCount} 人模式`,
    visibility: createPublicTimelineVisibility(),
    compatibility: {
      publicLog: [`👥 检测到 ${detectedCount} 人模式（${joinedProtagonists.length} 位主人公已登记并就绪）`],
    },
    changes: [{
      targetType: 'global',
      targetId: 'settings',
      field: 'playerCount',
      previousValue: previousPlayerCount,
      nextValue: detectedCount,
    }],
  });

  events.endPhase();
};

// ── toggleReady: Player marks themselves as ready ─────────────────────────────

// ── setPlayerCount: Mastermind manually adjusts player count ──────────────────

const setPlayerCount: Move<TragedyGameState> = ({ G, ctx, playerID }, count: 2 | 3 | 4) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (![2, 3, 4].includes(count)) return INVALID_MOVE;
  if (!canAdjustPlayerCountAtPhase(ctx.phase)) return INVALID_MOVE;
  if (ctx.phase === 'time_spiral' && hasTransientConsoleState(G)) return INVALID_MOVE;
  if (count === G.v1.settings.playerCount) return;

  const old = G.v1.settings.playerCount;
  G.v1.settings.playerCount = count;
  appendMoveManualFact({
    G,
    sourceId: 'setPlayerCount',
    phase: ctx.phase || undefined,
    phaseStep: 'set-player-count',
    operation: 'set_player_count',
    summary: `人数模式调整 ${old}人 → ${count}人`,
    visibility: createPublicTimelineVisibility(),
    compatibility: {
      publicLog: [`🔄 人数模式调整 ${old}人 → ${count}人`],
    },
    changes: [{
      targetType: 'global',
      targetId: 'settings',
      field: 'playerCount',
      previousValue: old,
      nextValue: count,
    }],
  });
};

// ── toggleReady ──────────────────────────────────────────────────────────────

const registerLobbySeat: Move<TragedyGameState> = ({ G, ctx, playerID }) => {
  if (!playerID || playerID === '0') return INVALID_MOVE;
  if (ctx.phase !== 'lobby_wait') return INVALID_MOVE;
  G.v1.joinedProtagonists[playerID] = true;
};

const toggleReady: Move<TragedyGameState> = ({ G, ctx, playerID }) => {
  if (!playerID) return INVALID_MOVE;
  if (ctx.phase !== 'lobby_wait') return INVALID_MOVE;
  if (playerID !== '0') {
    G.v1.joinedProtagonists[playerID] = true;
  }
  G.v1.readyPlayers[playerID] = !G.v1.readyPlayers[playerID];
};

// ── declareLoopLoss: Mastermind declares current loop is lost ────────────────

const declareLoopLoss: Move<TragedyGameState> = ({ G, ctx, events, playerID }) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (!canDeclareLoopLossAtPhase(ctx.phase)) return INVALID_MOVE;
  G.v1.loopLost = true;
  appendMoveManualFact({
    G,
    sourceId: 'declareLoopLoss',
    phase: ctx.phase || undefined,
    phaseStep: 'declare-loop-loss',
    operation: 'declare_loop_loss',
    summary: 'Loop loss declared',
    visibility: createPublicTimelineVisibility(),
    compatibility: {
      publicLog: ['⚠️ Loop loss declared — advancing to next loop…'],
    },
    changes: [{
      targetType: 'global',
      targetId: 'match',
      field: 'loopLost',
      previousValue: false,
      nextValue: true,
    }],
  });
  events.endPhase();
};

// ── playCard ─────────────────────────────────────────────────────────────────

const playCard: Move<TragedyGameState> = (
  { G, ctx, playerID },
  cardTemplateId: string,
  targetType: 'location' | 'character',
  targetId: string,
) => {
  if (!playerID) return INVALID_MOVE;

  const isMastermind = playerID === '0';

  // ── Phase validation ──
  if (isMastermind && ctx.phase !== 'mastermind_plan') return INVALID_MOVE;
  if (!isMastermind && ctx.phase !== 'protagonist_plan') return INVALID_MOVE;

  // ── leaderMode: 只有当前轮次主角可出牌 ──
  if (!isMastermind && G.v1.settings.leaderMode && ctx.phase === 'protagonist_plan') {
    const currentSeat = G.v1.leaderTurnOrder[G.v1.leaderTurnIndex];
    if (playerID !== currentSeat) return INVALID_MOVE;
  }

  // ── playerCount 出牌上限校验 ──
  const maxForSeat = getMaxCardsForSeat(G, playerID);
  const alreadyPlayed = G.v1.playedCards.filter(c => c.playedBySeat === playerID).length;
  if (alreadyPlayed >= maxForSeat) return INVALID_MOVE;

  // ── LL 密钥限牌：密钥惩罚激活时剧作家当天限出1张 ──
  if (isMastermind) {
    const limitFlag = G.v1.loopState?.abilityUsage?.['__secret_key_card_limit'];
    if (limitFlag?.usedToday) {
      const mmPlayed = G.v1.playedCards.filter(c => c.playedBySeat === '0').length;
      if (mmPlayed >= 1) return INVALID_MOVE;
    }
  }

  const hand = G.seatHands[playerID] || [];
  const validation = validatePlayCard(G, playerID, cardTemplateId, targetType, targetId, ctx.phase);
  if (!validation.ok) return INVALID_MOVE;

  const cardIndex = hand.indexOf(cardTemplateId);
  if (cardIndex === -1) return INVALID_MOVE;

  // ── All validations passed — play the card ──
  hand.splice(cardIndex, 1);

  if (!G.v1.nextCardId) G.v1.nextCardId = 1;
  G.v1.playedCards.push({
    id: `card_${G.v1.nextCardId++}`,
    cardTemplateId,
    owner: isMastermind ? 'mastermind' : 'protagonist',
    targetType,
    targetId,
    faceUp: false,
    playedBySeat: playerID,
    playedByColor: isMastermind ? undefined : getSeatColor(playerID),
  });
};

// ── recallCard: take back a played card ──────────────────────────────────────

const recallCard: Move<TragedyGameState> = (
  { G, ctx, playerID },
  playedCardId: string,
) => {
  if (!playerID) return INVALID_MOVE;

  const validation = validateRecallCard(G, playerID, playedCardId, ctx.phase);
  if (!validation.ok) return INVALID_MOVE;

  const cardIndex = G.v1.playedCards.findIndex(c => c.id === playedCardId && c.playedBySeat === playerID);
  if (cardIndex === -1) return INVALID_MOVE;

  const card = G.v1.playedCards[cardIndex];

  // Return the card to hand
  G.seatHands[playerID] = G.seatHands[playerID] || [];
  G.seatHands[playerID].push(card.cardTemplateId);

  // Remove from played cards
  G.v1.playedCards.splice(cardIndex, 1);
};

// ── Manual token adjustments ─────────────────────────────────────────────────

const modifyToken: Move<TragedyGameState> = (
  { G, playerID },
  characterId: string,
  tokenType: 'paranoia' | 'intrigue' | 'goodwill',
  delta: number,
) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家/村规操作
  const char = G.v1.characters[characterId];
  if (char) {
    const previousValue = char.tokens[tokenType] ?? 0;
    if (tokenType === 'paranoia') {
      applyCharacterTokenDelta(G, characterId, 'paranoia', delta);
    } else {
      addToken(char, tokenType, delta);
    }
    appendMoveManualFact({
      G,
      sourceId: 'modifyToken',
      phaseStep: 'modify-token',
      operation: 'modify_token',
      summary: `${characterId} ${tokenType} ${delta >= 0 ? '+' : ''}${delta}`,
      visibility: createMastermindTimelineVisibility(),
      changes: [{
        targetType: 'character',
        targetId: characterId,
        field: `tokens.${tokenType}`,
        delta,
        previousValue,
        nextValue: char.tokens[tokenType] ?? 0,
      }],
    });
  }
};

const modifyLocationToken: Move<TragedyGameState> = (
  { G, playerID },
  locationId: string,
  tokenType: 'intrigue',
  delta: number,
) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家/村规操作
  const loc = G.v1.locations[locationId];
  if (loc) {
    const previousValue = loc.tokens[tokenType] ?? 0;
    addToken(loc, tokenType, delta);
    appendMoveManualFact({
      G,
      sourceId: 'modifyLocationToken',
      phaseStep: 'modify-location-token',
      operation: 'modify_location_token',
      summary: `${locationId} ${tokenType} ${delta >= 0 ? '+' : ''}${delta}`,
      visibility: createMastermindTimelineVisibility(),
      changes: [{
        targetType: 'location',
        targetId: locationId,
        field: `tokens.${tokenType}`,
        delta,
        previousValue,
        nextValue: loc.tokens[tokenType] ?? 0,
      }],
    });
  }
};

const modifyExCard: Move<TragedyGameState> = (
  { G, playerID },
  characterId: string,
  delta: number,
) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家
  const char = G.v1.characters[characterId];
  if (!char) return INVALID_MOVE;
  const current = char.exCardCount ?? 0;
  char.exCardCount = Math.max(0, current + delta);
  appendMoveManualFact({
    G,
    sourceId: 'modifyExCard',
    phaseStep: 'modify-ex-card',
    operation: 'modify_ex_card',
    summary: `${characterId} exCardCount ${delta >= 0 ? '+' : ''}${delta}`,
    visibility: createMastermindTimelineVisibility(),
    changes: [{
      targetType: 'character',
      targetId: characterId,
      field: 'exCardCount',
      delta,
      previousValue: current,
      nextValue: char.exCardCount ?? 0,
    }],
  });
};

// ── Character movement (manual) ──────────────────────────────────────────────

const moveCharacter: Move<TragedyGameState> = (
  { G, playerID },
  characterId: string,
  targetLocation: string,
) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家/村规操作
  const flowId = startTimelineFlow(G);
  const char = G.v1.characters[characterId];
  if (hasLoopUsageFlag(G, `__removed_from_board_${characterId}`)) {
    appendMoveResolutionFact({
      G,
      sourceId: 'moveCharacter',
      flowId,
      phaseStep: 'move-character-blocked-removed',
      outcome: 'manual_move_blocked',
      summary: `👻 ${characterId} 已被移出版图，无法手动移动`,
      visibility: createPublicTimelineVisibility(),
      compatibility: {
        publicLog: [`👻 ${characterId} 已被移出版图，无法手动移动`],
      },
    });
    return INVALID_MOVE;
  }
  if (char) {
    if (!canCharacterMoveBetween(G, characterId, char.locationId, targetLocation)) {
      appendMoveResolutionFact({
        G,
        sourceId: 'moveCharacter',
        flowId,
        phaseStep: 'move-character-blocked-rule',
        outcome: 'manual_move_blocked',
        summary: `🚫 ${characterId} 当前无法移动到 ${targetLocation}`,
        visibility: createPublicTimelineVisibility(),
        compatibility: {
          publicLog: [`🚫 ${characterId} 当前无法移动到 ${targetLocation}`],
        },
      });
      return INVALID_MOVE;
    }
    const from = char.locationId;
    char.locationId = targetLocation;
    if (from !== targetLocation) {
      appendMoveManualFact({
        G,
        sourceId: 'moveCharacter',
        flowId,
        phaseStep: 'move-character',
        operation: 'move_character',
        summary: `${characterId} ${from} -> ${targetLocation}`,
        visibility: createMastermindTimelineVisibility(),
        compatibility: {
          eventLogs: [{
            type: 'move',
            payload: toTimelineJsonValue({ charId: characterId, from, to: targetLocation }),
          }],
        },
        changes: [{
          targetType: 'character',
          targetId: characterId,
          field: 'locationId',
          previousValue: from,
          nextValue: targetLocation,
        }],
      });
    }
  }
};

// ── Reveal all face-down cards ───────────────────────────────────────────────

const revealAllCards: Move<TragedyGameState> = ({ G, playerID }) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家可翻牌
  G.v1.playedCards.forEach(c => { c.faceUp = true; });
};

// ── Kill / revive a character (toggle) ───────────────────────────────────────

const killCharacter: Move<TragedyGameState> = (
  { G, playerID },
  characterId: string,
) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家/村规操作
  const char = G.v1.characters[characterId];
  if (char) {
    char.alive = !char.alive;
  }
};

// ── updateSetting: mastermind-only setting toggle ────────────────────────────────

const updateSetting: Move<TragedyGameState> = (
  { G, ctx, playerID },
  key: string,
  value: any,
) => {
  if (playerID !== '0') return INVALID_MOVE; // 仅剧作家可操作
  if (!(key in G.v1.settings)) return INVALID_MOVE;
  if (key !== 'autoResolve' && ctx.phase !== 'lobby_wait') return INVALID_MOVE;
  const nextAutoResolve = key === 'autoResolve' ? !!value : undefined;

  if (key === 'autoResolve') {
    const currentAutoResolve = !!G.v1.settings.autoResolve;
    const currentScriptId = G.v1.currentScriptId;
    const runtimeCapability = currentScriptId ? getScriptRuntimeCapability(currentScriptId) : null;
    if (nextAutoResolve && runtimeCapability && !runtimeCapability.canAutoResolve) {
      appendMoveResolutionFact({
        G,
        sourceId: 'updateSetting',
        phase: ctx.phase || undefined,
        phaseStep: 'toggle-auto-resolve-blocked-capability',
        outcome: 'auto_resolve_toggle_blocked',
        summary: `⚠️ 无法切换到结算模式: ${runtimeCapability.autoResolveBlockReasons.join(', ') || 'runtime_playability_gate'}`,
        visibility: createMastermindTimelineVisibility(),
        compatibility: {
          fullLog: [
            `⚠️ 无法切换到结算模式: ${runtimeCapability.autoResolveBlockReasons.join(', ') || 'runtime_playability_gate'}`,
          ],
        },
      });
      return INVALID_MOVE;
    }
    if (nextAutoResolve !== currentAutoResolve && nextAutoResolve) {
      const phase = ctx.phase || '';
      const hasPendingAbilities = phase === 'mastermind_abilities'
        && (G.v1.pendingAbilities?.length || 0) > 0;
      const hasPendingGoodwill = phase === 'goodwill_window'
        && !!G.v1.goodwillInteraction
        && G.v1.goodwillInteraction.phase !== 'idle'
        && G.v1.goodwillInteraction.phase !== 'done';
      const hasPendingIncidents = phase === 'incidents'
        && (hasPendingIncidentResolutionInteractions(G) || hasPendingButterflyChoiceInteraction(G));

      if (hasPendingAbilities || hasPendingGoodwill || hasPendingIncidents) {
        appendMoveResolutionFact({
          G,
          sourceId: 'updateSetting',
          phase: ctx.phase || undefined,
          phaseStep: 'toggle-auto-resolve-blocked-pending',
          outcome: 'auto_resolve_toggle_blocked',
          summary: `⚠️ 无法在 ${phase} 中途切回结算模式：仍有待处理项目`,
          visibility: createMastermindTimelineVisibility(),
          compatibility: {
            fullLog: [`⚠️ 无法在 ${phase} 中途切回结算模式：仍有待处理项目`],
          },
        });
        return INVALID_MOVE;
      }
    }

    if (nextAutoResolve === currentAutoResolve) {
      return;
    }
  }

  const previousValue = (G.v1.settings as any)[key];
  (G.v1.settings as any)[key] = value;
  if (key === 'autoResolve') {
    appendMoveManualFact({
      G,
      sourceId: 'updateSetting',
      phase: ctx.phase || undefined,
      phaseStep: 'toggle-auto-resolve',
      operation: 'update_setting',
      summary: nextAutoResolve ? '切换到结算模式' : '切换到桌游模拟模式',
      visibility: createPublicTimelineVisibility(),
      compatibility: {
        publicLog: [nextAutoResolve ? '⚡ 已切换到结算模式' : '🏖️ 已切换到桌游模拟模式'],
      },
      changes: [{
        targetType: 'global',
        targetId: 'settings',
        field: key,
        previousValue,
        nextValue: nextAutoResolve,
      }],
    });
  }
};

// ── setCharacterTerritory: mastermind sets boss territory at script setup ─────

const setCharacterTerritory: Move<TragedyGameState> = (
  { G, ctx, playerID },
  characterId: string,
  locationId: string,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'lobby_wait') return INVALID_MOVE;

  const character = G.v1.characters[characterId];
  if (!character) return INVALID_MOVE;
  if (characterId !== 'boss') return INVALID_MOVE;
  if (!G.v1.locations[locationId]) return INVALID_MOVE;
  if (character.territoryLocationId) return INVALID_MOVE;

  character.territoryLocationId = locationId;
};

const createMastermindSnapshot: Move<TragedyGameState> = (
  { G, ctx, playerID },
  label?: string,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  saveSnapshot(G, ctx.phase || null, label);
  appendMoveManualFact({
    G,
    sourceId: 'createMastermindSnapshot',
    phase: ctx.phase || undefined,
    phaseStep: 'create-mastermind-snapshot',
    operation: 'create_mastermind_snapshot',
    summary: `已记录剧作家快照${label ? `：${label}` : ''}`,
    visibility: createMastermindTimelineVisibility(),
    compatibility: {
      fullLog: [`📓 [console] 已记录剧作家快照${label ? `：${label}` : ''}`],
    },
  });
};

const restoreMastermindSnapshot: Move<TragedyGameState> = (
  { G, ctx, playerID },
) => {
  if (playerID !== '0') return INVALID_MOVE;
  const snapshot = G.v1.mastermindConsole.lastSnapshot;
  if (!snapshot) return INVALID_MOVE;
  if ((ctx.phase || null) !== snapshot.phase) {
    appendMoveResolutionFact({
      G,
      sourceId: 'restoreMastermindSnapshot',
      phase: ctx.phase || undefined,
      phaseStep: 'restore-mastermind-snapshot-blocked',
      outcome: 'restore_snapshot_blocked',
      summary: `⚠️ 无法在 ${ctx.phase || 'unknown'} 恢复 ${snapshot.phase || 'unknown'} 的快照`,
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`⚠️ 无法在 ${ctx.phase || 'unknown'} 恢复 ${snapshot.phase || 'unknown'} 的快照`],
      },
    });
    return INVALID_MOVE;
  }
  restoreSnapshotPayload(G, snapshot.payload as SnapshotPayload);
  appendMoveManualFact({
    G,
    sourceId: 'restoreMastermindSnapshot',
    phase: ctx.phase || undefined,
    phaseStep: 'restore-mastermind-snapshot',
    operation: 'restore_mastermind_snapshot',
    summary: `已回退到快照：${snapshot.label}`,
    visibility: createMastermindTimelineVisibility(),
    compatibility: {
      fullLog: [`↩️ [console] 已回退到快照：${snapshot.label}`],
    },
  });
};

const setLoopAndDay: Move<TragedyGameState> = (
  { G, ctx, playerID },
  nextLoopIndex: number,
  nextDay: number,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (!G.scriptOpen || G.maxLoops <= 0 || G.daysPerLoop <= 0) return INVALID_MOVE;
  if (!Number.isInteger(nextLoopIndex) || !Number.isInteger(nextDay)) return INVALID_MOVE;
  if (nextLoopIndex < 0 || nextLoopIndex >= G.maxLoops) return INVALID_MOVE;
  if (nextDay < 0 || nextDay > G.daysPerLoop) return INVALID_MOVE;
  if (!canEditTableTimeAtPhase(ctx.phase)) return INVALID_MOVE;
  if (hasTransientConsoleState(G)) return INVALID_MOVE;

  const previousLoopIndex = G.loopIndex;
  const previousDay = G.day;
  G.loopIndex = nextLoopIndex;
  G.day = nextDay;
  G.v1.readyPlayers = {};
  G.v1.readyToAdvance = false;
  appendMoveManualFact({
    G,
    sourceId: 'setLoopAndDay',
    phase: ctx.phase || undefined,
    phaseStep: 'set-loop-and-day',
    operation: 'set_loop_and_day',
    summary: `剧作家调整时间：L${nextLoopIndex + 1} / D${nextDay}`,
    visibility: createMastermindTimelineVisibility(),
    compatibility: {
      publicLog: [`🗓️ 剧作家调整时间：L${nextLoopIndex + 1} / D${nextDay}`],
      reset: {
        eventLogs: true,
      },
    },
    changes: [{
      targetType: 'global',
      targetId: 'match',
      field: 'loopIndex',
      previousValue: previousLoopIndex,
      nextValue: nextLoopIndex,
    }, {
      targetType: 'global',
      targetId: 'match',
      field: 'day',
      previousValue: previousDay,
      nextValue: nextDay,
    }],
  });
};

const setLeader: Move<TragedyGameState> = (
  { G, playerID },
  leaderSeat: string,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (!getProtagonistSeats(G).includes(leaderSeat)) return INVALID_MOVE;

  const previousLeaderSeat = G.leaderSeat;
  G.v1.leader = leaderSeat;
  G.leaderSeat = leaderSeat;
  appendMoveManualFact({
    G,
    sourceId: 'setLeader',
    phaseStep: 'set-leader',
    operation: 'set_leader',
    summary: `队长已手动调整为主角 ${leaderSeat}`,
    visibility: createMastermindTimelineVisibility(),
    compatibility: {
      publicLog: [`🎯 队长已手动调整为主角 ${leaderSeat}`],
    },
    changes: [{
      targetType: 'global',
      targetId: 'match',
      field: 'leaderSeat',
      previousValue: previousLeaderSeat,
      nextValue: leaderSeat,
    }],
  });
};

const setExState: Move<TragedyGameState> = (
  { G, playerID },
  patch: Partial<TragedyGameState['v1']['ex']>,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (!patch || typeof patch !== 'object') return INVALID_MOVE;

  const previousExState = toTimelineJsonValue(deepClone(G.v1.ex));
  const next = { ...G.v1.ex, ...patch };
  if (!Number.isFinite(next.gauge) || next.gauge < 0) return INVALID_MOVE;
  if (!Number.isFinite(next.lastLoopEndGauge) || next.lastLoopEndGauge < 0) return INVALID_MOVE;

  G.v1.ex = {
    enabled: !!next.enabled,
    gauge: Math.floor(next.gauge),
    changedThisLoop: !!next.changedThisLoop,
    lastLoopEndGauge: Math.floor(next.lastLoopEndGauge),
  };
  appendMoveManualFact({
    G,
    sourceId: 'setExState',
    phaseStep: 'set-ex-state',
    operation: 'set_ex_state',
    summary: `Ex 已调整为 ${G.v1.ex.gauge}`,
    visibility: createMastermindTimelineVisibility(),
    compatibility: {
      publicLog: [`🧪 Ex 已调整为 ${G.v1.ex.gauge}`],
    },
    changes: [{
      targetType: 'global',
      targetId: 'ex',
      field: 'state',
      previousValue: previousExState,
      nextValue: toTimelineJsonValue(G.v1.ex),
    }],
  });
};

const setHiddenRole: Move<TragedyGameState> = (
  { G, playerID },
  characterId: string,
  roleId: string | null,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  const setId = G.scriptOpen?.tragedySetId || '';
  if (!setId || !G.v1.characters[characterId]) return INVALID_MOVE;
  if (roleId && !getRoleById(setId, roleId)) return INVALID_MOVE;

  const previousRoleId = G.v1.hiddenRoles[characterId] ?? null;
  if (roleId) {
    G.v1.hiddenRoles[characterId] = roleId;
    appendMoveManualFact({
      G,
      sourceId: 'setHiddenRole',
      phaseStep: 'set-hidden-role',
      operation: 'set_hidden_role',
      summary: `${characterId} -> ${roleId}`,
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`🎭 [console] ${characterId} -> ${roleId}`],
      },
      changes: [{
        targetType: 'character',
        targetId: characterId,
        field: 'hiddenRole',
        previousValue: previousRoleId,
        nextValue: roleId,
      }],
    });
  } else {
    delete G.v1.hiddenRoles[characterId];
    appendMoveManualFact({
      G,
      sourceId: 'setHiddenRole',
      phaseStep: 'clear-hidden-role',
      operation: 'set_hidden_role',
      summary: `cleared role: ${characterId}`,
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`🎭 [console] cleared role: ${characterId}`],
      },
      changes: [{
        targetType: 'character',
        targetId: characterId,
        field: 'hiddenRole',
        previousValue: previousRoleId,
        nextValue: null,
      }],
    });
  }
  syncScriptSecretRole(G, characterId, roleId);
  rebuildActiveRulesForCurrentScript(G);
};

const setIncidentCulprit: Move<TragedyGameState> = (
  { G, playerID },
  day: number,
  incidentId: string,
  culpritId: string | null,
  occurrenceIndex = 0,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  const setId = G.scriptOpen?.tragedySetId || '';
  if (!setId || !Number.isInteger(day) || day < 1 || day > G.daysPerLoop) return INVALID_MOVE;
  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) return INVALID_MOVE;
  if (!getIncidentById(setId, incidentId)) return INVALID_MOVE;
  if (culpritId && !G.v1.characters[culpritId]) return INVALID_MOVE;

  const key = buildIncidentInstanceKey(day, incidentId, occurrenceIndex);
  const previousCulpritId = G.v1.incidentCulprits[key] ?? null;
  if (culpritId) {
    G.v1.incidentCulprits[key] = culpritId;
    appendMoveManualFact({
      G,
      sourceId: 'setIncidentCulprit',
      phaseStep: 'set-incident-culprit',
      operation: 'set_incident_culprit',
      summary: `${key} -> ${culpritId}`,
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`🗡️ [console] ${key} -> ${culpritId}`],
      },
      changes: [{
        targetType: 'global',
        targetId: key,
        field: 'incidentCulprit',
        previousValue: previousCulpritId,
        nextValue: culpritId,
      }],
    });
  } else {
    delete G.v1.incidentCulprits[key];
    appendMoveManualFact({
      G,
      sourceId: 'setIncidentCulprit',
      phaseStep: 'clear-incident-culprit',
      operation: 'set_incident_culprit',
      summary: `cleared culprit: ${key}`,
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`🗡️ [console] cleared culprit: ${key}`],
      },
      changes: [{
        targetType: 'global',
        targetId: key,
        field: 'incidentCulprit',
        previousValue: previousCulpritId,
        nextValue: null,
      }],
    });
  }
  syncScriptSecretIncident(G, day, incidentId, culpritId, occurrenceIndex);

  const runtimePending = getPendingIncidentResolutionInteractionBySource(G, key);
  if (runtimePending) {
    runtimePending.culpritId = culpritId || '';
    runtimePending.targetSlots = culpritId
      ? buildIncidentTargetSlots(G, incidentId, culpritId)
      : [];
    syncPendingIncidentCompatibilitySlice(G);
  }
};

const jumpToPhase: Move<TragedyGameState> = (
  { G, ctx, events, playerID },
  targetPhase: string,
  preserveCurrentSnapshot?: boolean,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (!CONSOLE_PHASES.includes(targetPhase as any)) return INVALID_MOVE;
  if (ctx.phase === targetPhase) return;

  if (!preserveCurrentSnapshot) {
    saveSnapshot(G, ctx.phase || null, `Before jump: ${ctx.phase || 'unknown'} -> ${targetPhase}`);
  }
  appendMoveManualFact({
    G,
    sourceId: 'jumpToPhase',
    phase: ctx.phase || undefined,
    phaseStep: 'jump-to-phase',
    operation: 'jump_to_phase',
    summary: `剧作家跳转阶段：${ctx.phase || 'unknown'} → ${targetPhase}`,
    visibility: createMastermindTimelineVisibility(),
    compatibility: {
      fullLog: [`🧭 [console] 剧作家跳转阶段：${ctx.phase || 'unknown'} → ${targetPhase}`],
    },
  });
  events.setPhase(targetPhase);
};

// ── submitGuess: protagonist guesses a character's role during final_guess ────

type FinalGuessInput = string | { frontRoleId: string; backRoleId: string };

function requiresDualFinalGuess(G: TragedyGameState, charId: string): boolean {
  const explicitTarget = G.v1.finalGuess?.targets?.find(target => target.charId === charId);
  if (explicitTarget) return explicitTarget.requiresDualGuess;
  return getFinalGuessAnswer(G, charId).requiresDualGuess;
}

const submitGuess: Move<TragedyGameState> = (
  { G, ctx, events, playerID },
  charId: string,
  guessedRole: FinalGuessInput,
) => {
  if (!playerID || playerID === '0') return INVALID_MOVE; // 仅主角可猜
  if (ctx.phase !== 'final_guess') return INVALID_MOVE;
  if (G.v1.winner) return INVALID_MOVE;
  if (!G.v1.finalGuess || G.v1.finalGuess.completed) return INVALID_MOVE;
  if (!G.v1.finalGuess.targets?.some(target => target.charId === charId)) return INVALID_MOVE;

  // 不可重复猜同一角色
  if (G.v1.finalGuess.guesses.some(g => g.charId === charId)) return INVALID_MOVE;

  const flowId = startTimelineFlow(G);
  const dualGuessRequired = requiresDualFinalGuess(G, charId);
  const finalAnswer = getFinalGuessAnswer(G, charId);

  if (dualGuessRequired) {
    if (typeof guessedRole !== 'object' || !guessedRole?.frontRoleId || !guessedRole?.backRoleId) {
      return INVALID_MOVE;
    }
    if (!finalAnswer.requiresDualGuess || !finalAnswer.frontRoleId || !finalAnswer.backRoleId) return INVALID_MOVE;

    const actualFrontRoleId = finalAnswer.frontRoleId;
    const actualBackRoleId = finalAnswer.backRoleId;
    const correct = guessedRole.frontRoleId === actualFrontRoleId
      && guessedRole.backRoleId === actualBackRoleId;

    G.v1.finalGuess.guesses.push({
      charId,
      guessedFrontRoleId: guessedRole.frontRoleId,
      guessedBackRoleId: guessedRole.backRoleId,
      correct,
    });

    const guessLine = correct
      ? `✅ ${charId}: 表 ${guessedRole.frontRoleId} / 里 ${guessedRole.backRoleId} — 正确！`
      : `❌ ${charId}: 猜测 表 ${guessedRole.frontRoleId} / 里 ${guessedRole.backRoleId}，实际 表 ${actualFrontRoleId} / 里 ${actualBackRoleId} — 错误！`;
    const guessFact = appendProjectedTimelineFact(G, {
      type: 'state_change',
      flowId,
      source: {
        system: 'move',
        id: 'submitGuess',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'protagonist',
        seatId: playerID,
      },
      refs: {
        characterIds: [charId],
        seatIds: [playerID],
      },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: correct ? 'final_guess_correct' : 'final_guess_incorrect',
        summary: guessLine,
        changes: [{
          targetType: 'global',
          targetId: 'finalGuess',
          field: 'guessesCount',
          previousValue: G.v1.finalGuess.guesses.length - 1,
          nextValue: G.v1.finalGuess.guesses.length,
        }],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: [guessLine],
        }),
      },
      gameTime: {
        phase: ctx.phase,
        phaseStep: 'submit-final-guess',
      },
    });

    if (correct) {
      const totalChars = G.v1.finalGuess.targets?.length || Object.keys(G.v1.characters).length;
      if (G.v1.finalGuess.guesses.length >= totalChars) {
        G.v1.finalGuess.completed = true;
        G.v1.winner = 'protagonist';
        appendProjectedTimelineFact(G, {
          type: 'state_change',
          flowId,
          causedByFactIds: [guessFact.factId],
          source: {
            system: 'move',
            id: 'submitGuess',
            phase: ctx.phase || undefined,
          },
          actor: null,
          visibility: createPublicTimelineVisibility(),
          payload: {
            family: 'resolution',
            type: 'state_change',
            outcome: 'final_guess_victory',
            summary: '🏆 全部猜对！主角团获胜！',
            changes: [{
              targetType: 'global',
              targetId: 'match',
              field: 'winner',
              previousValue: null,
              nextValue: 'protagonist',
            }, {
              targetType: 'global',
              targetId: 'finalGuess',
              field: 'completed',
              previousValue: false,
              nextValue: true,
            }],
            metadata: buildTimelineCompatibilityMetadata({
              publicLog: ['🏆 全部猜对！主角团获胜！'],
            }),
          },
          gameTime: {
            phase: ctx.phase,
            phaseStep: 'submit-final-guess-complete',
          },
        });
        events.setPhase('match_end');
      }
    } else {
      G.v1.finalGuess.completed = true;
      G.v1.winner = 'mastermind';
      appendProjectedTimelineFact(G, {
        type: 'state_change',
        flowId,
        causedByFactIds: [guessFact.factId],
        source: {
          system: 'move',
          id: 'submitGuess',
          phase: ctx.phase || undefined,
        },
        actor: null,
        visibility: createPublicTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'state_change',
          outcome: 'final_guess_defeat',
          summary: '🎭 猜测失败，剧作家获胜！',
          changes: [{
            targetType: 'global',
            targetId: 'match',
            field: 'winner',
            previousValue: null,
            nextValue: 'mastermind',
          }, {
            targetType: 'global',
            targetId: 'finalGuess',
            field: 'completed',
            previousValue: false,
            nextValue: true,
          }],
          metadata: buildTimelineCompatibilityMetadata({
            publicLog: ['🎭 猜测失败，剧作家获胜！'],
          }),
        },
        gameTime: {
          phase: ctx.phase,
          phaseStep: 'submit-final-guess-complete',
        },
      });
      events.setPhase('match_end');
    }
    return;
  }

  if (typeof guessedRole !== 'string') return INVALID_MOVE;

  const actualRole = finalAnswer.roleId || 'person';
  const correct = guessedRole === actualRole;

  G.v1.finalGuess.guesses.push({ charId, guessedRole, correct });
  const guessLine = correct
    ? `✅ ${charId}: ${guessedRole} — 正确！`
    : `❌ ${charId}: 猜测 ${guessedRole}，实际 ${actualRole} — 错误！`;
  const guessFact = appendProjectedTimelineFact(G, {
    type: 'state_change',
    flowId,
    source: {
      system: 'move',
      id: 'submitGuess',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'protagonist',
      seatId: playerID,
    },
    refs: {
      characterIds: [charId],
      seatIds: [playerID],
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: correct ? 'final_guess_correct' : 'final_guess_incorrect',
      summary: guessLine,
      changes: [{
        targetType: 'global',
        targetId: 'finalGuess',
        field: 'guessesCount',
        previousValue: G.v1.finalGuess.guesses.length - 1,
        nextValue: G.v1.finalGuess.guesses.length,
      }],
      metadata: buildTimelineCompatibilityMetadata({
        publicLog: [guessLine],
      }),
    },
    gameTime: {
      phase: ctx.phase,
      phaseStep: 'submit-final-guess',
    },
  });

  if (correct) {
    // 检查是否全部猜完
    const totalChars = G.v1.finalGuess.targets?.length || Object.keys(G.v1.characters).length;
    if (G.v1.finalGuess.guesses.length >= totalChars) {
      G.v1.finalGuess.completed = true;
      G.v1.winner = 'protagonist';
      appendProjectedTimelineFact(G, {
        type: 'state_change',
        flowId,
        causedByFactIds: [guessFact.factId],
        source: {
          system: 'move',
          id: 'submitGuess',
          phase: ctx.phase || undefined,
        },
        actor: null,
        visibility: createPublicTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'state_change',
          outcome: 'final_guess_victory',
          summary: '🏆 全部猜对！主角团获胜！',
          changes: [{
            targetType: 'global',
            targetId: 'match',
            field: 'winner',
            previousValue: null,
            nextValue: 'protagonist',
          }, {
            targetType: 'global',
            targetId: 'finalGuess',
            field: 'completed',
            previousValue: false,
            nextValue: true,
          }],
          metadata: buildTimelineCompatibilityMetadata({
            publicLog: ['🏆 全部猜对！主角团获胜！'],
          }),
        },
        gameTime: {
          phase: ctx.phase,
          phaseStep: 'submit-final-guess-complete',
        },
      });
      events.setPhase('match_end');
    }
  } else {
    G.v1.finalGuess.completed = true;
    G.v1.winner = 'mastermind';
    appendProjectedTimelineFact(G, {
      type: 'state_change',
      flowId,
      causedByFactIds: [guessFact.factId],
      source: {
        system: 'move',
        id: 'submitGuess',
        phase: ctx.phase || undefined,
      },
      actor: null,
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'final_guess_defeat',
        summary: '🎭 猜测失败，剧作家获胜！',
        changes: [{
          targetType: 'global',
          targetId: 'match',
          field: 'winner',
          previousValue: null,
          nextValue: 'mastermind',
        }, {
          targetType: 'global',
          targetId: 'finalGuess',
          field: 'completed',
          previousValue: false,
          nextValue: true,
        }],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: ['🎭 猜测失败，剧作家获胜！'],
        }),
      },
      gameTime: {
        phase: ctx.phase,
        phaseStep: 'submit-final-guess-complete',
      },
    });
    events.setPhase('match_end');
  }
};

// ── skipToFinalGuess: in time_spiral, protagonists can skip to final guess ────

const skipToFinalGuess: Move<TragedyGameState> = (
  { G, ctx, events, playerID },
) => {
  if (!playerID || playerID === '0') return INVALID_MOVE; // 仅主角可操作
  if (ctx.phase !== 'time_spiral') return INVALID_MOVE;
  const supportsFinalGuess = !!getTragedySetById(G.scriptOpen?.tragedySetId || '')?.supportsFinalGuess;
  if (!supportsFinalGuess) return INVALID_MOVE;
  if (G.maxLoops <= 0 || G.loopIndex < G.maxLoops) return INVALID_MOVE;

  appendProjectedTimelineFact(G, {
    type: 'state_change',
    source: {
      system: 'move',
      id: 'skipToFinalGuess',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'protagonist',
      seatId: playerID,
    },
    refs: {
      seatIds: [playerID],
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'skip_to_final_guess',
      summary: '⏩ 主角选择跳过剩余轮回，直接进入最终猜测！',
      changes: [],
      metadata: buildTimelineCompatibilityMetadata({
        publicLog: ['⏩ 主角选择跳过剩余轮回，直接进入最终猜测！'],
      }),
    },
    gameTime: {
      phase: ctx.phase,
      phaseStep: 'skip-to-final-guess',
    },
  });
  events.setPhase('final_guess');
};

// ── submitDetectiveGuess: LL 名侦探C 在各轮回记录当事人猜测 ────

const submitDetectiveGuess: Move<TragedyGameState> = (
  { G, ctx, playerID },
  {
    day,
    culpritId,
    incidentId,
    occurrenceIndex = 0,
  }: { day: number; culpritId: string; incidentId?: string; occurrenceIndex?: number },
) => {
  if (!playerID || playerID === '0') return INVALID_MOVE;
  if (G.scriptOpen?.tragedySetId !== 'last_liar') return INVALID_MOVE;
  if (!(G.v1.activePlots || []).includes('ll_i_am_the_detective')) return INVALID_MOVE;
  if (G.v1.exCardAssignment?.[playerID] !== 'C') return INVALID_MOVE;
  if (!Number.isInteger(day) || day < 1 || day > G.daysPerLoop) return INVALID_MOVE;
  if (!G.v1.characters[culpritId]) return INVALID_MOVE;
  if (!['time_spiral', 'final_guess'].includes(ctx.phase || '')) return INVALID_MOVE;

  const scheduledForDay = (G.v1.scheduledIncidents || []).reduce<Array<{ incidentId: string; occurrenceIndex: number }>>((acc, incident) => {
    if (incident.day !== day) return acc;
    const priorMatches = acc.filter(entry => entry.incidentId === incident.incidentId).length;
    acc.push({ incidentId: incident.incidentId, occurrenceIndex: priorMatches });
    return acc;
  }, []);
  const resolvedIncidentId = incidentId
    ?? (scheduledForDay.length === 1 ? scheduledForDay[0]?.incidentId : undefined);
  if (!resolvedIncidentId) return INVALID_MOVE;
  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) return INVALID_MOVE;

  const incidentExists = scheduledForDay.some(
    incident => incident.incidentId === resolvedIncidentId && incident.occurrenceIndex === occurrenceIndex,
  );
  if (!incidentExists) return INVALID_MOVE;

  if (!G.v1.detectiveGuesses) G.v1.detectiveGuesses = {};
  const incidentKey = buildIncidentInstanceKey(day, resolvedIncidentId, occurrenceIndex);
  if (incidentKey in G.v1.detectiveGuesses) return INVALID_MOVE;
  G.v1.detectiveGuesses[incidentKey] = culpritId;
  appendProjectedTimelineFact(G, {
    type: 'state_change',
    source: {
      system: 'move',
      id: 'submitDetectiveGuess',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'protagonist',
      seatId: playerID,
    },
    refs: {
      characterIds: [culpritId],
      seatIds: [playerID],
      incidentIds: [resolvedIncidentId],
    },
    visibility: createSeatPrivateTimelineVisibility([playerID]),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'detective_guess_recorded',
      summary: `[LL名侦探C] 猜测 ${incidentKey} 的当事人：${culpritId}`,
      changes: [{
        targetType: 'global',
        targetId: incidentKey,
        field: 'detectiveGuess',
        previousValue: null,
        nextValue: culpritId,
      }],
      metadata: buildTimelineCompatibilityMetadata({
        seatHistory: {
          [playerID]: [`[LL名侦探C] 猜测 ${incidentKey} 的当事人：${culpritId}`],
        },
      }),
    },
    gameTime: {
      phase: ctx.phase,
      phaseStep: 'submit-detective-guess',
    },
  });
};

// ── confirmAbility: 剧作家确认执行一个能力 ───────────────────────────────────

const confirmAbility: Move<TragedyGameState> = (
  { G, ctx, events, playerID },
  abilityId: string,
  selectedTargets?: Record<string, string>,
) => {
  if (playerID !== '0') return INVALID_MOVE;

  const idx = G.v1.pendingAbilities.findIndex(a => a.id === abilityId);
  if (idx === -1) return INVALID_MOVE;

  const ability = G.v1.pendingAbilities[idx];
  if (!canResolvePendingAbilityAtPhase(G, ability, ctx.phase || '')) return INVALID_MOVE;
  const targetSlots = ability.targetSlots || [];

  for (const slot of targetSlots) {
    const selected = selectedTargets?.[slot.slotId];
    if (!selected) return INVALID_MOVE;
    if (slot.kind === 'location' && !slot.eligibleLocationIds?.includes(selected)) return INVALID_MOVE;
    if (slot.kind === 'character' && !slot.eligibleCharacterIds?.includes(selected)) return INVALID_MOVE;
    if (slot.kind === 'character_or_location') {
      const charOk = slot.eligibleCharacterIds?.includes(selected);
      const locOk = slot.eligibleLocationIds?.includes(selected);
      if (!charOk && !locOk) return INVALID_MOVE;
    }
    if (slot.kind === 'token_type') {
      if (!slot.eligibleTokenTypes?.includes(selected as any)) return INVALID_MOVE;
    }
    if (slot.kind === 'choice') {
      if (!slot.eligibleChoices?.some(choice => choice.id === selected)) return INVALID_MOVE;
    }
  }

  // 执行能力
  const flowId = `pending-ability:${ability.id}`;
  appendProjectedTimelineFact(G, {
    type: 'ability_resolved',
    flowId,
    source: {
      system: 'move',
      id: 'confirmAbility',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
      characterId: toTimelineActorCharacterId(ability.characterId),
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'ability_resolved',
      outcome: 'pending_ability_confirmed',
      summary: '某角色能力正在结算。',
      changes: [],
      metadata: {},
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'confirm-ability',
    },
  });
  const abilitySnapshot = snapshotGameState(G);
  if (ability.ruleId === 'ahr_evangelist_death_despair_and_world_shift') {
    const targetId = selectedTargets?.target;
    if (targetId) {
      addToken(G.v1.characters[targetId], 'despair', 1);
      appendMoveResolutionFact({
        G,
        sourceId: 'confirmAbility',
        flowId,
        phase: ctx.phase || undefined,
        phaseStep: 'confirm-ability-optional-target',
        outcome: 'pending_ability_effect',
        summary: `${targetId} +1 despair`,
        visibility: createMastermindTimelineVisibility(),
        compatibility: {
          fullLog: [`🔧 [optional] ${ability.ruleId}: ${targetId} +1 despair`],
        },
      });
    }
    if (selectedTargets?.worldShiftChoice === 'shift') {
      markWorldShiftThisDay(G, `role:${ability.characterId}.ahr_evangelist_death_despair_and_world_shift`);
      appendMoveResolutionFact({
        G,
        sourceId: 'confirmAbility',
        flowId,
        phase: ctx.phase || undefined,
        phaseStep: 'confirm-ability-world-shift',
        outcome: 'world_shift_applied',
        summary: '🌗 世界线发生了波动',
        visibility: createPublicTimelineVisibility(),
        compatibility: {
          publicLog: ['🌗 世界线发生了波动'],
        },
      });
    } else {
      appendMoveResolutionFact({
        G,
        sourceId: 'confirmAbility',
        flowId,
        phase: ctx.phase || undefined,
        phaseStep: 'confirm-ability-world-stable',
        outcome: 'world_shift_skipped',
        summary: '🌗 世界线保持不变',
        visibility: createPublicTimelineVisibility(),
        compatibility: {
          publicLog: ['🌗 世界线保持不变'],
        },
      });
    }
    appendMoveResolutionFact({
      G,
      sourceId: 'confirmAbility',
      flowId,
      phase: ctx.phase || undefined,
      phaseStep: 'confirm-ability-world-choice',
      outcome: 'pending_ability_effect',
      summary: selectedTargets?.worldShiftChoice || 'no_shift',
      visibility: createMastermindTimelineVisibility(),
      compatibility: {
        fullLog: [`🔧 [optional] ${ability.ruleId}: ${selectedTargets?.worldShiftChoice || 'no_shift'}`],
      },
    });
    emitAbilityResolveEffects(G, flowId, ctx.phase || undefined, abilitySnapshot);
  } else if ((ability.ruleId === 'ahr_puppetized_goodwill_ability' || ability.ruleId === 'ahr_mastermind_goodwill_ability') && ability.abilityId) {
    executeGoodwillAbility(G, ability.characterId, ability.abilityId, selectedTargets);
    if (!(ability.ruleId === 'ahr_mastermind_goodwill_ability' && ability.abilityId === 'doctor_gw2')) {
      markAbilityUsed(
        G,
        ability.characterId,
        ability.abilityId,
        isOncePerLoopGoodwillAbility(ability.characterId, ability.abilityId),
      );
    }
    appendProjectedTimelineFacts(G, [
      {
        type: 'ability_resolved',
        flowId,
        source: {
          system: 'move',
          id: 'confirmAbility',
          phase: ctx.phase || undefined,
        },
        actor: {
          role: 'mastermind',
          seatId: '0',
          characterId: toTimelineActorCharacterId(ability.characterId),
        },
        visibility: createPublicTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'ability_resolved',
          outcome: 'mastermind_ability_public_result',
          summary: '🔮 某角色身上发生了变化',
          changes: [],
          metadata: buildTimelineCompatibilityMetadata({
            publicLog: ['🔮 某角色身上发生了变化'],
          }),
        },
        gameTime: {
          phase: ctx.phase || null,
          phaseStep: 'confirm-ability-public',
        },
      },
      {
        type: 'ability_resolved',
        flowId,
        causedByFactIds: getLatestFactIdForFlow(G, flowId) ? [getLatestFactIdForFlow(G, flowId)!] : [],
        source: {
          system: 'move',
          id: 'confirmAbility',
          phase: ctx.phase || undefined,
        },
        actor: {
          role: 'mastermind',
          seatId: '0',
          characterId: toTimelineActorCharacterId(ability.characterId),
        },
        visibility: createMastermindTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'ability_resolved',
          outcome: 'mastermind_ability_secret_result',
          summary: `${ability.characterId}.${ability.abilityId}`,
          changes: [],
          metadata: buildTimelineCompatibilityMetadata({
            fullLog: [`🔧 [mastermind_ability] ${ability.ruleId}: ${ability.characterId}.${ability.abilityId}`],
          }),
        },
        gameTime: {
          phase: ctx.phase || null,
          phaseStep: 'confirm-ability-secret',
        },
      },
    ]);
    emitAbilityResolveEffects(G, flowId, ctx.phase || undefined, abilitySnapshot);
  } else {
    const proc = getProcessor(ability.ruleId);
    if (proc) {
      const ruleCtx = {
        G,
        timing: getPendingAbilityTiming(ability),
        characterId: ability.characterId || undefined,
        selectedTargets,
      };
      proc.execute(ruleCtx);
      appendProjectedTimelineFacts(G, [
        {
          type: 'ability_resolved',
          flowId,
          source: {
            system: 'move',
            id: 'confirmAbility',
            phase: ctx.phase || undefined,
          },
          actor: {
            role: 'mastermind',
            seatId: '0',
            characterId: toTimelineActorCharacterId(ability.characterId),
          },
          visibility: createPublicTimelineVisibility(),
          payload: {
            family: 'resolution',
            type: 'ability_resolved',
            outcome: 'pending_ability_public_result',
            summary: '🔮 某角色身上发生了变化',
            changes: [],
            metadata: buildTimelineCompatibilityMetadata({
              publicLog: ['🔮 某角色身上发生了变化'],
            }),
          },
          gameTime: {
            phase: ctx.phase || null,
            phaseStep: 'confirm-ability-public',
          },
        },
        {
          type: 'ability_resolved',
          flowId,
          causedByFactIds: getLatestFactIdForFlow(G, flowId) ? [getLatestFactIdForFlow(G, flowId)!] : [],
          source: {
            system: 'move',
            id: 'confirmAbility',
            phase: ctx.phase || undefined,
          },
          actor: {
            role: 'mastermind',
            seatId: '0',
            characterId: toTimelineActorCharacterId(ability.characterId),
          },
          visibility: createMastermindTimelineVisibility(),
          payload: {
            family: 'resolution',
            type: 'ability_resolved',
            outcome: 'pending_ability_secret_result',
            summary: ability.description,
            changes: [],
            metadata: buildTimelineCompatibilityMetadata({
              fullLog: [`🔧 [${getPendingAbilityTiming(ability)}] ${ability.ruleId}: ${ability.description}`],
            }),
          },
          gameTime: {
            phase: ctx.phase || null,
            phaseStep: 'confirm-ability-secret',
          },
        },
      ]);
    }
    emitAbilityResolveEffects(G, flowId, ctx.phase || undefined, abilitySnapshot);
  }

  // 从队列移除
  G.v1.pendingAbilities.splice(idx, 1);
  removePendingInteractionBySource(G, 'mastermind_ability', ability.id);

  if (ctx.phase !== 'mastermind_abilities' && (G.v1.loopLost || G.v1.protagonistKilled)) {
    G.v1.pendingAbilities = [];
    clearPendingInteractions(G);
    events.setPhase('loop_end_check');
    return;
  }

  // 检查阶段转换
  finalizePendingAbilityResolution(G, ctx.phase);
};

// ── skipAbility: 剧作家跳过一个可选能力 ──────────────────────────────────────

const skipAbility: Move<TragedyGameState> = (
  { G, ctx, playerID },
  ruleId: string,
) => {
  if (playerID !== '0') return INVALID_MOVE;

  const idx = G.v1.pendingAbilities.findIndex(a => a.id === ruleId);
  if (idx === -1) return INVALID_MOVE;

  const ability = G.v1.pendingAbilities[idx];
  if (!canResolvePendingAbilityAtPhase(G, ability, ctx.phase || '')) return INVALID_MOVE;

  // 强制能力不能跳过
  if (ability.mandatory) return INVALID_MOVE;

  // 从队列移除
  G.v1.pendingAbilities.splice(idx, 1);
  removePendingInteractionBySource(G, 'mastermind_ability', ability.id);
  appendProjectedTimelineFact(G, {
    type: 'ability_skipped',
    flowId: `pending-ability:${ability.id}`,
    source: {
      system: 'move',
      id: 'skipAbility',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
      characterId: toTimelineActorCharacterId(ability.characterId),
    },
    visibility: createMastermindTimelineVisibility(),
    payload: {
      family: 'declaration',
      type: 'ability_skipped',
      subject: 'ability',
      summary: `跳过可选能力: ${ability.ruleId}`,
      abilityId: ability.ruleId,
      selectedTargets: {},
      metadata: buildTimelineCompatibilityMetadata({
        fullLog: [`⏭️ 跳过可选能力: ${ability.ruleId}`],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'skip-ability',
    },
  });

  // 检查阶段转换
  finalizePendingAbilityResolution(G, ctx.phase);
};

// ── finishAbilities: 跳过所有剩余可选能力 ────────────────────────────────────

const finishAbilities: Move<TragedyGameState> = (
  { G, ctx, playerID },
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (G.v1.pendingAbilities.length === 0) return INVALID_MOVE;
  if (
    G.v1.pendingAbilities.some(ability => !canResolvePendingAbilityAtPhase(G, ability, ctx.phase || ''))
  ) {
    return INVALID_MOVE;
  }

  // 仍有强制能力未处理 → 不能结束
  const hasMandatory = G.v1.pendingAbilities.some(a => a.mandatory);
  if (hasMandatory) return INVALID_MOVE;

  // 清空所有剩余可选能力
  G.v1.pendingAbilities = [];
  if (ctx.phase === 'mastermind_abilities' || ctx.phase === 'day_end') {
    G.v1.abilityPhase = 'done';
    if (ctx.phase === 'mastermind_abilities') {
      clearPendingInteractions(G);
      return;
    }
    clearPendingAbilityInteractions(G);
    return;
  }
  clearPendingAbilityInteractions(G);
};

/** 内部辅助：更新 abilityPhase，并在适用时保留当前阶段，等待显式 NEXT。 */
function updateAbilityPhase(
  G: TragedyGameState,
  phase: 'mastermind_abilities' | 'day_end',
): void {
  if (G.v1.pendingAbilities.length === 0) {
    G.v1.abilityPhase = 'done';
    if (phase === 'mastermind_abilities') {
      clearPendingInteractions(G);
      return;
    }
    clearPendingAbilityInteractions(G);
    return;
  }
  // 检查是否还有强制能力
  const hasMandatory = G.v1.pendingAbilities.some(a => a.mandatory);
  G.v1.abilityPhase = hasMandatory ? 'mandatory' : 'optional';
  syncPendingInteractionsFromLegacyState(G, phase);
}

function isCrossPhasePendingAbility(
  G: TragedyGameState,
  ability: TragedyGameState['v1']['pendingAbilities'][number],
): boolean {
  return isModuleCrossPhaseAbility(G, ability.ruleId);
}

function finalizePendingAbilityResolution(
  G: TragedyGameState,
  ctxPhase: string,
): void {
  if (ctxPhase === 'mastermind_abilities' || ctxPhase === 'day_end') {
    updateAbilityPhase(G, ctxPhase);
    return;
  }

  if (G.v1.pendingAbilities.length === 0) {
    clearPendingInteractions(G);
    return;
  }

  syncPendingInteractionsFromLegacyState(G, ctxPhase);
}

function getRelevantGoodwillTargetSlots(
  targetSlots: TargetSlot[],
  selectedTargets?: Record<string, string>,
): TargetSlot[] {
  const selectedValues = new Set(Object.values(selectedTargets || {}));
  return targetSlots.filter((slot) => {
    if (!slot.slotId.includes('::')) return true;
    return Array.from(selectedValues).some((value) => slot.slotId.startsWith(`${value}::`));
  });
}

function validateSelectedTargetSlots(
  targetSlots: TargetSlot[],
  selectedTargets?: Record<string, string>,
): boolean {
  for (const slot of targetSlots) {
    const selected = selectedTargets?.[slot.slotId];
    if (!selected) return false;
    if (slot.kind === 'location' && !slot.eligibleLocationIds?.includes(selected)) return false;
    if (slot.kind === 'character' && !slot.eligibleCharacterIds?.includes(selected)) return false;
    if (slot.kind === 'character_or_location') {
      const charOk = slot.eligibleCharacterIds?.includes(selected);
      const locOk = slot.eligibleLocationIds?.includes(selected);
      if (!charOk && !locOk) return false;
    }
    if (slot.kind === 'token_type' && !slot.eligibleTokenTypes?.includes(selected as any)) return false;
    if (slot.kind === 'choice' && !slot.eligibleChoices?.some(choice => choice.id === selected)) return false;
  }
  return true;
}

function toPublicIncidentFailureMessage(reason: string): string {
  if (reason === '当事人不在场') {
    return '📋 事件未发生（当事人不在场）';
  }

  return '📋 事件未发生（条件未满足）';
}

function formatGoodwillSelectionDetail(
  targetSlots: TargetSlot[],
  selectedTargets?: Record<string, string>,
): string | undefined {
  if (!selectedTargets) return undefined;

  const relevantSlots = getRelevantGoodwillTargetSlots(targetSlots, selectedTargets);
  const tokenTypeLabels: Record<string, string> = {
    paranoia: '不安',
    intrigue: '密谋',
    goodwill: '友好',
    hope: '希望',
    despair: '绝望',
  };
  const fragments: string[] = relevantSlots
    .map((slot) => {
      const selected = selectedTargets[slot.slotId];
      if (!selected) return null;

      if (
        (slot.kind === 'character' || slot.kind === 'character_or_location')
        && slot.eligibleCharacterIds?.includes(selected)
      ) {
        return `${slot.label}：${getLocalizedTerm(selected)}`;
      }

      if (
        (slot.kind === 'location' || slot.kind === 'character_or_location')
        && slot.eligibleLocationIds?.includes(selected)
      ) {
        return `${slot.label}：${getLocalizedTerm(selected)}`;
      }

      if (slot.kind === 'choice') {
        const selectedChoice = slot.eligibleChoices?.find((choice) => choice.id === selected);
        return `${slot.label}：${selectedChoice?.label || selected}`;
      }

      if (slot.kind === 'token_type') {
        return `${slot.label}：${tokenTypeLabels[selected] || getLocalizedTerm(selected) || selected}`;
      }

      return `${slot.label}：${getLocalizedTerm(selected) || selected}`;
    })
    .filter((fragment): fragment is string => fragment != null);

  return fragments.length > 0 ? fragments.join(' · ') : undefined;
}

function getPublicGoodwillFocusTarget(
  G: TragedyGameState,
  targetSlots: TargetSlot[],
  selectedTargets?: Record<string, string>,
): {
  targetId?: string;
  targetType?: 'character' | 'location';
} {
  if (!selectedTargets) return {};

  const relevantSlots = getRelevantGoodwillTargetSlots(targetSlots, selectedTargets);
  for (const slot of relevantSlots) {
    const selected = selectedTargets[slot.slotId];
    if (!selected) continue;

    if (
      (slot.kind === 'character' || slot.kind === 'character_or_location')
      && !!G.v1.characters[selected]
    ) {
      return {
        targetId: selected,
        targetType: 'character',
      };
    }

    if (
      (slot.kind === 'location' || slot.kind === 'character_or_location')
      && !!G.v1.locations[selected]
    ) {
      return {
        targetId: selected,
        targetType: 'location',
      };
    }
  }

  return {};
}

function getPublicTargetLabel(
  G: TragedyGameState,
  targetId?: string,
): string | undefined {
  if (!targetId) return undefined;
  if (G.v1.characters[targetId] || G.v1.locations[targetId]) {
    return getLocalizedTerm(targetId);
  }
  return undefined;
}

function getPublicTargetType(
  G: TragedyGameState,
  targetId?: string,
): 'character' | 'location' | undefined {
  if (!targetId) return undefined;
  if (G.v1.characters[targetId]) return 'character';
  if (G.v1.locations[targetId]) return 'location';
  return undefined;
}

function getIncidentAnnouncementSelectionLabel(
  G: TragedyGameState,
  slot: Pick<TargetSlot, 'eligibleChoices'> | undefined,
  selected: string,
): string {
  return slot?.eligibleChoices?.find(choice => choice.id === selected)?.label
    || getPublicTargetLabel(G, selected)
    || getLocalizedTerm(selected)
    || selected;
}

function buildIncidentAnnouncementDetailFragment(
  G: TragedyGameState,
  slotId: string,
  slot: Pick<TargetSlot, 'label' | 'eligibleChoices'> | undefined,
  selected: string,
): string {
  const selectionLabel = getIncidentAnnouncementSelectionLabel(G, slot, selected);
  if (slotId === 'worldShiftChoice') {
    return `结果：${selectionLabel}`;
  }
  return `${slot?.label || '对象'}：${selectionLabel}`;
}

function buildIncidentAnnouncementPayloads(
  G: TragedyGameState,
  incident: { incidentId: string; culpritId: string; targetSlots?: TargetSlot[] },
  triggered: boolean,
  selectedTargets?: Record<string, string>,
  failureReason?: string,
): Array<Record<string, unknown>> {
  const basePayload = {
    incidentName: getLocalizedTerm(incident.incidentId),
    incidentId: incident.incidentId,
    outcome: triggered ? 'triggered' : 'not_triggered',
    description: triggered
      ? `${getLocalizedTerm(incident.incidentId)} 已发生。`
      : toPublicIncidentFailureMessage(failureReason || ''),
  };

  if (!triggered) {
    return [basePayload];
  }

  const targetSlots = incident.targetSlots || [];
  const slotById = new Map(targetSlots.map(slot => [slot.slotId, slot]));
  const orderedSlotIds = [
    ...targetSlots.map(slot => slot.slotId),
    ...Object.keys(selectedTargets || {}).filter(slotId => !slotById.has(slotId)),
  ];
  const genericDetails: string[] = [];
  const subjectGroups = new Map<string, {
    subjectId: string;
    subjectType: 'character' | 'location';
    order: number;
    details: string[];
  }>();

  orderedSlotIds.forEach((slotId, order) => {
    const selected = selectedTargets?.[slotId];
    if (!selected) return;

    const slot = slotById.get(slotId);
    if (slot?.kind === 'choice' || slot?.kind === 'token_type') {
      genericDetails.push(buildIncidentAnnouncementDetailFragment(G, slotId, slot, selected));
      return;
    }

    const subjectType = getPublicTargetType(G, selected);
    if (!subjectType) {
      genericDetails.push(buildIncidentAnnouncementDetailFragment(G, slotId, slot, selected));
      return;
    }

    const subjectKey = `${subjectType}:${selected}`;
    if (!subjectGroups.has(subjectKey)) {
      subjectGroups.set(subjectKey, {
        subjectId: selected,
        subjectType,
        order,
        details: [],
      });
    }

    subjectGroups.get(subjectKey)!.details.push(
      buildIncidentAnnouncementDetailFragment(G, slotId, slot, selected),
    );
  });

  const orderedSubjects = [...subjectGroups.values()].sort((left, right) => left.order - right.order);
  if (orderedSubjects.length === 0) {
    return [{
      ...basePayload,
      detail: genericDetails.length > 0 ? genericDetails.join(' · ') : undefined,
    }];
  }

  return orderedSubjects.map((subject, index) => ({
    ...basePayload,
    characterId: subject.subjectType === 'character' ? subject.subjectId : undefined,
    locationId: subject.subjectType === 'location' ? subject.subjectId : undefined,
    targetId: subject.subjectId,
    targetType: subject.subjectType,
    detail: [...subject.details, ...(index === 0 ? genericDetails : [])].join(' · ') || undefined,
  }));
}

function buildIncidentAnnouncementEventLogs(
  G: TragedyGameState,
  incident: { incidentId: string; culpritId: string; targetSlots?: TargetSlot[] },
  triggered: boolean,
  selectedTargets?: Record<string, string>,
  failureReason?: string,
): Array<{ type: 'incident'; payload: TimelineJsonValue }> {
  return buildIncidentAnnouncementPayloads(G, incident, triggered, selectedTargets, failureReason).map(payload => ({
    type: 'incident',
    payload: toTimelineJsonValue(payload),
  }));
}

// ── declareAbility: 队长声明使用一个友好能力 ─────────────────────────────────

const declareAbility: Move<TragedyGameState> = (
  { G, ctx, playerID },
  characterId: string,
  abilityId: string,
  selectedTargets?: Record<string, string>,
) => {
  if (!playerID) return INVALID_MOVE;
  if (ctx.phase !== 'goodwill_window') return INVALID_MOVE;
  // 仅队长可操作
  if (playerID !== G.v1.leader) return INVALID_MOVE;
  const goodwillInteraction = getPendingGoodwillInteraction(G);
  if (!goodwillInteraction || goodwillInteraction.phase !== 'leader_choosing') return INVALID_MOVE;

  // 检查能力是否在合格列表中且未使用
  const ability = goodwillInteraction.eligibleAbilities.find(
    a => a.characterId === characterId && a.abilityId === abilityId && !a.used
  );
  if (!ability) return INVALID_MOVE;
  const relevantTargetSlots = getRelevantGoodwillTargetSlots(ability.targetSlots || [], selectedTargets);
  if (!validateSelectedTargetSlots(relevantTargetSlots, selectedTargets)) return INVALID_MOVE;

  const nextState = {
    phase: 'mastermind_resolving' as const,
    eligibleAbilities: goodwillInteraction.eligibleAbilities,
    currentDeclaration: { characterId, abilityId, selectedTargets },
  };
  G.v1.goodwillInteraction = nextState;
  appendProjectedTimelineFact(G, {
    type: 'ability_declared',
    flowId: `goodwill:${G.loopIndex}:${G.day}:${characterId}:${abilityId}`,
    source: {
      system: 'move',
      id: 'declareAbility',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'protagonist',
      seatId: playerID,
      characterId,
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'declaration',
      type: 'ability_declared',
      subject: 'ability',
      summary: `队长声明使用友好能力: ${ability.label}`,
      abilityId,
      selectedTargets: selectedTargets ?? {},
      metadata: buildTimelineCompatibilityMetadata({
        publicLog: [`📣 队长声明使用友好能力: ${ability.label}`],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'declare-ability',
    },
  });
  setPendingGoodwillInteraction(G, buildGoodwillInteraction(G, nextState));
};

// ── resolveAbility: 剧作家裁定友好能力 ──────────────────────────────────────

const resolveAbility: Move<TragedyGameState> = (
  { G, ctx, playerID },
  allowed: boolean,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'goodwill_window') return INVALID_MOVE;
  const goodwillInteraction = getPendingGoodwillInteraction(G);
  if (!goodwillInteraction || goodwillInteraction.phase !== 'mastermind_resolving') return INVALID_MOVE;
  if (!goodwillInteraction.currentDeclaration) return INVALID_MOVE;

  const { characterId, abilityId } = goodwillInteraction.currentDeclaration;
  const announcedAbility = goodwillInteraction.eligibleAbilities.find(
    a => a.characterId === characterId && a.abilityId === abilityId,
  );

  // 规则约束：检查身份特性
  const trait = getGoodwillTrait(G, characterId);

  // must_reject 强制拒绝
  if (trait === 'must_reject' && !isImmuneToRejection(abilityId)) {
    if (allowed) return INVALID_MOVE; // 不允许通过
  }
  // must_allow 或免疫拒绝 强制允许
  if (trait === 'must_allow' || isImmuneToRejection(abilityId)) {
    if (!allowed) return INVALID_MOVE; // 不允许拒绝
  }

  const declaredTargetSlots = announcedAbility?.targetSlots || [];
  const publicFocusTarget = getPublicGoodwillFocusTarget(
    G,
    declaredTargetSlots,
    goodwillInteraction.currentDeclaration.selectedTargets,
  );
  const publicSelectionDetail = formatGoodwillSelectionDetail(
    declaredTargetSlots,
    goodwillInteraction.currentDeclaration.selectedTargets,
  );
  const flowId = `goodwill:${G.loopIndex}:${G.day}:${characterId}:${abilityId}`;
  const causedByFactId = getLatestFactIdForFlow(G, flowId);

  if (allowed) {
    const goodwillSnapshot = snapshotGameState(G);
    executeGoodwillAbility(G, characterId, abilityId, goodwillInteraction.currentDeclaration.selectedTargets);
    const publicFact = appendProjectedTimelineFact(G, {
      type: 'ability_resolved',
      flowId,
      causedByFactIds: causedByFactId ? [causedByFactId] : [],
      source: {
        system: 'move',
        id: 'resolveAbility',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId,
      },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'ability_resolved',
        outcome: 'goodwill_allowed',
        summary: `${getLocalizedTerm(characterId)} 的友好能力已生效`,
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: [`✅ ${getLocalizedTerm(characterId)} 的友好能力生效`],
          eventLogs: [{
            type: 'ability_trigger',
            payload: toTimelineJsonValue({
              abilityName: '友好能力生效',
              characterId,
              abilityLabel: announcedAbility?.label || abilityId,
              resultType: 'goodwill',
              outcome: 'allowed',
              description: `${getLocalizedTerm(characterId)} 的友好能力已生效。`,
              detail: publicSelectionDetail,
              targetId: publicFocusTarget.targetId,
              targetType: publicFocusTarget.targetType,
            }),
          }],
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-ability-allowed',
      },
    });
    appendProjectedTimelineFact(G, {
      type: 'ability_resolved',
      flowId,
      causedByFactIds: [publicFact.factId],
      source: {
        system: 'move',
        id: 'resolveAbility',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId,
      },
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'ability_resolved',
        outcome: 'goodwill_allowed_secret',
        summary: `${characterId}.${abilityId} allowed`,
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: [`🔧 [goodwill] ${characterId}.${abilityId} 允许`],
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-ability-allowed-secret',
      },
    });
    emitAbilityResolveEffects(G, flowId, ctx.phase || undefined, goodwillSnapshot);
  } else {
    const publicFact = appendProjectedTimelineFact(G, {
      type: 'ability_resolved',
      flowId,
      causedByFactIds: causedByFactId ? [causedByFactId] : [],
      source: {
        system: 'move',
        id: 'resolveAbility',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId,
      },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'ability_resolved',
        outcome: 'goodwill_rejected',
        summary: `${getLocalizedTerm(characterId)} 的友好能力被拒绝`,
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: [`❌ ${getLocalizedTerm(characterId)} 的友好能力被拒绝`],
          eventLogs: [{
            type: 'ability_trigger',
            payload: toTimelineJsonValue({
              abilityName: '友好能力被拒绝',
              characterId,
              abilityLabel: announcedAbility?.label || abilityId,
              resultType: 'goodwill',
              outcome: 'rejected',
              description: `${getLocalizedTerm(characterId)} 的友好能力被拒绝。`,
              detail: publicSelectionDetail,
              targetId: publicFocusTarget.targetId,
              targetType: publicFocusTarget.targetType,
            }),
          }],
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-ability-rejected',
      },
    });
    appendProjectedTimelineFact(G, {
      type: 'ability_resolved',
      flowId,
      causedByFactIds: [publicFact.factId],
      source: {
        system: 'move',
        id: 'resolveAbility',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId,
      },
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'ability_resolved',
        outcome: 'goodwill_rejected_secret',
        summary: `${characterId}.${abilityId} rejected`,
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: [`🚫 [goodwill] ${characterId}.${abilityId} 拒绝`],
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-ability-rejected-secret',
      },
    });
  }

  // 标记已使用
  const abilityDef = CHARACTERS[characterId]?.goodwillAbilities.find(
    ability => ability.id === abilityId
  );
  markAbilityUsed(G, characterId, abilityId, !!abilityDef?.oncePerLoop);
  const abilityEntry = goodwillInteraction.eligibleAbilities.find(
    a => a.characterId === characterId && a.abilityId === abilityId
  );
  if (abilityEntry) abilityEntry.used = true;

  // 返回队长选择
  const hasUnused = goodwillInteraction.eligibleAbilities.some(a => !a.used);
  if (hasUnused) {
    const nextState = {
      phase: 'leader_choosing' as const,
      eligibleAbilities: goodwillInteraction.eligibleAbilities,
      currentDeclaration: null,
    };
    G.v1.goodwillInteraction = nextState;
    setPendingGoodwillInteraction(G, buildGoodwillInteraction(G, nextState));
  } else {
    G.v1.goodwillInteraction = {
      phase: 'done',
      eligibleAbilities: goodwillInteraction.eligibleAbilities,
      currentDeclaration: null,
    };
    clearPendingInteractions(G);
  }
};

// ── skipAllAbilities: 队长放弃所有友好能力 ────────────────────────────────────

const skipAllAbilities: Move<TragedyGameState> = (
  { G, ctx, playerID },
) => {
  if (!playerID) return INVALID_MOVE;
  if (ctx.phase !== 'goodwill_window') return INVALID_MOVE;
  if (playerID !== G.v1.leader) return INVALID_MOVE;
  const goodwillInteraction = getPendingGoodwillInteraction(G);
  if (!goodwillInteraction || goodwillInteraction.phase !== 'leader_choosing') return INVALID_MOVE;

  G.v1.goodwillInteraction = {
    phase: 'done',
    eligibleAbilities: goodwillInteraction.eligibleAbilities,
    currentDeclaration: null,
  };
  appendProjectedTimelineFact(G, {
    type: 'ability_skipped',
    flowId: `goodwill:${G.loopIndex}:${G.day}:skip-all`,
    source: {
      system: 'move',
      id: 'skipAllAbilities',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'protagonist',
      seatId: playerID,
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'declaration',
      type: 'ability_skipped',
      subject: 'ability',
      summary: '队长选择不使用友好能力',
      selectedTargets: {},
      metadata: buildTimelineCompatibilityMetadata({
        publicLog: ['⏭️ 队长选择不使用友好能力'],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'skip-all-abilities',
    },
  });
  clearPendingInteractions(G);
};

// ── resolveIncident: 剧作家裁定一个事件 ─────────────────────────────────────

const resolveIncident: Move<TragedyGameState> = (
  { G, ctx, events, playerID },
  pendingIncidentId: string,
  triggered: boolean,
  selectedTargets?: Record<string, string>,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'incidents') return INVALID_MOVE;
  if (hasPendingButterflyChoiceInteraction(G)) return INVALID_MOVE;

  const runtimeIncident = getPendingIncidentResolutionInteractionBySource(G, pendingIncidentId);
  const shadowIncident = (G.v1.pendingIncidents || []).find(inc => inc.id === pendingIncidentId);
  const incident = runtimeIncident
    ? {
        id: runtimeIncident.sourceId || pendingIncidentId,
        day: runtimeIncident.day,
        incidentId: runtimeIncident.incidentId,
        culpritId: runtimeIncident.culpritId,
        targetSlots: runtimeIncident.targetSlots,
      }
    : shadowIncident;
  if (!incident) return INVALID_MOVE;
  const flowId = `incident:${incident.id}`;
  const triggerStatus = getIncidentTriggerStatus(G, incident.day, incident.incidentId, incident.culpritId);

  if (triggered !== triggerStatus.shouldTrigger) return INVALID_MOVE;

  const usedSelections = selectedTargets || {};
  const requiredSlotIds = getModuleIncidentRequiredSlotIds(G, incident.incidentId, {
    culpritId: incident.culpritId,
    selectedTargets: usedSelections,
    targetSlots: incident.targetSlots,
  });

  if (triggered) {
    for (const slot of incident.targetSlots || []) {
      const selected = usedSelections[slot.slotId];
      const hasEligibleChoice = (slot.eligibleCharacterIds?.length || 0) > 0
        || (slot.eligibleLocationIds?.length || 0) > 0
        || (slot.eligibleTokenTypes?.length || 0) > 0
        || (slot.eligibleChoices?.length || 0) > 0;
      const isRequired = requiredSlotIds ? requiredSlotIds.has(slot.slotId) : hasEligibleChoice;
      if (!selected) {
        if (isRequired) return INVALID_MOVE;
        continue;
      }
      if (slot.kind === 'location' && !slot.eligibleLocationIds?.includes(selected)) return INVALID_MOVE;
      if (slot.kind === 'character' && !slot.eligibleCharacterIds?.includes(selected)) return INVALID_MOVE;
      if (slot.kind === 'character_or_location') {
        const charOk = slot.eligibleCharacterIds?.includes(selected);
        const locOk = slot.eligibleLocationIds?.includes(selected);
        if (!charOk && !locOk) return INVALID_MOVE;
      }
      if (slot.kind === 'token_type') {
        if (!slot.eligibleTokenTypes?.includes(selected as any)) return INVALID_MOVE;
      }
      if (slot.kind === 'choice') {
        if (!slot.eligibleChoices?.some(choice => choice.id === selected)) return INVALID_MOVE;
      }
    }

    if (!validateModuleIncidentSelections(G, incident.incidentId, {
      culpritId: incident.culpritId,
      selectedTargets: usedSelections,
      targetSlots: incident.targetSlots,
    })) {
      return INVALID_MOVE;
    }

    // 先做事件定义/处理器预检，避免异常时出现 Ex 与历史半更新
    const setId = G.scriptOpen?.tragedySetId || '';
    const incidentDef = setId ? getIncidentById(setId, incident.incidentId) : undefined;
    if (!incidentDef?.rules?.[0]?.id) {
      appendMoveResolutionFact({
        G,
        sourceId: 'resolveIncident',
        flowId,
        phase: ctx.phase || undefined,
        phaseStep: 'resolve-incident-missing-definition',
        outcome: 'incident_resolution_blocked',
        summary: `未找到事件定义: ${setId}:${incident.incidentId}`,
        visibility: createMastermindTimelineVisibility(),
        compatibility: {
          fullLog: [`⚠️ 未找到事件定义: ${setId}:${incident.incidentId}`],
        },
      });
      return INVALID_MOVE;
    }
    const ruleId = incidentDef.rules[0].id;
    const proc = incident.incidentId === 'butterfly_effect' ? undefined : getProcessor(ruleId);
    if (incident.incidentId !== 'butterfly_effect' && !proc) {
      appendMoveResolutionFact({
        G,
        sourceId: 'resolveIncident',
        flowId,
        phase: ctx.phase || undefined,
        phaseStep: 'resolve-incident-missing-processor',
        outcome: 'incident_resolution_blocked',
        summary: `未找到事件处理器: ${ruleId}`,
        visibility: createMastermindTimelineVisibility(),
        compatibility: {
          fullLog: [`⚠️ 未找到事件处理器: ${ruleId}`],
        },
      });
      return INVALID_MOVE;
    }

    const selectedTarget = usedSelections.target;
    const targetSlot = incident.targetSlots.find(slot => slot.slotId === 'target');
    if (incident.incidentId === 'butterfly_effect' && (!selectedTarget || !targetSlot)) {
      return INVALID_MOVE;
    }

    applyIncidentExDelta(G, incident.incidentId);

    if (!G.v1.loopState.triggeredIncidents.includes(incident.day)) {
      G.v1.loopState.triggeredIncidents.push(incident.day);
    }

    const immuneKey = `__incident_immune_${incident.culpritId}`;
    const removedKey = `__removed_from_board_${incident.culpritId}`;
    const usedLoopUsage = (key: string) => !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
    const isImmune = usedLoopUsage(immuneKey) || usedLoopUsage(removedKey);

    G.v1.loopState.incidentHistory.push({
      loop: G.loopIndex ?? 0,
      day: incident.day,
      incidentId: incident.incidentId,
      culpritId: incident.culpritId,
      wasImmune: isImmune
    });

    if (incident.incidentId === 'butterfly_effect') {
      if (!selectedTarget || !targetSlot) return INVALID_MOVE;
      const isLocationTarget = !!targetSlot.eligibleLocationIds?.includes(selectedTarget)
        && !targetSlot.eligibleCharacterIds?.includes(selectedTarget);
      const choice = {
        targetId: selectedTarget,
        targetKind: isLocationTarget ? 'location' as const : 'character' as const,
        allowedTokens: ['goodwill', 'paranoia', 'intrigue'] as const,
      };

      G.v1.loopState.butterflyEffectTriggered = true;
      const incidentFact = appendProjectedTimelineFact(G, {
        type: 'incident_resolved',
        flowId,
        causedByFactIds: getLatestFactIdForFlow(G, flowId) ? [getLatestFactIdForFlow(G, flowId)!] : [],
        source: {
          system: 'move',
          id: 'resolveIncident',
          phase: ctx.phase || undefined,
        },
        actor: {
          role: 'mastermind',
          seatId: '0',
          characterId: incident.culpritId,
        },
        visibility: createPublicTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'incident_resolved',
          outcome: 'butterfly_choice_pending',
          summary: '蝴蝶效应：等待剧作家选择指示物种类',
          changes: [],
          metadata: buildTimelineCompatibilityMetadata({
            publicLog: ['🦋 蝴蝶效应：等待剧作家选择指示物种类'],
            eventLogs: buildIncidentAnnouncementEventLogs(G, incident, true, usedSelections),
          }),
        },
        gameTime: {
          phase: ctx.phase || null,
          phaseStep: 'resolve-incident-butterfly-pending',
        },
      });
      appendProjectedTimelineFact(G, {
        type: 'incident_resolved',
        flowId,
        causedByFactIds: [incidentFact.factId],
        source: {
          system: 'move',
          id: 'resolveIncident',
          phase: ctx.phase || undefined,
        },
        actor: {
          role: 'mastermind',
          seatId: '0',
          characterId: incident.culpritId,
        },
        visibility: createMastermindTimelineVisibility(),
        payload: {
          family: 'resolution',
          type: 'incident_resolved',
          outcome: 'butterfly_choice_pending_secret',
          summary: selectedTarget,
          changes: [],
          metadata: buildTimelineCompatibilityMetadata({
            fullLog: [`🦋 [incident] 蝴蝶效应待选择：${selectedTarget}`],
          }),
        },
        gameTime: {
          phase: ctx.phase || null,
          phaseStep: 'resolve-incident-butterfly-pending-secret',
        },
      });
      removePendingInteractionBySource(G, 'incident_resolution', incident.id);
      enqueueButterflyChoiceInteraction(G, 'incidents', {
        ...choice,
        allowedTokens: [...choice.allowedTokens],
      });
      return;
    }

    const hasActiveIncidentResolveRules = (G.v1.activeRuleDefinitions || []).some(
      rule => rule.timing === 'incident_resolve'
        && (!rule.incidentId || rule.incidentId === incident.incidentId),
    );

    if (hasActiveIncidentResolveRules) {
      // 通过 ruleEngine 执行，确保 incident/plot 联动与 autoResolve 保持一致
      const resolution = resolveTimingWindow(
        G,
        'incident_resolve',
        { day: incident.day, incidentId: incident.incidentId, culpritId: incident.culpritId },
        usedSelections,
      );
      if (resolution.executed.length === 0) {
        appendMoveResolutionFact({
          G,
          sourceId: 'resolveIncident',
          flowId,
          phase: ctx.phase || undefined,
          phaseStep: 'resolve-incident-no-effects',
          outcome: 'incident_triggered_no_effects',
          summary: `${incident.incidentId}: 触发但无执行效果`,
          visibility: createMastermindTimelineVisibility(),
          compatibility: {
            fullLog: [`🔧 [incident] ${incident.incidentId}: 触发但无执行效果`],
          },
        });
      }
    } else {
      // 兼容旧测试/旧路径：未注册 active incident_resolve 规则时退回单处理器执行
      const ruleCtx = {
        G,
        timing: 'incident_resolve',
        incident: { day: incident.day, incidentId: incident.incidentId, culpritId: incident.culpritId },
        selectedTargets: usedSelections,
      };
      proc!.execute(ruleCtx);
      appendMoveResolutionFact({
        G,
        sourceId: 'resolveIncident',
        flowId,
        phase: ctx.phase || undefined,
        phaseStep: 'resolve-incident-triggered-secret',
        outcome: 'incident_triggered',
        summary: `${incident.incidentId}: 触发`,
        visibility: createMastermindTimelineVisibility(),
        compatibility: {
          fullLog: [`🔧 [incident] ${incident.incidentId}: 触发`],
        },
      });
    }
    appendProjectedTimelineFact(G, {
      type: 'incident_resolved',
      flowId,
      causedByFactIds: getLatestFactIdForFlow(G, flowId) ? [getLatestFactIdForFlow(G, flowId)!] : [],
      source: {
        system: 'move',
        id: 'resolveIncident',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId: incident.culpritId,
      },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'incident_resolved',
        outcome: 'incident_triggered',
        summary: '⚡ 事件发生了！',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: ['⚡ 事件发生了！'],
          eventLogs: buildIncidentAnnouncementEventLogs(G, incident, true, usedSelections),
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-incident-triggered',
      },
    });

    // 模组事件后钩子（如 WM 廷达罗斯之嗅消费）
    runModuleLifecycle(G, 'post_incident_resolve', {
      payload: { incidentId: incident.incidentId, culpritId: incident.culpritId },
    });
  } else {
    const publicFact = appendProjectedTimelineFact(G, {
      type: 'incident_resolved',
      flowId,
      causedByFactIds: getLatestFactIdForFlow(G, flowId) ? [getLatestFactIdForFlow(G, flowId)!] : [],
      source: {
        system: 'move',
        id: 'resolveIncident',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId: incident.culpritId,
      },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'incident_resolved',
        outcome: 'incident_not_triggered',
        summary: toPublicIncidentFailureMessage(triggerStatus.reason),
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: [toPublicIncidentFailureMessage(triggerStatus.reason)],
          eventLogs: buildIncidentAnnouncementEventLogs(
            G,
            incident,
            false,
            usedSelections,
            triggerStatus.reason,
          ),
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-incident-not-triggered',
      },
    });
    appendProjectedTimelineFact(G, {
      type: 'incident_resolved',
      flowId,
      causedByFactIds: [publicFact.factId],
      source: {
        system: 'move',
        id: 'resolveIncident',
        phase: ctx.phase || undefined,
      },
      actor: {
        role: 'mastermind',
        seatId: '0',
        characterId: incident.culpritId,
      },
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'incident_resolved',
        outcome: 'incident_not_triggered_secret',
        summary: triggerStatus.reason,
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: [`⏭️ [incident] ${incident.incidentId}: ${triggerStatus.reason}`],
        }),
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'resolve-incident-not-triggered-secret',
      },
    });
  }

  // 从队列移除
  removePendingInteractionBySource(G, 'incident_resolution', incident.id);

  // 检查败北
  if (G.v1.loopLost || G.v1.protagonistKilled) {
    clearPendingInteractions(G);
    events.setPhase('loop_end_check');
    return;
  }

  // 队列为空后停留在当前阶段，等待显式 NEXT
  if (!hasPendingIncidentResolutionInteractions(G)) {
    clearPendingInteractions(G);
    return;
  }
};

// ── confirmIncidentsComplete: 确认事件处理完毕 ───────────────────────────────

const confirmIncidentsComplete: Move<TragedyGameState> = (
  { G, ctx, events, playerID },
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'incidents') return INVALID_MOVE;
  if (hasPendingButterflyChoiceInteraction(G)) return INVALID_MOVE;
  if (hasPendingIncidentResolutionInteractions(G)) return INVALID_MOVE;

  removePendingInteractionBySource(G, 'incident_resolution');
  events.endPhase();
};

// ── chooseButterflyToken: 蝴蝶效应三选一 ────────────────────────────────────

const chooseButterflyToken: Move<TragedyGameState> = (
  { G, ctx, playerID },
  tokenType: 'goodwill' | 'paranoia' | 'intrigue',
) => {
  if (playerID !== '0') return INVALID_MOVE;
  const pending = getPendingButterflyChoiceInteraction(G);
  if (!pending) return INVALID_MOVE;
  // 蛀蝶效应可在任何阶段触发（例如 card_resolve 中），不限定 phase

  if (!pending.allowedTokens.includes(tokenType)) return INVALID_MOVE;
  const flowId = `butterfly:${pending.targetKind}:${pending.targetId}`;

  if (pending.targetKind === 'location') {
    const location = G.v1.locations[pending.targetId];
    if (!location) return INVALID_MOVE;
    addToken(location, tokenType, 1);
  } else {
    const char = G.v1.characters[pending.targetId];
    if (!char) return INVALID_MOVE;
    addToken(char, tokenType, 1);
  }

  const publicFact = appendProjectedTimelineFact(G, {
    type: 'state_change',
    flowId,
    source: {
      system: 'move',
      id: 'chooseButterflyToken',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'butterfly_token_selected',
      summary: '🦋 蝴蝶效应：某角色身上发生了变化',
      changes: [{
        targetType: pending.targetKind === 'location' ? 'location' : 'character',
        targetId: pending.targetId,
        field: `tokens.${tokenType}`,
        delta: 1,
      }],
      metadata: buildTimelineCompatibilityMetadata({
        publicLog: ['🦋 蝴蝶效应：某角色身上发生了变化'],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'choose-butterfly-token',
    },
  });
  appendProjectedTimelineFact(G, {
    type: 'state_change',
    flowId,
    causedByFactIds: [publicFact.factId],
    source: {
      system: 'move',
      id: 'chooseButterflyToken',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
    },
    visibility: createMastermindTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'butterfly_token_selected_secret',
      summary: `${pending.targetKind}:${pending.targetId} +1 ${tokenType}`,
      changes: [],
      metadata: buildTimelineCompatibilityMetadata({
        fullLog: [`🦋 蝴蝶效应：${pending.targetKind}:${pending.targetId} +1 ${tokenType}`],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'choose-butterfly-token-secret',
    },
  });
  removePendingInteractionBySource(G, 'butterfly_choice', pending.sourceId);

  if (ctx.phase === 'incidents' && !hasPendingIncidentResolutionInteractions(G)) {
    clearPendingInteractions(G);
  }
};

// ── confirmLoopResult: 剧作家确认轮回结果裁定 ───────────────────────────────

const confirmLoopResult: Move<TragedyGameState> = (
  { G, ctx, playerID },
  reasonId?: string,
  outcomeId?: string,
) => {
  if (playerID !== '0') return INVALID_MOVE;
  if (ctx.phase !== 'loop_end_check') return INVALID_MOVE;

  const pending = getPendingLoopResultResolutionInteraction(G);
  if (!pending) return INVALID_MOVE;

  const selectedReasonId = reasonId || pending.failureReasons[0]?.id;
  const selectedOutcomeId = outcomeId || pending.availableOutcomes[0]?.id;

  if (pending.failureReasons.length > 0 && !pending.failureReasons.some(reason => reason.id === selectedReasonId)) {
    return INVALID_MOVE;
  }
  if (pending.availableOutcomes.length > 0 && !pending.availableOutcomes.some(outcome => outcome.id === selectedOutcomeId)) {
    return INVALID_MOVE;
  }

  const supportsFinalGuess = !!getTragedySetById(G.scriptOpen?.tragedySetId || '')?.supportsFinalGuess;
  const resolvedLoopNumber = G.loopIndex;
  const canRunAfterProgression = G.loopIndex < G.maxLoops;
  const selectedReason = pending.failureReasons.find(reason => reason.id === selectedReasonId);
  const selectedOutcome = pending.availableOutcomes.find(outcome => outcome.id === selectedOutcomeId);
  const afterLossDeclaredEffectIds = pending.effectOptions
    .filter(effect => effect.stage !== 'after_progression')
    .map(effect => effect.id);
  const afterProgressionEffectIds = pending.effectOptions
    .filter(effect => effect.stage === 'after_progression')
    .map(effect => effect.id);
  const flowId = `loop-result:${resolvedLoopNumber}`;

  runModuleLifecycle(G, 'loop_end_check', {
    payload: { stage: 'after_loss_declared', supportsFinalGuess },
  });
  const appliedAfterLossEffects = applyModuleLoopResultEffects(G, afterLossDeclaredEffectIds, {
    currentLoopNumber: resolvedLoopNumber,
    supportsFinalGuess,
  });

  if (canRunAfterProgression) {
    runModuleLifecycle(G, 'loop_end_check', {
      payload: { stage: 'after_progression', supportsFinalGuess },
    });
  }
  const appliedAfterProgressionEffects = canRunAfterProgression
    ? applyModuleLoopResultEffects(G, afterProgressionEffectIds, {
        currentLoopNumber: resolvedLoopNumber,
        supportsFinalGuess,
      })
    : [];
  const appliedEffects = pending.effectOptions.filter(effect =>
    appliedAfterLossEffects.includes(effect.id) || appliedAfterProgressionEffects.includes(effect.id),
  );

  if (selectedOutcomeId === 'match_end' && !G.v1.winner) {
    G.v1.winner = 'mastermind';
    appendMoveResolutionFact({
      G,
      sourceId: 'confirmLoopResult',
      flowId,
      phase: ctx.phase || undefined,
      phaseStep: 'confirm-loop-result-match-end',
      outcome: 'loop_result_match_end',
      summary: '所有轮回已耗尽 — 剧作家获胜。',
      visibility: createPublicTimelineVisibility(),
      compatibility: {
        publicLog: ['所有轮回已耗尽 — 剧作家获胜。'],
      },
    });
  } else if (selectedOutcomeId === 'final_guess') {
    appendMoveResolutionFact({
      G,
      sourceId: 'confirmLoopResult',
      flowId,
      phase: ctx.phase || undefined,
      phaseStep: 'confirm-loop-result-final-guess',
      outcome: 'loop_result_final_guess',
      summary: '所有轮回已结束 — 进入最终决战。',
      visibility: createPublicTimelineVisibility(),
      compatibility: {
        publicLog: ['所有轮回已结束 — 进入最终决战。'],
      },
    });
  } else if (selectedOutcomeId === 'next_loop') {
    appendMoveResolutionFact({
      G,
      sourceId: 'confirmLoopResult',
      flowId,
      phase: ctx.phase || undefined,
      phaseStep: 'confirm-loop-result-next-loop',
      outcome: 'loop_result_next_loop',
      summary: `─── 第 ${resolvedLoopNumber} 轮回结束 ───`,
      visibility: createPublicTimelineVisibility(),
      compatibility: {
        publicLog: [`─── 第 ${resolvedLoopNumber} 轮回结束 ───`],
      },
    });
  }

  if (
    selectedOutcomeId === 'next_loop'
    || selectedOutcomeId === 'final_guess'
    || selectedOutcomeId === 'match_end'
  ) {
    pushResultAnnouncement(G, buildLoopOutcomeAnnouncement({
      G,
      outcomeId: selectedOutcomeId,
      resolvedLoopNumber,
    }), {
      flowId,
      source: {
        system: 'move',
        id: 'confirmLoopResult',
        phase: ctx.phase || undefined,
      },
      gameTime: {
        phase: ctx.phase || null,
        phaseStep: 'confirm-loop-result-announcement',
      },
    });
  }

  const publicFact = appendProjectedTimelineFact(G, {
    type: 'state_change',
    flowId,
    source: {
      system: 'move',
      id: 'confirmLoopResult',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
    },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'loop_result_confirmed',
      summary: '🧾 剧作家已确认轮回结果',
      changes: [],
      metadata: buildTimelineCompatibilityMetadata({
        publicLog: ['🧾 剧作家已确认轮回结果'],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'confirm-loop-result',
    },
  });
  appendProjectedTimelineFact(G, {
    type: 'state_change',
    flowId,
    causedByFactIds: [publicFact.factId],
    source: {
      system: 'move',
      id: 'confirmLoopResult',
      phase: ctx.phase || undefined,
    },
    actor: {
      role: 'mastermind',
      seatId: '0',
    },
    visibility: createMastermindTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'loop_result_confirmed_secret',
      summary: pending.resultLabel,
      changes: [],
      metadata: buildTimelineCompatibilityMetadata({
        fullLog: [
          `🧾 [loop_result] ${pending.resultLabel}`
          + `${selectedReason ? ` | reason=${selectedReason.label}` : ''}`
          + `${selectedOutcome ? ` | outcome=${selectedOutcome.label}` : ''}`
          + `${appliedEffects.length > 0 ? ` | effects=${appliedEffects.map(effect => effect.label).join(',')}` : ''}`,
        ],
      }),
    },
    gameTime: {
      phase: ctx.phase || null,
      phaseStep: 'confirm-loop-result-secret',
    },
  });

  removePendingInteractionBySource(G, 'loop_result_resolution', pending.sourceId);
};

// ── Export ────────────────────────────────────────────────────────────────────

export const moves = {
  advancePhase,
  declareLoopLoss,
  selectScript,
  startGame,
  registerLobbySeat,
  setPlayerCount,
  toggleReady,
  playCard,
  recallCard,
  modifyToken,
  modifyLocationToken,
  modifyExCard,
  moveCharacter,
  revealAllCards,
  killCharacter,
  updateSetting,
  setCharacterTerritory,
  createMastermindSnapshot,
  restoreMastermindSnapshot,
  setLoopAndDay,
  setLeader,
  setExState,
  setHiddenRole,
  setIncidentCulprit,
  jumpToPhase,
  submitGuess: { move: submitGuess, client: false },
  skipToFinalGuess,
  submitDetectiveGuess,
  confirmAbility,
  skipAbility,
  finishAbilities,
  declareAbility,
  resolveAbility,
  skipAllAbilities,
  resolveIncident,
  confirmIncidentsComplete,
  chooseButterflyToken,
  confirmLoopResult,
};
