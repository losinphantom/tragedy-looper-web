import { getCharacterLabel, getLocalizedTerm, type PlayedCard, type TargetSlot } from '@tragedy/game-logic';
import { CHARACTERS, getActionCardImageUrl, getActionCardBackUrl, getActionCardLabel, getSeatAvatarUrl as _getSeatAvatarUrl, getSeatDisplayName as _getSeatDisplayName, getSeatColorHex as _getSeatColorHex } from '@tragedy/domain';

// ── Phase Dictionaries ───────────────────────────────────────────────────────

export const PHASE_LABELS: Record<string, string> = {
  script_select:        '剧本选择',
  loop_setup:           '轮回准备',
  day_start:            '日出',
  mastermind_plan:      '剧本家出牌',
  protagonist_plan:     '主角出牌',
  resolve_cards:        '结算行动牌',
  mastermind_abilities: '剧本家能力',
  goodwill_window:      '友好能力',
  incidents:            '事件确认',
  day_end:              '日落',
  loop_end_check:       '轮回判定',
  match_end:            '游戏结束',
};

export const PHASE_HINTS: Record<string, string> = {
  mastermind_plan:      '剧本家暗置 3 张行动牌到角色或地点上',
  protagonist_plan:     '主角暗置 1 张行动牌',
  resolve_cards:        '公开所有行动牌 → 按顺序手动结算效果',
  mastermind_abilities: '执行身份能力（如主谋放阴谋、杀手检查条件等）',
  goodwill_window:      '领导者可使用角色的友好能力',
  incidents:            '检查今日事件是否触发',
};

export const LOCATION_LABELS_MAP: Record<string, string> = {
  hospital: '医院',
  shrine: '神社',
  city: '都市',
  school: '学校',
};

export type TokenTypeOption = NonNullable<TargetSlot['eligibleTokenTypes']>[number];

const TOKEN_TYPE_LABELS_MAP: Record<TokenTypeOption, string> = {
  paranoia: '不安',
  intrigue: '密谋',
  goodwill: '友好',
};

export function getTokenTypeLabel(tokenType: TokenTypeOption): string {
  return TOKEN_TYPE_LABELS_MAP[tokenType] || tokenType;
}

// ── Character helpers ────────────────────────────────────────────────────────

export function getCharLabel(charId: string): string {
  return getCharacterLabel(charId);
}

export function getCharImageSrc(charId: string): string {
  return CHARACTERS[charId]?.source?.cardAssetPath
    || `/assets/角色卡面/character_card-front_${getCharLabel(charId)}_01.png`;
}

export function t(key: string): string {
  return getLocalizedTerm(key);
}

// ── Action card helpers (delegated to domain layer) ─────────────────────────

/**
 * 获取行动牌正面图片 URL（按座位着色）
 * @param cardId 行动牌 ID
 * @param seatId 座位 ID（'0'=脚本家, '1'=橙, '2'=绿, '3'=蓝）
 */
export function getCardImageUrl(cardId: string, seatId?: string): string | undefined {
  return getActionCardImageUrl(cardId, seatId);
}

/** 获取卡背图片 URL（按座位着色）*/
export function getCardBackUrl(seatId?: string): string {
  return getActionCardBackUrl(seatId);
}

export function getPlayedCardRenderUrl(
  card: Pick<PlayedCard, 'cardTemplateId' | 'playedBySeat' | 'faceUp'>,
  options?: { forceBack?: boolean },
): string {
  if (options?.forceBack || !card.faceUp || card.cardTemplateId === 'hidden') {
    return getCardBackUrl(card.playedBySeat);
  }

  return getCardImageUrl(card.cardTemplateId, card.playedBySeat) ?? getCardBackUrl(card.playedBySeat);
}

/** 获取行动牌中文标签 */
export function getCardLabel(cardId: string): string {
  return getActionCardLabel(cardId);
}

// Re-export for convenience
export { CHARACTERS };

// ── Player avatar helpers (delegated to domain layer) ───────────────────────

export const getSeatAvatarUrl = _getSeatAvatarUrl;
export const getSeatDisplayName = _getSeatDisplayName;
export const getSeatColorHex = _getSeatColorHex;
