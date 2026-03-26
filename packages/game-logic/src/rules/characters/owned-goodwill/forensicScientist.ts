import {
  goodwillTargets,
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { addToken, getToken } from '../../../utils/tokenHelpers';
import { recordRevealedRole } from '../../../revealTracker';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';
import { resolveTargetFromSlots } from './local';

export const forensicScientistGoodwillHandlers: GoodwillHandlerRegistry = {
  forensic_scientist_gw2: ({ G, charId, selectedTargets }) => {
    const self = G.v1.characters[charId];
    if (!self || !self.alive) return { targetedCharacterIds: [] };

    const others = Object.entries(G.v1.characters)
      .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
      .map(([id]) => id);
    if (others.length < 2) return { targetedCharacterIds: [] };

    const fromCandidates = others.filter((id) => (
      getToken(G.v1.characters[id], 'paranoia') > 0
      || getToken(G.v1.characters[id], 'intrigue') > 0
      || getToken(G.v1.characters[id], 'goodwill') > 0
    ));
    const fromId = selectedTargets?.fromCharacter && fromCandidates.includes(selectedTargets.fromCharacter)
      ? selectedTargets.fromCharacter
      : fromCandidates[0];
    const source = fromId ? G.v1.characters[fromId] : undefined;
    const tokenChoices: Array<'paranoia' | 'intrigue' | 'goodwill'> = ['paranoia', 'intrigue', 'goodwill'];
    const tokenType = fromId
      ? resolveTargetFromSlots(
        [`${fromId}::tokenType`, 'tokenType'],
        tokenChoices,
        selectedTargets,
      ) as 'paranoia' | 'intrigue' | 'goodwill' | undefined
      : undefined;
    const toId = selectedTargets?.toCharacter && others.includes(selectedTargets.toCharacter) && selectedTargets.toCharacter !== fromId
      ? selectedTargets.toCharacter
      : others.find(id => id !== fromId);
    if (!fromId || !toId || !tokenType || !source || getToken(source, tokenType) <= 0) {
      return { targetedCharacterIds: [] };
    }

    addToken(G.v1.characters[fromId], tokenType, -1);
    addToken(G.v1.characters[toId], tokenType, 1);
    const labels: Record<typeof tokenType, string> = {
      paranoia: '不安',
      intrigue: '密谋',
      goodwill: '友好',
    };
    G.publicLog.push(`📋 ${charId}（鉴识官）使用友好能力：${fromId} → ${toId} 转移1枚${labels[tokenType]}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'forensic_scientist_gw2')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.forensic_scientist_gw2`);
    }
    return { targetedCharacterIds: [fromId, toId] };
  },
  forensic_scientist_gw5: ({ G, charId, selectedTargets }) => {
    const candidates = Object.entries(G.v1.characters)
      .filter(([id, ch]) => !ch.alive && G.v1.hiddenRoles?.[id] && !G.v1.loopState.revealedRoles[id])
      .map(([id]) => id);
    const deadId = selectedTargets?.target && candidates.includes(selectedTargets.target)
      ? selectedTargets.target
      : candidates[0];
    if (!deadId) {
      return noGoodwillTargets();
    }

    const role = G.v1.hiddenRoles[deadId];
    recordRevealedRole(G, deadId, role);
    G.publicLog.push(`📋 ${charId}（鉴识官）使用友好能力：尸体 ${deadId} 身份公开为 ${role}`);
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'forensic_scientist_gw5')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.forensic_scientist_gw5`);
    }
    return goodwillTargets(deadId);
  },
};
