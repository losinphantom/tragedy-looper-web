/**
 * Card Resolution Engine
 *
 * Implements the resolve_cards phase: forbid_movement → movement →
 * other_forbid → other_cards (value changes).
 * Pure function: takes played cards, returns ResolutionEffect objects.
 */

import { getCard, resolveMovementStack } from './data/cardService';
import type { ActionCardRecord } from './data/cardService';

// ── Types ────────────────────────────────────────────────────────────────────

export type PlayedCard = {
  id: string;
  cardTemplateId: string;
  owner: 'mastermind' | 'protagonist';
  targetType: 'location' | 'character';
  targetId: string;
  faceUp: boolean;
  /** Which seat played this card ('0' = mastermind, '1'/'2'/'3' = protagonists) */
  playedBySeat: string;
  /** Protagonist color for card back rendering */
  playedByColor?: 'blue' | 'orange' | 'green';
};

export type ResolutionEffect =
  | { kind: 'move';      targetId: string; axis: 'vertical' | 'horizontal' | 'diagonal' }
  | { kind: 'counter';   targetId: string; counter: string; delta: number }
  | { kind: 'forbidden'; targetId: string; cardId: string; reason: string }
  | { kind: 'no_effect'; targetId: string; cardId: string; reason: string };

// ── Main resolver ────────────────────────────────────────────────────────────

export function resolveAllCards(playedCards: PlayedCard[]): ResolutionEffect[] {
  const effects: ResolutionEffect[] = [];

  const byTarget = new Map<string, { card: PlayedCard; def: ActionCardRecord }[]>();
  for (const pc of playedCards) {
    const def = getCard(pc.cardTemplateId);
    if (!def) continue;
    const key = `${pc.targetType}:${pc.targetId}`;
    if (!byTarget.has(key)) byTarget.set(key, []);
    byTarget.get(key)!.push({ card: pc, def });
  }

  for (const [targetKey, entries] of byTarget) {
    const [targetType, targetId] = targetKey.split(':') as ['location' | 'character', string];

    const hasForbidMove = entries.some((e) => e.def.actionFamily === 'forbid_movement');
    const moveEntries = entries.filter((e) => e.def.actionFamily === 'movement');

    if (hasForbidMove) {
      for (const me of moveEntries) {
        effects.push({
          kind: 'forbidden',
          targetId,
          cardId: me.card.cardTemplateId,
          reason: '被"禁止移动"抵消',
        });
      }
    } else if (moveEntries.length > 0 && targetType === 'character') {
      const axes = moveEntries
        .map((e) => e.def.params.axis as 'vertical' | 'horizontal' | 'diagonal')
        .filter(Boolean);
      const finalAxis = resolveMovementStack(axes);
      if (finalAxis) {
        effects.push({ kind: 'move', targetId, axis: finalAxis });
      }
    }

    const forbidFamilies = new Set<string>();
    for (const e of entries) {
      if (e.def.actionFamily.startsWith('forbid_') && e.def.actionFamily !== 'forbid_movement') {
        const blocked = e.def.actionFamily.replace('forbid_', '');
        forbidFamilies.add(blocked);
      }
    }

    const valueEntries = entries.filter(
      (e) => !e.def.actionFamily.startsWith('forbid_') && e.def.actionFamily !== 'movement'
    );

    // 十周年: 希望+1 撞车降级——同一目标多张 hope 卡 → 全部降级为 goodwill+1
    const hopeEntries = valueEntries.filter((e) => e.def.actionFamily === 'hope');
    if (hopeEntries.length > 1) {
      for (const he of hopeEntries) {
        (he.def as any) = { ...he.def, actionFamily: 'goodwill' };
        effects.push({
          kind: 'no_effect',
          targetId,
          cardId: he.card.cardTemplateId,
          reason: '希望+1 撞车，降级为友好+1',
        });
      }
    }

    for (const ve of valueEntries) {
      if (forbidFamilies.has(ve.def.actionFamily)) {
        effects.push({
          kind: 'forbidden',
          targetId,
          cardId: ve.card.cardTemplateId,
          reason: `被"禁止${ve.def.actionFamily}"抵消`,
        });
        continue;
      }

      const amount = (ve.def.params.amount as number) || 0;
      const op = ve.def.params.operation as string | undefined;
      const delta = op === 'remove' ? -amount : amount;

      if (delta !== 0) {
        effects.push({
          kind: 'counter',
          targetId,
          counter: ve.def.actionFamily,
          delta,
        });
      }
    }
  }

  return effects;
}
