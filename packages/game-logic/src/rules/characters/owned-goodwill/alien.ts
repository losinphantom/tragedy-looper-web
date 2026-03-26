import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { recordDeathSnapshots } from '../../deathSnapshots';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility, hasImmortalityByRole } from './shared';
import { getLocalAliveOthers, resolveTarget } from './local';

export const alienGoodwillHandlers: GoodwillHandlerRegistry = {
  alien_gw4: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    const candidates = getLocalAliveOthers(G, charId);
    const target = resolveTarget('target', candidates, selectedTargets);
    if (!target) return noGoodwillTargets();

    if (hasImmortalityByRole(G, target)) {
      G.publicLog.push(`🛡️ ${target} 因不死特性免疫死亡`);
      G.fullLog.push(`[友好能力] 异界人 ${charId} 对 ${target} 的击杀被不死特性免疫`);
      return goodwillTargets(target);
    }

    recordDeathSnapshots(G, target);
    G.v1.characters[target].alive = false;
    if (G.v1.hiddenRoles?.[target] === 'magician') {
      addToken(G.v1.characters[target], 'paranoia', -getToken(G.v1.characters[target], 'paranoia'));
      G.fullLog.push(`[友好能力] 魔术师 ${target} 死亡时移除了所有不安`);
    }
    G.publicLog.push(`💀 ${charId}（异界人）使用友好能力：${target} 死亡`);
    G.fullLog.push(`[友好能力] 异界人 ${charId} 杀死了 ${target}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'alien_gw4')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.alien_gw4`);
    }
    return goodwillTargets(target);
  },
  alien_gw5: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    // 同区尸体列表
    const corpses = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && !ch.alive)
      .map(([id]) => id);
    const corpseId = resolveTarget('target', corpses, selectedTargets);
    if (!corpseId) return noGoodwillTargets();

    G.v1.characters[corpseId].alive = true;
    G.publicLog.push(`✨ ${charId}（异界人）使用友好能力：${corpseId} 复活`);
    G.fullLog.push(`[友好能力] 异界人 ${charId} 复活了 ${corpseId}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'alien_gw5')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.alien_gw5`);
    }
    return goodwillTargets(corpseId);
  },
};
