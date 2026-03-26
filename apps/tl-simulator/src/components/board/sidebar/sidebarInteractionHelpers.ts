import { getCharLabel, getTokenTypeLabel, LOCATION_LABELS_MAP } from '../boardHelpers';

export type SidebarInteractionMoves = {
  declareAbility: (characterId: string, abilityId: string, targets: Record<string, string>) => void;
  resolveAbility: (allowed: boolean) => void;
  confirmLoopResult: (reasonId?: string, outcomeId?: string) => void;
  resolveIncident: (interactionId: string, triggered: boolean, targets?: Record<string, string>) => void;
  chooseButterflyToken: (token: 'goodwill' | 'paranoia' | 'intrigue') => void;
};

export type SidebarTargetSelections = Record<string, Record<string, string>>;

type SidebarTargetSlot = {
  slotId: string;
  label: string;
  kind: 'character' | 'location' | 'character_or_location' | 'token_type' | 'choice' | string;
  eligibleCharacterIds?: string[];
  eligibleLocationIds?: string[];
  eligibleTokenTypes?: string[];
  eligibleChoices?: Array<{ id: string; label: string }>;
};

export type SidebarSlotSummaryEntry = {
  id: string;
  label: string;
  value: string;
};

export type SidebarSlotOption = {
  id: string;
  label: string;
};

export function getSidebarTargetOptionLabel(slot: SidebarTargetSlot, value: string): string {
  if (slot.kind === 'character' || slot.kind === 'character_or_location') {
    if ((slot.eligibleCharacterIds || []).includes(value)) {
      return getCharLabel(value);
    }
  }
  if (slot.kind === 'location' || slot.kind === 'character_or_location') {
    if ((slot.eligibleLocationIds || []).includes(value)) {
      return LOCATION_LABELS_MAP[value] || value;
    }
  }
  if (slot.kind === 'token_type') {
    return getTokenTypeLabel(value as any);
  }
  if (slot.kind === 'choice') {
    return slot.eligibleChoices?.find((choice) => choice.id === value)?.label || value;
  }
  return value;
}

export function buildSidebarSlotOptions(slot: SidebarTargetSlot): SidebarSlotOption[] {
  return [
    ...((slot.kind === 'character' || slot.kind === 'character_or_location')
      ? (slot.eligibleCharacterIds || []).map((id) => ({ id, label: getCharLabel(id) }))
      : []),
    ...((slot.kind === 'location' || slot.kind === 'character_or_location')
      ? (slot.eligibleLocationIds || []).map((id) => ({ id, label: LOCATION_LABELS_MAP[id] || id }))
      : []),
    ...((slot.kind === 'token_type')
      ? (slot.eligibleTokenTypes || []).map((tokenId) => ({
          id: tokenId,
          label: getTokenTypeLabel(tokenId as any),
        }))
      : []),
    ...((slot.kind === 'choice')
      ? (slot.eligibleChoices || []).map((choice) => ({
          id: choice.id,
          label: choice.label,
        }))
      : []),
  ];
}

export function filterRelevantSidebarSlots(
  targetSlots: SidebarTargetSlot[],
  selectedTargets?: Record<string, string> | null,
): SidebarTargetSlot[] {
  const selectedValues = new Set(Object.values(selectedTargets || {}));
  return (targetSlots || []).filter((slot) => (
    !slot.slotId.includes('::')
    || Array.from(selectedValues).some((value) => slot.slotId.startsWith(`${value}::`))
  ));
}

export function buildSidebarSelectionSummary(
  targetSlots: SidebarTargetSlot[],
  selectedTargets?: Record<string, string> | null,
): SidebarSlotSummaryEntry[] {
  if (!selectedTargets) return [];

  return filterRelevantSidebarSlots(targetSlots || [], selectedTargets)
    .map((slot) => {
      const selected = selectedTargets[slot.slotId];
      if (!selected) return null;
      return {
        id: slot.slotId,
        label: slot.label,
        value: getSidebarTargetOptionLabel(slot, selected),
      };
    })
    .filter((entry): entry is SidebarSlotSummaryEntry => entry != null);
}
