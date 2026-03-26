/**
 * Goodwill Ability Resolver — 友好能力结算引擎
 *
 * 友好能力的共享判定与调度保留在这里；
 * 具体能力效果通过角色层 goodwill handler registry 分发。
 */

import { CHARACTERS } from '@tragedy/domain';
import type { TragedyGameState } from '../game';
import { applyWmGoodwillRefusalEx } from '../rules/incidentEx';
import { runModuleGoodwillAfterResolveHooks } from '../rules/moduleGoodwill';
import { characterOwnedGoodwillHandlers } from './goodwill';
import {
  collectEligibleAbilities,
  getGoodwillTrait,
  isImmuneToRejection,
  markAbilityUsed,
} from './goodwill/effects';
import type { GoodwillSelectedTargets } from './goodwill/types';
import { getEffectiveRoleId } from '../rules/ahrEffectiveRoles';
import { addToken } from '../utils/tokenHelpers';
import { applyCharacterTokenDelta } from '../rules/ahrState';
import { getCharacterLabel } from '../data/translationService';

export type {
  EligibleAbility,
  GoodwillTrait,
} from './goodwill/effects';
export {
  collectEligibleAbilities,
  getGoodwillTrait,
  isImmuneToRejection,
  isOncePerLoopGoodwillAbility,
  markAbilityUsed,
} from './goodwill/effects';

export function executeGoodwillAbility(
  G: TragedyGameState,
  charId: string,
  abilityId: string,
  selectedTargets?: GoodwillSelectedTargets,
): { targetedCharacterIds: string[] } {
  const handler = characterOwnedGoodwillHandlers[abilityId];
  if (!handler) {
    G.publicLog.push(`📋 ${charId} 使用友好能力 ${abilityId}（效果未实现）`);
    return { targetedCharacterIds: [] };
  }

  const rawResult = handler({ G, charId, abilityId, selectedTargets });
  const result = {
    targetedCharacterIds: rawResult?.targetedCharacterIds ?? [],
  };
  runModuleGoodwillAfterResolveHooks({
    G,
    charId,
    abilityId,
    selectedTargets,
    targetedCharacterIds: result.targetedCharacterIds,
  });
  return result;
}

export function resolveGoodwillPhase(G: TragedyGameState): void {
  const eligible = collectEligibleAbilities(G);

  if (eligible.length === 0) {
    G.publicLog.push('📋 无合格友好能力');
    return;
  }

  for (const ability of eligible) {
    const trait = getGoodwillTrait(G, ability.charId);
    const immune = isImmuneToRejection(ability.abilityId);

    if (trait === 'must_reject' && !immune) {
      G.publicLog.push(`✋ ${ability.charId} 拒绝了能力的发动`);
      G.fullLog.push(`[友好能力] ${ability.charId} 必定无视友好，强制拒绝`);
      applyWmGoodwillRefusalEx(G);
    } else if (trait === 'can_reject' && !immune) {
      G.publicLog.push(`✋ ${ability.charId} 拒绝了能力的发动`);
      G.fullLog.push(`[友好能力] ${ability.charId} 无视友好，沙盒默认拒绝`);
      applyWmGoodwillRefusalEx(G);
    } else {
      executeGoodwillAbility(G, ability.charId, ability.abilityId);
      G.fullLog.push(`[友好能力] ${ability.charId} 执行 ${ability.abilityId}`);

      // LL influencer goodwill spread: 友好结算后同初始区域其他角色+1友好+1不安（每轮限1次）
      applyInfluencerGoodwillSpread(G, ability.charId);
    }

    const charDef = CHARACTERS[ability.charId];
    const abilityDef = charDef?.goodwillAbilities?.find((item: any) => item.id === ability.abilityId);
    markAbilityUsed(G, ability.charId, ability.abilityId, !!abilityDef?.oncePerLoop);
    G.v1.loopState.communicationFlagCount = (G.v1.loopState.communicationFlagCount || 0) + 1;
    if (!G.v1.loopState.communicatedCharacters.includes(ability.charId)) {
      G.v1.loopState.communicatedCharacters.push(ability.charId);
    }
  }
}

const LL_INFLUENCER_GOODWILL_SPREAD_USAGE_KEY = '__ll_influencer_goodwill_spread';
const cn = (id: string) => getCharacterLabel(id);

/**
 * LL 网络名流：友好能力结算后同初始区域其他角色+1友好+1不安（每轮限1次）
 */
function applyInfluencerGoodwillSpread(G: TragedyGameState, charId: string): void {
  if (getEffectiveRoleId(G, charId) !== 'influencer') return;
  const usageRecord = G.v1.loopState?.abilityUsage?.[LL_INFLUENCER_GOODWILL_SPREAD_USAGE_KEY];
  if (usageRecord?.usedThisLoop) return;

  const c = G.v1.characters[charId];
  if (!c || !c.alive) return;

  const startLocs = CHARACTERS[charId as keyof typeof CHARACTERS]?.startingLocations;
  if (!startLocs?.[0]) return;
  const startLoc = startLocs[0];

  for (const [otherId, otherChar] of Object.entries(G.v1.characters)) {
    if (otherId === charId || !otherChar.alive) continue;
    const otherStart = CHARACTERS[otherId as keyof typeof CHARACTERS]?.startingLocations?.[0];
    if (otherStart === startLoc) {
      addToken(G.v1.characters[otherId], 'goodwill', 1);
      applyCharacterTokenDelta(G, otherId, 'paranoia', 1);
      G.fullLog.push(`[身份能力] 网络名流友好扩散：${cn(otherId)} +1 友好 +1 不安`);
    }
  }

  if (!G.v1.loopState.abilityUsage[LL_INFLUENCER_GOODWILL_SPREAD_USAGE_KEY]) {
    G.v1.loopState.abilityUsage[LL_INFLUENCER_GOODWILL_SPREAD_USAGE_KEY] = { usedToday: false, usedThisLoop: true };
  } else {
    G.v1.loopState.abilityUsage[LL_INFLUENCER_GOODWILL_SPREAD_USAGE_KEY].usedThisLoop = true;
  }
}
