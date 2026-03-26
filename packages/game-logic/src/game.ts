/**
 * TragedyLooper — boardgame.io Game definition.
 *
 * This is the single source of truth shared by both the frontend client
 * and the backend server. Both sides must import from @tragedy/game-logic.
 *
 * ## State Design (boardgame.io convention)
 * - G holds all authoritative, JSON-serializable game data.
 * - ctx is framework-managed (turn, phase, playOrder) — never mutate directly.
 * - playerView strips secrets so Protagonists (seats 1-3) never see
 *   hidden roles, incident culprits, or Mastermind's face-down cards
 *   outside the public action-card resolution phase.
 */

import type { MatchState } from '@tragedy/domain';
import { createInitialMatchState } from '@tragedy/domain';
import type { Game } from 'boardgame.io';
import { moves } from './moves';
import { phases } from './phases';
import type { PlayedCard } from './action-cards/cardResolver';
import type { TimelineState } from './timeline/factSchema';
import { createInitialTimelineState } from './timeline/factWriter';
import { projectTimelineForViewer } from './timeline/viewerFactProjection';
import type { TokenBag } from './utils/tokenHelpers';

// ── Character runtime state ──────────────────────────────────────────────────

export interface CharacterState {
  locationId: string;
  alive: boolean;
  tokens: TokenBag;
  exCardCount?: number;
  territoryLocationId?: string;
}

// ── Event tracking ──────────────────────────────────────────────────────────

export interface IncidentRecord {
  loop: number;
  day: number;
  incidentId: string;
  culpritId: string;
  wasImmune: boolean;
}

// ── Loop-scoped tracking ─────────────────────────────────────────────────────

export interface LoopState {
  /** Roles revealed to Protagonists during this loop */
  revealedRoles: Record<string, string>;  // characterId → roleId
  /** Publicly revealed rule IDs that should remain visible after notification */
  revealedRules: string[];
  /** Publicly revealed incident culprits keyed by `${day}_${incidentId}` */
  revealedIncidentCulprits: Record<string, string>;
  /** Incidents that already fired this loop */
  triggeredIncidents: number[];            // day[]
  /** Detailed log of incidents evaluated this loop (with culprits & immunity) */
  incidentHistory: IncidentRecord[];
  /** Per-ability usage counters */
  abilityUsage: Record<string, {
    usedToday: boolean;
    usedThisLoop: boolean;
  }>;
  /** Whether butterfly effect incident fired this loop (for Change of Future plot) */
  butterflyEffectTriggered: boolean;
  /** Character IDs that had goodwill at end of previous loop (for Threads of Fate plot) */
  lastLoopGoodwillChars: string[];
  /** Character IDs that were dead at end of previous loop (for Bonds of Karma / Dice of Gods) */
  lastLoopDeadCharacters: string[];
  /** Current AHR last_will grants protagonists hope at the next loop setup */
  lastWillHopeNextLoop: boolean;
  /** LL: 已死亡标志累计（跨轮回保留，背叛者A胜利条件 ≥5） */
  deathFlagCount: number;
  /** LL: 已沟通标志累计（跨轮回保留，背叛者B胜利条件 ≥6） */
  communicationFlagCount: number;
  /** 十周年: 跨轮回至少死亡过一次的角色 ID（去重） */
  deadCharactersAtLeastOnce: string[];
  /** 十周年: 跨轮回使用/拒绝过友好能力的角色 ID（去重） */
  communicatedCharacters: string[];
}

export interface TargetSlot {
  slotId: string;
  label: string;
  kind: 'character' | 'location' | 'character_or_location' | 'token_type' | 'choice';
  eligibleCharacterIds?: string[];
  eligibleLocationIds?: string[];
  eligibleTokenTypes?: Array<'paranoia' | 'intrigue' | 'goodwill'>;
  eligibleChoices?: Array<{ id: string; label: string }>;
}

