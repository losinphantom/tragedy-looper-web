import type { TragedyGameState, CharacterState } from '../game';
import { getToken } from '../utils/tokenHelpers';
import { usesReversedEmotionRules } from './ahrWorldShift';

export function getIncidentTriggerEmotionValue(
  G: TragedyGameState,
  character: CharacterState | undefined,
): number {
  if (!character) return 0;
  return usesReversedEmotionRules(G)
    ? getToken(character, 'goodwill')
    : getToken(character, 'paranoia');
}

export function getGoodwillActivationValue(
  G: TragedyGameState,
  character: CharacterState | undefined,
): number {
  if (!character) return 0;
  return usesReversedEmotionRules(G)
    ? getToken(character, 'paranoia')
    : getToken(character, 'goodwill');
}
