import type { TragedyGameState } from './game';
import { type PlayedCard, resolveAllCards, applyEffects } from './action-cards/cardResolver';
import { getCard, getCardLabel } from './data/cardService';
import { getCharacterLabel } from './data/translationService';
import { getProtagonistSeats } from './playerConfig';
import { autoResolve } from './engine/autoResolve';
import { manualPrompt } from './engine/manualFallback';
import { runModuleLifecycle } from './rules/moduleLifecycle';
import type { TimelineJsonValue } from './timeline/factSchema';
import {
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
} from './timeline/factVisibility';
import {
  appendProjectedTimelineFact,
  buildTimelineCompatibilityMetadata,
} from './timeline/legacyHistoryProjection';
import { startTimelineFlow } from './timeline/factWriter';

const LOCATION_LABELS: Record<string, string> = {
  hospital: '医院',
  shrine: '神社',
  city: '都市',
  school: '学校',
};

const TOKEN_LABELS: Record<string, string> = {
  unease: '不安',
  paranoia: '不安',
  intrigue: '密谋',
  goodwill: '友好',
  hope: '希望',
  despair: '绝望',
};

const PROTAGONIST_SOURCE_LABELS: Record<string, string> = {
  '1': '主人公橙',
  '2': '主人公绿',
  '3': '主人公蓝',
};

function dispatchTiming(G: TragedyGameState, timing: string): void {
  if (G.v1.settings.autoResolve) {
    autoResolve(G, timing);
  } else {
    manualPrompt(G, timing);
  }
}

function toCompatibilityPayload(value: unknown): TimelineJsonValue {
  return JSON.parse(JSON.stringify(value)) as TimelineJsonValue;
}

function getLocationLabel(locationId: string | undefined): string {
  if (!locationId) return '未知地点';
  return LOCATION_LABELS[locationId] ?? locationId;
}

function getTargetLabel(targetType: string, targetId: string): string {
  return targetType === 'location'
    ? `地点「${getLocationLabel(targetId)}」`
    : `角色「${getCharacterLabel(targetId)}」`;
}

function getSourceLabel(card: Pick<PlayedCard, 'owner' | 'playedBySeat'>): string {
  if (card.owner === 'mastermind') return '剧作家';
  const seatId = card.playedBySeat ?? '';
  return PROTAGONIST_SOURCE_LABELS[seatId] ?? `主人公(${seatId || '?'})`;
}

function describePlayedCard(card: PlayedCard): string {
  return `${getSourceLabel(card)}的「${getCardLabel(card.cardTemplateId)}」`;
}

function formatCounterDelta(counter: string, delta: number): string {
  const baseCounter = counter.replace(/_plus$|_minus$/, '');
  const counterLabel = TOKEN_LABELS[baseCounter] ?? baseCounter;
  return `${counterLabel} ${delta > 0 ? '+' : ''}${delta}`;
}

function buildResolveEffectLogLine(args: {
  targetType: string;
  targetId: string;
  effect: ReturnType<typeof resolveAllCards>[number];
  sourceCards: PlayedCard[];
}): string {
  const targetLabel = getTargetLabel(args.targetType, args.targetId);
  const sourceText = args.sourceCards.length > 0
    ? args.sourceCards.map(describePlayedCard).join('、')
    : '本次行动卡';

  if (args.effect.kind === 'counter') {
    return `📘 ${targetLabel}受到 ${sourceText} 的影响：${formatCounterDelta(args.effect.counter, args.effect.delta)}`;
  }

  if (args.effect.kind === 'forbidden') {
    return `📘 ${targetLabel}受到 ${sourceText} 的影响：${args.effect.reason}`;
  }

  if (args.effect.kind === 'no_effect') {
    return `📘 ${targetLabel}受到 ${sourceText} 的影响：${args.effect.reason}`;
  }

  return `📘 ${targetLabel}受到 ${sourceText} 的影响`;
}