export interface PendingAbility {
  id: string;
  ruleId: string;
  characterId: string;  // 剧作家可见，主角不可见
  abilityId?: string;
  timing?: 'mastermind_ability' | 'day_end';
  phase?: 'mastermind_abilities' | 'day_end';
  mandatory: boolean;
  description: string;  // 公开描述
  targetSlots: TargetSlot[];
}

export type GoodwillInteractionPhase = 'idle' | 'leader_choosing' | 'mastermind_resolving' | 'done';

export interface GoodwillEligibleAbility {
  characterId: string;
  abilityId: string;
  label: string;
  used: boolean;
  targetSlots?: TargetSlot[];
}

export interface GoodwillDeclaration {
  characterId: string;
  abilityId: string;
  selectedTargets?: Record<string, string>;
}

export interface GoodwillInteractionState {
  phase: GoodwillInteractionPhase;
  eligibleAbilities: GoodwillEligibleAbility[];
  currentDeclaration: GoodwillDeclaration | null;
  observerCharacterId?: string;
  observerAbilityId?: string;
  observerSelectedTargets?: Record<string, string>;
}

export interface FinalGuessTarget {
  charId: string;
  requiresDualGuess: boolean;
}

export type FinalGuessRecord =
  | { charId: string; guessedRole: string; correct: boolean }
  | { charId: string; guessedFrontRoleId: string; guessedBackRoleId: string; correct: boolean };

export interface FinalGuessState {
  targets?: FinalGuessTarget[];
  guesses: FinalGuessRecord[];
  completed: boolean;
}

export interface PendingIncident {
  id: string;
  day: number;
  incidentId: string;
  culpritId: string;
  targetSlots: TargetSlot[];
}

interface RuntimeInteractionBase<
  Kind extends
    | 'time_spiral_discussion'
    | 'mastermind_ability'
    | 'goodwill'
    | 'incident_resolution'
    | 'butterfly_choice'
    | 'loop_result_resolution',
  Phase extends string = string,
> {
  id: string;
  kind: Kind;
  actorSeat: string;
  phase: Phase;
  blocking: boolean;
  sourceId?: string;
  description: string;
}

export type RuntimeInteraction =
  | RuntimeInteractionBase<'time_spiral_discussion', 'time_spiral'>
  | (RuntimeInteractionBase<'mastermind_ability', 'mastermind_abilities' | 'day_end'> & {
      ruleId: string;
      characterId: string;
      mandatory: boolean;
      targetSlots: TargetSlot[];
    })
  | (RuntimeInteractionBase<'goodwill', GoodwillInteractionPhase> & {
      eligibleAbilities: GoodwillEligibleAbility[];
      currentDeclaration: GoodwillDeclaration | null;
      observerCharacterId?: string;
      observerAbilityId?: string;
      observerSelectedTargets?: Record<string, string>;
    })
  | (RuntimeInteractionBase<'incident_resolution', 'incidents'> & {
      day: number;
      incidentId: string;
      culpritId: string;
      targetSlots: TargetSlot[];
    })
  | (RuntimeInteractionBase<'butterfly_choice'> & {
      targetId: string;
      targetKind: 'character' | 'location';
      allowedTokens: Array<'goodwill' | 'paranoia' | 'intrigue'>;
    })
  | (RuntimeInteractionBase<'loop_result_resolution', 'loop_end_check'> & {
      resultType: 'loop_failure' | 'loop_end';
      resultLabel: string;
      failureReasons: Array<{ id: string; label: string; detail?: string }>;
      effectOptions: Array<{
        id: string;
        label: string;
        detail?: string;
        stage?: 'after_loss_declared' | 'after_progression';
        outcomeOverride?: 'next_loop' | 'final_guess' | 'match_end';
      }>;
      availableOutcomes: Array<{ id: string; label: string; detail?: string }>;
    });

export interface MastermindConsoleSnapshot {
  label: string;
  capturedAt: string;
  phase: string | null;
  payload: unknown;
}

export interface MastermindConsoleState {
  lastSnapshot: MastermindConsoleSnapshot | null;
  nextSnapshotId: number;
}

