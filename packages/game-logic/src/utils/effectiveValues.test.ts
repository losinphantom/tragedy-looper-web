import { describe, expect, it } from 'vitest';

import { TragedyLooper } from '../game';
import type { TragedyGameState } from '../game';
import { createEmptyTokenBag } from './tokenHelpers';
import {
  getActiveHope,
  getActiveDespair,
  getEffectiveGoodwill,
  getEffectiveParanoia,
  getEffectiveIntrigue,
  getHopeOverrideIgnoreGoodwill,
} from './effectiveValues';

function makeG(tokens: Partial<Record<string, number>> = {}): TragedyGameState {
  const G = TragedyLooper.setup!({} as any) as TragedyGameState;
  G.v1.characters = {
    test_char: {
      locationId: 'school',
      alive: true,
      tokens: { ...createEmptyTokenBag(), ...tokens },
    },
  };
  return G;
}

describe('effectiveValues — 十周年希望/绝望有效值计算', () => {
  // ── getActiveHope / getActiveDespair: 冲突优先级 ──

  it('仅有希望时返回希望数量', () => {
    const G = makeG({ hope: 2 });
    expect(getActiveHope(G.v1.characters['test_char'])).toBe(2);
    expect(getActiveDespair(G.v1.characters['test_char'])).toBe(0);
  });

  it('仅有绝望时返回绝望数量', () => {
    const G = makeG({ despair: 3 });
    expect(getActiveHope(G.v1.characters['test_char'])).toBe(0);
    expect(getActiveDespair(G.v1.characters['test_char'])).toBe(3);
  });

  it('希望和绝望同时存在时仅希望生效（希望不服输）', () => {
    const G = makeG({ hope: 1, despair: 5 });
    expect(getActiveHope(G.v1.characters['test_char'])).toBe(1);
    expect(getActiveDespair(G.v1.characters['test_char'])).toBe(0);
  });

  it('都为 0 时两者都返回 0', () => {
    const G = makeG({});
    expect(getActiveHope(G.v1.characters['test_char'])).toBe(0);
    expect(getActiveDespair(G.v1.characters['test_char'])).toBe(0);
  });

  it('不存在的角色返回 0', () => {
    const G = makeG({});
    expect(getActiveHope(G.v1.characters['nonexistent'])).toBe(0);
    expect(getActiveDespair(G.v1.characters['nonexistent'])).toBe(0);
  });

  // ── getEffectiveGoodwill ──

  it('有效友好 = 原友好 + 活跃希望', () => {
    const G = makeG({ goodwill: 2, hope: 1 });
    expect(getEffectiveGoodwill(G.v1.characters['test_char'])).toBe(3);
  });

  it('有绝望无希望时有效友好不受绝望影响', () => {
    const G = makeG({ goodwill: 2, despair: 1 });
    expect(getEffectiveGoodwill(G.v1.characters['test_char'])).toBe(2);
  });

  // ── getEffectiveParanoia ──

  it('有效不安 = 原不安 + 活跃绝望', () => {
    const G = makeG({ paranoia: 1, despair: 2 });
    expect(getEffectiveParanoia(G.v1.characters['test_char'])).toBe(3);
  });

  it('有希望时有效不安不受绝望影响', () => {
    const G = makeG({ paranoia: 1, hope: 1, despair: 3 });
    expect(getEffectiveParanoia(G.v1.characters['test_char'])).toBe(1);
  });

  // ── getEffectiveIntrigue ──

  it('有效暗跃 = 原暗跃 + 活跃绝望 - 活跃希望', () => {
    const G = makeG({ intrigue: 3, despair: 2 });
    expect(getEffectiveIntrigue(G.v1.characters['test_char'])).toBe(5);
  });

  it('希望减少有效暗跃', () => {
    const G = makeG({ intrigue: 3, hope: 2 });
    expect(getEffectiveIntrigue(G.v1.characters['test_char'])).toBe(1);
  });

  it('有效暗跃最低为 0', () => {
    const G = makeG({ intrigue: 0, hope: 5 });
    expect(getEffectiveIntrigue(G.v1.characters['test_char'])).toBe(0);
  });

  it('希望绝望共存时暗跃仅被希望减少（绝望被压制）', () => {
    const G = makeG({ intrigue: 4, hope: 1, despair: 3 });
    // 活跃希望=1, 活跃绝望=0 → 4 + 0 - 1 = 3
    expect(getEffectiveIntrigue(G.v1.characters['test_char'])).toBe(3);
  });

  // ── getHopeOverrideIgnoreGoodwill ──

  it('有希望时强制消除无视友好（返回 false）', () => {
    const G = makeG({ hope: 1 });
    expect(getHopeOverrideIgnoreGoodwill(G.v1.characters['test_char'])).toBe(false);
  });

  it('有绝望无希望时强制赋予无视友好（返回 true）', () => {
    const G = makeG({ despair: 1 });
    expect(getHopeOverrideIgnoreGoodwill(G.v1.characters['test_char'])).toBe(true);
  });

  it('有希望覆盖绝望赋予的无视友好（返回 false）', () => {
    const G = makeG({ hope: 1, despair: 3 });
    expect(getHopeOverrideIgnoreGoodwill(G.v1.characters['test_char'])).toBe(false);
  });

  it('都没有时不产生覆盖效果（返回 null）', () => {
    const G = makeG({});
    expect(getHopeOverrideIgnoreGoodwill(G.v1.characters['test_char'])).toBeNull();
  });

  it('不存在的角色返回 null', () => {
    const G = makeG({});
    expect(getHopeOverrideIgnoreGoodwill(G.v1.characters['nonexistent'])).toBeNull();
  });
});