function buildResolveMoveLogLine(args: {
  targetId: string;
  from: string | undefined;
  to: string | undefined;
  sourceCards: PlayedCard[];
}): string {
  const targetLabel = getTargetLabel('character', args.targetId);
  const sourceText = args.sourceCards.length > 0
    ? args.sourceCards.map(describePlayedCard).join('、')
    : '本次行动卡';
  return `📘 ${targetLabel}受到 ${sourceText} 的影响：${getLocationLabel(args.from)} → ${getLocationLabel(args.to)}`;
}

function appendResolveFact(
  G: TragedyGameState,
  flowId: string,
  summary: string,
  compatibility: Parameters<typeof buildTimelineCompatibilityMetadata>[0],
): void {
  appendProjectedTimelineFact(G, {
    type: 'card_resolution',
    flowId,
    source: {
      system: 'phase',
      id: 'beginResolveCardsPhase',
      phase: 'resolve_cards',
    },
    actor: null,
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'card_resolution',
      outcome: summary,
      summary,
      changes: [],
      metadata: buildTimelineCompatibilityMetadata(compatibility),
    },
    gameTime: {
      phase: 'resolve_cards',
      phaseStep: summary,
    },
  });
}

function appendResolveMastermindFact(
  G: TragedyGameState,
  flowId: string,
  summary: string,
  compatibility: Parameters<typeof buildTimelineCompatibilityMetadata>[0],
): void {
  appendProjectedTimelineFact(G, {
    type: 'card_resolution',
    flowId,
    source: {
      system: 'phase',
      id: 'beginResolveCardsPhase',
      phase: 'resolve_cards',
    },
    actor: null,
    visibility: createMastermindTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'card_resolution',
      outcome: summary,
      summary,
      changes: [],
      metadata: buildTimelineCompatibilityMetadata(compatibility),
    },
    gameTime: {
      phase: 'resolve_cards',
      phaseStep: summary,
    },
  });
}

function returnCardsToHands(G: TragedyGameState, flowId: string): void {
  try {
    if (!G.board) G.board = { usedOncePerLoopCards: [], loopLimit: 0, dayLimit: 0 } as any;
    if (!G.board.usedOncePerLoopCards) G.board.usedOncePerLoopCards = [];

    for (const playedCard of G.v1.playedCards) {
      const definition = getCard(playedCard.cardTemplateId);
      if (!definition) {
        appendResolveFact(G, flowId, 'unknown-card', {
          publicLog: [`⚠️ 未知行动卡: ${playedCard.cardTemplateId}`],
        });
        continue;
      }

      if ((playedCard as any).__consumed) continue;

      const seatId = playedCard.playedBySeat;
      if (!seatId) continue;

      if (definition.oncePerLoop) {
        const lockKey = `${seatId}:${playedCard.cardTemplateId}`;
        if (!G.board.usedOncePerLoopCards.includes(lockKey)) {
          G.board.usedOncePerLoopCards.push(lockKey);
        }
      } else {
        G.seatHands[seatId] = G.seatHands[seatId] || [];
        G.seatHands[seatId].push(playedCard.cardTemplateId);
      }
    }

    G.v1.playedCards = [];
  } catch (error: any) {
    appendResolveFact(G, flowId, 'return-cards-failed', {
      publicLog: [`⚠️ 行动卡回收失败: ${error.message}`],
    });
  }
}

function buildCardsForResolve(G: TragedyGameState): PlayedCard[] {
  const hasDisconnect = (G.v1.activeRuleDefinitions || []).some(
    (rule) => rule.ruleId === 'disconnect_of_hearts_forbid_move',
  );
  if (!hasDisconnect) {
    return G.v1.playedCards as PlayedCard[];
  }

  const forbidGoodwillCards = (G.v1.playedCards as PlayedCard[]).filter(
    (playedCard) => playedCard.cardTemplateId === 'mastermind_forbid_goodwill',
  );
  if (forbidGoodwillCards.length === 0) {
    return G.v1.playedCards as PlayedCard[];
  }

  const syntheticCards: PlayedCard[] = forbidGoodwillCards.map((playedCard) => ({
    ...playedCard,
    id: `${playedCard.id}_disconnect_move`,
    cardTemplateId: 'protagonist_forbid_movement',
    owner: 'mastermind',
  }));
  return [...(G.v1.playedCards as PlayedCard[]), ...syntheticCards];
}

