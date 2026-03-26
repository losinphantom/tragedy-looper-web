import { addToken } from '../../../utils/tokenHelpers';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { resolveTarget } from './local';

export const youngLadyGoodwillHandlers: GoodwillHandlerRegistry = {
  young_lady_gw3: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();
    if (self.locationId !== 'school' && self.locationId !== 'city') {
      G.publicLog.push(`📋 ${charId}（大小姐）不在学校或都市，无法使用能力`);
      return noGoodwillTargets();
    }

    const allAtLoc = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .map(([id]) => id);
    const target = resolveTarget('target', allAtLoc, selectedTargets);
    if (target) {
      addToken(G.v1.characters[target], 'goodwill', 1);
      G.publicLog.push(`📋 ${charId}（大小姐）使用友好能力：${target} +1 友好`);
    }
    return noGoodwillTargets();
  },
};
