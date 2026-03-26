import { ALL_LOCATIONS } from '../../../data/boardGraph';
import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { getLocalAliveOthers, resolveTarget } from './local';

export const illusionGoodwillHandlers: GoodwillHandlerRegistry = {
  illusion_gw3: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return { targetedCharacterIds: [] };

    const candidates = getLocalAliveOthers(G, charId);
    const target = resolveTarget('target', candidates, selectedTargets);
    if (!target) return { targetedCharacterIds: [] };

    // 移动目标位置
    const destCandidates = ALL_LOCATIONS.filter((loc: string) => loc !== self.locationId);
    const destination = resolveTarget('destination', destCandidates, selectedTargets) ?? destCandidates[0] ?? self.locationId;

    G.v1.characters[target].locationId = destination;
    G.publicLog.push(`📋 ${charId}（幻想）使用友好能力：${target} 移动至 ${destination}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'illusion_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.illusion_gw3`);
    }
    return goodwillTargets(target);
  },
  illusion_gw4: ({ G, charId }) => {
    const removeKey = `__removed_from_board_${charId}`;
    if (!G.v1.loopState.abilityUsage[removeKey]) {
      G.v1.loopState.abilityUsage[removeKey] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage[removeKey].usedThisLoop = true;
    // FAQ: 被移除时不修改 alive，保留指示物
    G.publicLog.push(`📋 ${charId}（幻想）使用友好能力：本轮从版图移除`);
    return noGoodwillTargets();
  },
};
