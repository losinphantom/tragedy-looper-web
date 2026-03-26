import type { TragedyGameState } from '../game';
import { isBackWorld } from './ahrWorldShift';

export interface AhrVariableRoleAssignment {
  frontRoleId: string;
  backRoleId: string;
}

function getAhrVariableRoleAssignment(
  G: TragedyGameState,
  charId: string,
): AhrVariableRoleAssignment | null {
  if (G.scriptOpen?.tragedySetId !== 'another_horizon_revised') return null;
  return (G.v1.ahrVariableRoles?.[charId] as AhrVariableRoleAssignment | undefined) ?? null;
}

export function getEffectiveRoleId(
  G: TragedyGameState,
  charId: string,
): string | undefined {
  const currentRoleId = G.v1.hiddenRoles?.[charId];
  const assignment = getAhrVariableRoleAssignment(G, charId);
  if (!assignment) return currentRoleId;

  // Temporary overrides such as dynamic transformations should keep winning.
  if (currentRoleId && currentRoleId !== assignment.frontRoleId && currentRoleId !== assignment.backRoleId) {
    return currentRoleId;
  }

  return isBackWorld(G) ? assignment.backRoleId : assignment.frontRoleId;
}

export function hasEffectiveRole(
  G: TragedyGameState,
  charId: string,
  roleId: string,
): boolean {
  return getEffectiveRoleId(G, charId) === roleId;
}

export function findCharByEffectiveRole(
  G: TragedyGameState,
  roleId: string,
): string | undefined {
  const candidateIds = new Set([
    ...Object.keys(G.v1.hiddenRoles || {}),
    ...Object.keys(G.v1.ahrVariableRoles || {}),
  ]);

  for (const charId of candidateIds) {
    if (getEffectiveRoleId(G, charId) === roleId) {
      return charId;
    }
  }
  return undefined;
}
