/**
 * Card Validator — pure validation functions for playCard / recallCard moves.
 *
 * Returns { ok, reason } instead of mutating G or returning INVALID_MOVE,
 * so moves.ts can stay thin and these rules can be unit-tested independently.
 */

import type { TragedyGameState } from '../game';
import { isCardLocked } from './cardRegistry';
import { getEffectiveRoleId } from '../rules/ahrEffectiveRoles';
import { getMaxCardsForSeat } from '../playerConfig';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

function isAhrIllusionProtected(G: TragedyGameState, charId: string): boolean {
  return G.scriptOpen?.tragedySetId === 'another_horizon_revised'
    && getEffectiveRoleId(G, charId) === 'illusion'
    && (G.v1.activeRuleDefinitions || []).some(
      rule => rule.ruleId === 'ahr_illusion_unease_limit' && rule.characterId === charId,
    );
}

/**
 * Validate whether a player can play a card on a target.
 */
export function validatePlayCard(
  G: TragedyGameState,
  playerID: string,
  cardTemplateId: string,
  targetType: 'location' | 'character',
  targetId: string,
  phase: string | undefined,
): ValidationResult {
  const isMastermind = playerID === '0';

  // 阶段校验
  if (isMastermind && phase !== 'mastermind_plan') {
    return { ok: false, reason: '剧本家只能在 mastermind_plan 阶段出牌' };
  }
  if (!isMastermind && phase !== 'protagonist_plan') {
    return { ok: false, reason: '主人公只能在 protagonist_plan 阶段出牌' };
  }

  const hand = G.seatHands[playerID] || [];

  // 手牌校验
  if (hand.indexOf(cardTemplateId) === -1) {
    return { ok: false, reason: '手牌中没有这张卡' };
  }

  // 不能对尸体出牌（FAQ 规则）
  if (targetType === 'character') {
    const targetChar = G.v1.characters[targetId];
    if (targetChar && !targetChar.alive) {
      return { ok: false, reason: '不能对死亡角色出牌' };
    }
    if (!isMastermind && G.v1.ex?.enabled && (targetChar?.exCardCount ?? 0) > 0) {
      return { ok: false, reason: '该角色带有 Ex 牌，主人公不能再对其出牌' };
    }
    if (isMastermind && isAhrIllusionProtected(G, targetId)) {
      return { ok: false, reason: '剧作家不可以往幻影身上设置行动卡' };
    }
    // HSA: 狼人不可被剧作家出行动卡
    if (isMastermind && G.v1.hiddenRoles?.[targetId] === 'werewolf') {
      return { ok: false, reason: '剧作家不可以往狼人身上设置行动卡' };
    }
    // MZ: 预言家不可被剧作家设置任何行动牌
    if (isMastermind && getEffectiveRoleId(G, targetId) === 'prophet') {
      return { ok: false, reason: '剧作家不可以往预言家身上设置行动卡' };
    }
  }

  // 每轮回一次校验
  if (isCardLocked(cardTemplateId, G.board.usedOncePerLoopCards, playerID)) {
    return { ok: false, reason: '此卡本轮回已使用' };
  }

  // 出牌数量校验（动态适配 2/3/4 人模式）
  const myPlayedCards = G.v1.playedCards.filter(c => c.playedBySeat === playerID);
  const maxCards = getMaxCardsForSeat(G, playerID);
  if (myPlayedCards.length >= maxCards) {
    return { ok: false, reason: `已达到出牌上限 (${maxCards})` };
  }

  // 同阵营目标去重校验
  const targetKey = `${targetType}:${targetId}`;
  const side = isMastermind ? 'mastermind' : 'protagonist';
  const mySideCards = G.v1.playedCards.filter(c => c.owner === side);
  if (mySideCards.some(c => `${c.targetType}:${c.targetId}` === targetKey)) {
    return { ok: false, reason: '同阵营已有卡牌放置在此目标上' };
  }

  return { ok: true };
}

/**
 * Validate whether a player can recall a played card.
 */
export function validateRecallCard(
  G: TragedyGameState,
  playerID: string,
  playedCardId: string,
  phase: string | undefined,
): ValidationResult {
  const isMastermind = playerID === '0';

  // 阶段校验
  if (isMastermind && phase !== 'mastermind_plan') {
    return { ok: false, reason: '只能在出牌阶段撤回' };
  }
  if (!isMastermind && phase !== 'protagonist_plan') {
    return { ok: false, reason: '只能在出牌阶段撤回' };
  }

  // 卡牌归属校验
  const card = G.v1.playedCards.find(
    c => c.id === playedCardId && c.playedBySeat === playerID
  );
  if (!card) {
    return { ok: false, reason: '找不到属于你的该卡牌' };
  }

  return { ok: true };
}
