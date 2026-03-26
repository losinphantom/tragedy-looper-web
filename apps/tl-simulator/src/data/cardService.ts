/**
 * Card Service — thin adapter between @tragedy/domain registries and tl-simulator.
 *
 * Design principles:
 *   • Low coupling: the rest of tl-simulator never imports from @tragedy/domain directly.
 *   • This module is the SINGLE bridge; swap it to change data source.
 *   • Exports pure helpers, no side effects.
 */

import { ACTION_CARDS } from '@tragedy/domain';
import type { ActionCardRecord } from '@tragedy/domain';

// ── Re-export core type so consumers don't need to import domain directly ─────
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

/** Get the asset path for a card front image, or undefined. */
export function getCardAssetPath(cardId: string): string | undefined {
  return ACTION_CARDS[cardId]?.source?.cardAssetPath;
}

// ── Deck generators ──────────────────────────────────────────────────────────

/** Return an array of card IDs forming the default Mastermind hand (10 cards). */
export function buildMastermindDeck(): string[] {
  return [
    'mastermind_unease_plus_1',
    'mastermind_unease_plus_1',   // 不安+1 有两张
    'mastermind_unease_minus_1',
    'mastermind_forbid_unease',
    'mastermind_forbid_goodwill',
    'mastermind_intrigue_plus_1',
    'mastermind_intrigue_plus_2',
    'mastermind_move_vertical',
    'mastermind_move_horizontal',
    'mastermind_move_diagonal',
  ];
}

/**
 * Return an array of card IDs forming one Protagonist hand.
 * All three protagonists share the same symmetric deck.
 */
export function buildProtagonistDeck(): string[] {
  return Object.values(ACTION_CARDS)
    .filter((c) => c.owner === 'protagonist')
    .map((c) => c.id);
}

// ── Once-per-loop helpers ────────────────────────────────────────────────────

/** Check if a card is once-per-loop and already consumed this loop. */
export function isCardLocked(cardId: string, usedCards: string[]): boolean {
  const def = ACTION_CARDS[cardId];
  if (!def) return false;
  return def.oncePerLoop && usedCards.includes(cardId);
}

/** Filter a hand to only playable cards (exclude locked once-per-loop). */
export function getPlayableHand(hand: string[], usedCards: string[]): string[] {
  return hand.filter((id) => !isCardLocked(id, usedCards));
}

// ── Movement vector algebra ──────────────────────────────────────────────────

type Axis = 'vertical' | 'horizontal' | 'diagonal';

/**
 * Movement combination table (XOR-style vector addition).
 *
 * V + V = V    H + H = H    D + D = D
 * V + H = D    D + V = H    D + H = V
 */
const MOVE_COMBINE: Record<Axis, Record<Axis, Axis>> = {
  vertical:   { vertical: 'vertical',   horizontal: 'diagonal',   diagonal: 'horizontal' },
  horizontal: { vertical: 'diagonal',   horizontal: 'horizontal', diagonal: 'vertical'   },
  diagonal:   { vertical: 'horizontal', horizontal: 'vertical',   diagonal: 'diagonal'   },
};

/** Combine two movement axes using the board game's vector-addition rule. */
export function combineMoveAxes(a: Axis, b: Axis): Axis {
  return MOVE_COMBINE[a][b];
}

/** Resolve a list of movement card axes into a single final direction (or null if empty / all forbidden). */
export function resolveMovementStack(axes: Axis[]): Axis | null {
  if (axes.length === 0) return null;
  return axes.reduce((acc, cur) => combineMoveAxes(acc, cur));
}

// ── Card ID → Asset filename mapping ─────────────────────────────────────────

/**
 * Maps domain ActionCard IDs to the asset filename prefix under /assets/行动卡面/.
 * The full path is: `/assets/行动卡面/action-card_card-front_${prefix}_01.png`
 *
 * For protagonist cards, we use a color variant. Call getCardAssetFilename()
 * with an optional color parameter.
 */
const CARD_ASSET_PREFIX: Record<string, string> = {
  // ── Mastermind ──
  mastermind_unease_plus_1:   '脚本家不安放置',
  mastermind_unease_minus_1:  '脚本家不安移除',
  mastermind_forbid_unease:   '脚本家不安禁止',
  mastermind_forbid_goodwill: '脚本家友好禁止',
  mastermind_intrigue_plus_1: '脚本家阴谋放置一',
  mastermind_intrigue_plus_2: '脚本家阴谋放置二',
  mastermind_move_vertical:   '脚本家移动上下',
  mastermind_move_horizontal: '脚本家移动左右',
  mastermind_move_diagonal:   '脚本家移动交叉',
  // ── Protagonist (orange default — see getCardAssetFilename for color variants) ──
  protagonist_unease_plus_1:  '主人公橙不安放置',
  protagonist_unease_minus_1: '主人公橙不安移除',
  protagonist_goodwill_plus_1:'主人公橙友好放置一',
  protagonist_goodwill_plus_2:'主人公橙友好放置二',
  protagonist_forbid_intrigue:'主人公橙阴谋禁止',
  protagonist_move_vertical:  '主人公橙移动上下',
  protagonist_move_horizontal:'主人公橙移动左右',
  protagonist_forbid_movement:'主人公橙移动禁止',
};

const PROTAGONIST_COLOR_MAP: Record<string, Record<string, string>> = {
  '橙': {},  // orange is the default, no replacement needed
  '蓝': {
    '主人公橙': '主人公蓝',
  },
  '绿': {
    '主人公橙': '主人公绿',
  },
};

/**
 * Get the full image URL for a card, with optional protagonist color variant.
 * @param cardId     Domain card ID like 'mastermind_unease_plus_1'
 * @param color      Optional: '橙' | '蓝' | '绿' for protagonist color variant
 */
export function getCardImageUrl(cardId: string, color?: '橙' | '蓝' | '绿'): string {
  let prefix = CARD_ASSET_PREFIX[cardId];
  if (!prefix) return '/assets/卡背/card_back_s7_p01_i001.png';

  if (color && color !== '橙' && PROTAGONIST_COLOR_MAP[color]) {
    for (const [from, to] of Object.entries(PROTAGONIST_COLOR_MAP[color])) {
      prefix = prefix.replace(from, to);
    }
  }

  return `/assets/行动卡面/action-card_card-front_${prefix}_01.png`;
}

/** Get the card-back image URL. */
export function getCardBackUrl(owner?: 'mastermind' | 'protagonist', color?: '蓝' | '橙' | '绿'): string {
  if (owner === 'protagonist') {
    if (color === '蓝') return '/assets/卡背/card_back_s7_p02_i002.png';
    if (color === '绿') return '/assets/卡背/card_back_s7_p03_i004.png';
    return '/assets/卡背/card_back_s7_p03_i003.png'; // Orange / Default for protagonists
  }
  return '/assets/卡背/card_back_s7_p01_i001.png'; // Red back for mastermind
}
