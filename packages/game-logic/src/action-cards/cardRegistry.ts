/**
 * Card Registry — card lookups, asset paths, deck building, lock checks.
 *
 * Migrated from data/cardService.ts.  All functions are pure (no G mutation).
 */

import { ACTION_CARDS } from '@tragedy/domain';
import type { ActionCardRecord } from '@tragedy/domain';

// ── Re-export core type ──────────────────────────────────────────────────────
export type { ActionCardRecord };

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Get a card definition by its registry id. */
export function getCard(cardId: string): ActionCardRecord | undefined {
  return ACTION_CARDS[cardId];
}

/** Get the localized label for a card (zh-CN). */
export function getCardLabel(cardId: string): string {
  return ACTION_CARDS[cardId]?.label['zh-CN'] ?? cardId;
}

/** 
 * Get the asset path for a card front image, based on the player role mapping.
 * playerRole can be 'mastermind', 'protagonist_1' (Orange), 'protagonist_2' (Green), 'protagonist_3' (Blue)
 */
export function getCardAssetPath(cardId: string, playerRole?: string): string | undefined {
  const baseCard = ACTION_CARDS[cardId];
  if (!baseCard) return undefined;

  if (!playerRole) {
    playerRole = baseCard.owner === 'mastermind' ? 'mastermind' : 'protagonist_1';
  }

  let prefix = '';
  if (playerRole === 'mastermind' && baseCard.owner === 'mastermind') {
    prefix = '脚本家';
  } else if (baseCard.owner === 'protagonist') {
    if (playerRole === 'protagonist_1') prefix = '主人公橙';
    else if (playerRole === 'protagonist_2') prefix = '主人公绿';
    else if (playerRole === 'protagonist_3') prefix = '主人公蓝';
    else prefix = '主人公橙';
  } else {
    return baseCard.source?.cardAssetPath;
  }

  const cardNameMap: Record<string, string> = {
    'protagonist_unease_plus_1': '不安放置_01',
    'protagonist_unease_minus_1': '不安移除_01',
    'protagonist_goodwill_plus_1': '友好放置一_01',
    'protagonist_goodwill_plus_2': '友好放置二_01',
    'protagonist_forbid_intrigue': '阴谋禁止_01',
    'protagonist_move_vertical': '移动上下_01',
    'protagonist_move_horizontal': '移动左右_01',
    'protagonist_forbid_movement': '移动禁止_01',
    'mastermind_unease_plus_1': '不安放置',
    'mastermind_unease_minus_1': '不安移除',
    'mastermind_forbid_unease': '不安禁止',
    'mastermind_forbid_goodwill': '友好禁止',
    'mastermind_intrigue_plus_1': '阴谋放置',
    'mastermind_intrigue_plus_2': '阴谋放置二',
    'mastermind_move_vertical': '移动上下',
    'mastermind_move_horizontal': '移动左右',
    'mastermind_move_diagonal': '移动交叉',
  };

  const mappedName = cardNameMap[cardId];
  if (!mappedName) return baseCard.source?.cardAssetPath;

  if (playerRole === 'mastermind') {
    const mmMap: Record<string, string> = {
      'mastermind_unease_plus_1': 'action-card_card-front_脚本家不安放置_02.png',
      'mastermind_unease_minus_1': 'action-card_card-front_脚本家不安移除.png',
      'mastermind_forbid_unease': 'action-card_card-front_脚本家不安禁止.png',
      'mastermind_forbid_goodwill': 'action-card_card-front_脚本家友好禁止.png',
      'mastermind_intrigue_plus_1': 'action-card_card-front_脚本家阴谋放置.png',
      'mastermind_intrigue_plus_2': 'action-card_card-front_脚本家阴谋放置二.png',
      'mastermind_move_vertical': 'action-card_card-front_脚本家移动上下.png',
      'mastermind_move_horizontal': 'action-card_card-front_脚本家移动左右.png',
      'mastermind_move_diagonal': 'action-card_card-front_脚本家移动交叉.png',
    };
    return `/assets/行动卡面/${mmMap[cardId]}`;
  }

  const finalFilename = `action-card_card-front_${prefix}${mappedName}`;
  if (playerRole === 'protagonist_2' && cardId === 'protagonist_unease_plus_1') {
    return `/assets/行动卡面/action-card_card-front_主人公绿不安放置_01.png`;
  }
  return `/assets/行动卡面/${finalFilename.endsWith('.png') ? finalFilename : finalFilename + '.png'}`;
}