function emitResolveFrames(
  G: TragedyGameState,
  effects: ReturnType<typeof resolveAllCards>,
  flowId: string,
): void {
  const targetKeys = new Set<string>();
  for (const playedCard of G.v1.playedCards) {
    targetKeys.add(`${playedCard.targetType}:${playedCard.targetId}`);
  }

  // ── Step 1: 全局翻牌（同时翻开所有行动牌）──
  const allRevealedCards = G.v1.playedCards.map((playedCard) => ({
    ...playedCard,
    faceUp: true,
  }));
  const allCardIds = G.v1.playedCards.map((playedCard) => playedCard.id);
  for (const playedCard of G.v1.playedCards) {
    playedCard.faceUp = true;
  }
  appendResolveFact(G, flowId, 'resolve-flip-all', {
    eventLogs: [{
      type: 'resolve_flip_all',
      payload: toCompatibilityPayload({
        cardIds: allCardIds,
        cards: allRevealedCards,
      }),
    }],
  });

  // ── Step 2: 逐目标结算（只生成 resolve_effect / resolve_move）──
  for (const targetKey of targetKeys) {
    const [targetType, targetId] = targetKey.split(':');
    const cardsForTarget = G.v1.playedCards.filter(
      (playedCard) => playedCard.targetType === targetType && playedCard.targetId === targetId,
    );
    const cardIds = cardsForTarget.map((playedCard) => playedCard.id);
    const revealedCardsForTarget = cardsForTarget.map((playedCard) => ({
      ...playedCard,
      faceUp: true,
    }));
    const effectsForTarget = effects.filter((effect) => effect.targetId === targetId);

    const valueEffects = effectsForTarget.filter(
      (effect) => effect.kind === 'counter' || effect.kind === 'forbidden' || effect.kind === 'no_effect',
    );
    if (valueEffects.length > 0) {
      for (const effect of valueEffects) {
        applyEffects(G, [effect]);
        const effectCardIds = typeof effect.cardId === 'string' ? [effect.cardId] : cardIds;
        const effectCards = typeof effect.cardId === 'string'
          ? revealedCardsForTarget.filter((playedCard) => playedCard.id === effect.cardId)
          : revealedCardsForTarget;
        appendResolveFact(G, flowId, 'resolve-effect', {
          publicLog: [buildResolveEffectLogLine({
            targetType,
            targetId,
            effect,
            sourceCards: effectCards,
          })],
          eventLogs: [{
            type: 'resolve_effect',
            payload: toCompatibilityPayload({
              targetKey,
              targetType,
              targetId,
              cardIds: effectCardIds,
              cards: effectCards,
              effects: [{
                kind: effect.kind,
                ...(effect.kind === 'counter' ? { counter: effect.counter, delta: effect.delta } : {}),
                ...(typeof effect.cardId === 'string' ? { cardId: effect.cardId } : {}),
                ...(effect.kind === 'forbidden' || effect.kind === 'no_effect' ? { reason: effect.reason } : {}),
              }],
            }),
          }],
        });
      }
    }

    const moveEffects = effectsForTarget.filter((effect) => effect.kind === 'move');
    let emittedMove = false;
    if (moveEffects.length > 0) {
      const character = G.v1.characters[targetId];
      const fromLocation = character?.locationId;
      applyEffects(G, moveEffects);
      const toLocation = character?.locationId;
      if (fromLocation !== toLocation) {
        emittedMove = true;
        const movementCards = revealedCardsForTarget.filter((playedCard) => (
          getCard(playedCard.cardTemplateId)?.actionFamily === 'movement'
        ));
        appendResolveFact(G, flowId, 'resolve-move', {
          publicLog: [buildResolveMoveLogLine({
            targetId,
            from: fromLocation,
            to: toLocation,
            sourceCards: movementCards,
          })],
          eventLogs: [{
            type: 'resolve_move',
            payload: toCompatibilityPayload({
              targetKey,
              targetType,
              targetId,
              charId: targetId,
              from: fromLocation,
              to: toLocation,
              cardIds: movementCards.map((playedCard) => playedCard.id),
              cards: movementCards,
            }),
          }],
        });
      }
    }

    // 如果该目标既无数值效果也无实际移动，仍然显示一个"无变化"弹窗
    if (valueEffects.length === 0 && !emittedMove) {
      appendResolveFact(G, flowId, 'resolve-effect', {
        publicLog: [`📘 ${getTargetLabel(targetType, targetId)}受到 ${cardsForTarget.map(describePlayedCard).join('、') || '本次行动卡'} 的影响：本目标无变化`],
        eventLogs: [{
          type: 'resolve_effect',
          payload: toCompatibilityPayload({
            targetKey,
            targetType,
            targetId,
            cardIds,
            cards: revealedCardsForTarget,
            effects: [{ kind: 'no_effect', reason: '本目标无变化' }],
          }),
        }],
      });
    }
  }

  // ── Step 3: 全局收牌 ──
  appendResolveFact(G, flowId, 'resolve-dismiss-all', {
    eventLogs: [{
      type: 'resolve_dismiss_all',
      payload: toCompatibilityPayload({ cardIds: allCardIds }),
    }],
  });
}

