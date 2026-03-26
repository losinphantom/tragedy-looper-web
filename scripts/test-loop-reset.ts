/**
 * 天数推进 / 轮回推进 / 轮回间重置 测试
 * 运行: npx tsx scripts/test-loop-reset.ts
 *
 * The First Script: 3 loops, 4 days per loop
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { TragedyLooper } from '../packages/game-logic/src/game';
import { getToken } from '../packages/game-logic/src/utils/tokenHelpers';

const spec = { game: TragedyLooper, multiplayer: Local(), numPlayers: 4 };
const p0 = Client({ ...spec, playerID: '0' });
const p1 = Client({ ...spec, playerID: '1' });
const p2 = Client({ ...spec, playerID: '2' });
const p3 = Client({ ...spec, playerID: '3' });
p0.start(); p1.start(); p2.start(); p3.start();

function G() { return p0.getState()!.G; }
function ctx() { return p0.getState()!.ctx; }
function phase() { return ctx().phase || '??'; }

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { console.log(`  ✅ ${msg}`); passed++; }
  else { console.error(`  ❌ ${msg}`); failed++; }
}

// ── 快速推过一天（所有 9 步骤） ──────────────────────────────────────────────
function playOneDay() {
  // day_start → mastermind_plan
  if (phase() === 'day_start') p0.moves.advancePhase();

  // mastermind_plan: 出 3 张牌
  if (phase() === 'mastermind_plan') {
    const hand = G().seatHands['0'] || [];
    const chars = Object.keys(G().v1.characters);
    for (let i = 0; i < 3 && i < hand.length && i < chars.length; i++) {
      p0.moves.playCard(hand[i], 'character', chars[i]);
    }
    p0.moves.advancePhase();
  }

  // protagonist_plan: 各出 1 张
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

  // resolve_cards → mastermind_abilities → goodwill_window → incidents → day_end
  for (const expected of ['resolve_cards', 'mastermind_abilities', 'goodwill_window', 'incidents', 'day_end']) {
    if (phase() === expected) p0.moves.advancePhase();
  }
  // 轮回结束后经过 time_spiral
  if (phase() === 'time_spiral') p0.moves.advancePhase();
}

// ── Setup ────────────────────────────────────────────────────────────────────
console.log('\n=== 天数推进 / 轮回推进 / 轮回间重置 测试 ===\n');

p0.moves.selectScript('first_steps_sample');
p1.moves.toggleReady(); p2.moves.toggleReady(); p3.moves.toggleReady();
p0.moves.startGame();

assert(phase() === 'day_start', `开局 phase = day_start`);
assert(G().day === 1, `开局 day = 1`);
assert(G().loopIndex === 0, `开局 loopIndex = 0`);
assert(G().maxLoops === 3, `maxLoops = 3`);
assert(G().daysPerLoop === 4, `daysPerLoop = 4`);

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Loop 1 ──');
// ══════════════════════════════════════════════════════════════════════════════

// 记录初始角色状态
const initialChars = JSON.parse(JSON.stringify(G().v1.characters));
const charIds = Object.keys(initialChars);
console.log(`  角色: ${charIds.join(', ')}`);

// ── Day 1 ──
playOneDay();
assert(G().day === 2, `Day 1→2 推进`);
assert(phase() === 'day_start', `Day 2 开始于 day_start`);

// 验证出牌后手牌回收
const mmHandAfter = G().seatHands['0'] || [];
console.log(`  剧作家手牌: ${mmHandAfter.length} 张`);

// ── Day 2 ──
playOneDay();
assert(G().day === 3, `Day 2→3 推进`);

// ── Day 3 ──
playOneDay();
assert(G().day === 4, `Day 3→4 推进`);

// ── Day 4 (最后一天) ──
// 在 Day 4 结束后应该进入 loop_end_check → loop_setup → day_start
const leaderBeforeDay4 = G().v1.leader;
playOneDay();
// Day 4 的 day_end.next 检测 day >= daysPerLoop → 跳转 loop_end_check
// loop_end_check 是 transient → 自动推进到 loop_setup
// loop_setup 是 transient → 自动推进到 day_start

assert(G().loopIndex === 1, `Loop 1 结束 → loopIndex = 1`);
assert(G().day === 1, `新轮回 day 重置为 1`);
assert(phase() === 'day_start', `新轮回从 day_start 开始`);

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 轮回间重置验证 ──');
// ══════════════════════════════════════════════════════════════════════════════

// 验证角色重置
for (const charId of charIds) {
  const c = G().v1.characters[charId];
  assert(getToken(c, 'paranoia') === 0, `${charId} paranoia 重置为 0`);
  assert(getToken(c, 'goodwill') === 0, `${charId} goodwill 重置为 0`);
  assert(getToken(c, 'intrigue') === 0, `${charId} intrigue 重置为 0`);
  assert(c.alive === true, `${charId} alive 重置为 true`);
}

// 验证地点阴谋重置
for (const [locId, loc] of Object.entries(G().v1.locations) as any) {
  assert(getToken(loc, 'intrigue') === 0, `地点 ${locId} intrigue 重置为 0`);
}

// 验证手牌重置
assert(G().seatHands['0'].length > 0, `剧作家手牌已重置 (${G().seatHands['0'].length} 张)`);
assert(G().seatHands['1'].length > 0, `主角1 手牌已重置 (${G().seatHands['1'].length} 张)`);

// 验证 playedCards 清空
assert(G().v1.playedCards.length === 0, `playedCards 已清空`);

// 验证 loopState 重置
assert(G().v1.loopLost === false, `loopLost 重置为 false`);

// 验证 usedOncePerLoopCards 清空
assert(G().board.usedOncePerLoopCards.length === 0, `usedOncePerLoopCards 已清空`);

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Loop 2: 测试 declareLoopLoss ──');
// ══════════════════════════════════════════════════════════════════════════════

// 推过 Day 1
playOneDay();
assert(G().day === 2, `Loop 2 Day 1→2`);

// Day 2 开始时剧作家宣布 loop loss
if (phase() === 'day_start') p0.moves.advancePhase();
if (phase() === 'mastermind_plan') {
  p0.moves.declareLoopLoss();
  // declareLoopLoss → loop_end_check → time_spiral
  if (phase() === 'time_spiral') p0.moves.advancePhase();
}

assert(G().loopIndex === 2, `Loop loss → loopIndex = 2`);
assert(G().day === 1, `Loop loss 后 day 重置为 1`);
assert(phase() === 'day_start', `Loop loss 后从 day_start 开始`);

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Loop 3 (最后一轮): 推完 → match_end ──');
// ══════════════════════════════════════════════════════════════════════════════

for (let d = 0; d < 4; d++) {
  playOneDay();
}

assert(G().loopIndex === 3, `所有轮回结束 → loopIndex = 3`);
assert(phase() === 'match_end', `游戏结束 → match_end`);

// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
// ══════════════════════════════════════════════════════════════════════════════

p0.stop(); p1.stop(); p2.stop(); p3.stop();
process.exit(failed > 0 ? 1 : 0);
