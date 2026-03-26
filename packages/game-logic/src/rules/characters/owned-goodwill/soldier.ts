import { applyCharacterTokenDelta } from '../../ahrState';
import {
  noGoodwillTargets,
  goodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { getLocalAliveOthers, resolveTarget } from './local';

export const soldierGoodwillHandlers: GoodwillHandlerRegistry = {
  soldier_gw2: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = getLocalAliveOthers(G, charId);
    const target = resolveTarget('target', candidates, selectedTargets);
    if (!target) return noGoodwillTargets();

    applyCharacterTokenDelta(G, target, 'paranoia', 2);
    G.publicLog.push(`📋 ${charId}（军人）使用友好能力：${target} +2 不安`);
    return goodwillTargets(target);
  },
  soldier_gw5: ({ G, charId }) => {
    if (!G.v1.loopState.abilityUsage['__protagonist_immunity']) {
      G.v1.loopState.abilityUsage['__protagonist_immunity'] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage['__protagonist_immunity'].usedThisLoop = true;
    G.publicLog.push(`📋 ${charId}（军人）使用友好能力：本轮主人公不会死亡`);
    G.fullLog.push(`[友好能力] 军人 ${charId} 启用主人公免死保护`);
    return noGoodwillTargets();
  },
};
