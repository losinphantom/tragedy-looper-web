import type { TragedyGameState } from './game';
import {
  ResultAnnouncementPayloadSchema,
  type ResultAnnouncementPayload,
} from './resultAnnouncementSchema';
import type { TimelineSource } from './timeline/factSchema';
import { createPublicTimelineVisibility, type TimelineVisibility } from './timeline/factVisibility';
import {
  appendProjectedTimelineFact,
  buildTimelineCompatibilityMetadata,
} from './timeline/legacyHistoryProjection';
import type { TimelineGameTimeInput } from './timeline/factWriter';

export interface ResultAnnouncementTimelineOptions {
  flowId?: string;
  causedByFactIds?: string[];
  source?: TimelineSource;
  visibility?: TimelineVisibility;
  gameTime?: TimelineGameTimeInput;
}

type PublicAnnouncementTextInput = Pick<
  ResultAnnouncementPayload,
  'title' | 'summary' | 'detail' | 'characterId' | 'locationId' | 'targetId' | 'targetType'
>;

export interface NormalizedPublicAnnouncementText {
  title: string;
  summary: string;
  detail?: string;
}

function normalizeAnnouncementLine(value: string | undefined): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

const HIDDEN_CAUSE_HINTS = [
  '因为',
  '由於',
  '由于',
  '原因',
  '幕后',
  '隐藏',
  'secret',
  'hidden',
  'culprit',
  'trigger',
  'condition',
  '条件',
];

function stripHiddenCauseFragments(value: string | undefined): string {
  let sanitized = normalizeAnnouncementLine(value);
  if (!sanitized) return '';

  sanitized = sanitized.replace(/[（(]([^()（）]*)[）)]/g, (segment, inner: string) => {
    const normalizedInner = normalizeAnnouncementLine(inner).toLowerCase();
    const containsHiddenCauseHint = HIDDEN_CAUSE_HINTS.some((hint) => normalizedInner.includes(hint));
    return containsHiddenCauseHint ? '' : segment;
  });

  sanitized = sanitized
    .replace(/(?:因为|由於|由于|原因是|触发原因|幕后原因)[^，。；;！!？?]*/g, '')
    .replace(/[，,]\s*$/g, '');

  return normalizeAnnouncementLine(sanitized);
}

export function normalizePublicAnnouncementText(
  payload: PublicAnnouncementTextInput,
): NormalizedPublicAnnouncementText {
  const normalizedTitle = stripHiddenCauseFragments(payload.title) || '结果公布';
  const normalizedSummary = stripHiddenCauseFragments(payload.summary) || normalizedTitle;
  const normalizedDetail = stripHiddenCauseFragments(payload.detail);

  return {
    title: normalizedTitle,
    summary: normalizedSummary,
    ...(normalizedDetail ? { detail: normalizedDetail } : {}),
  };
}

export function pushResultAnnouncement(
  G: TragedyGameState,
  payload: ResultAnnouncementPayload,
  options: ResultAnnouncementTimelineOptions = {},
): void {
  const normalizedPayload = ResultAnnouncementPayloadSchema.parse(payload);
  const normalizedText = normalizePublicAnnouncementText(normalizedPayload);
  const normalizedAnnouncement: ResultAnnouncementPayload = {
    ...normalizedPayload,
    ...normalizedText,
  };

  appendProjectedTimelineFact(G, {
    type: 'result_announced',
    flowId: options.flowId,
    causedByFactIds: options.causedByFactIds,
    gameTime: options.gameTime,
    source: options.source ?? {
      system: 'phase',
      id: 'pushResultAnnouncement',
    },
    actor: null,
    visibility: options.visibility ?? createPublicTimelineVisibility(),
    payload: {
      family: 'result',
      type: 'result_announced',
      announcement: normalizedAnnouncement,
      metadata: buildTimelineCompatibilityMetadata({
        eventLogs: [{
          type: 'result',
          payload: normalizedAnnouncement,
        }],
      }),
    },
  });
}

export function buildLoopOutcomeAnnouncement(args: {
  G: TragedyGameState;
  outcomeId: 'next_loop' | 'final_guess' | 'match_end';
  resolvedLoopNumber: number;
}): ResultAnnouncementPayload {
  if (args.outcomeId === 'next_loop') {
    return {
      resultType: 'loop_end',
      title: `第 ${args.resolvedLoopNumber} 轮回结束`,
      summary: '时间裂隙开始，主角团可以整理情报。',
      detail: `下一轮将从第 ${args.resolvedLoopNumber + 1} 轮回开始。`,
    };
  }

  if (args.outcomeId === 'final_guess') {
    return {
      resultType: 'loop_end',
      title: '所有轮回结束',
      summary: '主角团即将进入最终决战。',
      detail: `${args.G.maxLoops} 次轮回已经全部结束，接下来需要进行最终猜测。`,
    };
  }

  return {
    resultType: 'loop_end',
    title: '所有轮回结束',
    summary: '全部轮回已经耗尽。',
    detail: '剧作家在时间耗尽后达成了胜利条件。',
  };
}

export function buildGameResultAnnouncement(
  G: TragedyGameState,
): ResultAnnouncementPayload | null {
  const winner = G.v1.winner;
  if (!winner) return null;

  if (winner === 'protagonist') {
    return {
      resultType: 'game_victory',
      title: '主角团获胜',
      summary: G.v1.finalGuess?.completed
        ? '最终猜测全部正确，主角团赢得了这场对决。'
        : '主角团成功阻止了惨剧。',
      detail: G.v1.finalGuess?.completed
        ? '所有目标身份都已被正确揭穿。'
        : '本局已经达成主角侧胜利条件。',
    };
  }

  const titleMap: Record<NonNullable<TragedyGameState['v1']['winner']>, string> = {
    protagonist: '主角团获胜',
    mastermind: '剧作家获胜',
    betrayer_A: '背叛者 A 获胜',
    betrayer_B: '背叛者 B 获胜',
    betrayer_C: '背叛者 C 获胜',
  };

  let detail = '本局已经达成对立阵营的胜利条件。';
  if (winner === 'mastermind') {
    detail = G.v1.finalGuess?.completed
      ? '最终猜测失败，剧作家赢得了这场对决。'
      : G.maxLoops > 0 && G.loopIndex >= G.maxLoops
        ? '所有轮回已经耗尽，主角团未能阻止惨剧。'
        : '主角团未能达成本局胜利条件。';
  }

  return {
    resultType: 'game_defeat',
    title: titleMap[winner],
    summary: '游戏结束。',
    detail,
  };
}
