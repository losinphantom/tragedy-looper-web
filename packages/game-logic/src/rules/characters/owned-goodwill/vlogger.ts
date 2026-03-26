import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { getLocalAliveOthers, resolveTarget, resolveTargetFromSlots } from './local';

export const vloggerGoodwillHandlers: GoodwillHandlerRegistry = {
  vlogger_gw2_move_paranoia: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = getLocalAliveOthers(G, charId)
      .filter(id => getToken(G.v1.characters[id], 'paranoia') > 0);
    const allLocal = getLocalAliveOthers(G, charId);
    const target = resolveTarget('target', candidates.length > 0 ? candidates : allLocal, selectedTargets);
    if (!target) return noGoodwillTargets();

    // 效果1: +1友好 -1不安
    addToken(G.v1.characters[target], 'goodwill', 1);
    if (getToken(G.v1.characters[target], 'paranoia') > 0) {
      addToken(G.v1.characters[target], 'paranoia', -1);
    }

    // 效果2: Ex牌转移 — 将 target 身上的 Ex 牌转移到同区非UP主的另一名角色上
    const targetChar = G.v1.characters[target];
    const exOnTarget = (targetChar.tokens as any).ex ?? 0;
    if (exOnTarget > 0) {
      // 同区非UP主的其他角色（不含 target 自身）
      const exReceivers = allLocal.filter(id => id !== target);
      const exReceiver = resolveTargetFromSlots([`${target}::exReceiver`, 'exReceiver'], exReceivers, selectedTargets);
      if (exReceiver) {
        (targetChar.tokens as any).ex = Math.max(0, ((targetChar.tokens as any).ex ?? 0) - 1);
        (G.v1.characters[exReceiver].tokens as any).ex = ((G.v1.characters[exReceiver].tokens as any).ex ?? 0) + 1;
        G.publicLog.push(`📋 ${charId}（UP主）使用友好能力：${target} +1友好 -1不安，Ex牌从 ${target} 转移至 ${exReceiver}`);
      } else {
        G.publicLog.push(`📋 ${charId}（UP主）使用友好能力：${target} +1友好 -1不安（无可转移Ex牌的目标）`);
      }
    } else {
      G.publicLog.push(`📋 ${charId}（UP主）使用友好能力：${target} +1友好 -1不安`);
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'vlogger_gw2_move_paranoia')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.vlogger_gw2_move_paranoia`);
    }
    return goodwillTargets(target);
  },
  vlogger_gw3_add_intrigue: ({ G, charId }) => {
    const self = G.v1.characters[charId];
    const vloggerKey = `__vlogger_gw3_active_${charId}`;
    if (!G.v1.loopState.abilityUsage[vloggerKey]) {
      G.v1.loopState.abilityUsage[vloggerKey] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage[vloggerKey].usedThisLoop = true;
    (G.v1.loopState as any).__vlogger_gw3_location = self?.locationId;
    G.publicLog.push(`📋 ${charId}（UP主）使用友好能力：当此区域事件被阻止时放置 Ex 牌`);
    G.fullLog.push(`[友好能力] UP主 ${charId} 启用事件阻止时 Ex 牌机制（区域: ${self?.locationId}）`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'vlogger_gw3_add_intrigue')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.vlogger_gw3_add_intrigue`);
    }
    return noGoodwillTargets();
  },
};
