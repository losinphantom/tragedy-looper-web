import { CHARACTERS } from '@tragedy/domain';
import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { resolveTarget } from './local';

export const cultLeaderGoodwillHandlers: GoodwillHandlerRegistry = {
  cult_leader_gw3: ({ G, charId, selectedTargets }) => {
    const candidates = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.alive)
      .filter(([id, ch]) => {
        const def = CHARACTERS[id];
        return !!def && getToken(ch, 'paranoia') >= def.uneaseLimit;
      })
      .map(([id]) => id);

    const targetId = resolveTarget('target', candidates, selectedTargets);
    if (targetId) {
      addToken(G.v1.characters[targetId], 'goodwill', 1);
      G.publicLog.push(`📋 ${charId}（教主）使用友好能力：${targetId} +1 友好（不安超限）`);
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'cult_leader_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.cult_leader_gw3`);
    }
    return noGoodwillTargets();
  },
  cult_leader_gw4: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .filter(([id, ch]) => {
        const def = CHARACTERS[id];
        return !!def
          && getToken(ch, 'paranoia') >= def.uneaseLimit
          && !!getEffectiveRoleId(G, id)
          && !G.v1.loopState.revealedRoles[id];
      })
      .map(([id]) => id);
    const target = resolveTarget('target', candidates, selectedTargets);

    if (!target) return noGoodwillTargets();

    const role = getEffectiveRoleId(G, target);
    if (!role) return noGoodwillTargets();

    recordRevealedRole(G, target, role);
    G.publicLog.push(`📋 ${charId}（教主）使用友好能力：${target} 身份公开为 ${role}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'cult_leader_gw4')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.cult_leader_gw4`);
    }
    return goodwillTargets(target);
  },
};
