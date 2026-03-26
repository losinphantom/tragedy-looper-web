/**
 * Phase Pipeline — boardgame.io phase definitions.
 *
 * ## Flow
 * script_select → lobby_wait → loop_setup → day_start →
 *   mastermind_plan → protagonist_plan → resolve_cards →
 *   mastermind_abilities → goodwill_window → incidents →
 *   day_end → (next day or loop_end_check) → loop_setup / match_end
 *
 * ## Design principles
 * 1. phases.ts is the SOLE state-transition pipeline. All G mutations
 *    for day/loop lifecycle happen here in onBegin/onEnd hooks.
 * 2. advancePhase move is intentionally thin — only permission checks
 *    + events.endPhase(). It never mutates G for lifecycle concerns.
 * 3. Transient (auto) phases use onBegin + events.endPhase() instead
 *    of the endIf: () => true hack (which causes spurious turn resets).
 * 4. activePlayers are set correctly per phase:
 *    - mastermind_plan: only seat '0'
 *    - protagonist_plan: only seats '1','2','3'
 *    - others: all seats active
 *
 * ## Multiplayer safety
 * onBegin/onEnd hooks run ONLY on the server in multiplayer.
 * Moves run on both client (optimistic) and server (authoritative).
 */

import type { PhaseConfig } from 'boardgame.io';
import { Stage } from 'boardgame.io/core';
import type { TragedyGameState } from './game';
import { buildMastermindDeck, buildProtagonistDeck } from './data/cardService';
import { getProtagonistSeats, getDeckCountForSeat } from './playerConfig';
import { CHARACTERS, getTragedySetById } from '@tragedy/domain';
import { addToken, clearAllTokens, createEmptyTokenBag } from './utils/tokenHelpers';
import { getCharacterLabel, getLocalizedTerm } from './data/translationService';
import { autoResolve } from './engine/autoResolve';
import { manualPrompt } from './engine/manualFallback';
import { resolveTimingWindow } from './ruleEngine';
import { runModuleLifecycle } from './rules/moduleLifecycle';
import { resetExForNewLoop } from './rules/incidentEx';
import { syncMidnightZoneExKeyPersons } from './rules/mzExKeyPersons';
import {
  clearPendingInteractions,
  setTimeSpiralDiscussionInteraction,
} from './runtime/interactions';
import { buildGameResultAnnouncement, pushResultAnnouncement } from './resultAnnouncements';
import {
  beginDayEndPhase,
  beginMastermindAbilitiesPhase,
  runEndOfLastDayTiming,
} from './phaseAbilityHandlers';
import {
  beginGoodwillWindowPhase,
  beginIncidentsPhase,
  beginLoopEndCheckPhase,
} from './phaseCheckpointHandlers';
import { beginResolveCardsPhase } from './phaseResolveCardsHandler';

/** 双模式分派：根据 settings.autoResolve 选择自动结算或手动提示 */
function dispatchTiming(G: TragedyGameState, timing: string): void {
  if (G.v1.settings.autoResolve) {
    autoResolve(G, timing);
  } else {
    manualPrompt(G, timing);
  }
}

// ── Turn configs ─────────────────────────────────────────────────────────────

/** All 4 seats can act (for lobby, utility phases) */
const allPlayersActive = {
  activePlayers: { all: Stage.NULL },
};

// 删除了未使用的 mastermindOnly 和 protagonistsOnly 变量

// ── Helper: reset hands for all 4 seats ──────────────────────────────────────

function resetAllHands(G: TragedyGameState) {
  G.seatHands['0'] = buildMastermindDeck();
  const seats = getProtagonistSeats(G);
  // 清空所有主角座位手牌
  for (const s of ['1', '2', '3']) {
    G.seatHands[s] = [];
  }
  // 按 playerCount 分配牌组
  for (const s of seats) {
    const deckCount = getDeckCountForSeat(G, s);
    for (let i = 0; i < deckCount; i++) {
      G.seatHands[s] = G.seatHands[s].concat(buildProtagonistDeck());
    }
  }
  G.board.usedOncePerLoopCards = [];
}

