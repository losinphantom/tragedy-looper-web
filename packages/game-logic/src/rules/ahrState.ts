import type { TragedyGameState } from '../game';
import { getCharacterLabel } from '../data/translationService';
import { addToken, type TokenType } from '../utils/tokenHelpers';
import { getEffectiveParanoia } from '../utils/effectiveValues';
import { recordDeathSnapshots } from './deathSnapshots';
import { hasEffectiveRole } from './ahrEffectiveRoles';

function isAhrIllusion(G: TragedyGameState, characterId: string): boolean {
  return G.scriptOpen?.tragedySetId === 'another_horizon_revised'
    && hasEffectiveRole(G, characterId, 'illusion');
}

export function applyCharacterTokenDelta(
  G: TragedyGameState,
  characterId: string,
  tokenType: TokenType,
  delta: number,
): number {
  const character = G.v1.characters[characterId];
  if (!character) return 0;

  const nextValue = addToken(character, tokenType, delta);
  if (tokenType === 'paranoia' && delta > 0) {
    enforceAhrIllusionParanoiaLimit(G, characterId);
  }
  return nextValue;
}

export function enforceAhrIllusionParanoiaLimit(
  G: TragedyGameState,
  characterId?: string,
): void {
  const candidateIds = characterId ? [characterId] : Object.keys(G.v1.characters || {});

  for (const charId of candidateIds) {
    const character = G.v1.characters[charId];
    if (!character || !character.alive) continue;
    if (!isAhrIllusion(G, charId)) continue;
    if (getEffectiveParanoia(G.v1.characters[charId]) < 3) continue;

    recordDeathSnapshots(G, charId);
    character.alive = false;
    G.publicLog.push(`💀 ${getCharacterLabel(charId)} 死亡`);
    G.fullLog.push(`[身份能力] 幻影 ${getCharacterLabel(charId)} 因不安达到上限 3 死亡`);
  }
}
