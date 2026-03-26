import type { GoodwillGameState, GoodwillSelectedTargets } from '../../../engine/goodwill/types';

export function getLocalAliveOthers(G: GoodwillGameState, charId: string): string[] {
  const self = G.v1.characters[charId];
  if (!self || !self.alive) return [];

  return Object.entries(G.v1.characters)
    .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
    .map(([id]) => id);
}

export function getAllAliveOthers(G: GoodwillGameState, charId: string): string[] {
  return Object.entries(G.v1.characters)
    .filter(([id, ch]) => id !== charId && ch.alive)
    .map(([id]) => id);
}

/**
 * 从 selectedTargets 获取用户选择的目标，fallback 到候选列表的第一个（沙盒兼容）
 * @param slotId - 目标槽位名称（如 'target', 'event', 'direction'）
 * @param candidates - 候选目标列表
 * @param selectedTargets - 用户选择的目标映射
 */
export function resolveTarget(
  slotId: string,
  candidates: string[],
  selectedTargets?: GoodwillSelectedTargets,
): string | undefined {
  const selected = selectedTargets?.[slotId];
  if (selected && candidates.includes(selected)) return selected;
  return candidates[0];
}

export function resolveTargetFromSlots(
  slotIds: string[],
  candidates: string[],
  selectedTargets?: GoodwillSelectedTargets,
): string | undefined {
  for (const slotId of slotIds) {
    const selected = selectedTargets?.[slotId];
    if (selected && candidates.includes(selected)) return selected;
  }
  return candidates[0];
}
