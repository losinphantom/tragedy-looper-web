import type { TargetSlot, TragedyGameState } from '../game';
import { officialModuleManifests } from './modules';

export interface ModuleAbilityTargetSlotContext {
  G: TragedyGameState;
  ruleId: string;
  characterId?: string;
}

export interface ModuleIncidentConstraintContext {
  G: TragedyGameState;
  incidentId: string;
  culpritId: string;
  selectedTargets: Record<string, string>;
  targetSlots: TargetSlot[];
}

export type ModuleAbilityTargetSlotBuilder = (context: ModuleAbilityTargetSlotContext) => TargetSlot[];
export type ModuleIncidentSelectionValidator = (context: ModuleIncidentConstraintContext) => boolean;
export type ModuleIncidentRequiredSlotResolver = (context: ModuleIncidentConstraintContext) => string[];

export interface ModuleInteractionDescriptors {
  abilityTargetSlots?: Record<string, ModuleAbilityTargetSlotBuilder>;
  crossPhaseAbilityRuleIds?: string[];
  incidentSelectionValidators?: Record<string, ModuleIncidentSelectionValidator>;
  incidentRequiredSlotIds?: Record<string, ModuleIncidentRequiredSlotResolver>;
}

function getActiveInteractionDescriptors(
  G: TragedyGameState,
): ModuleInteractionDescriptors[] {
  const setId = G.scriptOpen?.tragedySetId;
  return officialModuleManifests
    .filter((manifest) => !setId || (manifest.tragedySetId ?? manifest.moduleId.replace(/-/g, '_')) === setId)
    .map(manifest => manifest.interactionDescriptors)
    .filter((descriptors): descriptors is ModuleInteractionDescriptors => !!descriptors);
}

export function buildModuleAbilityTargetSlots(
  G: TragedyGameState,
  ruleId: string,
  characterId?: string,
): TargetSlot[] {
  for (const descriptors of getActiveInteractionDescriptors(G)) {
    const builder = descriptors.abilityTargetSlots?.[ruleId];
    if (builder) {
      return builder({ G, ruleId, characterId });
    }
  }
  return [];
}

export function isModuleCrossPhaseAbility(
  G: TragedyGameState,
  ruleId: string,
): boolean {
  return getActiveInteractionDescriptors(G).some(descriptors =>
    descriptors.crossPhaseAbilityRuleIds?.includes(ruleId),
  );
}

export function getModuleIncidentRequiredSlotIds(
  G: TragedyGameState,
  incidentId: string,
  context: Omit<ModuleIncidentConstraintContext, 'G' | 'incidentId'>,
): Set<string> | null {
  for (const descriptors of getActiveInteractionDescriptors(G)) {
    const resolver = descriptors.incidentRequiredSlotIds?.[incidentId];
    if (resolver) {
      return new Set(resolver({ G, incidentId, ...context }));
    }
  }
  return null;
}

export function validateModuleIncidentSelections(
  G: TragedyGameState,
  incidentId: string,
  context: Omit<ModuleIncidentConstraintContext, 'G' | 'incidentId'>,
): boolean {
  return getActiveInteractionDescriptors(G).every((descriptors) => {
    const validator = descriptors.incidentSelectionValidators?.[incidentId];
    if (!validator) return true;
    return validator({ G, incidentId, ...context });
  });
}

export function validateDistinctSelections(
  selectedTargets: Record<string, string>,
  leftSlotId: string,
  rightSlotId: string,
): boolean {
  const left = selectedTargets[leftSlotId];
  const right = selectedTargets[rightSlotId];
  return !left || !right || left !== right;
}

export function getImaginaryIncidentRequiredSlotIds(
  selectedTargets: Record<string, string>,
): string[] {
  const incidentChoice = selectedTargets.incidentChoice;
  if (incidentChoice === 'impulse_murder') {
    return ['incidentChoice', 'murderTarget'];
  }
  if (incidentChoice === 'dimension_warp') {
    return ['incidentChoice', 'worldShiftChoice', 'paranoiaTarget', 'goodwillTarget'];
  }
  if (incidentChoice === 'lost_item') {
    return ['incidentChoice', 'intrigueTarget', 'location'];
  }
  return ['incidentChoice'];
}
