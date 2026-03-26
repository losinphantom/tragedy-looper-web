import { CHARACTERS } from '@tragedy/domain';
import type { TragedyGameState } from '../../../game';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';

export function isOncePerLoopCharacterGoodwillAbility(charId: string, abilityId: string): boolean {
  const abilityDef = CHARACTERS[charId]?.goodwillAbilities.find(ability => ability.id === abilityId);
  if (!abilityDef) return false;
  return !!abilityDef.oncePerLoop;
}

/**
 * 不死身份列表（domain 层 RoleRecord.rules 中 summary 含"不死"的身份）
 * 来源：plotProcessorCatalog.ts IMMORTAL_ROLES 常量，统一管理
 */
const IMMORTAL_ROLE_IDS = new Set([
  'time_traveler',
  'detective',
  'nightmare',
  'vampire',
  'immortal',
  'ai',
  'black_cat',
  'illusion',
  'storyteller',
  'dimension_traveler',
  'sacrifice',   // 祭品：不死
  'faceless',     // 无面者：不死
]);

/**
 * 判断角色当前身份是否具有不死特性
 * 基于 hiddenRoles → effectiveRoleId → 不死身份列表查表
 */
export function hasImmortalityByRole(G: TragedyGameState, charId: string): boolean {
  const roleId = getEffectiveRoleId(G, charId);
  if (!roleId) return false;
  return IMMORTAL_ROLE_IDS.has(roleId);
}

// ── 解耦查询函数（供下游子系统消费） ─────────────────────────────────────

/**
 * Task 9: 判断角色是否具有事件免疫（手下 gw3 flag）
 * 由 incidentProcessorCatalog 消费
 */
export function isIncidentImmune(G: TragedyGameState, charId: string): boolean {
  return !!G.v1.loopState.abilityUsage[`__incident_immune_${charId}`]?.usedThisLoop;
}

/**
 * Task 10: 判断角色是否已从版图移除（幻想 gw4 flag）
 * 供轮回管理、存活判定等下游系统消费
 */
export function isRemovedFromBoard(G: TragedyGameState, charId: string): boolean {
  return !!G.v1.loopState.abilityUsage[`__removed_from_board_${charId}`]?.usedThisLoop;
}

/**
 * Task 3: 获取角色的有效位置列表（仙人 gw3 相邻判定 flag）
 * 供事件处理器消费：当 flag 激活时返回 [当前位置, ...相邻位置]
 */
export function getEffectiveLocations(G: TragedyGameState, charId: string): string[] {
  const ch = G.v1.characters[charId];
  if (!ch) return [];
  const base = ch.locationId;
  const hasFlag = !!G.v1.loopState.abilityUsage[`__immortal_adjacent_${charId}`]?.usedToday;
  if (!hasFlag) return [base];

  // 获取相邻版图
  const adjacentLocations = getAdjacentLocations(base);
  return [base, ...adjacentLocations];
}

/**
 * 简单的版图相邻关系（基于标准版图）
 * TODO: 从 boardGraph 模块导入正式的相邻关系
 */
function getAdjacentLocations(locationId: string): string[] {
  const adjacencyMap: Record<string, string[]> = {
    shrine: ['city', 'school'],
    city: ['shrine', 'hospital', 'school'],
    school: ['shrine', 'city'],
    hospital: ['city'],
  };
  return adjacencyMap[locationId] ?? [];
}

/**
 * 判断友好能力是否满足"剧作家阶段可用"条件
 * 适用于 higher_being_gw2（无视友好+1友好以上）和 doctor_gw2（无视友好+2友好以上）
 * 供 pendingAbilities 收集器消费
 */
export function isMastermindGoodwillEligible(
  G: TragedyGameState,
  charId: string,
  abilityId: string,
): boolean {
  const ch = G.v1.characters[charId];
  if (!ch || !ch.alive) return false;

  // 需要角色有"无视友好"特性
  const roleId = getEffectiveRoleId(G, charId);
  if (!roleId) return false;

  // 从 domain 查 goodwillRefusal
  const { ROLES } = require('@tragedy/domain');
  const roleDef = ROLES?.[roleId];
  const hasIgnoreGoodwill = roleDef?.goodwillRefusal === 'must_reject' || roleDef?.goodwillRefusal === 'can_reject';
  if (!hasIgnoreGoodwill) return false;

  const goodwillCount = ch.tokens?.goodwill ?? 0;
  if (abilityId === 'higher_being_gw2') return goodwillCount >= 1;
  if (abilityId === 'doctor_gw2') return goodwillCount >= 2;
  return false;
}
