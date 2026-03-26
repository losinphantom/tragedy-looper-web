import { CHARACTERS } from '@tragedy/domain';
import { executeGoodwillAbility } from '../../../engine/goodwillResolver';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';

function getAdultWithGoodwillAbility(G: Parameters<GoodwillHandlerRegistry[string]>[0]['G'], charId: string): string | null {
  const self = G.v1.characters[charId];
  if (!self || !self.alive) return null;

  return Object.entries(G.v1.characters)
    .filter(([id, ch]) => id !== charId && ch.locationId === self.locationId && ch.alive)
    .map(([id]) => id)
    .find(id => {
      const def = CHARACTERS[id];
      return !!def && def.traits.includes('adult') && def.goodwillAbilities.length > 0;
    }) ?? null;
}

function getFirstGoodwillWindowAbility(charId: string): string | null {
  const def = CHARACTERS[charId];
  const firstAbility = def?.goodwillAbilities.find(ability => ability.timing === 'goodwill_window');
  return firstAbility?.id ?? null;
}

export const sisterGoodwillHandlers: GoodwillHandlerRegistry = {
  sister_gw6: ({ G, charId }) => {
    const adultWithAbility = getAdultWithGoodwillAbility(G, charId);
    if (!adultWithAbility) return noGoodwillTargets();

    const abilityId = getFirstGoodwillWindowAbility(adultWithAbility);
    if (!abilityId) return noGoodwillTargets();

    G.publicLog.push(`📋 ${charId}（妹妹）使用友好能力：令 ${adultWithAbility} 使用 ${abilityId}`);
    return executeGoodwillAbility(G, adultWithAbility, abilityId);
  },
};
