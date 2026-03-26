import type { TragedyGameState } from '../game';
import { getToken } from '../utils/tokenHelpers';

function markLoopFlag(G: TragedyGameState, key: string): void {
  if (!G.v1.loopState.abilityUsage[key]) {
    G.v1.loopState.abilityUsage[key] = {
      usedToday: false,
      usedThisLoop: false,
    };
  }
  G.v1.loopState.abilityUsage[key].usedThisLoop = true;
}

export function recordDeathSnapshots(G: TragedyGameState, charId: string): void {
  const roleId = G.v1.hiddenRoles?.[charId];
  if (roleId === 'factor' && getToken(G.v1.locations.city, 'intrigue') >= 2) {
    markLoopFlag(G, `__factor_city_key_person_${charId}`);
  }
}

export function factorHadCityKeyPersonDeathSnapshot(
  G: TragedyGameState,
  charId: string,
): boolean {
  return !!G.v1.loopState.abilityUsage[`__factor_city_key_person_${charId}`]?.usedThisLoop;
}
