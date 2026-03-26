import { addToken, getToken } from '../../../utils/tokenHelpers';
import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { resolveTarget } from './local';

export const popIdolGoodwillHandlers: GoodwillHandlerRegistry = {
  pop_idol_gw3: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .filter(([id]) => getToken(G.v1.characters[id], 'paranoia') > 0)
      .map(([id]) => id);
    const targetId = resolveTarget('target', candidates, selectedTargets);
    if (targetId) {
      addToken(G.v1.characters[targetId], 'paranoia', -1);
      G.publicLog.push(`📋 ${charId}（偶像）使用友好能力：${targetId} -1 不安`);
      return goodwillTargets(targetId);
    }
    return noGoodwillTargets();
  },
  pop_idol_gw4: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .map(([id]) => id);
    const target = resolveTarget('target', candidates, selectedTargets);
    if (target) {
      addToken(G.v1.characters[target], 'goodwill', 1);
      G.publicLog.push(`📋 ${charId}（偶像）使用友好能力：${target} +1 友好`);
      return goodwillTargets(target);
    }
    return noGoodwillTargets();
  },
};