// ── Helper: reset characters for a new loop ──────────────────────────────────

function resetCharactersForNewLoop(G: TragedyGameState) {
  for (const [charId, char] of Object.entries(G.v1.characters)) {
    clearAllTokens(char);
    char.alive = true;
    // Reset to starting location
    const charData = CHARACTERS[charId];
    if (charData?.startingLocations?.[0]) {
      char.locationId = charData.startingLocations[0] as string;
    }
  }
  for (const loc of Object.values(G.v1.locations)) {
    clearAllTokens(loc);
  }
  // Reset loop-scoped tracking
    G.v1.loopState = {
      revealedRoles: {},
      revealedRules: [],
      revealedIncidentCulprits: {},
      triggeredIncidents: [],
      incidentHistory: [],
      abilityUsage: {},
      butterflyEffectTriggered: false,
      lastLoopGoodwillChars: G.v1.loopState?.lastLoopGoodwillChars ?? [],
      lastLoopDeadCharacters: G.v1.loopState?.lastLoopDeadCharacters ?? [],
      lastWillHopeNextLoop: G.v1.loopState?.lastWillHopeNextLoop ?? false,
      // LL 标志计数跨轮回保留（背叛者胜利条件累计）
      deathFlagCount: G.v1.loopState?.deathFlagCount ?? 0,
      communicationFlagCount: G.v1.loopState?.communicationFlagCount ?? 0,
      // 十周年扩展：跨轮回记录
      deadCharactersAtLeastOnce: G.v1.loopState?.deadCharactersAtLeastOnce ?? [],
      communicatedCharacters: G.v1.loopState?.communicatedCharacters ?? [],
    };
  G.v1.movementRestrictions = {
    blockedLocations: {},
    immobileCharacters: {},
  };
}

// ── Phase definitions ────────────────────────────────────────────────────────

