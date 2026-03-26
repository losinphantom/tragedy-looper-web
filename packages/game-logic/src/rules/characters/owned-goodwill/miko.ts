import { addToken, getToken } from '../../../utils/tokenHelpers';
import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const mikoGoodwillHandlers: GoodwillHandlerRegistry = {
  miko_gw3: ({ G, charId }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();
    if (self.locationId !== 'shrine') {
      G.publicLog.push(`📋 ${charId}（巫女）不在神社，无法使用能力`);
      return noGoodwillTargets();
    }

    const shrine = G.v1.locations['shrine'];
    if (shrine && getToken(shrine, 'intrigue') > 0) {
      addToken(shrine, 'intrigue', -1);
      G.publicLog.push(`📋 ${charId}（巫女）使用友好能力：神社 -1 密谋`);
    }

    return noGoodwillTargets();
  },
  miko_gw5: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const others = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .map(([id]) => id);
    const explicitTarget = selectedTargets?.target;
    const target = explicitTarget && others.includes(explicitTarget)
      ? explicitTarget
      : others.find(id => getEffectiveRoleId(G, id) && !G.v1.loopState.revealedRoles[id]);

    if (!target) return noGoodwillTargets();

    const role = getEffectiveRoleId(G, target);
    if (!role) return noGoodwillTargets();

    recordRevealedRole(G, target, role);
    G.publicLog.push(`📋 ${charId}（巫女）使用友好能力：${target} 身份公开为 ${role}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'miko_gw5')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.miko_gw5`);
    }
    return goodwillTargets(target);
  },
};
