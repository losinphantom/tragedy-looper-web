import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const outsiderGoodwillHandlers: GoodwillHandlerRegistry = {
  outsider_gw3: ({ G, charId }) => {
    if ((G.loopIndex ?? 0) < 1) {
      G.publicLog.push(`📋 ${charId}（局外人）第1轮回无法使用此能力`);
      return noGoodwillTargets();
    }

    const role = getEffectiveRoleId(G, charId);
    if (role) {
      recordRevealedRole(G, charId, role);
      G.publicLog.push(`📋 ${charId}（局外人）的身份被公开：${role}`);
    }
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'outsider_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.outsider_gw3`);
    }
    return noGoodwillTargets();
  },
};
