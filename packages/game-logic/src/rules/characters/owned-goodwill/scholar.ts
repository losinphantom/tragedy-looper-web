import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { clearAllTokens } from '../../../utils/tokenHelpers';

export const scholarGoodwillHandlers: GoodwillHandlerRegistry = {
  scholar_gw3: ({ G, charId }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    // Task 4: 按卡面效果 — 移除该角色身上全部指示物
    // 现有实现 clearAllTokens 已正确
    clearAllTokens(self);
    G.publicLog.push(`📋 ${charId}（学者）使用友好能力：移除全部指示物`);
    return noGoodwillTargets();
  },
};
