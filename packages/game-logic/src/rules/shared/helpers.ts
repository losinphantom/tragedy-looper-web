import type { RuleCheckResult, RuleContext } from '../../ruleEngine';
import { CHARACTERS } from '@tragedy/domain';
import { getMovementDestination } from '../../data/boardGraph';
import { findCharByEffectiveRole, getEffectiveRoleId } from '../ahrEffectiveRoles';
import { isFrontWorld as isAhrFrontWorld } from '../ahrWorldShift';

export function ok(triggered: boolean, message = '', needsInput = false): RuleCheckResult {
  return { triggered, needsInput, message };
}

export function hasLoopUsageFlag(ctx: RuleContext, key: string): boolean {
  return !!ctx.G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

export function hasLoopAbilityUsed(ctx: RuleContext, usageKey: string): boolean {
  return hasLoopUsageFlag(ctx, usageKey);
}

export function markLoopAbilityUsed(ctx: RuleContext, usageKey: string): void {
  const existing = ctx.G.v1.loopState.abilityUsage[usageKey] || {
    usedToday: false,
    usedThisLoop: false,
  };
  ctx.G.v1.loopState.abilityUsage[usageKey] = {
    ...existing,
    usedToday: true,
    usedThisLoop: true,
  };
}

export function getEffectiveLocations(ctx: RuleContext, charId: string): Set<string> {
  const c = ctx.G.v1.characters[charId];
  if (!c) return new Set();
  const locs = new Set<string>([c.locationId]);
  if (charId === 'boss' && c.territoryLocationId) {
    locs.add(c.territoryLocationId);
  }
  return locs;
}

export function charsAtSameLocation(ctx: RuleContext, charId: string): string[] {
  const locs = getEffectiveLocations(ctx, charId);
  if (locs.size === 0) return [];
  return Object.entries(ctx.G.v1.characters)
    .filter(([id, c]) => id !== charId && locs.has(c.locationId) && c.alive)
    .map(([id]) => id);
}

export function allAliveAtLocation(ctx: RuleContext, locationId: string): string[] {
  return Object.entries(ctx.G.v1.characters)
    .filter(([_, c]) => c.locationId === locationId && c.alive)
    .map(([id]) => id);
}

export function allOtherAliveAtLocation(ctx: RuleContext, charId: string): string[] {
  const locs = getEffectiveLocations(ctx, charId);
  if (locs.size === 0) return [];
  const ids = new Set<string>();
  for (const loc of locs) {
    for (const id of allAliveAtLocation(ctx, loc)) {
      if (id !== charId) ids.add(id);
    }
  }
  return [...ids];
}

export function findCharByRole(G: RuleContext['G'], roleId: string): string | undefined {
  return findCharByEffectiveRole(G, roleId);
}

export function findCharByRoleIncludingOriginal(G: RuleContext['G'], roleId: string): string | undefined {
  const candidateIds = new Set([
    ...Object.keys(G.v1.hiddenRoles || {}),
    ...Object.keys(G.v1.originalRoles || {}),
    ...Object.keys(G.v1.ahrVariableRoles || {}),
  ]);
  for (const charId of candidateIds) {
    const currentRole = G.v1.hiddenRoles?.[charId];
    const originalRole = G.v1.originalRoles?.[charId];
    const effectiveRole = getEffectiveRoleId(G, charId);
    if (effectiveRole === roleId || currentRole === roleId || originalRole === roleId) {
      return charId;
    }
  }
  return undefined;
}

export function getInitialLocation(charId: string): string | undefined {
  const char = CHARACTERS[charId as keyof typeof CHARACTERS];
  return char?.startingLocations?.[0] as string | undefined;
}

export function getAdjacentLocations(locationId: string): string[] {
  const vertical = getMovementDestination(locationId as any, 'vertical');
  const horizontal = getMovementDestination(locationId as any, 'horizontal');
  return [vertical, horizontal].filter((value): value is NonNullable<typeof value> => value != null);
}

export function countDistinctTokenTypes(target: { tokens: Record<string, number> }): number {
  return ['paranoia', 'intrigue', 'goodwill', 'hope', 'despair', 'guard']
    .filter(type => (target.tokens[type] ?? 0) > 0)
    .length;
}

export function isPresentAtLoopStart(ctx: RuleContext, charId: string): boolean {
  const character = ctx.G.v1.characters[charId];
  if (!character || !character.alive) return false;
  if (charId === 'fantasy') return true;
  return !hasLoopUsageFlag(ctx, `__removed_from_board_${charId}`);
}

export function isFrontWorld(ctx: RuleContext): boolean {
  return isAhrFrontWorld(ctx.G);
}
