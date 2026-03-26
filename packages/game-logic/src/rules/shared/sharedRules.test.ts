import { describe, expect, it } from 'vitest';

import { TragedyLooper } from '../../game';
import type { RuleContext } from '../../ruleEngine';
import { createEmptyTokenBag, getToken } from '../../utils/tokenHelpers';
import { countDistinctTokenTypes } from './helpers';
import { killCharacter } from './killCharacter';

function makeRuleContext(overrides: Partial<RuleContext> = {}): RuleContext {
  const G = TragedyLooper.setup!({} as any);

  G.v1.characters = {
    doctor: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    police: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
  };
  G.v1.locations = {
    hospital: { tokens: createEmptyTokenBag() },
    city: { tokens: createEmptyTokenBag() },
  };
  G.v1.hiddenRoles = {
    doctor: 'doctor',
    police: 'police',
  };
  G.v1.originalRoles = {
    doctor: 'doctor',
    police: 'police',
  };
  G.fullLog = [];
  G.publicLog = [];

  return {
    G,
    timing: 'role_action',
    ...overrides,
  };
}

describe('rules/shared helpers', () => {
  it('counts distinct token types with positive values only', () => {
    expect(countDistinctTokenTypes({
      tokens: {
        ...createEmptyTokenBag(),
        paranoia: 2,
        intrigue: 1,
        goodwill: 0,
        hope: 3,
      },
    })).toBe(3);
  });

  it('kills a mortal character through the shared helper and records loop death state', () => {
    const ctx = makeRuleContext();

    const killed = killCharacter(ctx, 'doctor', {
      recordDeadCharactersAtLeastOnce: true,
    });

    expect(killed).toBe(true);
    expect(ctx.G.v1.characters.doctor.alive).toBe(false);
    expect(ctx.G.v1.loopState.deathFlagCount).toBe(1);
    expect(ctx.G.v1.loopState.deadCharactersAtLeastOnce).toContain('doctor');
    expect(ctx.G.publicLog).toContain('💀 医生 死亡');
  });

  it('consumes a guard token instead of killing the character', () => {
    const ctx = makeRuleContext();
    ctx.G.v1.characters.doctor.tokens.guard = 1;

    const killed = killCharacter(ctx, 'doctor');

    expect(killed).toBe(false);
    expect(ctx.G.v1.characters.doctor.alive).toBe(true);
    expect(getToken(ctx.G.v1.characters.doctor, 'guard')).toBe(0);
    expect(ctx.G.v1.loopState.deathFlagCount).toBe(0);
  });
});
