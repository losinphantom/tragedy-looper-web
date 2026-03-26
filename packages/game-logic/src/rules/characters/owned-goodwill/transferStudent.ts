import { addToken, getToken } from '../../../utils/tokenHelpers';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { getLocalAliveOthers, resolveTarget } from './local';

export const transferStudentGoodwillHandlers: GoodwillHandlerRegistry = {
  transfer_student_gw2: ({ G, charId, selectedTargets }) => {
    const others = getLocalAliveOthers(G, charId)
      .filter(id => getToken(G.v1.characters[id], 'intrigue') > 0);
    const target = resolveTarget('target', others, selectedTargets);
    if (target) {
      addToken(G.v1.characters[target], 'intrigue', -1);
      addToken(G.v1.characters[target], 'goodwill', 1);
      G.publicLog.push(`📋 ${charId}（转校生）使用友好能力：${target} -1密谋 +1友好`);
    }
    return noGoodwillTargets();
  },
};
