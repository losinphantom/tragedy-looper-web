import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { resolveTarget } from './local';

export const deityGoodwillHandlers: GoodwillHandlerRegistry = {
  deity_gw3: ({ G, charId, selectedTargets }) => {
    const revealedIncidentCulprits = G.v1.loopState.revealedIncidentCulprits
      || (G.v1.loopState.revealedIncidentCulprits = {});
    const pastIncidents = G.v1.loopState.incidentHistory || [];
    if (pastIncidents.length > 0) {
      const incidentKeys = pastIncidents.map((incident) => `${incident.day}_${incident.incidentId}`);
      const selectedKey = resolveTarget('event', incidentKeys, selectedTargets) ?? incidentKeys[0];
      const inc = pastIncidents.find((incident) => `${incident.day}_${incident.incidentId}` === selectedKey) ?? pastIncidents[0];
      const key = `${inc.day}_${inc.incidentId}`;
      revealedIncidentCulprits[key] = inc.culpritId;
      G.publicLog.push(`📋 ${charId}（神灵）使用友好能力：公开事件当事人 ${inc.culpritId}（${inc.incidentId}）`);
    } else {
      const scheduledIncidents = G.v1.scheduledIncidents || [];
      const incidentKeys = scheduledIncidents.map((incident) => `${incident.day}_${incident.incidentId}`);
      const selectedKey = resolveTarget('event', incidentKeys, selectedTargets) ?? incidentKeys[0];
      const scheduled = scheduledIncidents.find((incident) => `${incident.day}_${incident.incidentId}` === selectedKey);
      if (scheduled) {
        const key = `${scheduled.day}_${scheduled.incidentId}`;
        const culprit = G.v1.incidentCulprits?.[key];
        if (culprit) {
          revealedIncidentCulprits[key] = culprit;
        }
        G.publicLog.push(`📋 ${charId}（神灵）使用友好能力：公开第${scheduled.day}天事件当事人 ${culprit}（${scheduled.incidentId}）`);
      } else {
        G.publicLog.push(`📋 ${charId}（神灵）使用友好能力：无可公开的事件`);
      }
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'deity_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.deity_gw3`);
    }
    return noGoodwillTargets();
  },
  deity_gw5: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const characterTargets = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive && getToken(ch, 'intrigue') > 0)
      .map(([id]) => id);
    const targetId = resolveTarget('target', characterTargets, selectedTargets);
    if (targetId) {
      addToken(G.v1.characters[targetId], 'intrigue', -1);
      G.publicLog.push(`📋 ${charId}（神灵）使用友好能力：${targetId} -1 密谋`);
    } else {
      const location = G.v1.locations[self.locationId];
      if (location && getToken(location, 'intrigue') > 0) {
        addToken(location, 'intrigue', -1);
        G.publicLog.push(`📋 ${charId}（神灵）使用友好能力：${self.locationId} -1 密谋`);
      }
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'deity_gw5')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.deity_gw5`);
    }
    return noGoodwillTargets();
  },
};
