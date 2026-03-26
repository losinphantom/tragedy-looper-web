/**
 * Goodwill Ability Resolver — 友好能力结算引擎
 *
 * 步骤 6（规则书 p8）的自动结算管道。
 * 沙盒模式下自动执行所有合格友好能力，按身份特性决定拒绝/允许。
 *
 * 友好阈值从 domain 层 AbilityRecord.goodwillCost 读取，不在此硬编码。
 */

import type { TragedyGameState } from '../../game';
import { CHARACTERS, findRoleById, getRoleById } from '@tragedy/domain';
import { getCard } from '../../data/cardService';
import { getHopeOverrideIgnoreGoodwill } from '../../utils/effectiveValues';
import { getGoodwillActivationValue } from '../../rules/ahrTokenSemantics';
import { getEffectiveRoleId } from '../../rules/ahrEffectiveRoles';
import { resolveModuleGoodwillTrait } from '../../rules/moduleGoodwill';

// ── 免疫友好拒绝的能力 ID ────────────────────────────────────────────────────
// 这些能力即使角色有无视友好/必定无视友好，也不能被拒绝
const IMMUNE_TO_REJECTION = new Set([
  'nurse_gw2',           // 护士：即使带有无视友好特性也不能拒绝
  'outsider_gw3',        // 局外人：即使带有无视友好特性也不能拒绝
  'copycat_gw3',         // 模仿犯：即使带有无视友好特性也不能拒绝
]);

// ── 身份特性分类 ─────────────────────────────────────────────────────────────

export type GoodwillTrait = 'must_reject' | 'can_reject' | 'must_allow';

function getRoleDefinitionForCharacter(G: TragedyGameState, charId: string) {
  const roleId = getEffectiveRoleId(G, charId);
  if (!roleId) return null;

  const setId = G.scriptOpen?.tragedySetId;
  return setId ? getRoleById(setId, roleId) : findRoleById(roleId);
}

/**
 * 获取角色的友好拒绝特性
 * 基于 hiddenRoles 中的身份 → domain 层 RoleRecord.goodwillRefusal 动态查找
 */
export function getGoodwillTrait(G: TragedyGameState, charId: string): GoodwillTrait {
  // 十周年: 希望/绝望指示物覆盖优先于角色特性
  const hopeOverride = getHopeOverrideIgnoreGoodwill(G.v1.characters[charId]);
  if (hopeOverride === false) return 'must_allow';  // 希望消除“无视友好”
  if (hopeOverride === true) return 'must_reject';   // 绝望赋予“必定无视友好”

  const roleDef = getRoleDefinitionForCharacter(G, charId);
  if (!roleDef) return 'must_allow';

  let trait: GoodwillTrait;
  switch (roleDef.goodwillRefusal) {
    case 'mandatory': trait = 'must_reject'; break;
    case 'optional':  trait = 'can_reject'; break;
    case 'none':
    default:          trait = 'must_allow'; break;
  }
  return resolveModuleGoodwillTrait({ G, charId, currentTrait: trait });
}

/**
 * 判断能力是否免疫友好拒绝
 */
export function isImmuneToRejection(abilityId: string): boolean {
  return IMMUNE_TO_REJECTION.has(abilityId);
}

// ── 合格能力收集 ─────────────────────────────────────────────────────────────

export interface EligibleAbility {
  charId: string;
  abilityId: string;
  goodwillCost: number;
  summary: string;
}

function hasRecoverableLeaderOncePerLoopCard(G: TragedyGameState): boolean {
  const leaderSeat = G.v1.leader || '1';
  const usedOncePerLoop = G.board?.usedOncePerLoopCards || [];
  if (usedOncePerLoop.some((key: string) => key.startsWith(`${leaderSeat}:`))) {
    return true;
  }
  return G.v1.playedCards.some((pc) => {
    if (pc.playedBySeat !== leaderSeat) return false;
    const cardDef = getCard(pc.cardTemplateId);
    return !!cardDef?.oncePerLoop;
  });
}

export function isOncePerLoopGoodwillAbility(charId: string, abilityId: string): boolean {
  const abilityDef = CHARACTERS[charId]?.goodwillAbilities.find(ability => ability.id === abilityId);
  if (!abilityDef) return false;
  return !!abilityDef.oncePerLoop;
}

/**
 * 收集所有合格的友好能力
 * 条件：角色存活 + 友好 ≥ 阈值（从 domain goodwillCost 读取）
 */
export function collectEligibleAbilities(G: TragedyGameState): EligibleAbility[] {
  const result: EligibleAbility[] = [];

  for (const [charId, charState] of Object.entries(G.v1.characters)) {
    if (!charState.alive) continue;

    const charDef = CHARACTERS[charId];
    if (!charDef?.goodwillAbilities) continue;

    for (const ability of charDef.goodwillAbilities) {
      if (ability.timing !== 'goodwill_window') continue;

      if (ability.id === 'class_rep_gw2' && !hasRecoverableLeaderOncePerLoopCard(G)) {
        continue;
      }

      if (ability.id === 'police_gw4') {
        const validIncidents = (G.v1.loopState.incidentHistory || [])
          .filter(inc => inc.loop === G.loopIndex && !inc.wasImmune);
        if (validIncidents.length === 0) continue;
      }

      // 从 domain 层 AbilityRecord.goodwillCost 读取阈值
      const threshold = ability.goodwillCost ?? 99;
      if (getGoodwillActivationValue(G, charState) >= threshold) {
        const usageKey = `${charId}_${ability.id}`;
        const usage = G.v1.loopState.abilityUsage[usageKey];
        if (usage?.usedToday) continue;
        if (ability.oncePerLoop && usage?.usedThisLoop) continue;

        const summary = ability.rules?.[0]?.summary?.['zh-CN'] ?? ability.label['zh-CN'] ?? '';
        result.push({
          charId,
          abilityId: ability.id,
          goodwillCost: threshold,
          summary,
        });
      }
    }
  }

  return result;
}

/**
 * 标记能力已使用
 */
export function markAbilityUsed(G: TragedyGameState, charId: string, abilityId: string, isLoopAbility: boolean): void {
  const key = `${charId}_${abilityId}`;
  if (!G.v1.loopState.abilityUsage[key]) {
    G.v1.loopState.abilityUsage[key] = { usedToday: false, usedThisLoop: false };
  }
  G.v1.loopState.abilityUsage[key].usedToday = true;
  if (isLoopAbility) {
    G.v1.loopState.abilityUsage[key].usedThisLoop = true;
  }
}

