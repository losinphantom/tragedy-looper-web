/**
 * Phase 2 Integration Test — 身份能力 + 友好能力 + 剧作家能力
 *
 * 直接调用处理器进行 mock 测试，不依赖 boardgame.io Client。
 */

import { roleProcessors } from '../packages/game-logic/src/rules/roleProcessors';
import { incidentProcessors } from '../packages/game-logic/src/rules/incidentProcessors';
import {
  collectEligibleAbilities,
  getGoodwillTrait,
  isImmuneToRejection,
  resolveGoodwillPhase,
  executeGoodwillAbility,
} from '../packages/game-logic/src/engine/goodwillResolver';
import { getToken } from '../packages/game-logic/src/utils/tokenHelpers';

// ── test helpers ────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

/** Minimal G mock factory */
function makeG(overrides: any = {}) {
  return {
    publicLog: [] as string[],
    fullLog: [] as string[],
    day: 1,
    daysPerLoop: 4,
    loopIndex: 0,
    maxLoops: 3,
    v1: {
      characters: {},
      locations: {
        hospital: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        shrine: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        city: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
        school: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      },
      hiddenRoles: {},
      loopState: { revealedRoles: {}, triggeredIncidents: [], abilityUsage: {}, incidentHistory: [] },
      loopLost: false,
      protagonistKilled: false,
      settings: { autoResolve: true, leaderMode: false },
      ...overrides,
    },
  } as any;
}

function makeChar(loc: string, extra: any = {}) {
  const { paranoia = 0, intrigue = 0, goodwill = 0, ...rest } = extra;
  return { locationId: loc, alive: true, tokens: { paranoia, intrigue, goodwill, hope: 0, despair: 0, guard: 0 }, ...rest };
}

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════');
console.log('  Phase 2 Tests: 身份能力 + 友好能力');
console.log('══════════════════════════════════════════════════\n');

