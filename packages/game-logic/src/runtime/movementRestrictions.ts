import type { TragedyGameState } from '../game';

type MovementRestrictions = TragedyGameState['v1']['movementRestrictions'];

function ensureMovementRestrictions(G: TragedyGameState): MovementRestrictions {
  if (!G.v1.movementRestrictions) {
    G.v1.movementRestrictions = {
      blockedLocations: {},
      immobileCharacters: {},
    };
  }
  return G.v1.movementRestrictions;
}

export function resetMovementRestrictions(G: TragedyGameState): void {
  G.v1.movementRestrictions = {
    blockedLocations: {},
    immobileCharacters: {},
  };
}

export function clearExpiredMovementRestrictions(G: TragedyGameState): void {
  const restrictions = ensureMovementRestrictions(G);
  const today = G.day ?? 0;

  for (const [locationId, untilDay] of Object.entries(restrictions.blockedLocations)) {
    if (untilDay < today) {
      delete restrictions.blockedLocations[locationId];
    }
  }

  for (const [characterId, blockedDay] of Object.entries(restrictions.immobileCharacters)) {
    if (blockedDay < today) {
      delete restrictions.immobileCharacters[characterId];
    }
  }
}

export function blockLocationUntilDay(
  G: TragedyGameState,
  locationId: string,
  untilDay: number,
): void {
  const restrictions = ensureMovementRestrictions(G);
  restrictions.blockedLocations[locationId] = Math.max(
    restrictions.blockedLocations[locationId] ?? 0,
    untilDay,
  );
}

export function lockCharacterMovementOnDay(
  G: TragedyGameState,
  characterId: string,
  blockedDay: number,
): void {
  const restrictions = ensureMovementRestrictions(G);
  restrictions.immobileCharacters[characterId] = Math.max(
    restrictions.immobileCharacters[characterId] ?? 0,
    blockedDay,
  );
}

export function isCharacterMovementLockedToday(
  G: TragedyGameState,
  characterId: string,
): boolean {
  const restrictions = ensureMovementRestrictions(G);
  return restrictions.immobileCharacters[characterId] === (G.day ?? 0);
}

export function isLocationBlockedToday(
  G: TragedyGameState,
  locationId: string,
): boolean {
  const restrictions = ensureMovementRestrictions(G);
  const untilDay = restrictions.blockedLocations[locationId];
  return typeof untilDay === 'number' && (G.day ?? 0) <= untilDay;
}

export function canCharacterMoveBetween(
  G: TragedyGameState,
  characterId: string,
  fromLocationId: string,
  toLocationId: string,
): boolean {
  if (fromLocationId === toLocationId) return true;
  if (isCharacterMovementLockedToday(G, characterId)) return false;
  if (isLocationBlockedToday(G, fromLocationId)) return false;
  if (isLocationBlockedToday(G, toLocationId)) return false;
  return true;
}
