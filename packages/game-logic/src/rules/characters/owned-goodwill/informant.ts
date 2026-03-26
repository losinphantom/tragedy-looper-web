import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { resolveTarget } from './local';

export const informantGoodwillHandlers: GoodwillHandlerRegistry = {
  informant_gw5: ({ G, charId, selectedTargets }) => {
    // Task 2: 规则X声明/公开
    // 卡面：队长声明1条规则X的名称，剧作家从当前剧本所选用的规则X中公开1条
    // 解耦：handler 只记录队长声明的规则名到 publicLog + loopState

    // 收集活跃的规则X（plots）
    const activePlots = G.v1.activePlots || [];
    if (activePlots.length === 0) {
      G.publicLog.push(`📋 ${charId}（情报商）使用友好能力：当前无可声明的规则X`);
      return noGoodwillTargets();
    }

    // 队长选择声明的规则
    const declaredRule = resolveTarget('rule', activePlots, selectedTargets) ?? activePlots[0];

    // 剧作家公开一条未声明的规则X（沙盒模式自动选择第一条未公开的）
    const revealedRules = Array.isArray(G.v1.loopState.revealedRules)
      ? G.v1.loopState.revealedRules
      : (G.v1.loopState.revealedRules = []);
    const unrevealed = activePlots.filter(p => !revealedRules.includes(p));
    if (unrevealed.length > 0) {
      const toReveal = unrevealed[0];
      revealedRules.push(toReveal);
      G.publicLog.push(`📋 ${charId}（情报商）使用友好能力：队长声明"${declaredRule}"，剧作家公开规则X "${toReveal}"`);
    } else {
      G.publicLog.push(`📋 ${charId}（情报商）使用友好能力：所有规则X已公开`);
    }

    return noGoodwillTargets();
  },
};
