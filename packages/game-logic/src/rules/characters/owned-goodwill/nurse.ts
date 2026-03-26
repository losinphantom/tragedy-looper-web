import { CHARACTERS } from '@tragedy/domain';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';

function getLocalAliveOthers(
  G: Parameters<GoodwillHandlerRegistry[string]>[0]['G'],
  charId: string,
): string[] {
  const self = G.v1.characters[charId];
  if (!self || !self.alive) return [];

  return Object.entries(G.v1.characters)
    .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
    .map(([id]) => id);
}

export const nurseGoodwillHandlers: GoodwillHandlerRegistry = {
  nurse_gw2: ({ G, charId, selectedTargets }) => {
    const others = getLocalAliveOthers(G, charId);
    const eligibleTargets = others.filter(id => {
      const ch = G.v1.characters[id];
      const charDef = CHARACTERS[id];
      return getToken(ch, 'paranoia') > 0 && charDef && getToken(ch, 'paranoia') >= charDef.uneaseLimit;
    });

    const explicitTarget = selectedTargets?.target;
    const target = explicitTarget && eligibleTargets.includes(explicitTarget)
      ? explicitTarget
      : eligibleTargets[0];

    if (target) {
      addToken(G.v1.characters[target], 'paranoia', -1);
      G.publicLog.push(`📋 ${charId}（护士）使用友好能力：${target} -1 不安（不安超限）`);
    }
    return noGoodwillTargets();
  },
};
