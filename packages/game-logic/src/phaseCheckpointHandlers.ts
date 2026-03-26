import type { TragedyGameState } from './game';
import { getTragedySetById } from '@tragedy/domain';
import { getCharacterLabel, getLocalizedTerm } from './data/translationService';
import { checkLoopEndLossConditions } from './lossConditions';
import { autoResolve } from './engine/autoResolve';
import { manualIncidentPrompt, manualPrompt } from './engine/manualFallback';
import { collectEligibleAbilities } from './engine/goodwillResolver';
import { getProcessor } from './ruleEngine';
import { getToken } from './utils/tokenHelpers';
import { buildIncidentResolutionInteractions } from './runtime/interactionBuilder';
import {
  buildGoodwillInteraction,
  clearPendingInteractions,
  replacePendingInteractions,
  setPendingGoodwillInteraction,
} from './runtime/interactions';
import { buildModuleGoodwillTargetSlots } from './rules/moduleGoodwill';
import {
  collectModuleLoopResultEffects,
  type ModuleLoopResultEffectOption,
} from './rules/moduleLifecycle';
import { recordLoopEndExGauge } from './rules/incidentEx';
import { pushResultAnnouncement } from './resultAnnouncements';
import {
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
} from './timeline/factVisibility';
import {
  appendProjectedTimelineFact,
  buildTimelineCompatibilityMetadata,
} from './timeline/legacyHistoryProjection';
import { createTimelineCheckpoint, startTimelineFlow } from './timeline/factWriter';

type LoopResultResolutionInteraction = Extract<
  TragedyGameState['v1']['pendingInteractions'][number],
  { kind: 'loop_result_resolution' }
>;

type LoopResultReason = LoopResultResolutionInteraction['failureReasons'][number];
type LoopResultEffect = LoopResultResolutionInteraction['effectOptions'][number];
type LoopResultOutcome = LoopResultResolutionInteraction['availableOutcomes'][number];

function dispatchTiming(G: TragedyGameState, timing: string): void {
  if (G.v1.settings.autoResolve) {
    autoResolve(G, timing);
  } else {
    manualPrompt(G, timing);
  }
}

