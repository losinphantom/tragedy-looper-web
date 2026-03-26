import { addToken, getToken } from '../../../utils/tokenHelpers';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { getLocalAliveOthers, resolveTarget } from './local';

export const boyStudentGoodwillHandlers: GoodwillHandlerRegistry = {
  boy_student_gw1: ({ G, charId, selectedTargets }) => {
    const others = getLocalAliveOthers(G, charId)
      .filter(id => getToken(G.v1.characters[id], 'paranoia') > 0);
    const target = resolveTarget('target', others, selectedTargets);
    if (target) {
      addToken(G.v1.characters[target], 'paranoia', -1);
      G.publicLog.push(`📋 ${charId} 使用友好能力：${target} -1 不安`);
    }
    return noGoodwillTargets();
  },
};
