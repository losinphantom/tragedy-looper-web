/**
 * 调试脚本：查看 Day 2 protagonist_plan 时 p3 的手牌
 */
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { TragedyLooper } from '../packages/game-logic/src/game';

const spec = { game: TragedyLooper, multiplayer: Local(), numPlayers: 4 };
const p0 = Client({ ...spec, playerID: '0' });
const p1 = Client({ ...spec, playerID: '1' });
const p2 = Client({ ...spec, playerID: '2' });
const p3 = Client({ ...spec, playerID: '3' });
p0.start(); p1.start(); p2.start(); p3.start();

function G() { return p0.getState()!.G; }
function phase() { return p0.getState()!.ctx.phase || '??'; }

// Setup
p0.moves.selectScript('first_steps_sample');
p1.moves.toggleReady(); p2.moves.toggleReady(); p3.moves.toggleReady();
p0.moves.startGame();

// Day 1: 模拟 test-action-cards.ts 第 1-4 节的出牌
p0.moves.advancePhase(); // day_start → mastermind_plan

// 剧作家出 3 张
p0.moves.playCard('mastermind_unease_plus_1', 'character', 'girl_student');
p0.moves.playCard('mastermind_unease_minus_1', 'character', 'office_worker');
p0.moves.playCard('mastermind_forbid_unease', 'character', 'patient');
p0.moves.advancePhase(); // → protagonist_plan

// 主角出牌（模拟测试脚本）
p1.moves.playCard('protagonist_goodwill_plus_1', 'character', 'girl_student');
p2.moves.playCard('protagonist_unease_minus_1', 'character', 'office_worker');
p3.moves.playCard('protagonist_goodwill_plus_2', 'character', 'boy_student');
p1.moves.advancePhase(); p2.moves.advancePhase(); p3.moves.advancePhase();

// 推完 Day 1
p0.moves.advancePhase(); // resolve_cards
p0.moves.advancePhase(); // mastermind_abilities
p0.moves.advancePhase(); // goodwill_window
p0.moves.advancePhase(); // incidents
p0.moves.advancePhase(); // day_end

// Day 2 day_start
p0.moves.advancePhase(); // → mastermind_plan

console.log(`Phase: ${phase()}`);
console.log(`Day: ${G().day}`);
console.log('\n=== 手牌状态 ===');
for (let i = 0; i <= 3; i++) {
  const hand = G().seatHands[String(i)] || [];
  console.log(`Seat ${i}: [${hand.join(', ')}] (${hand.length} 张)`);
}
console.log(`\np3 手牌包含 protagonist_unease_minus_1: ${G().seatHands['3'].includes('protagonist_unease_minus_1')}`);
console.log(`usedOncePerLoopCards: [${G().board.usedOncePerLoopCards.join(', ')}]`);
console.log(`playedCards: ${G().v1.playedCards.length} 张`);

// 尝试 p3 出牌
p0.moves.playCard('mastermind_unease_plus_1', 'character', 'girl_student');
p0.moves.playCard('mastermind_intrigue_plus_1', 'character', 'office_worker');
p0.moves.playCard('mastermind_intrigue_plus_2', 'character', 'boy_student');
p0.moves.advancePhase(); // → protagonist_plan

console.log(`\nPhase: ${phase()}`);
console.log('p3 手牌:', G().seatHands['3']);
const r = p3.moves.playCard('protagonist_unease_minus_1', 'character', 'boy_student');
console.log('p3 出牌结果:', r);
console.log('playedCards by p3:', G().v1.playedCards.filter((c: any) => c.playedBySeat === '3'));
console.log('所有 protagonist 已出目标:', G().v1.playedCards.filter((c: any) => c.owner === 'protagonist').map((c: any) => c.targetId));

p0.stop(); p1.stop(); p2.stop(); p3.stop();
