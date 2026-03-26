import { CHARACTERS } from '@tragedy/domain';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { applyCharacterTokenDelta } from '../../ahrState';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { resolveTarget } from './local';

export const teacherSupportGoodwillHandlers: GoodwillHandlerRegistry = {
  teacher_gw3: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const students = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .filter(([id]) => {
        const def = CHARACTERS[id];
        return !!def && def.traits.includes('student');
      })
      .map(([id]) => id);
    const mode = selectedTargets?.mode === 'place' ? 'place' : 'remove';
    const removableStudents = students.filter(id => getToken(G.v1.characters[id], 'paranoia') > 0);
    const removeTarget = resolveTarget('target', removableStudents, selectedTargets);
    const placeTarget = resolveTarget('target', students, selectedTargets);
    if (mode === 'remove' && removeTarget) {
      addToken(G.v1.characters[removeTarget], 'paranoia', -1);
      G.publicLog.push(`📋 ${charId}（教师）使用友好能力：${removeTarget} -1 不安`);
    } else if (placeTarget) {
      const studentPlace = placeTarget;
      applyCharacterTokenDelta(G, studentPlace, 'paranoia', 1);
      G.publicLog.push(`📋 ${charId}（教师）使用友好能力：${studentPlace} +1 不安`);
    } else if (removeTarget) {
      addToken(G.v1.characters[removeTarget], 'paranoia', -1);
      G.publicLog.push(`📋 ${charId}（教师）使用友好能力：${removeTarget} -1 不安`);
    }

    if (isOncePerLoopCharacterGoodwillAbility(charId, 'teacher_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.teacher_gw3`);
    }
    return noGoodwillTargets();
  },
};