/** Alias for getCardAssetPath to maintain compatibility */
export const getCardImageUrl = getCardAssetPath;

/** Get the card-back image URL. */
export function getCardBackUrl(playerRoleOrSeat?: string, owner?: string): string {
  if (playerRoleOrSeat === '1' || playerRoleOrSeat === 'protagonist_1') return '/assets/卡背/card_back_主人公橙.png';
  if (playerRoleOrSeat === '2' || playerRoleOrSeat === 'protagonist_2') return '/assets/卡背/card_back_主人公绿.png';
  if (playerRoleOrSeat === '3' || playerRoleOrSeat === 'protagonist_3') return '/assets/卡背/card_back_主人公蓝.png';
  if (playerRoleOrSeat === '0' || playerRoleOrSeat === 'mastermind' || owner === 'mastermind') return '/assets/卡背/card_back_剧作家.png';
  if (owner === 'protagonist') return '/assets/卡背/card_back_主人公橙.png';
  return '/assets/卡背/card_back_剧作家.png';
}

// ── Deck generators ──────────────────────────────────────────────────────────

export interface DeckBuildOptions {
  tenthAnniversary?: boolean;
}

/** Return an array of card IDs forming the default Mastermind hand. */
export function buildMastermindDeck(options?: DeckBuildOptions): string[] {
  const deck = [
    'mastermind_unease_plus_1',
    'mastermind_unease_plus_1',
    'mastermind_unease_minus_1',
    'mastermind_forbid_unease',
    'mastermind_forbid_goodwill',
    'mastermind_intrigue_plus_1',
    'mastermind_intrigue_plus_2',
    'mastermind_move_vertical',
    'mastermind_move_horizontal',
    'mastermind_move_diagonal',
  ];
  if (options?.tenthAnniversary) {
    deck.push('mastermind_despair_plus_1', 'mastermind_goodwill_plus_1');
  }
  return deck;
}

/** Return an array of card IDs forming one Protagonist hand. */
export function buildProtagonistDeck(options?: DeckBuildOptions): string[] {
  const deck = [
    'protagonist_unease_plus_1',
    'protagonist_unease_minus_1',
    'protagonist_goodwill_plus_1',
    'protagonist_goodwill_plus_2',
    'protagonist_forbid_intrigue',
    'protagonist_move_vertical',
    'protagonist_move_horizontal',
    'protagonist_forbid_movement',
  ];
  if (options?.tenthAnniversary) {
    deck.push('protagonist_hope_plus_1', 'protagonist_unease_plus_2');
  }
  return deck;
}

// ── Once-per-loop helpers ────────────────────────────────────────────────────

/** Check if a card is once-per-loop and already consumed this loop for this seat. */
export function isCardLocked(cardId: string, usedCards: string[], seatId?: string): boolean {
  const def = ACTION_CARDS[cardId];
  if (!def) return false;
  if (!def.oncePerLoop) return false;
  const lockKey = seatId ? `${seatId}:${cardId}` : cardId;
  return usedCards.includes(lockKey);
}

/** Filter a hand to only playable cards (exclude locked once-per-loop). */
export function getPlayableHand(hand: string[], usedCards: string[], seatId?: string): string[] {
  return hand.filter((id) => !isCardLocked(id, usedCards, seatId));
}
