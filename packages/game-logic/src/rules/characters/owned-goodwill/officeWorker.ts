import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const officeWorkerGoodwillHandlers: GoodwillHandlerRegistry = {
  office_worker_gw3: ({ G, charId }) => {
    const role = getEffectiveRoleId(G, charId);
    if (role) {
      recordRevealedRole(G, charId, role);
      G.publicLog.push(`📋 ${charId}（职员）的身份被公开：${role}`);
    }
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'office_worker_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.office_worker_gw3`);
    }
    return noGoodwillTargets();
  },
};
