import { CHARACTERS } from '@tragedy/domain';
import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { resolveTarget } from './local';

export const teacherGoodwillHandlers: GoodwillHandlerRegistry = {
  teacher_gw4: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .filter(([id]) => {
        const def = CHARACTERS[id];
        return !!def
          && def.traits.includes('student')
          && !!getEffectiveRoleId(G, id)
          && !G.v1.loopState.revealedRoles[id];
      })
      .map(([id]) => id);
    const target = resolveTarget('target', candidates, selectedTargets);

    if (!target) {
      return noGoodwillTargets();
    }

    const role = getEffectiveRoleId(G, target);
    if (!role) return noGoodwillTargets();

    recordRevealedRole(G, target, role);
    G.publicLog.push(`📋 ${charId}（教师）使用友好能力：${target} 身份公开为 ${role}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'teacher_gw4')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.teacher_gw4`);
    }
    return goodwillTargets(target);
  },
};
