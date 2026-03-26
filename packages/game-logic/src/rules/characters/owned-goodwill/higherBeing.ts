import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { applyCharacterTokenDelta } from '../../ahrState';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const higherBeingGoodwillHandlers: GoodwillHandlerRegistry = {
  higher_being_gw2: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const explicitTarget = selectedTargets?.target;
    const explicitToken = selectedTargets?.token;
    const sameAreaTargets = Object.entries(G.v1.characters)
      .filter(([_, ch]) => ch.alive && ch.locationId === self.locationId)
      .map(([id]) => id);
    const target = explicitTarget && sameAreaTargets.includes(explicitTarget)
      ? explicitTarget
      : sameAreaTargets[0];
    const tokenType = explicitToken === 'despair' ? 'despair' : 'hope';

    if (!target) return noGoodwillTargets();

    applyCharacterTokenDelta(G, target, tokenType, 1);
    G.publicLog.push(`📋 ${charId}（上位存在）使用友好能力：${target} +1 ${tokenType === 'hope' ? '希望' : '绝望'}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'higher_being_gw2')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.higher_being_gw2`);
    }
    return goodwillTargets(target);
  },
};
