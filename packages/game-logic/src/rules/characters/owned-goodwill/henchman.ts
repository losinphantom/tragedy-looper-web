import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';

export const henchmanGoodwillHandlers: GoodwillHandlerRegistry = {
  henchman_gw3: ({ G, charId }) => {
    const immuneKey = `__incident_immune_${charId}`;
    if (!G.v1.loopState.abilityUsage[immuneKey]) {
      G.v1.loopState.abilityUsage[immuneKey] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage[immuneKey].usedThisLoop = true;
    G.publicLog.push(`📋 ${charId}（手下）使用友好能力：本轮该角色的事件不会发生`);
    G.fullLog.push(`[友好能力] 手下 ${charId} 启用事件免疫`);
    return noGoodwillTargets();
  },
};
