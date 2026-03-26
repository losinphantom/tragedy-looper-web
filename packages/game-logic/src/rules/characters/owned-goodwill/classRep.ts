import { getCard } from '../../../data/cardService';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

export const classRepGoodwillHandlers: GoodwillHandlerRegistry = {
  class_rep_gw2: ({ G, charId }) => {
    const leaderSeat = G.v1.leader || '1';
    G.seatHands[leaderSeat] = G.seatHands[leaderSeat] || [];
    const usedOncePerLoop = G.board?.usedOncePerLoopCards || [];

    const lockedIdx = usedOncePerLoop.findIndex((key: string) => key.startsWith(`${leaderSeat}:`));
    if (lockedIdx >= 0) {
      const lockKey = usedOncePerLoop[lockedIdx];
      const cardTemplateId = lockKey.slice(lockKey.indexOf(':') + 1);
      usedOncePerLoop.splice(lockedIdx, 1);
      G.seatHands[leaderSeat].push(cardTemplateId);
      G.publicLog.push(`📋 ${charId}（班长）使用友好能力：回收队长行动牌 ${cardTemplateId}`);
      if (isOncePerLoopCharacterGoodwillAbility(charId, 'class_rep_gw2')) {
        markWorldShiftThisDay(G, `goodwill:${charId}.class_rep_gw2`);
      }
      return noGoodwillTargets();
    }

    const playedIdx = G.v1.playedCards.findIndex((pc) => {
      if (pc.playedBySeat !== leaderSeat) return false;
      const cardDef = getCard(pc.cardTemplateId);
      return !!cardDef?.oncePerLoop;
    });
    if (playedIdx >= 0) {
      const [recalled] = G.v1.playedCards.splice(playedIdx, 1);
      G.seatHands[leaderSeat].push(recalled.cardTemplateId);
      G.publicLog.push(`📋 ${charId}（班长）使用友好能力：回收队长已打出行动牌 ${recalled.cardTemplateId}`);
    } else {
      G.publicLog.push(`📋 ${charId}（班长）使用友好能力：队长无可回收的每轮限1次行动牌`);
    }
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'class_rep_gw2')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.class_rep_gw2`);
    }
    return noGoodwillTargets();
  },
};