// ── Main game state interface ────────────────────────────────────────────────

export interface TragedyGameState extends MatchState {
  v1: {
    characters: Record<string, CharacterState>;
    locations: Record<string, { tokens: TokenBag; exCardCount?: number }>;
    playedCards: PlayedCard[];

    /** Scheduled incidents — PUBLIC view (no culprit info) */
    scheduledIncidents: Array<{ day: number; incidentId: string }>;

    /** Which players have declared ready (indexed by seat '0'..'3') */
    readyPlayers: Record<string, boolean>;
    /** Server-owned lobby participation state for protagonist seats */
    joinedProtagonists: Record<string, boolean>;

    /** Flag set by advancePhase move, consumed by endIf to advance phases */
    readyToAdvance: boolean;
    /** 结构化动画事件日志数组，由前端消费并回放 */
    eventLogs: Array<{
      id: string;      // 唯一 ID (Math.random)
      type: 'stat_change' | 'move' | 'death' | 'incident' | 'card_flip' | 'phase_change' | 'ability_trigger' | 'result'
        | 'resolve_flip_all' | 'resolve_effect' | 'resolve_move' | 'resolve_dismiss_all';
      payload: any;
    }>;
    timeline: TimelineState;
    /** Flag set by declareLoopLoss move — triggers immediate loop end */
    loopLost: boolean;
    /** card_resolve 免疫列表：处理器在结算前设置，cardResolver 读取跳过对应禁止 */
    cardResolveImmunities: Array<{ characterId: string; immuneToForbid: string }>;

    // ── Auto-resolve engine state (Mastermind-only secrets) ────────────────
    /** Character → hidden role mapping (e.g. student_m → 'key_person') */
    hiddenRoles: Record<string, string>;
    /** Current AHR front/back variable-role assignments */
    ahrVariableRoles: Record<string, { frontRoleId: string; backRoleId: string }>;
    /** 妄想扩大病毒：记录被变为杀人狂之前的原始身份，用于不安<3时还原 */
    originalRoles?: Record<string, string>;
    /** 跨轮回身份公开记忆（亲友等规则会读取） */
    revealedRoleMemory: Record<string, string>;
    /** Day → culprit characterId mapping */
    incidentCulprits: Record<string, string>;
    /** Active plot IDs loaded from script */
    activePlots: string[];
    /** Active rule definitions loaded from plots (serializable, no global state) */
    activeRuleDefinitions: Array<{ ruleId: string; timing: string; mandatory: boolean; characterId?: string; incidentId?: string; source: string }>;
    /** Auto-increment counter for deterministic card IDs */
    nextCardId: number;
    /** Per-loop tracking */
    loopState: LoopState;
    /** Expansion Ex runtime state */
    ex: {
      enabled: boolean;
      gauge: number;
      changedThisLoop: boolean;
      lastLoopEndGauge: number;
    };
    /** Current AHR singularity tracks whether it has already occurred this game */
    ahrSingularityOccurred: boolean;
    /** Team-level hope / despair runtime for expansion rules */
    protagonists: {
      tokens: {
        paranoia: number;
        intrigue: number;
        goodwill: number;
        hope: number;
        despair: number;
        guard: number;
      };
    };
    mastermind: {
      tokens: {
        paranoia: number;
        intrigue: number;
        goodwill: number;
        hope: number;
        despair: number;
        guard: number;
      };
    };
    /** Original cast definitions from script (for appearsFromLoop filtering) */
    castDefinitions: Array<{ characterId: string; roleId: string | null; backRoleId?: string | null; appearsFromLoop?: number }>;

    /** Protagonist killed flag — set by death trigger, consumed by loop_end_check */
    protagonistKilled: boolean;

    /** Runtime settings */
    settings: {
      autoResolve: boolean;
      leaderMode: boolean;
      /** 单人模拟模式（lobby 阶段无主角 ready 时由 startGame 设置） */
      soloMode: boolean;
      /** 当前人数模式：2=1剧作+1主角, 3=1剧作+2主角, 4=1剧作+3主角 */
      playerCount: 2 | 3 | 4;
    };
    movementRestrictions: {
      blockedLocations: Record<string, number>;
      immobileCharacters: Record<string, number>;
    };
    /** 当前已选剧本 ID，用于模式门禁与 UI 提示 */
    currentScriptId: string | null;

    /** 剧作家能力交互队列（模块 A） */
    pendingAbilities: PendingAbility[];
    /** 当前能力处理阶段 */
    abilityPhase: 'idle' | 'mandatory' | 'optional' | 'done';

    /** 友好能力交互状态机（模块 B） */
    goodwillInteraction: GoodwillInteractionState;

    /** Current leader seat for protagonist team */
    leader: string;
    /** 队长模式串行出牌顺序（从 leader 开始） */
    leaderTurnOrder: string[];
    /** 队长模式当前出牌位置索引 */
    leaderTurnIndex: number;

    /** 事件交互队列（模块 C） */
    pendingIncidents: PendingIncident[];

    /** 统一交互兼容层：先镜像 legacy 交互队列，再逐步取代它们 */
    pendingInteractions: RuntimeInteraction[];
    activeInteractionId: string | null;

    /** 剧作家控制台运行态 */
    mastermindConsole: MastermindConsoleState;

    /** Final guess state — populated in final_guess phase */
    finalGuess?: FinalGuessState;
    /** Game winner — set after final guess or protagonist survival */
    winner?: 'mastermind' | 'protagonist' | 'betrayer_A' | 'betrayer_B' | 'betrayer_C';
    /** LL Ex牌分配（seatId → A/B/C）— 第1轮开始时随机分配 */
    exCardAssignment?: Record<string, 'A' | 'B' | 'C'>;
    /** LL 背叛者胜利条件（从剧本规则X提取） */
    betrayerVictoryConditions?: Record<string, { ruleId: string; description: string }>;
    /** LL 名侦探C的当事人猜测（incidentInstanceKey → charId） */
    detectiveGuesses?: Record<string, string>;
  };
}

