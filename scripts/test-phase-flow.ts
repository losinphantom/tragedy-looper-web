/**
 * 阶段流程测试 — 用 boardgame.io Client 本地模拟 4 人完整流程
 * 运行: npx tsx scripts/test-phase-flow.ts
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { TragedyLooper } from '../packages/game-logic/src/game';

// 创建本地多人客户端
const spec = { game: TragedyLooper, multiplayer: Local(), numPlayers: 4 };

const p0 = Client({ ...spec, playerID: '0' });
const p1 = Client({ ...spec, playerID: '1' });
const p2 = Client({ ...spec, playerID: '2' });
const p3 = Client({ ...spec, playerID: '3' });

p0.start(); p1.start(); p2.start(); p3.start();

function getPhase() { return p0.getState()?.ctx.phase || '??'; }
function getDay() { return p0.getState()?.G.day || 0; }
function log(msg: string) { console.log(`  [${getPhase()} Day${getDay()}] ${msg}`); }
function check(expected: string, label: string) {
  const actual = getPhase();
  if (actual === expected) {
    console.log(`  ✅ ${label}: ${actual}`);
  } else {
    console.error(`  ❌ ${label}: expected ${expected}, got ${actual}`);
    process.exit(1);
  }
}

console.log('\n=== 阶段流程测试 ===\n');

// 1. script_select
check('script_select', 'Start phase');
p0.moves.selectScript('first_steps_sample');

// 2. lobby_wait
check('lobby_wait', 'After selectScript');
p1.moves.toggleReady();
p2.moves.toggleReady();
p3.moves.toggleReady();
p0.moves.startGame();

// 3. day_start (沙盒模式 autoResolve=false → 停住)
check('day_start', 'After startGame');
console.log(`  Day: ${getDay()} (expected 1)`);
p0.moves.advancePhase();

// 4. mastermind_plan
check('mastermind_plan', 'After day_start advance');

// 出 3 张牌
const state = p0.getState()!;
const mmHand = state.G.seatHands['0'] || [];
const chars = Object.keys(state.G.v1.characters || {});
for (let i = 0; i < 3 && i < mmHand.length && i < chars.length; i++) {
  p0.moves.playCard(mmHand[i], 'character', chars[i]);
  log(`剧作家出牌 ${mmHand[i]} → ${chars[i]}`);
}
p0.moves.advancePhase();

// 5. protagonist_plan
check('protagonist_plan', 'After mastermind advance');

// 各主角出 1 张牌
for (const [pid, client] of [['1', p1], ['2', p2], ['3', p3]] as const) {
  const hand = (client as any).getState()?.G.seatHands[pid] || [];
  // 找一个没被其他主角占的角色
  const usedTargets = new Set(
    ((client as any).getState()?.G.v1.playedCards || [])
      .filter((c: any) => c.owner === 'protagonist')
      .map((c: any) => c.targetId)
  );
  const avail = chars.filter(c => !usedTargets.has(c));
  if (hand.length > 0 && avail.length > 0) {
    (client as any).moves.playCard(hand[0], 'character', avail[0]);
    log(`主角${pid} 出牌 ${hand[0]} → ${avail[0]}`);
  }
  (client as any).moves.advancePhase();
}

// 6. resolve_cards
check('resolve_cards', 'After all protagonists ready');
p0.moves.advancePhase();

// 7. mastermind_abilities
check('mastermind_abilities', 'After resolve');
p0.moves.advancePhase();

// 8. goodwill_window
check('goodwill_window', 'After abilities');
p0.moves.advancePhase();

// 9. incidents
check('incidents', 'After goodwill');
p0.moves.advancePhase();

// 10. day_end (沙盒模式停住)
check('day_end', 'After incidents');
p0.moves.advancePhase();

// 11. Day 2 day_start
check('day_start', 'After day_end advance');
console.log(`  Day: ${getDay()} (expected 2)`);

console.log('\n=== ✅ 完整流程测试通过 ===\n');

p0.stop(); p1.stop(); p2.stop(); p3.stop();
process.exit(0);
