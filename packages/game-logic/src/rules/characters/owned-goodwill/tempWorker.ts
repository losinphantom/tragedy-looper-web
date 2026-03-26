import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { addToken } from '../../../utils/tokenHelpers';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { getLocalAliveOthers, resolveTarget } from './local';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const tempWorkerGoodwillHandlers: GoodwillHandlerRegistry = {
  temp_worker_question_gw2: ({ G, charId, selectedTargets }) => {
    const role = getEffectiveRoleId(G, charId);
    if (role) {
      recordRevealedRole(G, charId, role);
      G.publicLog.push(`📋 ${charId}（临时工？）身份公开为 ${role}`);
    }

    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const allAtLoc = getLocalAliveOthers(G, charId);
    if (allAtLoc.length === 0) return noGoodwillTargets();

    const target = resolveTarget('target', allAtLoc, selectedTargets) ?? allAtLoc[0];
    addToken(G.v1.characters[target], 'goodwill', 2);
    G.publicLog.push(`📋 ${charId}（临时工？）使用友好能力：${target} +2 友好`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'temp_worker_question_gw2')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.temp_worker_question_gw2`);
    }
    return goodwillTargets(target);
  },
};
