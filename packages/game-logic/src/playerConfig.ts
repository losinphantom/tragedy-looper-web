/**
 * Player Configuration — 2-3-4 人变体规则辅助模块
 *
 * 所有人数相关的派生逻辑集中在此，替代散落在各处的硬编码 ['1','2','3']。
 */

import type { TragedyGameState } from './game';

// ── 核心查询函数 ─────────────────────────────────────────────────────────────

/** 按 playerCount 返回活跃主角座位列表 */
export function getProtagonistSeats(G: TragedyGameState): string[] {
  const count = G.v1?.settings?.playerCount ?? 4;
  switch (count) {
    case 2: return ['1'];
    case 3: return ['1', '2'];
    default: return ['1', '2', '3'];
  }
}

/**
 * 每回合该座位需出几张卡
 * - 4人: 每人 1 张
 * - 3人: 队长 2 张, 非队长 0 张
 * - 2人: 唯一主角 3 张
 */
export function getMaxCardsForSeat(G: TragedyGameState, seatId: string): number {
  if (seatId === '0') return 3; // 剧作家始终 3 张

  const count = G.v1?.settings?.playerCount ?? 4;
  switch (count) {
    case 2:
      return 3; // 唯一主角出 3 张
    case 3:
      return seatId === G.v1.leader ? 2 : 0; // 队长 2 张，非队长不出牌
    default:
      return 1; // 每人 1 张
  }
}

/** 是否需要队长轮换（2 人模式不轮换） */
export function shouldRotateLeader(G: TragedyGameState): boolean {
  return (G.v1?.settings?.playerCount ?? 4) !== 2;
}

// ── 人数检测 ─────────────────────────────────────────────────────────────────

/**
 * 从 readyPlayers 推断 playerCount
 * 用于 startGame 时自动检测
 */
export function detectPlayerCount(
  readyPlayers: Record<string, boolean>,
): 2 | 3 | 4 {
  const readyProtagonists = ['1', '2', '3'].filter(
    seat => readyPlayers[seat] === true,
  );
  const count = readyProtagonists.length;
  if (count <= 1) return 2;
  if (count === 2) return 3;
  return 4;
}

// ── 牌组分配 ─────────────────────────────────────────────────────────────────

/**
 * 获取每个主角座位应获得的主角牌组数量
 * - 4人: 每人 1 副
 * - 3人: 队长 2 副, 非队长 0 副
 * - 2人: 唯一主角 3 副
 */
export function getDeckCountForSeat(G: TragedyGameState, seatId: string): number {
  if (seatId === '0') return 0; // 剧作家不拿主角牌

  const count = G.v1?.settings?.playerCount ?? 4;
  switch (count) {
    case 2:
      return seatId === '1' ? 3 : 0;
    case 3:
      return seatId === G.v1.leader ? 2 : (getProtagonistSeats(G).includes(seatId) ? 0 : 0);
    default:
      return getProtagonistSeats(G).includes(seatId) ? 1 : 0;
  }
}
