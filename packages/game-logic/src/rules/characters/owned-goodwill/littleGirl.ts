import { CHARACTERS } from '@tragedy/domain';
import { getMovementDestination } from '../../../data/boardGraph';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';

function hasLoopUsageFlag(G: Parameters<GoodwillHandlerRegistry[string]>[0]['G'], key: string): boolean {
  return !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

function canIgnoreForbiddenByGoodwill(G: Parameters<GoodwillHandlerRegistry[string]>[0]['G'], charId: string): boolean {
  if (charId === 'patient' && hasLoopUsageFlag(G, '__doctor_patient_can_leave_hospital')) {
    return true;
  }
  if (charId === 'little_girl' && hasLoopUsageFlag(G, '__ignore_forbidden_little_girl')) {
    return true;
  }
  return false;
}

export const littleGirlGoodwillHandlers: GoodwillHandlerRegistry = {
  little_girl_gw1: ({ G, charId }) => {
    const markerKey = '__ignore_forbidden_little_girl';
    if (!G.v1.loopState.abilityUsage[markerKey]) {
      G.v1.loopState.abilityUsage[markerKey] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage[markerKey].usedThisLoop = true;
    G.publicLog.push(`📋 ${charId}（小女孩）使用友好能力：本轮解除禁行区域`);
    return noGoodwillTargets();
  },
  little_girl_gw3: ({ G, charId }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const domainChar = CHARACTERS[charId];
    const ignoreForbidden = canIgnoreForbiddenByGoodwill(G, charId);
    const candidateAxes: Array<'vertical' | 'horizontal' | 'diagonal'> = ['vertical', 'horizontal', 'diagonal'];
    const dest = candidateAxes
      .map(axis => getMovementDestination(self.locationId as any, axis))
      .find(candidate => {
        if (!candidate) return false;
        if (ignoreForbidden) return true;
        return !domainChar?.forbiddenLocations.includes(candidate);
      });

    if (dest) {
      self.locationId = dest;
      G.publicLog.push(`📋 ${charId}（小女孩）使用友好能力：移动至相邻版图 ${dest}`);
      return noGoodwillTargets();
    }

    G.publicLog.push(`📋 ${charId}（小女孩）使用友好能力：无可达相邻版图`);
    return noGoodwillTargets();
  },
};
