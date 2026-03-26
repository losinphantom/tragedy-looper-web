import type { TragedyGameState } from '../game';

export function syncMidnightZoneExKeyPersons(G: TragedyGameState): void {
  if (G.scriptOpen?.tragedySetId !== 'midnight_zone') return;
  if (!(G.v1.activePlots || []).includes('bonds_of_karma')) return;

  if (!G.v1.originalRoles) {
    G.v1.originalRoles = {};
  }

  for (const [characterId, character] of Object.entries(G.v1.characters || {})) {
    const hasEx = (character.exCardCount ?? 0) > 0;
    const currentRole = G.v1.hiddenRoles?.[characterId] || 'person';
    const originalRole = G.v1.originalRoles?.[characterId];

    if (hasEx) {
      if (!originalRole) {
        G.v1.originalRoles[characterId] = currentRole;
      }
      if (currentRole !== 'key_person') {
        G.v1.hiddenRoles[characterId] = 'key_person';
        G.fullLog.push(`[因果之绊] ${characterId} 因 Ex 牌变为关键人物`);
      }
      continue;
    }

    if (currentRole === 'key_person' && originalRole) {
      G.v1.hiddenRoles[characterId] = originalRole;
      delete G.v1.originalRoles[characterId];
      G.fullLog.push(`[因果之绊] ${characterId} 因 Ex 牌移除而恢复为 ${originalRole}`);
    }
  }
}