function projectPendingIncidentsForView(
  interactions: TragedyGameState['v1']['pendingInteractions'],
): PendingIncident[] {
  return (interactions || [])
    .filter(
      (interaction): interaction is Extract<TragedyGameState['v1']['pendingInteractions'][number], { kind: 'incident_resolution' }> =>
        interaction.kind === 'incident_resolution',
    )
    .map(interaction => ({
      id: interaction.sourceId || interaction.id,
      day: interaction.day,
      incidentId: interaction.incidentId,
      culpritId: interaction.culpritId,
      targetSlots: interaction.targetSlots,
    }));
}

// ── Game definition ──────────────────────────────────────────────────────────

export const TragedyLooper: Game<TragedyGameState> = {
  name: 'tragedy-looper',

  setup: (): TragedyGameState => {
    const base = createInitialMatchState();

    return {
      ...base,
      v1: {
        characters: {},
        locations: {},
        playedCards: [],
        scheduledIncidents: [],
        readyPlayers: {},
        joinedProtagonists: {},
        readyToAdvance: false,
        eventLogs: [],
        timeline: createInitialTimelineState(),
        loopLost: false,

        // Auto-resolve engine — populated by selectScript
        hiddenRoles: {},
        ahrVariableRoles: {},
        incidentCulprits: {},
        revealedRoleMemory: {},
        activePlots: [],
        activeRuleDefinitions: [],
        nextCardId: 1,
        cardResolveImmunities: [],
        loopState: {
          revealedRoles: {},
          revealedRules: [],
          revealedIncidentCulprits: {},
          triggeredIncidents: [],
          incidentHistory: [],
          abilityUsage: {},
          butterflyEffectTriggered: false,
          lastLoopGoodwillChars: [],
          lastLoopDeadCharacters: [],
          lastWillHopeNextLoop: false,
          deathFlagCount: 0,
          communicationFlagCount: 0,
          deadCharactersAtLeastOnce: [],
          communicatedCharacters: [],
        },
        ex: {
          enabled: false,
          gauge: 0,
          changedThisLoop: false,
          lastLoopEndGauge: 0,
        },
        ahrSingularityOccurred: false,
        protagonists: {
          tokens: {
            paranoia: 0,
            intrigue: 0,
            goodwill: 0,
            hope: 0,
            despair: 0,
            guard: 0,
          },
        },
        mastermind: {
          tokens: {
            paranoia: 0,
            intrigue: 0,
            goodwill: 0,
            hope: 0,
            despair: 0,
            guard: 0,
          },
        },
        protagonistKilled: false,
        castDefinitions: [],

        settings: {
          autoResolve: false,
          leaderMode: false,
          soloMode: false,
          playerCount: 4,
        },
        movementRestrictions: {
          blockedLocations: {},
          immobileCharacters: {},
        },
        currentScriptId: null,

        pendingAbilities: [],
        abilityPhase: 'idle' as const,

        goodwillInteraction: {
          phase: 'idle' as const,
          eligibleAbilities: [],
          currentDeclaration: null,
        },

        pendingIncidents: [],
        pendingInteractions: [],
        activeInteractionId: null,
        mastermindConsole: {
          lastSnapshot: null,
          nextSnapshotId: 1,
        },

        leader: '1',
        leaderTurnOrder: [],
        leaderTurnIndex: 0,
        finalGuess: undefined,
        winner: undefined,
        exCardAssignment: undefined,
        betrayerVictoryConditions: undefined,
        detectiveGuesses: undefined,
      },
    };
  },

  moves,
  phases,

  // ── Secret state filtering ─────────────────────────────────────────────────
  // Runs server-side in multiplayer. Each player can only see their own
  // face-down cards. All other players' face-down cards show as 'hidden'
  // outside the public action-card resolution phase.

  playerView: ({ G, ctx, playerID }): TragedyGameState => {
    // Spectators see nothing secret
    if (!playerID) return filterForPlayer(G, null, ctx?.phase);

    return filterForPlayer(G, playerID, ctx?.phase);
  },
};