function applyHopePlusOneLinkage(
  G: TragedyGameState,
  effects: ReturnType<typeof resolveAllCards>,
  flowId: string,
): void {
  const hopePlayed = (G.v1.playedCards as PlayedCard[]).filter(
    (playedCard) => playedCard.cardTemplateId === 'protagonist_hope_plus_1',
  );
  const hopeCollision = effects.some(
    (effect) => effect.kind === 'no_effect'
      && 'reason' in effect
      && effect.reason === '希望+1 撞车，降级为友好+1',
  );
  if (hopePlayed.length !== 1 || hopeCollision) return;

  for (const seatId of getProtagonistSeats(G)) {
    const hand = G.seatHands[seatId];
    if (!hand) continue;
    const index = hand.indexOf('protagonist_hope_plus_1');
    if (index !== -1) {
      hand.splice(index, 1);
    }
  }

  for (const playedCard of hopePlayed) {
    (playedCard as any).__consumed = true;
  }
  appendResolveFact(G, flowId, 'hope-linkage', {
    publicLog: ['✨ 希望+1 联动技：所有主人公手牌中的希望+1 已被移除'],
  });
  appendResolveMastermindFact(G, flowId, 'hope-linkage-secret', {
    fullLog: ['[十周年] 希望+1 成功使用，全局移除该卡'],
  });
}

export function beginResolveCardsPhase(G: TragedyGameState): void {
  const flowId = startTimelineFlow(G);
  appendResolveFact(G, flowId, 'resolve-cards-begin', {
    publicLog: ['▶ 行动卡结算开始'],
  });

  dispatchTiming(G, 'card_resolve');

  const resolveCardsState = runModuleLifecycle(G, 'resolve_cards');
  const wmOldSealActive = resolveCardsState.oldSealActive === true;
  const effects = resolveAllCards(
    buildCardsForResolve(G),
    G.v1.cardResolveImmunities,
    wmOldSealActive,
  );

  emitResolveFrames(G, effects, flowId);
  appendResolveFact(G, flowId, 'resolve-cards-complete', {
    publicLog: [`✅ 行动卡结算完成 — ${effects.length} 个效果已处理`],
  });

  applyHopePlusOneLinkage(G, effects, flowId);
  returnCardsToHands(G, flowId);
}