function dedupeLoopResultEntries<T extends { id: string; label: string; detail?: string }>(
  entries: T[],
): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const entry of entries) {
    const key = `${entry.id}::${entry.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  return deduped;
}

function isLikelyLoopLossRule(ruleId: string, message: string): boolean {
  return ruleId.includes('loss')
    || message.includes('败')
    || message.includes('死')
    || message.includes('失败');
}

function collectTriggeredLoopEndReasons(
  G: TragedyGameState,
): LoopResultReason[] {
  const reasons: LoopResultReason[] = [];

  for (const rule of G.v1.activeRuleDefinitions || []) {
    if (rule.timing !== 'loop_end') continue;

    const processor = getProcessor(rule.ruleId);
    if (!processor) continue;

    const check = processor.check({
      G,
      timing: 'loop_end',
      characterId: rule.characterId,
    });
    if (!check.triggered) continue;

    const message = String(check.message || '').trim();
    if (!isLikelyLoopLossRule(rule.ruleId, message)) continue;

    reasons.push({
      id: `${rule.ruleId}:${rule.characterId || 'global'}`,
      label: message || getLocalizedTerm(rule.ruleId) || rule.ruleId,
      detail: rule.characterId
        ? `来源角色：${getCharacterLabel(rule.characterId)}`
        : `来源规则：${rule.ruleId}`,
    });
  }

  return dedupeLoopResultEntries(reasons);
}

function buildLoopResultOutcomeOptions(
  G: TragedyGameState,
  supportsFinalGuess: boolean,
  effectOptions: ModuleLoopResultEffectOption[] = [],
): LoopResultOutcome[] {
  const outcomeOverride = effectOptions.find((effect) => effect.outcomeOverride)?.outcomeOverride;
  if (outcomeOverride === 'final_guess') {
    return [{
      id: 'final_guess',
      label: '进入最终猜测',
      detail: '附加效果会直接耗尽剩余轮回，并进入最终决战。',
    }];
  }

  if (outcomeOverride === 'match_end') {
    return [{
      id: 'match_end',
      label: '进入对局结束',
      detail: '附加效果会直接结束本局。',
    }];
  }

  if (G.v1.winner === 'mastermind') {
    return [{
      id: 'match_end',
      label: '进入对局结束',
      detail: '所有轮回已耗尽，剧作家获胜。',
    }];
  }

  if (G.loopIndex >= G.maxLoops && G.maxLoops > 0 && supportsFinalGuess) {
    return [{
      id: 'final_guess',
      label: '进入最终猜测',
      detail: '所有轮回已经结束，接下来进入最终决战。',
    }];
  }

  if (G.loopIndex >= G.maxLoops && G.maxLoops > 0) {
    return [{
      id: 'match_end',
      label: '进入对局结束',
      detail: '所有轮回已经结束。',
    }];
  }

  return [{
    id: 'next_loop',
    label: '进入时间裂隙',
    detail: `下一轮将从第 ${G.loopIndex + 1} 轮回开始。`,
  }];
}

function buildLoopResultResolutionInteraction(args: {
  currentLoopNumber: number;
  failureReasons: LoopResultReason[];
  effectOptions?: LoopResultEffect[];
  availableOutcomes: LoopResultOutcome[];
}): LoopResultResolutionInteraction {
  return {
    id: `loop_result:${args.currentLoopNumber}`,
    kind: 'loop_result_resolution',
    actorSeat: '0',
    phase: 'loop_end_check',
    blocking: true,
    sourceId: `loop_result:${args.currentLoopNumber}`,
    description: '轮回结果待确认',
    resultType: 'loop_failure',
    resultLabel: `第 ${args.currentLoopNumber} 轮回结果确认`,
    failureReasons: dedupeLoopResultEntries(args.failureReasons),
    effectOptions: dedupeLoopResultEntries(args.effectOptions || []),
    availableOutcomes: dedupeLoopResultEntries(args.availableOutcomes),
  };
}

function appendPhaseBoundaryFact(
  G: TragedyGameState,
  flowId: string,
  summary: string,
  compatibility: Parameters<typeof buildTimelineCompatibilityMetadata>[0],
  phaseStep: string,
): void {
  appendProjectedTimelineFact(G, {
    type: 'phase_boundary',
    flowId,
    source: {
      system: 'phase',
      id: 'phaseCheckpointHandlers',
    },
    actor: null,
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'boundary',
      type: 'phase_boundary',
      label: summary,
      metadata: buildTimelineCompatibilityMetadata(compatibility),
    },
    gameTime: {
      phaseStep,
    },
  });
}

export function beginGoodwillWindowPhase(G: TragedyGameState): void {
  const flowId = startTimelineFlow(G);
  appendPhaseBoundaryFact(G, flowId, '▶ 友好能力阶段', {
    publicLog: ['▶ 友好能力阶段'],
  }, 'goodwill-window-begin');
  createTimelineCheckpoint(G, {
    kind: 'phase_boundary',
    visibility: createPublicTimelineVisibility(),
    payload: {
      summary: 'goodwill_window phase started',
      metadata: {
        phase: 'goodwill_window',
      },
    },
    gameTime: {
      phase: 'goodwill_window',
      phaseStep: 'begin',
    },
  });
  G.v1.goodwillInteraction = {
    phase: 'idle',
    eligibleAbilities: [],
    currentDeclaration: null,
  };

  if (G.v1.settings.autoResolve) {
    manualPrompt(G, 'goodwill_window');
  }

  const eligible = collectEligibleAbilities(G);
  if (eligible.length === 0) {
    G.v1.goodwillInteraction = {
      phase: 'done',
      eligibleAbilities: [],
      currentDeclaration: null,
    };
    clearPendingInteractions(G);
    return;
  }

  G.v1.goodwillInteraction = {
    phase: 'leader_choosing',
    eligibleAbilities: eligible.map((entry: any) => ({
      characterId: entry.charId,
      abilityId: entry.abilityId,
      label: entry.summary || `${entry.charId}: ${entry.abilityId}`,
      used: false,
      targetSlots: buildModuleGoodwillTargetSlots({
        G,
        charId: entry.charId,
        abilityId: entry.abilityId,
      }),
    })),
    currentDeclaration: null,
  };
  setPendingGoodwillInteraction(
    G,
    buildGoodwillInteraction(G, G.v1.goodwillInteraction),
  );
}

export function beginIncidentsPhase(G: TragedyGameState): void {
  const flowId = startTimelineFlow(G);
  clearPendingInteractions(G);
  const todayIncidents = G.v1.scheduledIncidents.filter((incident) => incident.day === G.day);

  if (todayIncidents.length === 0) {
    appendPhaseBoundaryFact(G, flowId, '今日无事件', {
      publicLog: ['今日无事件'],
    }, 'incidents-empty');
    return;
  }

  appendPhaseBoundaryFact(G, flowId, `⚠️ 事件阶段 — 检查 ${todayIncidents.length} 个预定事件`, {
    publicLog: [`⚠️ 事件阶段 — 检查 ${todayIncidents.length} 个预定事件`],
  }, 'incidents-begin');
  createTimelineCheckpoint(G, {
    kind: 'phase_boundary',
    visibility: createPublicTimelineVisibility(),
    payload: {
      summary: 'incidents phase started',
      metadata: {
        phase: 'incidents',
        incidentCount: todayIncidents.length,
      },
    },
    gameTime: {
      phase: 'incidents',
      phaseStep: 'begin',
    },
  });

  if (G.v1.settings.autoResolve) {
    manualPrompt(G, 'incident_check');
    manualIncidentPrompt(G);
  }

  const incidentInteractions = buildIncidentResolutionInteractions(G);
  replacePendingInteractions(G, incidentInteractions);
}

export function beginLoopEndCheckPhase(G: TragedyGameState): void {
  const flowId = startTimelineFlow(G);
  recordLoopEndExGauge(G);
  const supportsFinalGuess = !!getTragedySetById(G.scriptOpen?.tragedySetId || '')?.supportsFinalGuess;
  const currentLoopNumber = G.loopIndex + 1;
  const failureReasons: LoopResultReason[] = [];

  const lossResult = checkLoopEndLossConditions(G);

  const goodwillChars = Object.entries(G.v1.characters)
    .filter(([_, character]) => getToken(character, 'goodwill') > 0)
    .map(([id]) => id);
  const deadChars = Object.entries(G.v1.characters)
    .filter(([_, character]) => !character.alive)
    .map(([id]) => id);

  failureReasons.push(...collectTriggeredLoopEndReasons(G));
  dispatchTiming(G, 'loop_end');

  if (lossResult.lost || G.v1.loopLost) {
    G.v1.loopLost = true;
    appendPhaseBoundaryFact(G, flowId, `─── 第 ${currentLoopNumber} 轮回失败 ───`, {
      publicLog: [`─── 第 ${currentLoopNumber} 轮回失败 ───`],
    }, 'loop-end-loss');
    pushResultAnnouncement(G, {
      resultType: 'loop_failure',
      title: `第 ${currentLoopNumber} 轮回失败`,
      summary: '本轮未能阻止惨剧。',
      detail: '剧作家将先确认失败原因、附加效果与后续流向。',
    }, {
      flowId,
      source: {
        system: 'phase',
        id: 'beginLoopEndCheckPhase',
      },
      gameTime: {
        phase: 'loop_end_check',
        phaseStep: 'loop-failure-announcement',
      },
    });
    if (lossResult.reason) {
      failureReasons.unshift({
        id: `system:${lossResult.reason}`,
        label: lossResult.reason === '败北条件已达成' ? '已触发即时败北条件' : lossResult.reason,
        detail: '系统已检测到本轮的直接败北条件。',
      });
    }
  } else {
    G.v1.winner = 'protagonist';
    appendPhaseBoundaryFact(G, flowId, '🏆 主角团成功阻止了惨剧！', {
      publicLog: ['🏆 主角团成功阻止了惨剧！'],
    }, 'loop-end-victory');
    return;
  }

  G.loopIndex += 1;
  G.v1.loopLost = false;
  G.v1.protagonistKilled = false;

  if (G.v1.loopState) {
    G.v1.loopState.lastLoopGoodwillChars = goodwillChars;
    G.v1.loopState.lastLoopDeadCharacters = deadChars;
    G.v1.loopState.butterflyEffectTriggered = false;
  }

  const effectOptions = collectModuleLoopResultEffects(G, {
    currentLoopNumber,
    supportsFinalGuess,
  });
  const availableOutcomes = buildLoopResultOutcomeOptions(G, supportsFinalGuess, effectOptions);

  replacePendingInteractions(G, [
    buildLoopResultResolutionInteraction({
      currentLoopNumber,
      failureReasons: failureReasons.length > 0
        ? failureReasons
        : [{
            id: `system:loop_loss:${currentLoopNumber}`,
            label: '系统判定本轮失败',
            detail: '当前没有更细的结构化失败原因，请结合日志复核。',
          }],
      effectOptions,
      availableOutcomes,
    }),
  ]);
  createTimelineCheckpoint(G, {
    kind: 'loop_boundary',
    visibility: createMastermindTimelineVisibility(),
    payload: {
      summary: 'loop result resolution created',
      metadata: {
        currentLoopNumber,
        failureReasons: failureReasons.map(reason => reason.id),
        availableOutcomes: availableOutcomes.map(outcome => outcome.id),
      },
    },
    gameTime: {
      phase: 'loop_end_check',
      phaseStep: 'pending-loop-result-resolution',
    },
  });
}
