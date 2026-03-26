import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { recordRevealedRole } from '../../../revealTracker';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { getLocalAliveOthers, resolveTarget } from './local';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';

export const richManGoodwillHandlers: GoodwillHandlerRegistry = {
  rich_man_gw4: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    // Task 7: 按卡面 "领地中另外1名角色" → 同区域（领地=角色所在区域）
    // 过滤未公开身份的同区存活角色
    const candidates = getLocalAliveOthers(G, charId)
      .filter(id => G.v1.hiddenRoles?.[id] && !G.v1.loopState.revealedRoles[id]);
    const targetId = resolveTarget('target', candidates, selectedTargets);

    if (targetId) {
      const role = getEffectiveRoleId(G, targetId) ?? G.v1.hiddenRoles[targetId];
      if (role) {
        recordRevealedRole(G, targetId, role);
        G.publicLog.push(`📋 ${charId}（大人物）使用友好能力：${targetId} 身份公开为 ${role}`);
      }
    } else {
      G.publicLog.push(`📋 ${charId}（大人物）使用友好能力：领地中无可公开身份的角色`);
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'rich_man_gw4')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.rich_man_gw4`);
    }
    return noGoodwillTargets();
  },
};
