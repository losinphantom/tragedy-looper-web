import { describe, expect, it } from 'vitest';

import { resolveAllCards, type PlayedCard, type ResolutionEffect } from './cardResolver';

function makeCard(
  id: string,
  templateId: string,
  owner: 'mastermind' | 'protagonist',
  targetType: 'character' | 'location',
  targetId: string,
): PlayedCard {
  return {
    id,
    cardTemplateId: templateId,
    owner,
    targetType,
    targetId,
    faceUp: false,
  };
}

describe('cardResolver — resolveAllCards', () => {
  // ── 禁止移动 ──────────────────────────────────────────────────────────

  it('forbid movement nullifies movement cards on the same target', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_forbid_movement', 'protagonist', 'character', 'doctor'),
      makeCard('c2', 'protagonist_move_vertical', 'protagonist', 'character', 'doctor'),
    ];

    const effects = resolveAllCards(cards);

    const forbidden = effects.filter(e => e.kind === 'forbidden' && e.targetId === 'doctor');
    expect(forbidden.length).toBeGreaterThanOrEqual(1);
    const moves = effects.filter(e => e.kind === 'move');
    expect(moves.length).toBe(0);
  });

  // ── 移动结算 ──────────────────────────────────────────────────────────

  it('resolves single movement card into a move effect', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_move_vertical', 'protagonist', 'character', 'doctor'),
    ];

    const effects = resolveAllCards(cards);

    const moves = effects.filter(e => e.kind === 'move');
    expect(moves.length).toBe(1);
    expect(moves[0]).toMatchObject({ kind: 'move', targetId: 'doctor' });
  });

  it('marks movement cards on locations as no_effect', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_move_vertical', 'protagonist', 'location', 'hospital'),
    ];

    const effects = resolveAllCards(cards);

    const noEffect = effects.filter(e => e.kind === 'no_effect' && e.targetId === 'hospital');
    expect(noEffect.length).toBe(1);
    expect(noEffect[0]).toMatchObject({ reason: expect.stringContaining('无效') });
  });

  // ── 禁止暗跃互抵 ──────────────────────────────────────────────────────

  it('nullifies forbid_intrigue when 2+ protagonists play it', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_forbid_intrigue', 'protagonist', 'character', 'doctor'),
      makeCard('c2', 'protagonist_forbid_intrigue', 'protagonist', 'character', 'nurse'),
      makeCard('c3', 'mastermind_intrigue_plus_1', 'mastermind', 'character', 'doctor'),
    ];

    const effects = resolveAllCards(cards);

    // 禁止暗跃被互相抵消
    const noEffects = effects.filter(e => e.kind === 'no_effect' && e.reason?.includes('互相抵消'));
    expect(noEffects.length).toBe(2);

    // 阴谋+1 应当生效（因为禁止被抵消了）
    const counterEffects = effects.filter(e => e.kind === 'counter' && e.targetId === 'doctor');
    expect(counterEffects.length).toBe(1);
  });

  it('skips forbid_intrigue nullification when wmOldSealActive', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_forbid_intrigue', 'protagonist', 'character', 'doctor'),
      makeCard('c2', 'protagonist_forbid_intrigue', 'protagonist', 'character', 'nurse'),
    ];

    const effects = resolveAllCards(cards, [], true);

    // 不应被互抵
    const noEffects = effects.filter(e => e.kind === 'no_effect' && e.reason?.includes('互相抵消'));
    expect(noEffects.length).toBe(0);
  });

  // ── 免疫列表 ──────────────────────────────────────────────────────────

  it('skips forbid card for characters with immunity', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'mastermind_forbid_goodwill', 'mastermind', 'character', 'doctor'),
      makeCard('c2', 'protagonist_goodwill_plus_1', 'protagonist', 'character', 'doctor'),
    ];

    const immunities = [{ characterId: 'doctor', immuneToForbid: 'forbid_goodwill' }];
    const effects = resolveAllCards(cards, immunities);

    // 禁止友好被免疫跳过
    const noEffects = effects.filter(e => e.kind === 'no_effect' && e.reason?.includes('无视'));
    expect(noEffects.length).toBe(1);

    // 友好+1 应当生效（因为禁止被免疫了）
    const counterEffects = effects.filter(e => e.kind === 'counter' && e.targetId === 'doctor');
    expect(counterEffects.length).toBe(1);
  });

  // ── Token 结算 ─────────────────────────────────────────────────────────

  it('produces counter effects for token cards', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'mastermind_unease_plus_1', 'mastermind', 'character', 'doctor'),
      makeCard('c2', 'protagonist_goodwill_plus_1', 'protagonist', 'character', 'doctor'),
    ];

    const effects = resolveAllCards(cards);

    const counters = effects.filter(e => e.kind === 'counter' && e.targetId === 'doctor');
    expect(counters.length).toBe(2);
  });

  it('blocks value cards when matching forbid card is present', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'mastermind_forbid_unease', 'mastermind', 'character', 'doctor'),
      makeCard('c2', 'protagonist_unease_plus_1', 'protagonist', 'character', 'doctor'),
    ];

    const effects = resolveAllCards(cards);

    const forbidden = effects.filter(e => e.kind === 'forbidden' && e.targetId === 'doctor');
    expect(forbidden.length).toBeGreaterThanOrEqual(1);
  });

  // ── 地点限制 ──────────────────────────────────────────────────────────

  it('rejects non-intrigue value cards on locations', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_goodwill_plus_1', 'protagonist', 'location', 'school'),
    ];

    const effects = resolveAllCards(cards);

    const noEffects = effects.filter(e => e.kind === 'no_effect' && e.targetId === 'school');
    expect(noEffects.length).toBe(1);
    expect(noEffects[0]).toMatchObject({ reason: expect.stringContaining('无效') });
  });

  it('allows intrigue cards on locations', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'mastermind_intrigue_plus_1', 'mastermind', 'location', 'school'),
    ];

    const effects = resolveAllCards(cards);

    const counters = effects.filter(e => e.kind === 'counter' && e.targetId === 'school');
    expect(counters.length).toBe(1);
  });

  // ── 十周年希望+1 撞车 ─────────────────────────────────────────────────

  it('downgrades hope cards to goodwill when multiple hope cards target the same entity', () => {
    const cards: PlayedCard[] = [
      makeCard('c1', 'protagonist_hope_plus_1', 'protagonist', 'character', 'doctor'),
      makeCard('c2', 'protagonist_hope_plus_1', 'protagonist', 'character', 'doctor'),
    ];

    const effects = resolveAllCards(cards);

    const noEffects = effects.filter(e => e.kind === 'no_effect' && e.reason?.includes('撞车'));
    expect(noEffects.length).toBe(2);
  });
});
