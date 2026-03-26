import {
  noGoodwillTargets,
  goodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken } from '../../../utils/tokenHelpers';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { getLocalAliveOthers, resolveTarget } from './local';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const policeGoodwillHandlers: GoodwillHandlerRegistry = {
  police_gw4: ({ G, charId, selectedTargets }) => {
    const validIncidents = (G.v1.loopState.incidentHistory || [])
      .filter(inc => inc.loop === G.loopIndex && !inc.wasImmune);

    if (validIncidents.length > 0) {
      // FAQ 对齐：队长可选择公开哪个事件
      const incidentIds = validIncidents.map(inc => `${inc.day}_${inc.incidentId}`);
      const selectedEvent = resolveTarget('event', incidentIds, selectedTargets);
      const inc = validIncidents.find(i => `${i.day}_${i.incidentId}` === selectedEvent) ?? validIncidents[0];
      const revealedIncidentCulprits = G.v1.loopState.revealedIncidentCulprits
        || (G.v1.loopState.revealedIncidentCulprits = {});
      const key = `${inc.day}_${inc.incidentId}`;
      revealedIncidentCulprits[key] = inc.culpritId;
      G.publicLog.push(`📋 ${charId}（刑警）使用友好能力：公开第${inc.day}天事件当事人 ${inc.culpritId}（${inc.incidentId}）`);
    } else {
      G.publicLog.push(`📋 ${charId}（刑警）使用友好能力：无可公开的已发生事件当事人`);
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'police_gw4')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.police_gw4`);
    }
    return noGoodwillTargets();
  },
  police_gw5: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = getLocalAliveOthers(G, charId);
    const guardTargetId = resolveTarget('target', candidates, selectedTargets) ?? charId;
    const guardTargetChar = G.v1.characters[guardTargetId];
    if (guardTargetChar) {
      addToken(guardTargetChar, 'guard', 1);
      G.publicLog.push(`🛡️ ${charId}（刑警）使用友好能力：为 ${guardTargetId} 放置护卫指示物`);
      G.fullLog.push(`[友好能力] 刑警 ${charId} → ${guardTargetId} +1 guard`);
    }
    return goodwillTargets(guardTargetId);
  },
};