// ── A. 杀手杀关键人物 ─────────────────────────────────────────────────────
console.log('── A. 杀手杀关键人物 ──');
{
  const G = makeG({
    characters: {
      killer1: makeChar('school', { intrigue: 0 }),
      key_p: makeChar('school', { intrigue: 2 }),
    },
    hiddenRoles: { killer1: 'killer', key_p: 'key_person' },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'killer_day_end_key_person')!;
  const ctx = { G, timing: 'day_end', characterId: 'killer1' } as any;
  const check = proc.check(ctx);
  assert(check.triggered, 'A1: 关键人物密谋≥2触发');
  proc.execute(ctx);
  assert(!G.v1.characters.key_p.alive, 'A2: 关键人物死亡');
  assert(G.v1.loopLost, 'A3: 轮回败北');
}

// ── B. 杀手杀主角 ──────────────────────────────────────────────────────────
console.log('\n── B. 杀手杀主角 ──');
{
  const G = makeG({
    characters: { killer1: makeChar('school', { intrigue: 4 }) },
    hiddenRoles: { killer1: 'killer' },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'killer_day_end_protagonists')!;
  const ctx = { G, timing: 'day_end', characterId: 'killer1' } as any;
  const check = proc.check(ctx);
  assert(check.triggered, 'B1: 密谋≥4触发');
  proc.execute(ctx);
  assert(G.v1.protagonistKilled, 'B2: 主角死亡');
}

// ── C. 主谋放密谋 ──────────────────────────────────────────────────────────
console.log('\n── C. 主谋放密谋 ──');
{
  const G = makeG({
    characters: {
      brain1: makeChar('city'),
      target1: makeChar('city'),
    },
    hiddenRoles: { brain1: 'brain' },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'brain_intrigue_ability')!;
  const ctx = { G, timing: 'mastermind_ability', characterId: 'brain1' } as any;
  const check = proc.check(ctx);
  assert(check.triggered, 'C1: 主谋能力触发');
  proc.execute(ctx);
  assert(getToken(G.v1.characters.target1, 'intrigue') === 1, 'C2: 目标 +1 密谋');
}

// ── D. 传谣人放不安 ────────────────────────────────────────────────────────
console.log('\n── D. 传谣人放不安 ──');
{
  const G = makeG({
    characters: {
      ct1: makeChar('shrine'),
      target1: makeChar('shrine'),
    },
    hiddenRoles: { ct1: 'conspiracy_theorist' },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'conspiracy_theorist_unease_ability')!;
  const ctx = { G, timing: 'mastermind_ability', characterId: 'ct1' } as any;
  proc.execute(ctx);
  assert(getToken(G.v1.characters.target1, 'paranoia') === 1, 'D1: 目标 +1 不安');
}

// ── E. 时间旅者不死 ────────────────────────────────────────────────────────
console.log('\n── E. 时间旅者不死 ──');
{
  const G = makeG({
    characters: {
      tt1: makeChar('school'),
      sk: makeChar('school'),
    },
    hiddenRoles: { tt1: 'time_traveler', sk: 'serial_killer' },
  });
  // 杀人狂与时间旅者独处 → 试图杀死时间旅者
  const proc = roleProcessors.find(p => p.ruleId === 'serial_killer_day_end_kill')!;
  const ctx = { G, timing: 'day_end', characterId: 'sk' } as any;
  const check = proc.check(ctx);
  assert(check.triggered, 'E1: 杀人狂独处触发');
  proc.execute(ctx);
  assert(G.v1.characters.tt1.alive, 'E2: 时间旅者因不死免疫');
}

// ── F. 时间旅者最终日败北 ──────────────────────────────────────────────────
console.log('\n── F. 时间旅者最终日 ──');
{
  const G = makeG({
    characters: { tt1: makeChar('school', { goodwill: 1 }) },
    hiddenRoles: { tt1: 'time_traveler' },
  });
  G.day = 4; // 最终日
  G.daysPerLoop = 4;
  const proc = roleProcessors.find(p => p.ruleId === 'time_traveler_final_day_loss')!;
  const ctx = { G, timing: 'day_end', characterId: 'tt1' } as any;
  const check = proc.check(ctx);
  assert(check.triggered, 'F1: 友好≤2触发');
  proc.execute(ctx);
  assert(G.v1.loopLost, 'F2: 轮回败北');
}
{
  const G = makeG({
    characters: { tt1: makeChar('school', { goodwill: 3 }) },
    hiddenRoles: { tt1: 'time_traveler' },
  });
  G.day = 4;
  G.daysPerLoop = 4;
  const proc = roleProcessors.find(p => p.ruleId === 'time_traveler_final_day_loss')!;
  const ctx = { G, timing: 'day_end', characterId: 'tt1' } as any;
  assert(!proc.check(ctx).triggered, 'F3: 友好>2不触发');
}
{
  const G = makeG({
    characters: { tt1: makeChar('school', { goodwill: 1 }) },
    hiddenRoles: { tt1: 'time_traveler' },
  });
  G.day = 2; // 非最终日
  G.daysPerLoop = 4;
  const proc = roleProcessors.find(p => p.ruleId === 'time_traveler_final_day_loss')!;
  const ctx = { G, timing: 'day_end', characterId: 'tt1' } as any;
  assert(!proc.check(ctx).triggered, 'F4: 非最终日不触发');
}

// ── G. 求爱者杀主角 ────────────────────────────────────────────────────────
console.log('\n── G. 求爱者杀主角 ──');
{
  const G = makeG({
    characters: { suitor1: makeChar('city', { intrigue: 1, paranoia: 3 }) },
    hiddenRoles: { suitor1: 'suitor' },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'suitor_day_end_protagonist_death')!;
  const ctx = { G, timing: 'day_end', characterId: 'suitor1' } as any;
  assert(proc.check(ctx).triggered, 'G1: 密谋≥1且不安≥3触发');
  proc.execute(ctx);
  assert(G.v1.protagonistKilled, 'G2: 主角死亡');
}
{
  const G = makeG({
    characters: { suitor1: makeChar('city', { intrigue: 0, paranoia: 5 }) },
    hiddenRoles: { suitor1: 'suitor' },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'suitor_day_end_protagonist_death')!;
  assert(!proc.check({ G, timing: 'day_end', characterId: 'suitor1' } as any).triggered, 'G3: 密谋<1不触发');
}

// ── H. 不安定因子 ──────────────────────────────────────────────────────────
console.log('\n── H. 不安定因子 ──');
{
  const G = makeG({
    characters: {
      factor1: makeChar('city'),
      target1: makeChar('city'),
    },
    hiddenRoles: { factor1: 'factor_of_unrest' },
    locations: {
      hospital: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      shrine: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      city: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      school: { tokens: { paranoia: 0, intrigue: 2, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
    },
  });
  const proc = roleProcessors.find(p => p.ruleId === 'factor_school_conspiracy')!;
  const ctx = { G, timing: 'always', characterId: 'factor1' } as any;
  assert(proc.check(ctx).triggered, 'H1: 学校密谋≥2触发');
  proc.execute(ctx);
  assert(getToken(G.v1.characters.target1, 'paranoia') === 1, 'H2: 传谣人能力 +1不安');
}

// ── I. incidentProcessors 不死检查 ─────────────────────────────────────────
console.log('\n── I. 不死检查（事件层） ──');
{
  const G = makeG({
    characters: {
      tt1: makeChar('hospital'),
    },
    hiddenRoles: { tt1: 'time_traveler' },
    locations: {
      hospital: { tokens: { paranoia: 0, intrigue: 1, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      shrine: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      city: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
      school: { tokens: { paranoia: 0, intrigue: 0, goodwill: 0, hope: 0, despair: 0, guard: 0 } },
    },
  });
  // 医院事故 → 应该因不死免疫
  const proc = incidentProcessors.find(p => p.ruleId === 'incident_hospital_incident_effect')!;
  const ctx = {
    G, timing: 'incident_resolve', characterId: undefined,
    incident: { day: 1, incidentId: 'hospital_incident', culpritId: 'tt1' },
  } as any;
  const check = proc.check(ctx);
  if (check.triggered) {
    proc.execute(ctx);
  }
  assert(G.v1.characters.tt1.alive, 'I1: 时间旅者在医院事故中存活（不死）');
}

// ── J. 友好能力特性分类 ────────────────────────────────────────────────────
console.log('\n── J. 身份特性分类 ──');
{
  const G = makeG({
    hiddenRoles: {
      c1: 'cultist', c2: 'witch', c3: 'killer', c4: 'brain',
      c5: 'key_person', c6: 'friend', c7: 'curmudgeon',
    },
  });
  assert(getGoodwillTrait(G, 'c1') === 'must_reject', 'J1: 邪教徒必定无视');
  assert(getGoodwillTrait(G, 'c2') === 'must_reject', 'J2: 魔女必定无视');
  assert(getGoodwillTrait(G, 'c3') === 'can_reject', 'J3: 杀手可选拒绝');
  assert(getGoodwillTrait(G, 'c4') === 'can_reject', 'J4: 主谋可选拒绝');
  assert(getGoodwillTrait(G, 'c5') === 'must_allow', 'J5: 关键人物必须允许');
  assert(getGoodwillTrait(G, 'c6') === 'must_allow', 'J6: 亲友必须允许');
  assert(getGoodwillTrait(G, 'c7') === 'can_reject', 'J7: 暴徒可选拒绝');
}

// ── K. 免疫拒绝 ────────────────────────────────────────────────────────────
console.log('\n── K. 免疫拒绝 ──');
{
  assert(isImmuneToRejection('outsider_gw3'), 'K1: 局外人（神秘少年）免疫');
  assert(isImmuneToRejection('nurse_gw2'), 'K2: 护士免疫');
  assert(!isImmuneToRejection('boy_student_gw1'), 'K3: 男学生不免疫');
}

// ── L. 友好能力效果 ────────────────────────────────────────────────────────
console.log('\n── L. 友好能力效果 ──');
{
  // 男学生友好能力：移除同区域角色1枚不安
  const G = makeG({
    characters: {
      bs: makeChar('school', { goodwill: 2 }),
      target: makeChar('school', { paranoia: 3 }),
    },
  });
  executeGoodwillAbility(G, 'bs', 'boy_student_gw1');
  assert(getToken(G.v1.characters.target, 'paranoia') === 2, 'L1: 男学生 -1不安');
}
{
  // 局外人（神秘少年）：第 2 轮回起公开身份
  const G = makeG({
    characters: { mb: makeChar('city', { paranoia: 2, goodwill: 3 }) },
    hiddenRoles: { mb: 'friend' },
  });
  G.loopIndex = 1;
  executeGoodwillAbility(G, 'mb', 'outsider_gw3');
  assert(G.v1.loopState.revealedRoles['mb'] === 'friend', 'L2: 局外人公开身份');
}
{
  // 护士：移除同区域另外 1 名不安超限角色的 1 枚不安
  const G = makeG({
    characters: {
      nurse: makeChar('hospital', { goodwill: 2 }),
      patient: makeChar('hospital', { paranoia: 3 }),
    },
  });
  executeGoodwillAbility(G, 'nurse', 'nurse_gw2');
  assert(getToken(G.v1.characters.patient, 'paranoia') === 2, 'L3: 护士使同区超限角色 -1不安');
}
{
  // 医生：同区域角色 -1不安
  const G = makeG({
    characters: {
      doc: makeChar('hospital', { goodwill: 3 }),
      patient: makeChar('hospital', { paranoia: 4 }),
    },
  });
  executeGoodwillAbility(G, 'doc', 'doctor_gw2');
  assert(getToken(G.v1.characters.patient, 'paranoia') === 3, 'L4: 医生 -1不安');
}

// ── M. 友好能力沙盒全流程 ──────────────────────────────────────────────────
console.log('\n── M. 沙盒友好结算 ──');
{
  const G = makeG({
    characters: {
      boy_student: makeChar('school', { goodwill: 2, paranoia: 0 }),      // 男学生 → 合格
      girl_student: makeChar('school', { goodwill: 2, paranoia: 3 }),  // 女学生 → 合格，有不安可移除
      nurse: makeChar('hospital', { goodwill: 2 }), // 护士 → 合格 + 免疫拒绝
      patient: makeChar('hospital', { paranoia: 3 }),
    },
    hiddenRoles: { boy_student: 'killer', nurse: 'witch' }, // 杀手→沙盒默认拒绝；魔女→必定拒绝但护士免疫
  });
  resolveGoodwillPhase(G);

  // boy_student 的能力被拒绝（杀手=无视友好，沙盒默认拒绝）
  const bsRejected = G.publicLog.some((l: string) => l.includes('boy_student') && l.includes('拒绝'));
  assert(bsRejected, 'M1: 杀手角色的友好能力被拒绝');

  // nurse 的能力免疫拒绝（即使是魔女=必定无视友好）
  assert(getToken(G.v1.characters.patient, 'paranoia') === 2, 'M2: 护士免疫拒绝，同区超限角色 -1不安');
}

// ═════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════');
console.log(`  Phase 2 测试结果: ${passed} 通过, ${failed} 失败`);
console.log('══════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
