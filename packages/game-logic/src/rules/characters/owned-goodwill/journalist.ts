import { addToken } from '../../../utils/tokenHelpers';
import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { applyCharacterTokenDelta } from '../../ahrState';
import { getAllAliveOthers, getLocalAliveOthers, resolveTarget } from './local';

export const journalistGoodwillHandlers: GoodwillHandlerRegistry = {
  journalist_gw2_paranoia: ({ G, charId, selectedTargets }) => {
    // 全场存活他人 +1 不安
    const candidates = getAllAliveOthers(G, charId);
    const target = resolveTarget('target', candidates, selectedTargets);
    if (target) {
      applyCharacterTokenDelta(G, target, 'paranoia', 1);
      G.publicLog.push(`📋 ${charId}（媒体人）使用友好能力：${target} +1 不安`);
      return goodwillTargets(target);
    }
    return noGoodwillTargets();
  },
  journalist_gw2_intrigue: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    // 卡面：往同区1名角色身上 或 所在版图 +1密谋
    // targetType: 'location' | 角色ID
    const localOthers = getLocalAliveOthers(G, charId);
    const targetOptions = [self.locationId, ...localOthers]; // 版图ID + 同区角色ID
    const chosen = resolveTarget('target', targetOptions, selectedTargets) ?? self.locationId;

    if (chosen === self.locationId || Object.keys(G.v1.locations).includes(chosen)) {
      // 放到版图
      const location = G.v1.locations[chosen] ?? G.v1.locations[self.locationId];
      if (location) {
        addToken(location, 'intrigue', 1);
        G.publicLog.push(`📋 ${charId}（媒体人）使用友好能力：${chosen} 版图 +1 密谋`);
      }
    } else {
      // 放到角色
      const targetChar = G.v1.characters[chosen];
      if (targetChar) {
        addToken(targetChar, 'intrigue', 1);
        G.publicLog.push(`📋 ${charId}（媒体人）使用友好能力：${chosen} 角色 +1 密谋`);
        return goodwillTargets(chosen);
      }
    }
    return noGoodwillTargets();
  },
};