// ── Helper: filter state for a specific player ────────────────────────────────

function filterForPlayer(
  G: TragedyGameState,
  viewerSeat: string | null,
  phase?: string,
): TragedyGameState {
  const isMastermind = viewerSeat === '0';
  const shouldRevealPlayedCards = phase === 'resolve_cards';
  const canSeeDetectiveGuesses = !!viewerSeat
    && !isMastermind
    && G.v1.exCardAssignment?.[viewerSeat] === 'C';
  const isLeader = viewerSeat === G.v1.leader;
  const pendingInteractions = G.v1.pendingInteractions || [];

  const redactInteractionForPublic = (
    interaction: TragedyGameState['v1']['pendingInteractions'][number],
  ): TragedyGameState['v1']['pendingInteractions'][number] | null => {
    if (interaction.kind === 'time_spiral_discussion') return interaction;

    if (interaction.kind === 'goodwill') {
      if (isLeader) return interaction;
      const declaration = interaction.currentDeclaration;
      return {
        ...interaction,
        actorSeat: '0',
        sourceId: undefined,
        eligibleAbilities: [],
        currentDeclaration: null,
        observerCharacterId: declaration?.characterId,
        observerAbilityId: declaration?.abilityId,
        observerSelectedTargets: declaration?.selectedTargets,
        description: '友好能力处理中',
      };
    }

    if (interaction.kind === 'mastermind_ability') {
      return null;
    }

    if (interaction.kind === 'incident_resolution') {
      return {
        ...interaction,
        actorSeat: '0',
        sourceId: undefined,
        culpritId: '',
        description: '事件裁定处理中',
      };
    }

    if (interaction.kind === 'butterfly_choice') {
      return {
        ...interaction,
        actorSeat: '0',
        sourceId: undefined,
      };
    }

    if (interaction.kind === 'loop_result_resolution') {
      return {
        ...interaction,
        actorSeat: '0',
        sourceId: undefined,
        failureReasons: [],
        effectOptions: [],
        availableOutcomes: [],
        description: '轮回结果确认中',
      };
    }

    return null;
  };

  const selectPublicInteractions = (): TragedyGameState['v1']['pendingInteractions'] => {
    if (isMastermind) return pendingInteractions;

    const visible: TragedyGameState['v1']['pendingInteractions'] = [];
    const activeInteraction = pendingInteractions.find(
      (interaction) => interaction.id === G.v1.activeInteractionId,
    );
    const activePublicInteraction = activeInteraction == null
      ? null
      : redactInteractionForPublic(activeInteraction);

    for (const interaction of pendingInteractions) {
      if (interaction.id === activeInteraction?.id) {
        if (activePublicInteraction != null) visible.push(activePublicInteraction);
        continue;
      }

      if (interaction.kind === 'time_spiral_discussion' || interaction.kind === 'goodwill') {
        const redacted = redactInteractionForPublic(interaction);
        if (redacted != null) visible.push(redacted);
      }
    }
    return visible;
  };

  const filteredPendingInteractions = selectPublicInteractions();
  const filteredActiveInteractionId = isMastermind
    ? G.v1.activeInteractionId
    : filteredPendingInteractions.some(
        (interaction) => interaction.id === G.v1.activeInteractionId,
      )
      ? G.v1.activeInteractionId
      : null;
  const filteredTimeline = projectTimelineForViewer(G.v1.timeline, viewerSeat);

  // ── seatHands 隔离：每个 seat 只看自己的手牌 ──
  const filteredHands: Record<string, string[]> = {};
  if (viewerSeat && G.seatHands) {
    filteredHands[viewerSeat] = G.seatHands[viewerSeat] || [];
  }

  // ── loopState 字段级过滤 ──
  // 主角可见：revealedRoles（已公开身份是公开事实）、triggeredIncidents
  // 仅剧作家可见：abilityUsage、butterflyEffectTriggered、lastLoopGoodwillChars
  const filteredLoopState = isMastermind
    ? {
      ...G.v1.loopState,
      revealedRules: G.v1.loopState.revealedRules || [],
      revealedIncidentCulprits: G.v1.loopState.revealedIncidentCulprits || {},
    }
      : {
        revealedRoles: G.v1.loopState.revealedRoles,
        revealedRules: G.v1.loopState.revealedRules || [],
        revealedIncidentCulprits: G.v1.loopState.revealedIncidentCulprits || {},
        triggeredIncidents: G.v1.loopState.triggeredIncidents,
        incidentHistory: (G.v1.loopState.incidentHistory || []).map(h => ({ ...h, culpritId: '' })),
        abilityUsage: {},
        butterflyEffectTriggered: false,   // plot 内部，主角不可见
        lastLoopGoodwillChars: [],          // plot 内部，主角不可见
        lastLoopDeadCharacters: [],         // plot 内部，主角不可见
        lastWillHopeNextLoop: false,
        deathFlagCount: 0,                  // 引擎内部，主角不可见
        communicationFlagCount: 0,          // 引擎内部，主角不可见
        deadCharactersAtLeastOnce: [],      // 引擎内部，主角不可见
        communicatedCharacters: [],         // 引擎内部，主角不可见
      };

  return {
    ...G,
    // 主角看不到秘密信息
    scriptSecret: isMastermind ? G.scriptSecret : null,
    fullLog: isMastermind ? G.fullLog : [],
    // 手牌隔离：包括剧作家也只能看到自己的手牌
    seatHands: filteredHands,
    v1: {
      ...G.v1,
      // 所有面朝下的牌：只有出牌者自己能看到牌面，其他人看到 'hidden'
      playedCards: G.v1.playedCards.map((card) => {
        if (shouldRevealPlayedCards) {
          return { ...card, faceUp: true };
        }
        if (!card.faceUp && card.playedBySeat !== viewerSeat) {
          return { ...card, cardTemplateId: 'hidden' };
        }
        return card;
      }),
      timeline: filteredTimeline,
      // 主角看不到隐藏角色等秘密
      hiddenRoles: isMastermind ? G.v1.hiddenRoles : {},
      ahrVariableRoles: isMastermind ? G.v1.ahrVariableRoles : {},
      originalRoles: isMastermind ? G.v1.originalRoles : {},
      revealedRoleMemory: isMastermind ? G.v1.revealedRoleMemory : {},
      incidentCulprits: isMastermind ? G.v1.incidentCulprits : {},
      activePlots: isMastermind ? G.v1.activePlots : [],
      // activeRuleDefinitions 含 source:plot:XXX 会泄漏阴谋信息
      activeRuleDefinitions: isMastermind ? G.v1.activeRuleDefinitions : [],
      castDefinitions: isMastermind ? G.v1.castDefinitions : [],
      // 非剧作家不接收隐藏能力队列，避免从数量或顺序反推出秘密状态。
      pendingAbilities: isMastermind ? (G.v1.pendingAbilities || []) : [],
      abilityPhase: isMastermind ? G.v1.abilityPhase : 'idle',
      // goodwillInteraction: 队长和剧作家可见 eligibleAbilities，其他主角不可见
      goodwillInteraction: G.v1.goodwillInteraction ? {
        ...G.v1.goodwillInteraction,
        // 剧作家看全部；队长看 eligibleAbilities（需知道哪些能力可用）
        // 其他主角只看 phase（用于显示等待提示）
        eligibleAbilities: (isMastermind || isLeader)
          ? G.v1.goodwillInteraction.eligibleAbilities
          : [],
        currentDeclaration: (isMastermind || isLeader)
          ? G.v1.goodwillInteraction.currentDeclaration
          : null,
        observerCharacterId: (!isMastermind && !isLeader)
          ? G.v1.goodwillInteraction.currentDeclaration?.characterId
          : undefined,
        observerAbilityId: (!isMastermind && !isLeader)
          ? G.v1.goodwillInteraction.currentDeclaration?.abilityId
          : undefined,
        observerSelectedTargets: (!isMastermind && !isLeader)
          ? G.v1.goodwillInteraction.currentDeclaration?.selectedTargets
          : undefined,
      } : { phase: 'idle' as const, eligibleAbilities: [], currentDeclaration: null },
      // pendingIncidents 仅保留给剧作家作为兼容投影；真实交互状态以 pendingInteractions 为准。
      pendingIncidents: isMastermind ? projectPendingIncidentsForView(G.v1.pendingInteractions || []) : [],
      pendingInteractions: filteredPendingInteractions,
      activeInteractionId: filteredActiveInteractionId,
      mastermindConsole: isMastermind ? G.v1.mastermindConsole : { lastSnapshot: null, nextSnapshotId: 0 },
      // Ex 状态与角色 Ex 牌计数是公开信息
      ex: { ...G.v1.ex },
      // loopState 字段级过滤
      loopState: filteredLoopState,
      protagonists: {
        ...G.v1.protagonists,
        tokens: { ...G.v1.protagonists.tokens },
      },
      mastermind: {
        ...G.v1.mastermind,
        tokens: { ...G.v1.mastermind.tokens },
      },
      // LL 背叛者 Ex牌分配：剧作家不知道，每个主人公只看自己的
      exCardAssignment: (viewerSeat && !isMastermind && G.v1.exCardAssignment?.[viewerSeat])
        ? { [viewerSeat]: G.v1.exCardAssignment[viewerSeat] }
        : undefined,
      // 背叛者胜利条件：剧作家可见（从剧本知道），主角不可见
      betrayerVictoryConditions: isMastermind ? G.v1.betrayerVictoryConditions : undefined,
      // LL 名侦探 C 的猜测属于 seat 私有信息，不进入公共层或剧作家视图
      detectiveGuesses: canSeeDetectiveGuesses ? G.v1.detectiveGuesses : undefined,
    },
  };
}
