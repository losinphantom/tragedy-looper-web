/**
 * ActionCards Module — 行动牌统一查询 API
 *
 * 从 domain 数据层提供行动牌的查询、标签、资产路径等服务。
 * 前端和 game-logic 层均通过此模块获取行动牌信息。
 */

import { ACTION_CARDS } from '../data/actionCards';
import type { ActionCardRecord } from '../dictionary';

// ── 查询 API ────────────────────────────────────────────────────────────────

/** 按 ID 查询行动牌 */
export function getActionCard(cardId: string): ActionCardRecord | undefined {
  return ACTION_CARDS[cardId];
}

/** 获取行动牌中文标签 */
export function getActionCardLabel(cardId: string): string {
  return ACTION_CARDS[cardId]?.label['zh-CN'] ?? cardId;
}

/** 获取所有行动牌 */
export function getAllActionCards(): ActionCardRecord[] {
  return Object.values(ACTION_CARDS);
}

/** 按阵营获取行动牌 */
export function getActionCardsByOwner(owner: 'mastermind' | 'protagonist'): ActionCardRecord[] {
  return Object.values(ACTION_CARDS).filter(c => c.owner === owner);
}

// ── 卡组构建 ────────────────────────────────────────────────────────────────

/** 构建脚本家手牌（含重复卡） */
export function buildMastermindDeck(): string[] {
  return [
    'mastermind_unease_plus_1',
    'mastermind_unease_plus_1',   // 不安+1 有两张
    'mastermind_unease_minus_1',
    'mastermind_forbid_unease',
    'mastermind_forbid_goodwill',
    'mastermind_intrigue_plus_1',
    'mastermind_intrigue_plus_2',
    'mastermind_move_vertical',
    'mastermind_move_horizontal',
    'mastermind_move_diagonal',
  ];
}

/** 构建主角手牌 */
export function buildProtagonistDeck(): string[] {
  return [
    'protagonist_unease_plus_1',
    'protagonist_unease_minus_1',
    'protagonist_goodwill_plus_1',
    'protagonist_goodwill_plus_2',
    'protagonist_forbid_intrigue',
    'protagonist_move_vertical',
    'protagonist_move_horizontal',
    'protagonist_forbid_movement',
  ];
}

// ── 资产路径 ────────────────────────────────────────────────────────────────

/**
 * 座位 ID 到颜色前缀的映射
 * 座位 0 = 脚本家, 1 = 橙, 2 = 绿, 3 = 蓝
 */
type SeatColor = 'mastermind' | 'orange' | 'green' | 'blue';

const SEAT_COLOR: Record<string, SeatColor> = {
  '0': 'mastermind',
  '1': 'orange',
  '2': 'green',
  '3': 'blue',
};

/** cardId → 各颜色文件名映射 */
const CARD_ASSET_MAP: Record<string, Record<SeatColor, string>> = {
  // ── 脚本家卡牌 ──
  mastermind_unease_plus_1:   { mastermind: '脚本家不安放置.png', orange: '', green: '', blue: '' },
  mastermind_unease_minus_1:  { mastermind: '脚本家不安移除.png', orange: '', green: '', blue: '' },
  mastermind_forbid_unease:   { mastermind: '脚本家不安禁止.png', orange: '', green: '', blue: '' },
  mastermind_forbid_goodwill: { mastermind: '脚本家友好禁止.png', orange: '', green: '', blue: '' },
  mastermind_intrigue_plus_1: { mastermind: '脚本家阴谋放置一.png', orange: '', green: '', blue: '' },
  mastermind_intrigue_plus_2: { mastermind: '脚本家阴谋放置二.png', orange: '', green: '', blue: '' },
  mastermind_move_vertical:   { mastermind: '脚本家移动上下.png', orange: '', green: '', blue: '' },
  mastermind_move_horizontal: { mastermind: '脚本家移动左右.png', orange: '', green: '', blue: '' },
  mastermind_move_diagonal:   { mastermind: '脚本家移动交叉.png', orange: '', green: '', blue: '' },

  // ── 主角卡牌（三色） ──
  protagonist_unease_plus_1:   { mastermind: '', orange: '主人公橙不安放置.png',   green: '主人公绿不安放置.png',   blue: '主人公蓝不安放置.png' },
  protagonist_unease_minus_1:  { mastermind: '', orange: '主人公橙不安移除.png',   green: '主人公绿不安移除.png',   blue: '主人公蓝不安移除.png' },
  protagonist_goodwill_plus_1: { mastermind: '', orange: '主人公橙友好放置一.png', green: '主人公绿友好放置一.png', blue: '主人公蓝友好放置一.png' },
  protagonist_goodwill_plus_2: { mastermind: '', orange: '主人公橙友好放置二.png', green: '主人公绿友好放置二.png', blue: '主人公蓝友好放置二.png' },
  protagonist_forbid_intrigue: { mastermind: '', orange: '主人公橙阴谋禁止.png',   green: '主人公绿阴谋禁止.png',   blue: '主人公蓝阴谋禁止.png' },
  protagonist_move_vertical:   { mastermind: '', orange: '主人公橙移动上下.png',   green: '主人公绿移动上下.png',   blue: '主人公蓝移动上下.png' },
  protagonist_move_horizontal: { mastermind: '', orange: '主人公橙移动左右.png',   green: '主人公绿移动左右.png',   blue: '主人公蓝移动左右.png' },
  protagonist_forbid_movement: { mastermind: '', orange: '主人公橙移动禁止.png',   green: '主人公绿移动禁止.png',   blue: '主人公蓝移动禁止.png' },
};

/** 卡背路径 */
const CARD_BACK: Record<SeatColor, string> = {
  mastermind: '/assets/卡背/card_back_剧作家.png',
  orange:     '/assets/卡背/card_back_主人公橙.png',
  green:      '/assets/卡背/card_back_主人公绿.png',
  blue:       '/assets/卡背/card_back_主人公蓝.png',
};

/**
 * 获取行动牌正面图片 URL（按座位着色）
 * @param cardId 卡牌 ID
 * @param seatId 座位 ID ('0'=脚本家, '1'=橙, '2'=绿, '3'=蓝)
 */
export function getActionCardImageUrl(cardId: string, seatId?: string): string | undefined {
  const color = SEAT_COLOR[seatId || '0'] || 'mastermind';
  const entry = CARD_ASSET_MAP[cardId];
  if (!entry) return undefined;
  const filename = entry[color];
  if (!filename) return undefined;
  return `/assets/行动卡面/${filename}`;
}

/**
 * 获取卡背图片 URL（按座位着色）
 */
export function getActionCardBackUrl(seatId?: string): string {
  const color = SEAT_COLOR[seatId || '0'] || 'mastermind';
  return CARD_BACK[color];
}

// ── Once-per-loop 检查 ──────────────────────────────────────────────────────

/** 检查卡牌是否已在本轮使用过（一轮一次） */
export function isActionCardLocked(cardId: string, usedCards: string[]): boolean {
  const def = ACTION_CARDS[cardId];
  if (!def) return false;
  return def.oncePerLoop && usedCards.includes(cardId);
}
