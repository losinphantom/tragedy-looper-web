/**
 * 行动卡交互测试 — playCard/recallCard 权限校验 + 结算效果验证
 * 运行: npx tsx scripts/test-action-cards.ts
 *
 * oncePerLoop 牌 (每轮回一次):
 *   protagonist: unease_minus_1, goodwill_plus_2, forbid_movement
 *   mastermind:  intrigue_plus_2, move_diagonal
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
  else { console.error(`  [FAILED] ${msg}`); failed++; }
}

// 快速推进到指定阶段
function advanceTo(target: string) {
  let guard = 20;
  while (phase() !== target && guard-- > 0) {
    if (phase() === 'protagonist_plan') {
      p1.moves.advancePhase();
      p2.moves.advancePhase();
      p3.moves.advancePhase();
    } else {
      p0.moves.advancePhase();
    }
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────
console.log('\n=== 行动卡交互测试 ===\n');

p0.moves.selectScript('first_steps_sample');
p1.moves.toggleReady(); p2.moves.toggleReady(); p3.moves.toggleReady();
p0.moves.startGame();
assert(phase() === 'day_start', '开局 day_start');
p0.moves.advancePhase();
assert(phase() === 'mastermind_plan', '进入 mastermind_plan');

const chars = Object.keys(G().v1.characters);
console.log(`  角色: ${chars.join(', ')}`);

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 1. playCard 权限校验 ──');
// ══════════════════════════════════════════════════════════════════════════════

// 1a. 主角不能在 mastermind_plan 出牌
p1.moves.playCard('protagonist_unease_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.length === 0,
  '主角在 mastermind_plan 出牌被拒绝');

// 1b. 剧作家出牌成功
p0.moves.playCard('mastermind_unease_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.length === 1, '剧作家出牌成功');
assert(G().v1.playedCards[0].faceUp === false, '出的牌是暗牌 (faceUp=false)');
assert(G().v1.playedCards[0].owner === 'mastermind', '卡牌 owner = mastermind');

// 1c. 剧作家不能放两张牌在同一目标
p0.moves.playCard('mastermind_unease_minus_1', 'character', chars[0]);
assert(G().v1.playedCards.length === 1, '剧作家同一目标第二张被拒绝');

// 1d. 出到不同目标可以
p0.moves.playCard('mastermind_unease_minus_1', 'character', chars[1]);
assert(G().v1.playedCards.length === 2, '剧作家第二张到不同目标成功');

// 1e. 出第三张
p0.moves.playCard('mastermind_forbid_unease', 'character', chars[2]);
assert(G().v1.playedCards.length === 3, '剧作家第三张出牌成功');

// 1f. 剧作家出第四张被拒绝（上限 3 张）
p0.moves.playCard('mastermind_intrigue_plus_1', 'character', chars[3]);
assert(G().v1.playedCards.length === 3, '剧作家第四张被拒绝（上限 3）');

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 2. recallCard 撤回 ──');
// ══════════════════════════════════════════════════════════════════════════════

// 2a. 撤回第三张牌
const card3Id = G().v1.playedCards[2].id;
const handBefore = G().seatHands['0'].length;
p0.moves.recallCard(card3Id);
assert(G().v1.playedCards.length === 2, '撤回后剩 2 张');
assert(G().seatHands['0'].length === handBefore + 1, '撤回的牌回到手牌');

// 2b. 主角不能撤回剧作家的牌
const card1Id = G().v1.playedCards[0].id;
p1.moves.recallCard(card1Id);
assert(G().v1.playedCards.length === 2, '主角不能撤回剧作家的牌');

// 2c. 补出第三张（换一个目标）
p0.moves.playCard('mastermind_forbid_unease', 'character', chars[3]);
assert(G().v1.playedCards.length === 3, '撤回后重新出牌成功');

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 3. protagonist_plan 出牌 ──');
// ══════════════════════════════════════════════════════════════════════════════

p0.moves.advancePhase();
assert(phase() === 'protagonist_plan', '进入 protagonist_plan');

// 3a. 剧作家不能在 protagonist_plan 出牌
p0.moves.playCard('mastermind_intrigue_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '0').length === 3,
  '剧作家在 protagonist_plan 出牌被拒绝');

// 3b. 主角1 出牌成功
p1.moves.playCard('protagonist_unease_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '1').length === 1,
  '主角1 出牌成功');

// 3c. 主角2 不能放在主角1 已放的目标
p2.moves.playCard('protagonist_unease_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '2').length === 0,
  '主角2 不能放在主角1 的目标上');

// 3d. 主角2 放到不同目标
p2.moves.playCard('protagonist_unease_minus_1', 'character', chars[1]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '2').length === 1,
  '主角2 出到不同目标成功');

// 3e. 主角出第二张被拒绝（上限 1 张）
p1.moves.playCard('protagonist_goodwill_plus_1', 'character', chars[2]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '1').length === 1,
  '主角1 第二张被拒绝（上限 1）');

// 3f. 主角1 撤回再出
const p1CardId = G().v1.playedCards.find((c: any) => c.playedBySeat === '1')!.id;
p1.moves.recallCard(p1CardId);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '1').length === 0,
  '主角1 撤回成功');
p1.moves.playCard('protagonist_goodwill_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '1').length === 1,
  '主角1 撤回后重新出牌成功');

// 3g. 主角3 出牌
p3.moves.playCard('protagonist_goodwill_plus_2', 'character', chars[2]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '3').length === 1,
  '主角3 出牌成功');

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 4. 行动卡结算效果验证 ──');
// ══════════════════════════════════════════════════════════════════════════════

// 当前 playedCards:
// chars[0]: mastermind_unease_plus_1 + protagonist_goodwill_plus_1
// chars[1]: mastermind_unease_minus_1 + protagonist_unease_minus_1
// chars[2]: protagonist_goodwill_plus_2 (no mastermind card)
// chars[3]: mastermind_forbid_unease (no other cards)

const before: Record<string, any> = {};
for (const cid of chars) {
  const c = G().v1.characters[cid];
  before[cid] = { paranoia: getToken(c, 'paranoia'), goodwill: getToken(c, 'goodwill'), intrigue: getToken(c, 'intrigue') };
}
console.log(`  结算前: ${JSON.stringify(before)}`);

p1.moves.advancePhase(); p2.moves.advancePhase(); p3.moves.advancePhase();
assert(phase() === 'resolve_cards', '进入 resolve_cards');

const after: Record<string, any> = {};
for (const cid of chars) {
  const c = G().v1.characters[cid];
  after[cid] = { paranoia: getToken(c, 'paranoia'), goodwill: getToken(c, 'goodwill'), intrigue: getToken(c, 'intrigue') };
}
console.log(`  结算后: ${JSON.stringify(after)}`);

// chars[0]: unease+1 → paranoia+1; goodwill+1 → goodwill+1
assert(after[chars[0]].paranoia === before[chars[0]].paranoia + 1,
  `${chars[0]} paranoia +1（不安+1 生效）`);
assert(after[chars[0]].goodwill === before[chars[0]].goodwill + 1,
  `${chars[0]} goodwill +1（友好+1 生效）`);

// chars[1]: unease-1 + unease-1 → paranoia - 2 (min 0)
assert(after[chars[1]].paranoia === Math.max(0, before[chars[1]].paranoia - 2),
  `${chars[1]} paranoia = ${after[chars[1]].paranoia}（两张不安-1）`);

// chars[2]: goodwill+2
assert(after[chars[2]].goodwill === before[chars[2]].goodwill + 2,
  `${chars[2]} goodwill +2（友好+2 生效）`);

// chars[3]: forbid_unease 无对手牌 → paranoia 不变
assert(after[chars[3]].paranoia === before[chars[3]].paranoia,
  `${chars[3]} paranoia 不变（禁止不安无对手牌）`);

// 牌已归还
assert(G().v1.playedCards.length === 0, '结算后 playedCards 清空');

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 5. oncePerLoop 限制验证 ──');
// ══════════════════════════════════════════════════════════════════════════════

// Day 1 用过的 oncePerLoop 牌: protagonist_unease_minus_1 (p2), protagonist_goodwill_plus_2 (p3)
assert(G().board.usedOncePerLoopCards.includes('2:protagonist_unease_minus_1'),
  'protagonist_unease_minus_1 标记为已使用');
assert(G().board.usedOncePerLoopCards.includes('3:protagonist_goodwill_plus_2'),
  'protagonist_goodwill_plus_2 标记为已使用');

// 推完 Day 1 剩余阶段 → Day 2
advanceTo('day_start');
p0.moves.advancePhase(); // → mastermind_plan

assert(phase() === 'mastermind_plan', 'Day 2 mastermind_plan');

// 5a. oncePerLoop 牌仍然被锁
assert(G().board.usedOncePerLoopCards.includes('2:protagonist_unease_minus_1'),
  'Day 2 protagonist_unease_minus_1 仍被锁');

// 5b. Day 2 剧作家出牌（只用 non-oncePerLoop 牌）
p0.moves.playCard('mastermind_unease_plus_1', 'character', chars[0]);
p0.moves.playCard('mastermind_intrigue_plus_1', 'character', chars[1]);
p0.moves.playCard('mastermind_forbid_goodwill', 'character', chars[2]);
assert(G().v1.playedCards.length === 3, '剧作家 Day 2 出 3 张成功');
p0.moves.advancePhase(); // → protagonist_plan

// 5c. 主角尝试出 oncePerLoop 已消耗的牌 → 被拒绝
p2.moves.playCard('protagonist_unease_minus_1', 'character', chars[1]);
assert(G().v1.playedCards.filter((c: any) => c.playedBySeat === '2').length === 0,
  '主角2 oncePerLoop 已消耗牌被拒绝');

// 5d. 主角使用 non-oncePerLoop 牌
p1.moves.playCard('protagonist_forbid_intrigue', 'character', chars[1]);
p2.moves.playCard('protagonist_unease_plus_1', 'character', chars[0]);
p3.moves.playCard('protagonist_goodwill_plus_1', 'character', chars[2]);

const intrigue1Before = getToken(G().v1.characters[chars[1]], 'intrigue');
const paranoia0Before = getToken(G().v1.characters[chars[0]], 'paranoia');

p1.moves.advancePhase(); p2.moves.advancePhase(); p3.moves.advancePhase();
assert(phase() === 'resolve_cards', 'Day 2 resolve_cards');

// 5e. prohibit_intrigue 阻止 intrigue+1
assert(getToken(G().v1.characters[chars[1]], 'intrigue') === intrigue1Before,
  `${chars[1]} intrigue 不变（禁止阴谋阻止）`);

// 5f. 不安+1+1 叠加
assert(getToken(G().v1.characters[chars[0]], 'paranoia') === paranoia0Before + 2,
  `${chars[0]} paranoia +2（两张不安+1 叠加）`);

// 5g. forbid_goodwill 阻止 goodwill+1
const gw2Before = before[chars[2]].goodwill + 2; // Day 1 已经 +2
assert(getToken(G().v1.characters[chars[2]], 'goodwill') === gw2Before,
  `${chars[2]} goodwill 不变（禁止友好阻止）`);

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── 6. 出牌阶段以外不能出牌 ──');
// ══════════════════════════════════════════════════════════════════════════════

const playedBeforePhaseTest = G().v1.playedCards.length;
p0.moves.playCard('mastermind_unease_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.length === playedBeforePhaseTest,
  'resolve_cards 阶段不能出牌');

p0.moves.advancePhase(); // → mastermind_abilities
assert(phase() === 'mastermind_abilities', '进入 mastermind_abilities');
p0.moves.playCard('mastermind_unease_plus_1', 'character', chars[0]);
assert(G().v1.playedCards.length === playedBeforePhaseTest,
  'mastermind_abilities 阶段不能出牌');

// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===\n`);
// ══════════════════════════════════════════════════════════════════════════════

p0.stop(); p1.stop(); p2.stop(); p3.stop();
process.exit(failed > 0 ? 1 : 0);
