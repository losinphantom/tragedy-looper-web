/**
 * Card Service — thin adapter between @tragedy/domain registries and game logic.
 *
 * Exports pure helpers for card lookups, deck building, and movement algebra.
 *
 * ## Seat-aware design
 * - Mastermind = seat '0', gets one crimson deck.
 * - Protagonists = seats '1', '2', '3', each gets an independent symmetric deck.
 * - Card backs are color-coded per seat for correct rendering.
 */

import { ACTION_CARDS } from '@tragedy/domain';
import type { ActionCardRecord } from '@tragedy/domain';

// ── Re-export core type ──────────────────────────────────────────────────────
export type { ActionCardRecord };

// ── Seat → Color mapping ─────────────────────────────────────────────────────

export type ProtagonistColor = 'blue' | 'orange' | 'green';

const SEAT_COLOR_MAP: Record<string, ProtagonistColor> = {
  '1': 'orange',
  '2': 'green',
  '3': 'blue',
};

export function getSeatColor(seatId: string): ProtagonistColor | undefined {
  return SEAT_COLOR_MAP[seatId];
}

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

/** Alias for getCardAssetPath to maintain compatibility with Board.tsx */
export const getCardImageUrl = getCardAssetPath;

/**
 * Get the asset path for the card back image.
 * - Mastermind (seat '0') → dark crimson back
 * - Protagonists → color-coded back matching their seat color
 */
export function getCardBackUrl(seatId?: string): string {
  if (!seatId || seatId === '0') {
    return '/assets/行动牌卡面/card_back.png';
  }
  const color = SEAT_COLOR_MAP[seatId];
  if (color) {
    return `/assets/行动牌卡面/card_back_${color}.png`;
  }
  return '/assets/行动牌卡面/card_back.png';
}

// ── Deck generators ──────────────────────────────────────────────────────────

export interface DeckBuildOptions {
  tenthAnniversary?: boolean;
}

/** Return an array of card IDs forming the default Mastermind hand (10 cards). */
export function buildMastermindDeck(options?: DeckBuildOptions): string[] {
  const deck = [
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
  if (options?.tenthAnniversary) {
    deck.push('mastermind_despair_plus_1', 'mastermind_goodwill_plus_1');
  }
  return deck;
}

/**
 * Return an array of card IDs forming one Protagonist hand.
 * All three protagonists share the same symmetric deck structure.
 */
export function buildProtagonistDeck(options?: DeckBuildOptions): string[] {
  const base = Object.values(ACTION_CARDS)
    .filter((c) => c.owner === 'protagonist' && c.id !== 'protagonist_hope_plus_1' && c.id !== 'protagonist_unease_plus_2')
    .map((c) => c.id);
  if (options?.tenthAnniversary) {
    base.push('protagonist_hope_plus_1', 'protagonist_unease_plus_2');
  }
  return base;
}

// ── Once-per-loop helpers ────────────────────────────────────────────────────

/** Check if a card is once-per-loop and already consumed this loop for this seat. */
export function isCardLocked(cardId: string, usedCards: string[], seatId?: string): boolean {
  const def = ACTION_CARDS[cardId];
  if (!def) return false;
  if (!def.oncePerLoop) return false;
  // 按 seat:cardId 组合键检查（避免跨 seat 锁定）
  const lockKey = seatId ? `${seatId}:${cardId}` : cardId;
  return usedCards.includes(lockKey);
}

/** Filter a hand to only playable cards (exclude locked once-per-loop). */
export function getPlayableHand(hand: string[], usedCards: string[], seatId?: string): string[] {
  return hand.filter((id) => !isCardLocked(id, usedCards, seatId));
}

// ── Movement vector algebra ──────────────────────────────────────────────────

type Axis = 'vertical' | 'horizontal' | 'diagonal';

/**
 * Movement combination table (XOR-style vector addition).
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

/** Resolve a list of movement card axes into a single final direction (or null if empty). */
export function resolveMovementStack(axes: Axis[]): Axis | null {
  if (axes.length === 0) return null;
  return axes.reduce((acc, cur) => combineMoveAxes(acc, cur));
}
