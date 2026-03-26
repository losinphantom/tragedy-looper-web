import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '@tragedy/domain';

import { TragedyLooper } from '../../../game';
import type { TragedyGameState } from '../../../game';
import { executeGoodwillAbility } from '../../../engine/goodwillResolver';
import { isOncePerLoopGoodwillAbility } from '../../../engine/goodwill/effects';
import { ownedCharacterGoodwillHandlers } from './index';
import { createEmptyTokenBag, getToken } from '../../../utils/tokenHelpers';
import { hasImmortalityByRole, isIncidentImmune, isRemovedFromBoard, getEffectiveLocations } from './shared';

function createMinimalG(overrides: Partial<TragedyGameState> = {}): TragedyGameState {
  const G = TragedyLooper.setup!({} as any) as TragedyGameState;
  Object.assign(G, overrides);
  return G;
}

describe('友好能力 handler — Phase 18 回归测试', () => {
  // ── 1. Registry 完整性 ──────────────────────────────────────────────

  it('所有 goodwill_window timing 的能力都有对应 handler', () => {
    const missingHandlers: string[] = [];
    for (const [charId, charDef] of Object.entries(CHARACTERS)) {
      for (const ability of charDef.goodwillAbilities ?? []) {
        if (ability.timing === 'goodwill_window') {
          if (!ownedCharacterGoodwillHandlers[ability.id]) {
            missingHandlers.push(`${charId}:${ability.id}`);
          }
        }
      }
    }
    expect(missingHandlers).toEqual([]);
  });

  it('handler registry 包含至少 40 个 handler', () => {
    expect(Object.keys(ownedCharacterGoodwillHandlers).length).toBeGreaterThanOrEqual(40);
  });

  // ── 2. Bug 修复回归（Plan 01 Task 3-5）──────────────────────────────

  it('soldier_gw2 不选择自身', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      soldier: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      bystander: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'soldier', 'soldier_gw2');

    // soldier 不应该是被选择的目标
    expect(getToken(G.v1.characters.bystander, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.soldier, 'paranoia')).toBe(0);
  });

  it('temp_worker_question_gw2 不选择自身', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      temp_worker_question: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      other: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = { temp_worker_question: 'person' };

    executeGoodwillAbility(G, 'temp_worker_question', 'temp_worker_question_gw2');

    expect(getToken(G.v1.characters.other, 'goodwill')).toBe(2);
  });

  it('follower_gw2 可选择不同区域的角色', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      follower: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      remote_char: { locationId: 'hospital', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'follower', 'follower_gw2');

    // 应能选到不同区域的角色
    const traitKey = '__trait_append:remote_char:student';
    expect(G.v1.loopState.abilityUsage[traitKey]?.usedThisLoop).toBe(true);
  });

  // ── 3. selectedTargets 接入 ─────────────────────────────────────────

  it('soldier_gw2 使用 selectedTargets 指定目标', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      soldier: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target_a: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target_b: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'soldier', 'soldier_gw2', { target: 'target_b' });

    expect(getToken(G.v1.characters.target_b, 'paranoia')).toBe(2);
    expect(getToken(G.v1.characters.target_a, 'paranoia')).toBe(0);
  });

  it('soldier_gw2 无 selectedTargets 时 fallback 到自动选择', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      soldier: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      auto_target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'soldier', 'soldier_gw2');

    expect(getToken(G.v1.characters.auto_target, 'paranoia')).toBe(2);
  });

  it('forensic_scientist_gw2 读取 fromCharacter 派生的 tokenType 槽位', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      forensic_scientist: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      source: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1, intrigue: 1 },
      },
      receiver: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'forensic_scientist', 'forensic_scientist_gw2', {
      fromCharacter: 'source',
      toCharacter: 'receiver',
      'source::tokenType': 'intrigue',
    });

    expect(getToken(G.v1.characters.source, 'intrigue')).toBe(0);
    expect(getToken(G.v1.characters.receiver, 'intrigue')).toBe(1);
    expect(getToken(G.v1.characters.source, 'paranoia')).toBe(1);
  });

  it('immortal_gw1 读取 destination 派生的尸体槽位', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      immortal: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      corpse_a: { locationId: 'school', alive: false, tokens: createEmptyTokenBag() },
      corpse_b: { locationId: 'school', alive: false, tokens: createEmptyTokenBag() },
    };
    G.v1.locations = {
      city: { tokens: createEmptyTokenBag() },
      school: { tokens: createEmptyTokenBag() },
      hospital: { tokens: createEmptyTokenBag() },
      shrine: { tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'immortal', 'immortal_gw1', {
      destination: 'school',
      'school::target': 'corpse_b',
    });

    expect(G.v1.characters.immortal.locationId).toBe('school');
    expect(G.v1.characters.corpse_b.alive).toBe(true);
    expect(G.v1.characters.corpse_a.alive).toBe(false);
  });

  it('vlogger_gw2_move_paranoia 读取 target 派生的 exReceiver 槽位', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      vlogger: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target_a: {
        locationId: 'city',
        alive: true,
        tokens: { ...createEmptyTokenBag(), paranoia: 1, ex: 1 } as any,
      },
      target_b: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target_c: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'vlogger', 'vlogger_gw2_move_paranoia', {
      target: 'target_a',
      'target_a::exReceiver': 'target_c',
    });

    expect(getToken(G.v1.characters.target_a, 'goodwill')).toBe(1);
    expect(getToken(G.v1.characters.target_a, 'paranoia')).toBe(0);
    expect((G.v1.characters.target_a.tokens as any).ex ?? 0).toBe(0);
    expect((G.v1.characters.target_c.tokens as any).ex ?? 0).toBe(1);
    expect((G.v1.characters.target_b.tokens as any).ex ?? 0).toBe(0);
  });

  // ── 4. effects.ts 清理回归 ──────────────────────────────────────────

  it('executeGoodwillAbility 分发到 handler 而非旧空壳', () => {
    const G = createMinimalG();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.characters = {
      soldier: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      target: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    executeGoodwillAbility(G, 'soldier', 'soldier_gw2');

    // 旧空壳会输出 "效果未实现"，新实现会输出实际效果
    expect(G.publicLog.some(line => line.includes('效果未实现'))).toBe(false);
    expect(G.publicLog.some(line => line.includes('+2 不安'))).toBe(true);
  });

  it('isOncePerLoopGoodwillAbility 只查 oncePerLoop 字段，不依赖文本匹配', () => {
    // 所有 domain 中有 oncePerLoop: true 的能力都应返回 true
    for (const [charId, charDef] of Object.entries(CHARACTERS)) {
      for (const ability of charDef.goodwillAbilities ?? []) {
        if (ability.oncePerLoop) {
          expect(isOncePerLoopGoodwillAbility(charId, ability.id)).toBe(true);
        }
      }
    }
  });

  // ── 5. 不死查表 (Plan 01 Task 6) ────────────────────────────────────

  it('hasImmortalityByRole 覆盖完整的不死身份列表', () => {
    const G = createMinimalG();
    G.v1.hiddenRoles = { char_a: 'time_traveler', char_b: 'person', char_c: 'vampire' };
    G.v1.characters = {
      char_a: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      char_b: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      char_c: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    expect(hasImmortalityByRole(G, 'char_a')).toBe(true);  // time_traveler
    expect(hasImmortalityByRole(G, 'char_b')).toBe(false);  // person
    expect(hasImmortalityByRole(G, 'char_c')).toBe(true);   // vampire
  });

  // ── 6. 解耦查询函数 ────────────────────────────────────────────────

  it('isIncidentImmune 正确读取 henchman_gw3 flag', () => {
    const G = createMinimalG();
    expect(isIncidentImmune(G, 'henchman')).toBe(false);

    executeGoodwillAbility(G, 'henchman', 'henchman_gw3');

    expect(isIncidentImmune(G, 'henchman')).toBe(true);
  });

  it('isRemovedFromBoard 正确读取 illusion_gw4 flag', () => {
    const G = createMinimalG();
    G.v1.characters = {
      illusion: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    expect(isRemovedFromBoard(G, 'illusion')).toBe(false);

    executeGoodwillAbility(G, 'illusion', 'illusion_gw4');

    expect(isRemovedFromBoard(G, 'illusion')).toBe(true);
    // FAQ: alive 状态不改变
    expect(G.v1.characters.illusion.alive).toBe(true);
  });

  it('getEffectiveLocations 返回相邻版图（immortal_gw3 激活时）', () => {
    const G = createMinimalG();
    G.v1.characters = {
      immortal: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    // 未激活时只返回当前位置
    expect(getEffectiveLocations(G, 'immortal')).toEqual(['city']);

    executeGoodwillAbility(G, 'immortal', 'immortal_gw3');

    // 激活后返回当前位置 + 相邻版图
    const locs = getEffectiveLocations(G, 'immortal');
    expect(locs).toContain('city');
    expect(locs.length).toBeGreaterThan(1);
  });
});
