import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const copycatGoodwillHandlers: GoodwillHandlerRegistry = {
  copycat_gw3: ({ G, charId }) => {
    if ((G.loopIndex ?? 0) < 1) {
      G.publicLog.push(`📋 ${charId}（模仿犯）第1轮回无法使用此能力`);
      return noGoodwillTargets();
    }

    const myRole = getEffectiveRoleId(G, charId);
    if (myRole) {
      const sameRole = Object.entries(G.v1.characters || {})
        .filter(([id]) => id !== charId)
        .filter(([_, character]) => character.alive)
        .filter(([id]) => !G.v1.loopState?.abilityUsage?.[`__removed_from_board_${id}`]?.usedThisLoop)
        .filter(([id]) => getEffectiveRoleId(G, id) === myRole)
        .map(([id]) => id);
      G.publicLog.push(`📋 ${charId}（模仿犯）公开同身份角色：${sameRole.join(', ') || '不存在'}`);
    }
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'copycat_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.copycat_gw3`);
    }
    return noGoodwillTargets();
  },
};
