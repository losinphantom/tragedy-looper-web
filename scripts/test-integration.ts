/**
 * 全系统联合测试 — 单实例顺序执行
 * 运行: npx tsx scripts/test-integration.ts
 *
 * 单个 boardgame.io 实例依次测试所有子系统:
 *   A. 阶段流转 + 行动卡
 *   B. 事件判定 + 效果 (mock)
 *   C. 死亡联动 (mock)
 *   D. 轮回推进 + 重置
 *   E. match_end
 *   F. 身份处理器 (mock)
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { TragedyLooper } from '../packages/game-logic/src/game';
import { CHARACTERS } from '@tragedy/domain';
import { getToken, createEmptyTokenBag } from '../packages/game-logic/src/utils/tokenHelpers';

let passed = 0, failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

// ══════════════════════════════════════════════════════════════════════════════
// Part 1: boardgame.io 在线流程测试 (单实例)
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════════');
console.log('  Part 1: boardgame.io 在线流程');
console.log('══════════════════════════════════════════════════');

const spec = { game: TragedyLooper, multiplayer: Local(), numPlayers: 4 };
const p0 = Client({ ...spec, playerID: '0' });
const p1 = Client({ ...spec, playerID: '1' });
const p2 = Client({ ...spec, playerID: '2' });
const p3 = Client({ ...spec, playerID: '3' });
p0.start(); p1.start(); p2.start(); p3.start();

const G = () => p0.getState()!.G;
const phase = () => p0.getState()!.ctx.phase || '??';

function playOneDay() {
  if (phase() === 'day_start') p0.moves.advancePhase();
  if (phase() === 'mastermind_plan') {
    const hand = G().seatHands['0'] || [];
    const chars = Object.keys(G().v1.characters);
    for (let i = 0; i < 3 && i < hand.length && i < chars.length; i++) {
      p0.moves.playCard(hand[i], 'character', chars[i]);
    }
    p0.moves.advancePhase();
  }
  if (phase() === 'protagonist_plan') {
    for (const [pid, client] of [['1', p1], ['2', p2], ['3', p3]] as const) {
      const hand = (client as any).getState()?.G.seatHands[pid] || [];
      const usedTargets = new Set(
        (G().v1.playedCards || [])
          .filter((c: any) => c.owner === 'protagonist')
          .map((c: any) => c.targetId)
      );
      const chars = Object.keys(G().v1.characters).filter(c => !usedTargets.has(c));
      if (hand.length > 0 && chars.length > 0) {
        (client as any).moves.playCard(hand[0], 'character', chars[0]);
      }
      (client as any).moves.advancePhase();
    }
  }
  for (const expected of ['resolve_cards', 'mastermind_abilities', 'goodwill_window', 'incidents', 'day_end']) {
    if (phase() === expected) p0.moves.advancePhase();
  }
  // 轮回结束后经过 time_spiral
  if (phase() === 'time_spiral') p0.moves.advancePhase();
}

// ── A. 初始状态 + 阶段流转 ──────────────────────────────────────────────────

console.log('\n── A. 初始状态 + 阶段流转 ──');

p0.moves.selectScript('first_steps_sample');
p1.moves.toggleReady(); p2.moves.toggleReady(); p3.moves.toggleReady();
p0.moves.startGame();

assert(phase() === 'time_spiral', 'A1: 开局先进入 time_spiral');
p0.moves.advancePhase();
assert(phase() === 'day_start', 'A2: 准备后进入 day_start');
assert(G().day === 1, 'A3: day = 1');
assert(G().loopIndex === 0, 'A4: loopIndex = 0');
assert(G().maxLoops === 3, 'A5: maxLoops = 3');
assert(G().daysPerLoop === 4, 'A6: daysPerLoop = 4');

const mmHand = G().seatHands['0']?.length ?? 0;
const pHand = p1.getState()!.G.seatHands['1']?.length ?? 0;
assert(mmHand > 0, `A7: 剧作家手牌 ${mmHand} 张`);
assert(pHand > 0, `A8: 主角手牌 ${pHand} 张`);

const charIds = Object.keys(G().v1.characters);
assert(charIds.length >= 4, `A9: ${charIds.length} 个角色`);

const incidents = G().v1.scheduledIncidents;
assert(incidents.length > 0, `A10: ${incidents.length} 个预定事件`);
console.log(`  事件: ${JSON.stringify(incidents)}`);

// ── B. 完整阶段流转（Day 1） ────────────────────────────────────────────────

console.log('\n── B. Day 1 完整流转 ──');

// day_start → mastermind_plan
p0.moves.advancePhase();
assert(phase() === 'mastermind_plan', 'B1: mastermind_plan');

// 出牌
const hand0 = G().seatHands['0'] || [];
for (let i = 0; i < 3 && i < hand0.length && i < charIds.length; i++) {
  p0.moves.playCard(hand0[i], 'character', charIds[i]);
}
assert(G().v1.playedCards.length >= 3, `B2: 已出 ${G().v1.playedCards.length} 张`);
p0.moves.advancePhase();

// protagonist_plan
assert(phase() === 'protagonist_plan', 'B3: protagonist_plan');
for (const [pid, client] of [['1', p1], ['2', p2], ['3', p3]] as const) {
  const hand = (client as any).getState()?.G.seatHands[pid] || [];
  const usedTargets = new Set(
    (G().v1.playedCards || [])
      .filter((c: any) => c.owner === 'protagonist')
      .map((c: any) => c.targetId)
  );
  const avail = charIds.filter(c => !usedTargets.has(c));
  if (hand.length > 0 && avail.length > 0) {
    (client as any).moves.playCard(hand[0], 'character', avail[0]);
  }
  (client as any).moves.advancePhase();
}

// resolve → abilities → goodwill → incidents → day_end
assert(phase() === 'resolve_cards', 'B4: resolve_cards');
p0.moves.advancePhase();
assert(phase() === 'mastermind_abilities', 'B5: mastermind_abilities');
p0.moves.advancePhase();
assert(phase() === 'goodwill_window', 'B6: goodwill_window');
p0.moves.advancePhase();
assert(phase() === 'incidents', 'B7: incidents');

// 检查事件阶段日志
const logAfterIncidents = G().publicLog;
const hasIncidentLog = logAfterIncidents.some((l: string) =>
  l.includes('事件') || l.includes('incident') || l.includes('No incidents')
);
assert(hasIncidentLog, 'B8: 事件阶段有结算日志');

p0.moves.advancePhase();
assert(phase() === 'day_end', 'B9: day_end');

// 队长交接日志
const leaderLog = G().publicLog.some((l: string) => l.includes('队长'));
assert(leaderLog, 'B10: 有队长交接日志');
assert(G().v1.leader === '2', `B11: 队长从 1→${G().v1.leader}`);

p0.moves.advancePhase();
assert(G().day === 2, 'B12: Day 1→2');

// ── C. Day 2-4 推进 → 轮回结束 ──────────────────────────────────────────────

console.log('\n── C. 推完 Loop 1 ──');

playOneDay(); // Day 2
assert(G().day === 3, 'C1: Day 2→3');

playOneDay(); // Day 3
assert(G().day === 4, 'C2: Day 3→4');

function playOneDayNoSpiral() {
  if (phase() === 'day_start') p0.moves.advancePhase();
  if (phase() === 'mastermind_plan') {
    const hand = G().seatHands['0'] || [];
    const chars = Object.keys(G().v1.characters);
    for (let i = 0; i < 3 && i < hand.length && i < chars.length; i++) {
      p0.moves.playCard(hand[i], 'character', chars[i]);
    }
    p0.moves.advancePhase();
  }
  if (phase() === 'protagonist_plan') {
    for (const [pid, client] of [['1', p1], ['2', p2], ['3', p3]] as const) {
      const hand = (client as any).getState()?.G.seatHands[pid] || [];
      const usedTargets = new Set(
        (G().v1.playedCards || [])
          .filter((c: any) => c.owner === 'protagonist')
          .map((c: any) => c.targetId)
      );
      const chars = Object.keys(G().v1.characters).filter(c => !usedTargets.has(c));
      if (hand.length > 0 && chars.length > 0) {
        (client as any).moves.playCard(hand[0], 'character', chars[0]);
      }
      (client as any).moves.advancePhase();
    }
  }
  for (const expected of ['resolve_cards', 'mastermind_abilities', 'goodwill_window', 'incidents', 'day_end']) {
    if (phase() === expected) p0.moves.advancePhase();
  }
  // 注意：不自动推 time_spiral
}

playOneDayNoSpiral(); // Day 4 → loop_end_check (transient) → match_end
assert(phase() === 'match_end', 'C3: 安全度过轮回后直接 match_end');
assert(G().v1.winner === 'protagonist', 'C4: 安全轮回 → 主角获胜');

p0.stop(); p1.stop(); p2.stop(); p3.stop();

// ── D. 失败轮回进入 time_spiral ─────────────────────────────────────────────

console.log('\n── D. declareLoopLoss → time_spiral ──');

const lossSpec = { game: TragedyLooper, multiplayer: Local(), numPlayers: 4, matchID: 'loss-flow' };
const l0 = Client({ ...lossSpec, playerID: '0' });
const l1 = Client({ ...lossSpec, playerID: '1' });
const l2 = Client({ ...lossSpec, playerID: '2' });
const l3 = Client({ ...lossSpec, playerID: '3' });
l0.start(); l1.start(); l2.start(); l3.start();

const LG = () => l0.getState()!.G;
const lPhase = () => l0.getState()!.ctx.phase || '??';

l0.moves.selectScript('first_steps_sample');
l1.moves.toggleReady(); l2.moves.toggleReady(); l3.moves.toggleReady();
l0.moves.startGame();
if (lPhase() === 'time_spiral') l0.moves.advancePhase();
if (lPhase() === 'day_start') l0.moves.advancePhase();
if (lPhase() === 'mastermind_plan') l0.moves.declareLoopLoss();
assert(lPhase() === 'time_spiral', 'D1: declareLoopLoss 后进入 time_spiral');
l0.moves.advancePhase();
assert(LG().loopIndex === 1, 'D2: 败北后 loopIndex=1');
assert(LG().day === 1, 'D3: 新轮回重置到 day=1');
assert(lPhase() === 'day_start', 'D4: 新轮回进入 day_start');

// ── E. First Steps 轮回耗尽后不进 final_guess ───────────────────────────────

console.log('\n── E. First Steps 轮回耗尽 → match_end ──');

for (let loop = 1; loop < (LG().maxLoops || 3); loop++) {
  if (lPhase() === 'day_start') l0.moves.advancePhase();
  if (lPhase() === 'mastermind_plan') l0.moves.declareLoopLoss();
  if (lPhase() === 'time_spiral') l0.moves.advancePhase();
}
assert(LG().loopIndex === (LG().maxLoops || 3), `E1: 所有轮回耗尽 (loopIndex=${LG().loopIndex})`);
assert(lPhase() === 'match_end', 'E2: First Steps 不进入 final_guess');
assert(LG().v1.winner === 'mastermind', 'E3: 轮回耗尽 → 剧作家获胜');

l0.stop(); l1.stop(); l2.stop(); l3.stop();

// ══════════════════════════════════════════════════════════════════════════════
// Part 2: 独立 Mock 测试 (不依赖 boardgame.io)
// ══════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════════');
console.log('  Part 2: 独立 Mock 测试');
console.log('══════════════════════════════════════════════════');

// ── G. 事件处理器 ────────────────────────────────────────────────────────────

console.log('\n── G. 事件处理器 ──');
{
  const { incidentProcessors } = require('../packages/game-logic/src/rules/incidentProcessors');

  assert(incidentProcessors.length >= 30, `G1: ${incidentProcessors.length} 个处理器`);

  function mk() {
    return {
      G: {
        v1: {
          characters: {
            a: { locationId: 'hospital', tokens: { ...createEmptyTokenBag(), paranoia: 3, goodwill: 2 }, alive: true },
            b: { locationId: 'hospital', tokens: { ...createEmptyTokenBag(), paranoia: 1, intrigue: 3, goodwill: 1 }, alive: true },
            c: { locationId: 'school', tokens: { ...createEmptyTokenBag(), goodwill: 4 }, alive: true },
          },
          locations: { hospital: { tokens: { ...createEmptyTokenBag(), intrigue: 2 } }, school: { tokens: createEmptyTokenBag() }, city: { tokens: createEmptyTokenBag() } },
          hiddenRoles: { a: 'key_person' },
          loopLost: false, protagonistKilled: false,
          loopState: { triggeredIncidents: [], revealedRoles: {}, abilityUsage: {} },
        },
        publicLog: [] as string[], fullLog: [] as string[],
      },
    };
  }

  // 医院恐惧 intrigue≥2
  {
    const s = mk();
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_hospital_incident_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'a' } });
    assert(!s.G.v1.characters.a.alive, 'G2: 医院恐惧杀死角色');
    assert(!s.G.v1.protagonistKilled, 'G3: 关键人物死亡后事件即时中止，不再追加主角死');
    assert(s.G.v1.loopLost, 'G4: 关键人物死→loopLost');
  }

  // 谋杀
  {
    const s = mk();
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_murder_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'a' } });
    assert(!s.G.v1.characters.b.alive, 'G5: 谋杀杀死同区角色');
    assert(s.G.v1.characters.a.alive, 'G6: 犯人存活');
  }

  // 自杀
  {
    const s = mk();
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_suicide_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'c' } });
    assert(!s.G.v1.characters.c.alive, 'G7: 自杀死亡');
  }

  // 失踪
  {
    const s = mk();
    const origLoc = s.G.v1.characters.a.locationId;
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_missing_person_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'a' } });
    assert(s.G.v1.characters.a.locationId === origLoc, 'G8: 失踪留在合法地点');
    assert(getToken(s.G.v1.locations[origLoc as keyof typeof s.G.v1.locations], 'intrigue') === 3, 'G8b: 失踪在目标地点放置密谋');
  }

  // 不安扩散
  {
    const s = mk();
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_increasing_unease_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'a' } });
    assert(getToken(s.G.v1.characters.a, 'paranoia') === 5, 'G9: +2不安(3→5)');
    assert(getToken(s.G.v1.characters.b, 'intrigue') === 4, 'G10: +1密谋(3→4)');
  }

  // 扩展别名注册
  {
    const ids = incidentProcessors.map((p: any) => p.ruleId);
    assert(ids.includes('ahr_incident_missing_person'), 'Gx: AHR 失踪已注册');
    assert(ids.includes('ll_incident_missing_person'), 'Gx: LL 失踪已注册');
    assert(ids.includes('ll_incident_increasing_unease'), 'Gx: LL 不安扩散已注册');
    assert(ids.includes('wm_incident_missing_person'), 'Gx: WM 失踪已注册');
    assert(ids.includes('wm_incident_increasing_unease'), 'Gx: WM 不安扩散已注册');
    assert(ids.includes('wm_incident_hospital_incident'), 'Gx: WM 医院事故已注册');
    assert(ids.includes('mc_incident_increasing_unease'), 'Gx: MC 不安扩散已注册');
    assert(ids.includes('mc_incident_hospital_incident'), 'Gx: MC 医院事故已注册');
    assert(ids.includes('mc_incident_serial_murder'), 'Gx: MC 连续杀人已注册');
    assert(ids.includes('mc_incident_suicide'), 'Gx: MC 自杀已注册');
    assert(ids.includes('hsa_incident_increasing_unease'), 'Gx: HSA 不安扩散已注册');
    assert(ids.includes('hsa_incident_missing_person'), 'Gx: HSA 失踪已注册');
    assert(ids.includes('hsa_incident_foul_evil'), 'Gx: HSA 邪气污染已注册');
    assert(ids.includes('smell_of_gunpowder_loop_end_loss') === false, 'Gx: plot 规则不在事件处理器中'); // sanity
  }

  // 远程杀人
  {
    const s = mk();
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_faraway_murder_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'a' } });
    assert(!s.G.v1.characters.b.alive, 'G11: 远程杀(intrigue≥2)');
  }

  // 散播
  {
    const s = mk();
    const p = incidentProcessors.find((p: any) => p.ruleId === 'incident_spreading_effect');
    p.execute({ ...s, incident: { day: 1, incidentId: 'x', culpritId: 'a' } });
    assert(getToken(s.G.v1.characters.a, 'goodwill') === 0, 'G12: 散播 -2友好');
    assert(getToken(s.G.v1.characters.b, 'goodwill') === 3, 'G13: 散播 +2友好');
  }
}

// ── H. 败北条件 ──────────────────────────────────────────────────────────────

console.log('\n── H. 败北条件 ──');
{
  const lc = require('../packages/game-logic/src/lossConditions');

  // triggerImmediateLoss
  {
    const g: any = { v1: { loopLost: false }, publicLog: [], fullLog: [] };
    lc.triggerImmediateLoss(g, 'test');
    assert(g.v1.loopLost, 'H1: 即时败北');
    const len = g.publicLog.length;
    lc.triggerImmediateLoss(g, 'dup');
    assert(g.publicLog.length === len, 'H2: 重复忽略');
  }

  // triggerProtagonistDeath + checkLoopEnd
  {
    const g: any = { v1: { protagonistKilled: false, loopLost: false }, publicLog: [], fullLog: [] };
    lc.triggerProtagonistDeath(g, 'test');
    assert(g.v1.protagonistKilled, 'H3: 主角死亡标记');
    const r = lc.checkLoopEndLossConditions(g);
    assert(r.lost && r.reason === '主人公死亡', 'H4: 检查返回lost');
    assert(!g.v1.protagonistKilled, 'H5: 标记清除');
  }
}

// ── I. autoResolveIncidents 管道 ──────────────────────────────────────────────

console.log('\n── I. autoResolveIncidents 管道 ──');
{
  const ar = require('../packages/game-logic/src/engine/autoResolve');

  // 非事件日
  {
    const g: any = {
      day: 99,
      v1: {
        characters: {}, locations: {},
        scheduledIncidents: [{ day: 1, incidentId: 'x' }],
        incidentCulprits: {}, hiddenRoles: {},
        loopState: { triggeredIncidents: [], revealedRoles: {}, abilityUsage: {} },
        loopLost: false, protagonistKilled: false,
      },
      publicLog: [], fullLog: [],
    };
    const r = ar.autoResolveIncidents(g);
    assert(r.executed.length === 0, 'I1: 非事件日为空');
  }

  // 犯人不安不足
  {
    const g: any = {
      day: 1,
      v1: {
        characters: { c1: { locationId: 'school', tokens: createEmptyTokenBag(), alive: true } },
        locations: { school: { tokens: createEmptyTokenBag() } },
        scheduledIncidents: [{ day: 1, incidentId: 'murder' }],
        incidentCulprits: { '1_murder': 'c1' },
        hiddenRoles: {},
        loopState: { triggeredIncidents: [], revealedRoles: {}, abilityUsage: {} },
        loopLost: false, protagonistKilled: false,
      },
      publicLog: [], fullLog: [],
    };
    ar.autoResolveIncidents(g);
    assert(g.publicLog.some((l: string) => l.includes('条件未满足')), 'I2: 不安不足');
  }

  // 犯人死亡
  {
    const g: any = {
      day: 1,
      v1: {
        characters: { c1: { locationId: 'school', tokens: { ...createEmptyTokenBag(), paranoia: 5 }, alive: false } },
        scheduledIncidents: [{ day: 1, incidentId: 'murder' }],
        incidentCulprits: { '1_murder': 'c1' },
        hiddenRoles: {},
        loopState: { triggeredIncidents: [], revealedRoles: {}, abilityUsage: {} },
        loopLost: false, protagonistKilled: false,
      },
      publicLog: [], fullLog: [],
    };
    ar.autoResolveIncidents(g);
    assert(g.publicLog.some((l: string) => l.includes('不在场')), 'I3: 犯人死亡跳过');
  }
}

// ── J. 身份处理器 ────────────────────────────────────────────────────────────

console.log('\n── J. 身份处理器 ──');
{
  const { roleProcessors } = require('../packages/game-logic/src/rules/roleProcessors');
  assert(roleProcessors.length >= 30, `J1: ${roleProcessors.length} 个`);

  // 杀人狂独处
  {
    const sk = roleProcessors.find((p: any) => p.ruleId === 'serial_killer_day_end_kill');
    const g: any = {
      v1: {
        characters: {
          sk: { locationId: 'city', alive: true },
          victim: { locationId: 'city', alive: true },
          safe: { locationId: 'school', alive: true },
        },
      },
      publicLog: [], fullLog: [],
    };
    const check = sk.check({ G: g, timing: 'day_end', characterId: 'sk' });
    assert(check.triggered, 'J2: 独处触发');
    sk.execute({ G: g, timing: 'day_end', characterId: 'sk' });
    assert(!g.v1.characters.victim.alive, 'J3: 被害者死');
    assert(g.v1.characters.sk.alive, 'J4: 杀人狂活');
  }

  // 杀人狂多人
  {
    const sk = roleProcessors.find((p: any) => p.ruleId === 'serial_killer_day_end_kill');
    const g: any = {
      v1: { characters: { sk: { locationId: 'a', alive: true }, x: { locationId: 'a', alive: true }, y: { locationId: 'a', alive: true } } },
      publicLog: [], fullLog: [],
    };
    assert(!sk.check({ G: g, timing: 'day_end', characterId: 'sk' }).triggered, 'J5: 多人不触发');
  }

  // 关键人物死亡
  {
    const kp = roleProcessors.find((p: any) => p.ruleId === 'key_person_death_loss');
    const g: any = {
      v1: { characters: { hero: { alive: false } }, loopLost: false },
      publicLog: [], fullLog: [],
    };
    const check = kp.check({ G: g, timing: 'day_end', characterId: 'hero' });
    assert(check.triggered, 'J6: 关键人物死亡触发');
    kp.execute({ G: g, timing: 'day_end', characterId: 'hero' });
    assert(g.v1.loopLost, 'J7: loopLost');
  }

  // 新增角色处理器注册
  {
    const ids = roleProcessors.map((p: any) => p.ruleId);
    assert(ids.includes('mc_friend_death_reveal'), 'J8: MC 亲友死亡处理器已注册');
    assert(ids.includes('hsa_lover_kill'), 'J9: HSA 求爱者杀主角处理器已注册');
    assert(ids.includes('hsa_ghost_unease'), 'J10: HSA 鬼魂处理器已注册');
    assert(ids.includes('hsa_coward_escape'), 'J11: HSA 胆小鬼处理器已注册');
    assert(ids.includes('mc_paranoiac_intrigue_or_unease'), 'J12: MC 偏执狂处理器已注册');
    assert(ids.includes('mc_fool_incident_target'), 'J13: MC 愚者当事人约束已注册');
    assert(ids.includes('mc_fool_incident_recovery'), 'J14: MC 愚者结算复原已注册');
  }

  // HSA 鬼魂：死后可指定当前或初始区域角色 +1 不安
  {
    const ghost = roleProcessors.find((p: any) => p.ruleId === 'hsa_ghost_unease');
    const g: any = {
      v1: {
        characters: {
          shrine_maiden: { locationId: 'city', alive: false, tokens: { paranoia: 0, intrigue: 0, goodwill: 0 } },
          office_worker: { locationId: 'shrine', alive: true, tokens: { paranoia: 0, intrigue: 0, goodwill: 0 } },
        },
      },
      publicLog: [],
      fullLog: [],
    };
    ghost.execute({ G: g, timing: 'mastermind_ability', characterId: 'shrine_maiden', selectedTargets: { target: 'office_worker' } });
    assert(getToken(g.v1.characters.office_worker, 'paranoia') === 1, 'J15: 鬼魂可指定初始区域角色 +1 不安');
  }

  // HSA 胆小鬼：可移动到相邻版图；指定禁行区域则取消移动
  {
    const coward = roleProcessors.find((p: any) => p.ruleId === 'hsa_coward_escape');
    const mover: any = {
      v1: {
        characters: {
          shrine_maiden: { locationId: 'shrine', alive: true, tokens: { paranoia: 2, intrigue: 0, goodwill: 0 } },
        },
      },
      publicLog: [],
      fullLog: [],
    };
    coward.execute({ G: mover, timing: 'mastermind_ability', characterId: 'shrine_maiden', selectedTargets: { location: 'hospital' } });
    assert(mover.v1.characters.shrine_maiden.locationId === 'hospital', 'J16: 胆小鬼可移动到相邻版图');

    const blocked: any = {
      v1: {
        characters: {
          shrine_maiden: { locationId: 'shrine', alive: true, tokens: { paranoia: 2, intrigue: 0, goodwill: 0 } },
        },
      },
      publicLog: [],
      fullLog: [],
    };
    coward.execute({ G: blocked, timing: 'mastermind_ability', characterId: 'shrine_maiden', selectedTargets: { location: 'city' } });
    assert(blocked.v1.characters.shrine_maiden.locationId === 'shrine', 'J17: 胆小鬼指定禁行/非相邻区域时取消移动');
  }

  // MC 亲友公开后下轮 loop_start +1 友好
  {
    const proc = roleProcessors.find((p: any) => p.ruleId === 'friend_revealed_loop_start_goodwill');
    const g: any = {
      v1: {
        characters: { friend: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag(), goodwill: 0 } } },
        loopState: { revealedRoles: {}, triggeredIncidents: [], abilityUsage: {}, incidentHistory: [], butterflyEffectTriggered: false, lastLoopGoodwillChars: [] },
        revealedRoleMemory: { friend: 'friend' },
      },
      publicLog: [],
      fullLog: [],
    };
    const ctx: any = { G: g, timing: 'loop_start', characterId: 'friend' };
    assert(proc.check(ctx).triggered, 'J18: 亲友已公开时 loop_start 可触发 +1 友好');
    proc.execute(ctx);
    assert(getToken(g.v1.characters.friend, 'goodwill') === 1, 'J19: 亲友公开后获得 1 友好');
  }

  // MC 偏执狂：自选密谋/不安
  {
    const proc = roleProcessors.find((p: any) => p.ruleId === 'mc_paranoiac_intrigue_or_unease');
    const g: any = { v1: { characters: { para: { locationId: 'city', alive: true, tokens: { paranoia: 0, intrigue: 0, goodwill: 0 } } } }, publicLog: [], fullLog: [] };
    proc.execute({ G: g, timing: 'mastermind_ability', characterId: 'para', selectedTargets: { tokenType: 'paranoia' } });
    assert(getToken(g.v1.characters.para, 'paranoia') === 1, 'J20: 偏执狂可加不安');
    proc.execute({ G: g, timing: 'mastermind_ability', characterId: 'para', selectedTargets: { tokenType: 'intrigue' } });
    assert(getToken(g.v1.characters.para, 'intrigue') === 1, 'J21: 偏执狂可加密谋');
  }

  // MC 愚者：担任事件后不安清零
  {
    const proc = roleProcessors.find((p: any) => p.ruleId === 'mc_fool_incident_recovery');
    const g: any = { v1: { characters: { fool: { locationId: 'city', alive: true, tokens: { paranoia: 3, intrigue: 0, goodwill: 0 } } }, loopLost: false, protagonistKilled: false }, publicLog: [], fullLog: [] };
    const ctxObj: any = { G: g, timing: 'incident_resolve', characterId: 'fool', incident: { culpritId: 'fool' } };
    assert(proc.check(ctxObj).triggered, 'J22: 愚者担任当事人后应触发复原');
    proc.execute(ctxObj);
    assert(getToken(g.v1.characters.fool, 'paranoia') === 0, 'J23: 愚者事件后不安清零');
  }

  // MC 偏执狂：能力目标槽携带 tokenType 并正确结算
  {
    const { phases } = require('../packages/game-logic/src/phases');
    const { moves } = require('../packages/game-logic/src/moves');
    const baseLoopState = { revealedRoles: {}, triggeredIncidents: [], incidentHistory: [], abilityUsage: {}, butterflyEffectTriggered: false, lastLoopGoodwillChars: [] };
    const g: any = {
      scriptOpen: { tragedySetId: 'mystery_circle' },
      publicLog: [],
      fullLog: [],
      v1: {
        characters: { para: { locationId: 'city', alive: true, tokens: { ...createEmptyTokenBag() } } },
        locations: {},
        playedCards: [],
        scheduledIncidents: [],
        readyPlayers: {},
        readyToAdvance: false,
        eventLogs: [],
        loopLost: false,
        hiddenRoles: {},
        incidentCulprits: {},
        activePlots: [],
        activeRuleDefinitions: [{
          ruleId: 'mc_paranoiac_intrigue_or_unease',
          timing: 'mastermind_ability',
          mandatory: false,
          characterId: 'para',
          source: 'test',
        }],
        nextCardId: 1,
        cardResolveImmunities: [],
        loopState: baseLoopState,
        protagonistKilled: false,
        castDefinitions: [],
        settings: { autoResolve: false, leaderMode: false, soloMode: false },
        pendingAbilities: [],
        abilityPhase: 'idle',
        pendingIncidents: [],
        goodwillInteraction: { phase: 'idle', eligibleAbilities: [], currentDeclaration: null },
      },
    };

    phases.mastermind_abilities.onBegin({ G: g, events: { endPhase() {} } });
    const pending = g.v1.pendingAbilities[0];
    assert(pending.targetSlots?.[0]?.kind === 'token_type', 'J26: 偏执狂目标槽为 token_type');
    assert(pending.targetSlots?.[0]?.eligibleTokenTypes?.length === 2, 'J27: tokenType 槽含两种指示物');

    moves.confirmAbility({ G: g, ctx: { phase: 'mastermind_abilities' }, events: { endPhase() {} }, playerID: '0' } as any, pending.id, { tokenType: 'paranoia' });
    assert(getToken(g.v1.characters.para, 'paranoia') === 1, 'J28: 选择不安时 +1 不安');
  }
}

// ── J+. Plot 规则补充 ────────────────────────────────────────────────────────
{
  const { plotProcessors } = require('../packages/game-logic/src/rules/plotProcessors');
  const smell = plotProcessors.find((p: any) => p.ruleId === 'smell_of_gunpowder_loop_end_loss');
  const g: any = {
    v1: {
      characters: {
        a: { alive: true, tokens: { paranoia: 5, intrigue: 0, goodwill: 0 } },
        b: { alive: true, tokens: { paranoia: 4, intrigue: 0, goodwill: 0 } },
        c: { alive: true, tokens: { paranoia: 3, intrigue: 0, goodwill: 0 } },
      },
      loopLost: false,
    },
    publicLog: [],
    fullLog: [],
  };
  const ctx: any = { G: g, timing: 'loop_end' };
  assert(smell.check(ctx).triggered, 'J24: 火药的味道触发');
  smell.execute(ctx);
  assert(g.v1.loopLost, 'J25: 火药的味道导致败北');
}

// ── K. Domain 数据一致性 ─────────────────────────────────────────────────────

console.log('\n── K. Domain 数据 ──');
{
  assert(CHARACTERS['boy_student']?.uneaseLimit === 2, 'K1: boy_student=2');
  assert(CHARACTERS['girl_student']?.uneaseLimit === 3, 'K2: girl_student=3');
  assert(CHARACTERS['patient']?.uneaseLimit === 2, 'K3: patient=2');
  assert(CHARACTERS['rich_mans_daughter']?.uneaseLimit !== undefined, 'K4: rich_mans_daughter有上限');
  assert(typeof CHARACTERS['office_worker']?.uneaseLimit === 'number', 'K5: office_worker有上限');
}

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════');
console.log(`  联合测试结果: ${passed} 通过, ${failed} 失败`);
console.log('══════════════════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
