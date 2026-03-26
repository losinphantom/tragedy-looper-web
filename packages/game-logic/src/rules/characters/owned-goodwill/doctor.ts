import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { applyCharacterTokenDelta } from '../../ahrState';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const doctorGoodwillHandlers: GoodwillHandlerRegistry = {
  doctor_gw2: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const others = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .map(([id]) => id);

    const explicitTarget = selectedTargets?.target;
    const explicitMode = selectedTargets?.mode;
    if (explicitTarget && others.includes(explicitTarget) && (explicitMode === 'place' || explicitMode === 'remove')) {
      if (explicitMode === 'remove' && getToken(G.v1.characters[explicitTarget], 'paranoia') > 0) {
        addToken(G.v1.characters[explicitTarget], 'paranoia', -1);
        G.publicLog.push(`📋 ${charId}（医生）使用友好能力：${explicitTarget} -1 不安`);
        if (isOncePerLoopCharacterGoodwillAbility(charId, 'doctor_gw2')) {
          markWorldShiftThisDay(G, `goodwill:${charId}.doctor_gw2`);
        }
        return goodwillTargets(explicitTarget);
      }
      if (explicitMode === 'place') {
        applyCharacterTokenDelta(G, explicitTarget, 'paranoia', 1);
        G.publicLog.push(`📋 ${charId}（医生）使用友好能力：${explicitTarget} +1 不安`);
        if (isOncePerLoopCharacterGoodwillAbility(charId, 'doctor_gw2')) {
          markWorldShiftThisDay(G, `goodwill:${charId}.doctor_gw2`);
        }
        return goodwillTargets(explicitTarget);
      }
    }

    const removeTarget = others.find(id => getToken(G.v1.characters[id], 'paranoia') > 0);
    if (removeTarget) {
      addToken(G.v1.characters[removeTarget], 'paranoia', -1);
      G.publicLog.push(`📋 ${charId}（医生）使用友好能力：${removeTarget} -1 不安`);
      if (isOncePerLoopCharacterGoodwillAbility(charId, 'doctor_gw2')) {
        markWorldShiftThisDay(G, `goodwill:${charId}.doctor_gw2`);
      }
      return goodwillTargets(removeTarget);
    }
    if (others.length > 0) {
      const placeTarget = others[0];
      applyCharacterTokenDelta(G, placeTarget, 'paranoia', 1);
      G.publicLog.push(`📋 ${charId}（医生）使用友好能力：${placeTarget} +1 不安`);
      if (isOncePerLoopCharacterGoodwillAbility(charId, 'doctor_gw2')) {
        markWorldShiftThisDay(G, `goodwill:${charId}.doctor_gw2`);
      }
      return goodwillTargets(placeTarget);
    }

    return noGoodwillTargets();
  },
  doctor_gw3: ({ G, charId }) => {
    const markerKey = '__doctor_patient_can_leave_hospital';
    if (!G.v1.loopState.abilityUsage[markerKey]) {
      G.v1.loopState.abilityUsage[markerKey] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage[markerKey].usedThisLoop = true;
    G.publicLog.push(`📋 ${charId}（医生）使用友好能力：住院患者本轮可移出医院`);
    G.fullLog.push(`[友好能力] 医生 ${charId} 启用住院患者可离院标记`);

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'doctor_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.doctor_gw3`);
    }
    return noGoodwillTargets();
  },
};
