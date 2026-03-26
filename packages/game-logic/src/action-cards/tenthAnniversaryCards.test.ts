/**
 * Tenth Anniversary Card Tests — 十周年卡牌管道测试
 *
 * 覆盖：counterMap 映射、hope 撞车降级、卡组构建函数
 */

import { describe, it, expect } from 'vitest';
import { resolveAllCards, applyEffects } from './cardResolver';
import { buildMastermindDeck, buildProtagonistDeck } from './cardRegistry';
import type { PlayedCard } from './cardResolver';
import { getToken } from '../utils/tokenHelpers';

function makeTestG(): any {
  return {
    v1: {
      characters: {
        boy_student: { alive: true, locationId: 'city', tokens: { paranoia: 0, goodwill: 0, intrigue: 0, hope: 0, despair: 0 } },
        girl_student: { alive: true, locationId: 'city', tokens: { paranoia: 0, goodwill: 0, intrigue: 0, hope: 0, despair: 0 } },
      },
      locations: {},
      loopState: { abilityUsage: {} },
    },
    publicLog: [] as string[],
    fullLog: [] as string[],
  };
}

describe('十周年卡牌 counterMap', () => {
  it('hope counter 正确应用到角色', () => {
    const G = makeTestG();
    const cards: PlayedCard[] = [{
      id: '1', cardTemplateId: 'protagonist_hope_plus_1', owner: 'protagonist',
      targetType: 'character', targetId: 'boy_student', faceUp: true,
    }];
    const effects = resolveAllCards(cards);
    expect(effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'counter', targetId: 'boy_student', counter: 'hope', delta: 1,
      }),
    ]));

    applyEffects(G, effects);
    expect(getToken(G.v1.characters.boy_student, 'hope')).toBe(1);
  });

  it('despair counter 正确应用到角色', () => {
    const G = makeTestG();
    const cards: PlayedCard[] = [{
      id: '2', cardTemplateId: 'mastermind_despair_plus_1', owner: 'mastermind',
      targetType: 'character', targetId: 'girl_student', faceUp: true,
    }];
    const effects = resolveAllCards(cards);
    expect(effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'counter', targetId: 'girl_student', counter: 'despair', delta: 1,
      }),
    ]));

    applyEffects(G, effects);
    expect(getToken(G.v1.characters.girl_student, 'despair')).toBe(1);
  });
});

describe('hope 撞车降级', () => {
  it('同一目标 2 张 hope → 全部降级为 goodwill+1', () => {
    const cards: PlayedCard[] = [
      { id: '1', cardTemplateId: 'protagonist_hope_plus_1', owner: 'protagonist',
        targetType: 'character', targetId: 'boy_student', faceUp: true, playedBySeat: '1' },
      { id: '2', cardTemplateId: 'protagonist_hope_plus_1', owner: 'protagonist',
        targetType: 'character', targetId: 'boy_student', faceUp: true, playedBySeat: '2' },
    ];
    const effects = resolveAllCards(cards);

    const noEffects = effects.filter(e => e.kind === 'no_effect');
    expect(noEffects.length).toBe(2);
    expect(noEffects[0]).toMatchObject({ reason: '希望+1 撞车，降级为友好+1' });

    const counters = effects.filter(e => e.kind === 'counter');
    expect(counters.length).toBe(2);
    for (const c of counters) {
      expect(c).toMatchObject({ counter: 'goodwill', delta: 1 });
    }
  });

  it('单张 hope 不降级', () => {
    const cards: PlayedCard[] = [
      { id: '1', cardTemplateId: 'protagonist_hope_plus_1', owner: 'protagonist',
        targetType: 'character', targetId: 'boy_student', faceUp: true },
    ];
    const effects = resolveAllCards(cards);
    expect(effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'counter', targetId: 'boy_student', counter: 'hope', delta: 1,
      }),
    ]));
    expect(effects.filter(e => e.kind === 'no_effect')).toHaveLength(0);
  });
});

describe('十周年卡组构建', () => {
  it('默认卡组不含十周年卡牌', () => {
    const mmDeck = buildMastermindDeck();
    const pDeck = buildProtagonistDeck();
    expect(mmDeck).not.toContain('mastermind_despair_plus_1');
    expect(mmDeck).not.toContain('mastermind_goodwill_plus_1');
    expect(pDeck).not.toContain('protagonist_hope_plus_1');
    expect(pDeck).not.toContain('protagonist_unease_plus_2');
  });

  it('tenthAnniversary=true 时追加新卡牌', () => {
    const mmDeck = buildMastermindDeck({ tenthAnniversary: true });
    const pDeck = buildProtagonistDeck({ tenthAnniversary: true });
    expect(mmDeck).toContain('mastermind_despair_plus_1');
    expect(mmDeck).toContain('mastermind_goodwill_plus_1');
    expect(pDeck).toContain('protagonist_hope_plus_1');
    expect(pDeck).toContain('protagonist_unease_plus_2');
  });

  it('十周年剧作家卡组为 12 张', () => {
    expect(buildMastermindDeck({ tenthAnniversary: true })).toHaveLength(12);
  });
});
