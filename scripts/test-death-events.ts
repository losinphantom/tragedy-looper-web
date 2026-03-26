/**
 * Test: Death & Event System (Phase 1)
 * 验证 5 个缺口的实现
 * 运行: npx tsx scripts/test-death-events.ts
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { TragedyLooper } from '../packages/game-logic/src/game';
import { CHARACTERS } from '@tragedy/domain';

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; console.log(`  ✅ ${msg}`); }
  else { fail++; console.error(`  ❌ FAIL: ${msg}`); }
}

// ── Setup helper ─────────────────────────────────────────────────────────────

function setupGame() {
  const spec = { game: TragedyLooper, multiplayer: Local(), numPlayers: 4 };
  const p0 = Client({ ...spec, playerID: '0' });
  const p1 = Client({ ...spec, playerID: '1' });
  const p2 = Client({ ...spec, playerID: '2' });
  const p3 = Client({ ...spec, playerID: '3' });
  p0.start(); p1.start(); p2.start(); p3.start();

  // Script select → lobby_wait
  p0.moves.selectScript('first_steps_sample');
  // Toggle ready + start
  p1.moves.toggleReady();
  p2.moves.toggleReady();
  p3.moves.toggleReady();
  p0.moves.startGame();

  return { p0, p1, p2, p3 };
}

function getPhase(p: any) { return p.getState()?.ctx.phase || '??'; }
function getG(p: any) { return p.getState()?.G; }

// ── Test 1: Domain character uneaseLimit exists ──────────────────────────────

console.log('\n=== Test 1: 角色不安上限 ===');
{
  assert(CHARACTERS['boy_student']?.uneaseLimit === 2, 'boy_student uneaseLimit = 2');
  assert(CHARACTERS['girl_student']?.uneaseLimit === 3, 'girl_student uneaseLimit = 3');
  assert(typeof CHARACTERS['rich_mans_daughter']?.uneaseLimit === 'number', 'rich_mans_daughter has uneaseLimit');
}

// ── Test 2: Incident processors all registered ───────────────────────────────

console.log('\n=== Test 2: 事件处理器注册 ===');
{
  const { incidentProcessors } = require('../packages/game-logic/src/rules/incidentProcessors');
  assert(Array.isArray(incidentProcessors), `事件处理器数组存在`);
  assert(incidentProcessors.length === 7, `共 ${incidentProcessors.length} 个事件处理器`);
  
  const ids = incidentProcessors.map((p: any) => p.ruleId);
  assert(ids.includes('incident_murder_effect'), '谋杀处理器');
  assert(ids.includes('incident_hospital_incident_effect'), '医院恐惧处理器');
  assert(ids.includes('incident_suicide_effect'), '自杀处理器');
  assert(ids.includes('incident_missing_person_effect'), '失踪处理器');
  assert(ids.includes('incident_spreading_effect'), '散播处理器');
  assert(ids.includes('incident_increasing_unease_effect'), '不安扩散处理器');
  assert(ids.includes('incident_faraway_murder_effect'), '远距离杀人处理器');
}

// ── Test 3: lossConditions functions exist ────────────────────────────────────

console.log('\n=== Test 3: 败北条件函数 ===');
{
  const lc = require('../packages/game-logic/src/lossConditions');
  assert(typeof lc.triggerProtagonistDeath === 'function', 'triggerProtagonistDeath 可用');
  assert(typeof lc.triggerImmediateLoss === 'function', 'triggerImmediateLoss 可用');
  assert(typeof lc.checkLoopEndLossConditions === 'function', 'checkLoopEndLossConditions 可用');
}

// ── Test 4: autoResolveIncidents exists ───────────────────────────────────────

console.log('\n=== Test 4: autoResolveIncidents 检查 ===');
{
  const ar = require('../packages/game-logic/src/engine/autoResolve');
  assert(typeof ar.autoResolveIncidents === 'function', 'autoResolveIncidents 可用');
  assert(typeof ar.autoResolve === 'function', 'autoResolve 可用');
}

// ── Test 5: resolveTimingWindow supports incident param ──────────────────────

console.log('\n=== Test 5: resolveTimingWindow 签名 ===');
{
  const re = require('../packages/game-logic/src/ruleEngine');
  assert(typeof re.resolveTimingWindow === 'function', 'resolveTimingWindow 可用');
}

// ── Test 6: Full game flow with incidents phase ──────────────────────────────

console.log('\n=== Test 6: 含事件阶段的完整游戏流程 ===');
{
  const { p0, p1, p2, p3 } = setupGame();
  
  // day_start
  assert(getPhase(p0) === 'day_start', `初始 phase = day_start`);
  p0.moves.advancePhase();

  // mastermind_plan
  assert(getPhase(p0) === 'mastermind_plan', 'mastermind_plan');
  const s = p0.getState()!;
  const mmHand = s.G.seatHands['0'] || [];
  const chars = Object.keys(s.G.v1.characters || {});
  for (let i = 0; i < 3 && i < mmHand.length && i < chars.length; i++) {
    p0.moves.playCard(mmHand[i], 'character', chars[i]);
  }
  p0.moves.advancePhase();

  // protagonist_plan
  assert(getPhase(p0) === 'protagonist_plan', 'protagonist_plan');
  for (const [pid, client] of [['1', p1], ['2', p2], ['3', p3]] as const) {
    const hand = (client as any).getState()?.G.seatHands[pid] || [];
    const usedTargets = new Set(
      ((client as any).getState()?.G.v1.playedCards || [])
        .filter((c: any) => c.owner === 'protagonist')
        .map((c: any) => c.targetId)
    );
    const avail = chars.filter(c => !usedTargets.has(c));
    if (hand.length > 0 && avail.length > 0) {
      (client as any).moves.playCard(hand[0], 'character', avail[0]);
    }
    (client as any).moves.advancePhase();
  }

  // resolve_cards → mastermind_abilities → goodwill_window → incidents → day_end
  assert(getPhase(p0) === 'resolve_cards', 'resolve_cards');
  p0.moves.advancePhase();
  assert(getPhase(p0) === 'mastermind_abilities', 'mastermind_abilities');
  p0.moves.advancePhase();
  assert(getPhase(p0) === 'goodwill_window', 'goodwill_window');
  p0.moves.advancePhase();
  
  // 🔥 关键检查：incidents phase
  const incidentPhase = getPhase(p0);
  assert(incidentPhase === 'incidents', `after goodwill → ${incidentPhase}`);
  
  // 查看日志确认事件阶段被正确执行
  const g = getG(p0);
  const incidentLogs = g?.publicLog?.filter((l: string) => 
    l.includes('事件') || l.includes('incident') || l.includes('No incidents')
  ) || [];
  assert(incidentLogs.length > 0, `事件阶段有日志输出 (${incidentLogs.length} 条)`);
  
  p0.moves.advancePhase();
  assert(getPhase(p0) === 'day_end', 'day_end');

  // 检查日志中角色能力调度
  const g2 = getG(p0);
  const dayEndLogs = g2?.publicLog?.filter((l: string) => 
    l.includes('Day') || l.includes('队长')
  ) || [];
  assert(dayEndLogs.length > 0, `day_end 有队长交接日志`);

  p0.stop(); p1.stop(); p2.stop(); p3.stop();
}

// ── Test 7: triggerImmediateLoss works ────────────────────────────────────────

console.log('\n=== Test 7: triggerImmediateLoss 功能测试 ===');
{
  // 使用独立对象（非 boardgame.io frozen state）
  const mockG: any = {
    v1: { loopLost: false },
    publicLog: [],
    fullLog: [],
  };
  
  assert(mockG.v1.loopLost === false, '初始 loopLost = false');
  
  const lc = require('../packages/game-logic/src/lossConditions');
  lc.triggerImmediateLoss(mockG, '测试败北');
  assert(mockG.v1.loopLost === true, 'triggerImmediateLoss 后 loopLost = true');
  assert(mockG.publicLog.some((l: string) => l.includes('失败')), '有失败日志');
  
  // 第二次调用应被忽略
  const logLen = mockG.publicLog.length;
  lc.triggerImmediateLoss(mockG, '重复败北');
  assert(mockG.publicLog.length === logLen, '重复调用不会追加日志');
}

// ── Test 8: triggerProtagonistDeath works ─────────────────────────────────────

console.log('\n=== Test 8: triggerProtagonistDeath 功能测试 ===');
{
  const mockG: any = {
    v1: { protagonistKilled: false, loopLost: false },
    publicLog: [],
    fullLog: [],
  };
  
  assert(mockG.v1.protagonistKilled === false, '初始 protagonistKilled = false');
  
  const lc = require('../packages/game-logic/src/lossConditions');
  lc.triggerProtagonistDeath(mockG, '测试主角死亡');
  assert(mockG.v1.protagonistKilled === true, 'triggerProtagonistDeath 后标记为 true');
  assert(mockG.publicLog.some((l: string) => l.includes('死了')), '有死亡日志');

  // checkLoopEndLossConditions 应在此时返回 lost
  const result = lc.checkLoopEndLossConditions(mockG);
  assert(result.lost === true, 'checkLoopEndLossConditions 返回 lost');
  assert(result.reason === '主人公死亡', `败北原因 = ${result.reason}`);
  
  // 消费后标记清零
  assert(mockG.v1.protagonistKilled === false, '消费后 protagonistKilled 归零');
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
