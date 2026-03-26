/**
 * Abilities Module — 友好/被动能力统一查询 API
 */

import type { AbilityRecord } from '../dictionary';
import { CHARACTER_ABILITIES } from '../data/characterAbilities';
import { CHARACTERS } from '../data/characters';

/** 按 ID 查询能力 */
export function getAbilityById(id: string): AbilityRecord | undefined {
  return CHARACTER_ABILITIES[id];
}

/** 获取所有能力 */
export function getAllAbilities(): AbilityRecord[] {
  return Object.values(CHARACTER_ABILITIES);
}

/** 获取角色的所有能力（友好 + 被动） */
export function getAbilitiesForCharacter(charId: string): {
  goodwill: AbilityRecord[];
  passive: AbilityRecord[];
} {
  const char = CHARACTERS[charId];
  if (!char) return { goodwill: [], passive: [] };
  return {
    goodwill: char.goodwillAbilities,
    passive: char.passiveAbilities,
  };
}

/** 按 timing 筛选能力 */
export function getAbilitiesByTiming(timing: string): AbilityRecord[] {
  return Object.values(CHARACTER_ABILITIES).filter(a => a.timing === timing);
}

/** 按 controller 筛选能力 */
export function getAbilitiesByController(controller: AbilityRecord['controller']): AbilityRecord[] {
  return Object.values(CHARACTER_ABILITIES).filter(a => a.controller === controller);
}
