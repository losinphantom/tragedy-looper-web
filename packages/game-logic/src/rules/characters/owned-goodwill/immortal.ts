import { CHARACTERS } from '@tragedy/domain';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken } from '../../../utils/tokenHelpers';
import { resolveTarget, resolveTargetFromSlots } from './local';

export const immortalGoodwillHandlers: GoodwillHandlerRegistry = {
  immortal_gw1: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return noGoodwillTargets();

    // 移动到有尸体的版图或任意其他版图
    const locsWithCorpse = Object.keys(G.v1.locations).filter(locationId =>
      Object.entries(G.v1.characters).some(([_, ch]) => ch.locationId === locationId && !ch.alive),
    );
    const locCandidates = locsWithCorpse.length > 0 ? locsWithCorpse : Object.keys(G.v1.locations).filter(l => l !== self.locationId);
    const destination = resolveTarget('destination', locCandidates, selectedTargets) ?? locCandidates[0] ?? self.locationId;
    self.locationId = destination;
    G.publicLog.push(`📋 ${charId}（仙人）移动至 ${destination}`);

    // 复活同区尸体
    const corpses = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === destination && !ch.alive)
      .map(([id]) => id);
    const corpseId = resolveTargetFromSlots([`${destination}::target`, 'target'], corpses, selectedTargets);
    if (corpseId) {
      G.v1.characters[corpseId].alive = true;
      const immortalDef = CHARACTERS[charId];
      const xValue = immortalDef?.uneaseLimit ?? 2;
      addToken(G.v1.characters[corpseId], 'goodwill', xValue);
      G.publicLog.push(`✨ ${charId}（仙人）复活 ${corpseId} 并放置 ${xValue} 枚友好`);
      return { targetedCharacterIds: [corpseId] };
    }

    return noGoodwillTargets();
  },
  immortal_gw3: ({ G, charId }) => {
    // Task 3: 设置 flag，标记本回合事件判定时视为也在相邻版图
    const markerKey = `__immortal_adjacent_${charId}`;
    if (!G.v1.loopState.abilityUsage[markerKey]) {
      G.v1.loopState.abilityUsage[markerKey] = { usedToday: false, usedThisLoop: false };
    }
    G.v1.loopState.abilityUsage[markerKey].usedToday = true;
    G.publicLog.push(`📋 ${charId}（仙人）使用友好能力：本回合事件判定时视为也在相邻版图`);
    G.fullLog.push(`[友好能力] 仙人 ${charId} 启用相邻版图事件判定`);
    return noGoodwillTargets();
  },
};