export const phases: Record<string, PhaseConfig<TragedyGameState>> = {

  // ── Script Selection — Mastermind picks a script ───────────────────────────
  script_select: {
    start: true,
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      G.publicLog.push('等待剧作家选择剧本…');
    },
    next: 'lobby_wait',
  },

  // ── Lobby Wait — all players ready up before game starts ──────────────────
  lobby_wait: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      G.v1.readyPlayers = {};
      G.v1.joinedProtagonists = {};
      G.v1.readyToAdvance = false;
      G.publicLog.push('等待所有玩家准备…');
    },
    // Phase ends when startGame move calls events.endPhase()
    next: 'time_spiral',
  },

  // ── Loop Setup — initialize/reset for a new loop (TRANSIENT) ──────────────
  loop_setup: {
    turn: allPlayersActive,
    onBegin: ({ G, events }) => {
      if (G.loopIndex > 0) {
        resetCharactersForNewLoop(G);
      }
      // ── appearsFromLoop: 按轮回过滤角色登场 ──
      if (G.v1.castDefinitions?.length) {
        for (const def of G.v1.castDefinitions) {
          const threshold = def.appearsFromLoop ?? 1;
          const charId = def.characterId;
          if (G.loopIndex + 1 >= threshold) {
            // 应登场：如果不在 characters 中则添加
            if (!G.v1.characters[charId]) {
              const charData = CHARACTERS[charId];
              const startLoc = (charData?.startingLocations?.[0] as string) || 'city';
              G.v1.characters[charId] = {
                locationId: startLoc,
                alive: true,
                tokens: createEmptyTokenBag(),
                exCardCount: 0,
              };
              G.publicLog.push(`👤 ${getCharacterLabel(charId)} 登场（第 ${G.loopIndex + 1} 轮回起）`);
            }
          } else {
            // 不应登场：从 characters 中移除
            if (G.v1.characters[charId]) {
              delete G.v1.characters[charId];
            }
          }
        }
      }
      resetExForNewLoop(G);
      syncMidnightZoneExKeyPersons(G);
      runModuleLifecycle(G, 'loop_setup');
      if (G.v1.loopState.lastWillHopeNextLoop) {
        addToken(G.v1.protagonists, 'hope', 1);
        G.v1.loopState.lastWillHopeNextLoop = false;
        G.publicLog.push('🕊️ 遗言：主人公在本轮开始时获得 1 希望');
      }
      resetAllHands(G);
      G.v1.playedCards = [];
      G.v1.loopLost = false;
      G.v1.readyToAdvance = false;
      G.day = 0;
      G.publicLog.push(`══ 第 ${G.loopIndex + 1} 轮回 / 共 ${G.maxLoops} 轮 ══`);
      // dispatch loop_start timing（因果线等规则）
      dispatchTiming(G, 'loop_start');
      syncMidnightZoneExKeyPersons(G);
      // Transient: auto-advance
      events.endPhase();
    },
    next: 'day_start',
  },

  // ── Day Start — increment day, trigger morning abilities ──────────────────
  // 沙盒模式：剧作家手动推进（处理【早上】时序能力）
  // 结算模式：自动跳过
  day_start: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      G.day += 1;
      G.v1.readyPlayers = {};
      for (const [locationId, untilDay] of Object.entries(G.v1.movementRestrictions.blockedLocations || {})) {
        if (untilDay < G.day) {
          delete G.v1.movementRestrictions.blockedLocations[locationId];
        }
      }
      for (const [characterId, blockedDay] of Object.entries(G.v1.movementRestrictions.immobileCharacters || {})) {
        if (blockedDay < G.day) {
          delete G.v1.movementRestrictions.immobileCharacters[characterId];
        }
      }
      // Reset daily ability usage
      for (const key of Object.keys(G.v1.loopState.abilityUsage)) {
        if (G.v1.loopState.abilityUsage[key]) {
          G.v1.loopState.abilityUsage[key].usedToday = false;
        }
      }
      G.publicLog.push(`══ 第 ${G.day} 天 ══`);
      // 清理每日临时状态
      G.v1.cardResolveImmunities = [];
      dispatchTiming(G, 'day_start');
      runModuleLifecycle(G, 'day_start');
      // 始终等待剧作家手动推进（day_start 涉及秘密能力结算）
    },
    next: 'mastermind_plan',
  },

  // ── Mastermind Plan — only seat '0' can play cards ────────────────────────
  mastermind_plan: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      G.v1.readyPlayers = {};
    },
    next: ({ G }) => G.v1.loopLost ? 'loop_end_check' : 'protagonist_plan',
  },

  // ── Protagonist Plan — parallel (default) or sequential (leaderMode) ────────
  protagonist_plan: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      G.v1.readyPlayers = {};
      if (G.v1.settings.leaderMode) {
        // 串行模式：记录出牌顺序，从队长开始
        const leader = G.v1.leader || '1';
        const seats = getProtagonistSeats(G);
        const startIdx = seats.indexOf(leader);
        G.v1.leaderTurnOrder = seats.slice(startIdx).concat(seats.slice(0, startIdx));
        G.v1.leaderTurnIndex = 0;
        G.publicLog.push(`🎯 队长模式：出牌顺序 ${G.v1.leaderTurnOrder.join(' → ')}`);
      }
    },
    next: ({ G }) => G.v1.loopLost ? 'loop_end_check' : 'resolve_cards',
  },

  // ── Resolve Cards — flip cards per-target, apply effects with animation frames ──
  resolve_cards: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      beginResolveCardsPhase(G);
    },
    next: ({ G }) => G.v1.loopLost ? 'loop_end_check' : 'mastermind_abilities',
  },

  // ── Mastermind Abilities (步骤 5) ────────────────────────────────────────
  // 剧作家只宣布结果，不说明触发角色（规则书 p7）
  // 交互模式：强制能力+可选能力都需剧作家手动确认（信息隐藏原则）
  mastermind_abilities: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      beginMastermindAbilitiesPhase(G);
    },
    next: ({ G }) => G.v1.loopLost ? 'loop_end_check' : 'goodwill_window',
  },

  // ── Goodwill Window (步骤 6) ──────────────────────────────────────────────
  // 队长使用友好能力，剧作家根据身份特性决定拒绝/允许（规则书 p8）
  // 交互模式：队长声明 → 剧作家裁定的对话流（纯 move + G 状态机）
  goodwill_window: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      beginGoodwillWindowPhase(G);
    },
    next: ({ G }) => G.v1.loopLost ? 'loop_end_check' : 'incidents',
  },

  // ── Incidents ─────────────────────────────────────────────────────────────
  // 交互模式：剧作家手动裁定每个事件（触发/不触发 + 目标选择）
  incidents: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      beginIncidentsPhase(G);
    },
    next: ({ G }) => G.v1.loopLost ? 'loop_end_check' : 'day_end',
  },

  // ── Day End — leader rotation, night abilities ────────────────────────────
  // 沙盒模式：剧作家手动推进（处理【夜晚】时序能力）
  // 结算模式：自动跳过
  day_end: {
    turn: allPlayersActive,
    onBegin: ({ G, events }) => {
      beginDayEndPhase(G, events);
    },
    onEnd: ({ G, events }) => {
      if (G.v1.loopLost || G.v1.protagonistKilled) {
        return;
      }

      if (G.day >= G.daysPerLoop) {
        runEndOfLastDayTiming(G);
      }
      runModuleLifecycle(G, 'day_end', { events });

      if (G.v1.loopLost || G.v1.protagonistKilled) {
        G.publicLog.push('💀 回合结束阶段触发败北，轮回即将结束');
        return;
      }

      G.publicLog.push(`── 第 ${G.day} 天结束 ──`);
    },
    next: ({ G }) => {
      if (G.daysPerLoop > 0 && G.day >= G.daysPerLoop) {
        return 'loop_end_check';
      }
      return 'day_start';
    },
  },

  // ── Loop End Check — evaluate win/loss conditions ──────────────────────────
  loop_end_check: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      beginLoopEndCheckPhase(G);
    },
    next: ({ G }) => {
      const supportsFinalGuess = !!getTragedySetById(G.scriptOpen?.tragedySetId || '')?.supportsFinalGuess;
      if (G.v1.winner) {
        return 'match_end';
      }
      if (G.loopIndex >= G.maxLoops && G.maxLoops > 0 && supportsFinalGuess) {
        return 'final_guess';
      }
      if (G.loopIndex >= G.maxLoops && G.maxLoops > 0) {
        return 'match_end';
      }
      return 'time_spiral';
    },
  },

  // ── Time Spiral — 时间裂隙（轮回间讨论） ─────────────────────────────────
  //
  // 规则书：轮回结束后、下一轮回开始前的讨论窗口。
  // • 剧作家宣布本轮回结果（胜/败）
  // • 公开本轮回中被揭示的身份信息（如亲友死亡）
  // • 主角团讨论推理、制定下轮策略
  // • 等待剧作家手动 advancePhase 推进到下一轮回
  //
  time_spiral: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      const isInitialPrep = G.loopIndex === 0 && G.day === 0;
      G.publicLog.push(isInitialPrep
        ? '⏳ 开局准备窗口 — 主角讨论时间'
        : '⏳ 时间裂隙 — 主角讨论时间');

      // 公开本轮回中被揭示的身份
      const revealed = G.v1.loopState?.revealedRoles ?? {};
      const entries = Object.entries(revealed);
      if (entries.length > 0) {
        for (const [charId, roleId] of entries) {
          G.publicLog.push(`🔍 已揭示：${getCharacterLabel(charId)} 的身份为 ${getLocalizedTerm(roleId)}`);
        }
      }

      // 无论 autoResolve 与否，时间裂隙都需要剧作家手动推进
      // （信息隐藏：确保主角有充分讨论时间，不暴露阶段性信息）
      if (!G.v1.settings.autoResolve) {
        setTimeSpiralDiscussionInteraction(G);
      }
    },
    // 等待剧作家手动推进
    next: 'loop_setup',
  },

  // ── Final Guess — 最终猜测阶段 ───────────────────────────────────────
  //
  // 规则书第 10 页：
  // 1. 重置游戏区域（复活、归位、清指示物）
  // 2. 主角逐一猜测每个角色的身份（无身份猜“路人”）
  // 3. 每猜一个即时告知对错，错一个立即输
  // 4. 全部猜对 → 主角胜
  //
  final_guess: {
    turn: allPlayersActive,
    onBegin: ({ G, events }) => {
      clearPendingInteractions(G);
      // 1. 重置游戏区域
      for (const [id, char] of Object.entries(G.v1.characters)) {
        char.alive = true;
        clearAllTokens(char);
        const domainChar = CHARACTERS[id];
        if (domainChar) {
          char.locationId = domainChar.startingLocations[0] ?? char.locationId;
        }
      }
      for (const loc of Object.values(G.v1.locations)) {
        clearAllTokens(loc);
      }
      // 2. 初始化猜测记录
      G.v1.finalGuess = {
        targets: Object.keys(G.v1.characters).map(charId => {
          const castDef = (G.v1.castDefinitions || []).find(def => def.characterId === charId);
          const variableAssignment = G.v1.ahrVariableRoles?.[charId];
          const frontRoleId = castDef?.roleId || 'person';
          const backRoleId = castDef?.backRoleId || variableAssignment?.backRoleId || 'person';
          return {
            charId,
            requiresDualGuess: (!!castDef?.backRoleId || !!variableAssignment) && backRoleId !== frontRoleId,
          };
        }),
        guesses: [],
        completed: false,
      };
      G.publicLog.push('🔮 最终猜测阶段 — 主角逐一猜测每个角色的身份');
      G.publicLog.push(`ℹ️ 共 ${Object.keys(G.v1.characters).length} 个角色需要猜测`);
      const resolution = resolveTimingWindow(G, 'final_guess');
      if (resolution.executed.length > 0) {
        G.publicLog.push(`⚙️ [最终决战] ${resolution.executed.length} 条规则已执行`);
      }
      if (resolution.pendingInputs.length > 0) {
        G.fullLog.push(`⏳ [最终决战] ${resolution.pendingInputs.length} 条规则需要剧作家输入`);
      }
      if (G.v1.winner) {
        G.v1.finalGuess.completed = true;
        events.setPhase('match_end');
      }
    },
    // 等待 submitGuess move 逐一提交
  },

  // ── Match End ─────────────────────────────────────────────────────────
  match_end: {
    turn: allPlayersActive,
    onBegin: ({ G }) => {
      const w = G.v1.winner;
      if (w === 'protagonist') {
        G.publicLog.push('═══ 🏆 主角团获胜！═══');
      } else if (w === 'mastermind') {
        G.publicLog.push('═══ 🎭 剧作家获胜！═══');
      } else if (w === 'betrayer_A') {
        G.publicLog.push('═══ 🗡️ 背叛者 A 获胜！═══');
      } else if (w === 'betrayer_B') {
        G.publicLog.push('═══ 🗡️ 背叛者 B 获胜！═══');
      } else if (w === 'betrayer_C') {
        G.publicLog.push('═══ 🗡️ 背叛者 C 获胜！═══');
      }
      const resultAnnouncement = buildGameResultAnnouncement(G);
      if (resultAnnouncement) {
        pushResultAnnouncement(G, resultAnnouncement);
      }
    },
  },
};
