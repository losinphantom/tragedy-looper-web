import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { getAllAliveOthers, resolveTarget } from './local';

export const followerGoodwillHandlers: GoodwillHandlerRegistry = {
  follower_gw2: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = getAllAliveOthers(G, charId);
    const followerTarget = resolveTarget('target', candidates, selectedTargets);
    if (followerTarget) {
      const traitKey = `__trait_append:${followerTarget}:student`;
      if (!G.v1.loopState.abilityUsage[traitKey]) {
        G.v1.loopState.abilityUsage[traitKey] = { usedToday: false, usedThisLoop: false };
      }
      G.v1.loopState.abilityUsage[traitKey].usedThisLoop = true;
      G.publicLog.push(`📋 ${charId}（从者）为 ${followerTarget} 追加学生特性`);
      G.fullLog.push(`[友好能力] 从者 ${charId} → ${followerTarget} 追加 student 特性`);
      return goodwillTargets(followerTarget);
    }

    G.publicLog.push(`📋 ${charId}（从者）无可选目标`);
    return noGoodwillTargets();
  },
};
