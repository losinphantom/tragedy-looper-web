import type { TargetSlot, TragedyGameState } from '../game';
import { officialModuleManifests } from './modules';
import { buildGenericGoodwillTargetSlots } from './moduleInteractionBuilders';

export interface ModuleGoodwillResolutionContext {
  G: TragedyGameState;
  charId: string;
  abilityId: string;
  selectedTargets?: Record<string, string>;
  targetedCharacterIds?: string[];
}

export type ModuleGoodwillResolutionHook = (
  ctx: ModuleGoodwillResolutionContext,
) => void;

export type ModuleGoodwillTrait = 'must_reject' | 'can_reject' | 'must_allow';

export interface ModuleGoodwillTraitOverrideContext {
  G: TragedyGameState;
  charId: string;
  currentTrait: ModuleGoodwillTrait;
}

export type ModuleGoodwillTraitOverrideHook = (
  ctx: ModuleGoodwillTraitOverrideContext,
) => ModuleGoodwillTrait | null | undefined;

export interface ModuleGoodwillTargetSlotContext {
  G: TragedyGameState;
  charId: string;
  abilityId: string;
}

export type ModuleGoodwillTargetSlotBuilder = (
  ctx: ModuleGoodwillTargetSlotContext,
) => TargetSlot[] | null | undefined;

export interface ModulePendingGoodwillAbility {
  id: string;
  ruleId: string;
  characterId: string;
  abilityId?: string;
  mandatory: boolean;
  description: string;
  targetSlots: TargetSlot[];
}

export interface ModulePendingGoodwillContext {
  G: TragedyGameState;
}

export type ModulePendingGoodwillCollector = (
  ctx: ModulePendingGoodwillContext,
) => ModulePendingGoodwillAbility[];

function getActiveGoodwillManifests(G: TragedyGameState) {
  const setId = G.scriptOpen?.tragedySetId;
  return officialModuleManifests.filter((manifest) => {
    const manifestSetId = manifest.tragedySetId ?? manifest.moduleId.replace(/-/g, '_');
    return !setId || manifestSetId === setId;
  });
}

export function runModuleGoodwillAfterResolveHooks(
  ctx: ModuleGoodwillResolutionContext,
): void {
  for (const manifest of getActiveGoodwillManifests(ctx.G)) {
    for (const hook of manifest.goodwillHooks?.afterResolve ?? []) {
      hook(ctx);
    }
  }
}

export function resolveModuleGoodwillTrait(
  ctx: ModuleGoodwillTraitOverrideContext,
): ModuleGoodwillTrait {
  let trait = ctx.currentTrait;
  for (const manifest of getActiveGoodwillManifests(ctx.G)) {
    for (const hook of manifest.goodwillHooks?.traitOverrides ?? []) {
      trait = hook({ ...ctx, currentTrait: trait }) ?? trait;
    }
  }
  return trait;
}

export function buildModuleGoodwillTargetSlots(
  ctx: ModuleGoodwillTargetSlotContext,
): TargetSlot[] {
  for (const manifest of getActiveGoodwillManifests(ctx.G)) {
    for (const hook of manifest.goodwillHooks?.leaderTargetSlots ?? []) {
      const targetSlots = hook(ctx);
      if (targetSlots) return targetSlots;
    }
  }
  return buildGenericGoodwillTargetSlots({
    G: ctx.G,
    ruleId: ctx.abilityId,
    characterId: ctx.charId,
  });
}

export function collectModulePendingGoodwillAbilities(
  ctx: ModulePendingGoodwillContext,
): ModulePendingGoodwillAbility[] {
  const result: ModulePendingGoodwillAbility[] = [];
  for (const manifest of getActiveGoodwillManifests(ctx.G)) {
    for (const hook of manifest.goodwillHooks?.collectPendingAbilities ?? []) {
      result.push(...hook(ctx));
    }
  }
  return result;
}
