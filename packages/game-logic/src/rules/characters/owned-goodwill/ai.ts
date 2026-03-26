import type { TargetSlot, TragedyGameState } from '../../../game';
import {
  noGoodwillTargets,
  type GoodwillHandlerRegistry,
} from '../../../engine/goodwill/types';
import { buildIncidentTargetSlots } from '../../../runtime/incidents';
import { resolveTimingWindow } from '../../../ruleEngine';
import { markWorldShiftThisDay } from '../../ahrWorldShift';
import { isOncePerLoopCharacterGoodwillAbility } from './shared';

type AiGoodwillIncidentChoice = {
  choiceId: string;
  scheduledIncident: { day: number; incidentId: string };
};

function buildAiGoodwillIncidentChoiceId(
  scheduledIncident: { day: number; incidentId: string },
  index: number,
): string {
  return `${scheduledIncident.day}:${index}:${scheduledIncident.incidentId}`;
}

function getAiGoodwillIncidentChoices(G: TragedyGameState): AiGoodwillIncidentChoice[] {
  return (G.v1.scheduledIncidents || []).map((scheduledIncident, index) => ({
    choiceId: buildAiGoodwillIncidentChoiceId(scheduledIncident, index),
    scheduledIncident,
  }));
}

function buildAutoIncidentSelections(
  targetSlots: Array<{
    slotId: string;
    kind: 'character' | 'location' | 'character_or_location' | 'token_type' | 'choice';
    eligibleCharacterIds?: string[];
    eligibleLocationIds?: string[];
    eligibleTokenTypes?: Array<'paranoia' | 'intrigue' | 'goodwill'>;
    eligibleChoices?: Array<{ id: string; label: string }>;
  }>,
): Record<string, string> {
  const selections: Record<string, string> = {};
  const selectedCharacters = new Set<string>();

  for (const slot of targetSlots) {
    if (slot.kind === 'character') {
      const eligible = slot.eligibleCharacterIds || [];
      const choice = eligible.find(id => !selectedCharacters.has(id)) ?? eligible[0];
      if (choice) {
        selections[slot.slotId] = choice;
        selectedCharacters.add(choice);
      }
      continue;
    }

    if (slot.kind === 'location') {
      const choice = slot.eligibleLocationIds?.[0];
      if (choice) selections[slot.slotId] = choice;
      continue;
    }

    if (slot.kind === 'character_or_location') {
      const characterChoice = slot.eligibleCharacterIds?.find(id => !selectedCharacters.has(id)) ?? slot.eligibleCharacterIds?.[0];
      if (characterChoice) {
        selections[slot.slotId] = characterChoice;
        selectedCharacters.add(characterChoice);
        continue;
      }
      const locationChoice = slot.eligibleLocationIds?.[0];
      if (locationChoice) selections[slot.slotId] = locationChoice;
      continue;
    }

    if (slot.kind === 'token_type') {
      const choice = slot.eligibleTokenTypes?.[0];
      if (choice) selections[slot.slotId] = choice;
      continue;
    }

    if (slot.kind === 'choice') {
      const choice = slot.eligibleChoices?.[0]?.id;
      if (choice) selections[slot.slotId] = choice;
    }
  }

  return selections;
}

function resolveAiGoodwillIncidentChoice(
  G: TragedyGameState,
  selectedTargets?: Record<string, string>,
): AiGoodwillIncidentChoice | null {
  const choices = getAiGoodwillIncidentChoices(G);
  if (choices.length === 0) return null;

  if (!selectedTargets?.incidentChoice) {
    return choices[0];
  }

  return choices.find(choice => choice.choiceId === selectedTargets.incidentChoice) ?? null;
}

function extractAiGoodwillIncidentSelections(
  targetSlots: TargetSlot[],
  choiceId: string,
  selectedTargets?: Record<string, string>,
): Record<string, string> {
  const scopedSelections = buildAutoIncidentSelections(targetSlots as Array<{
    slotId: string;
    kind: 'character' | 'location' | 'character_or_location' | 'token_type' | 'choice';
    eligibleCharacterIds?: string[];
    eligibleLocationIds?: string[];
    eligibleTokenTypes?: Array<'paranoia' | 'intrigue' | 'goodwill'>;
    eligibleChoices?: Array<{ id: string; label: string }>;
  }>);

  for (const [slotId, value] of Object.entries(selectedTargets || {})) {
    if (!slotId.startsWith(`${choiceId}::`)) continue;
    scopedSelections[slotId.slice(choiceId.length + 2)] = value;
  }

  return scopedSelections;
}

export const aiGoodwillHandlers: GoodwillHandlerRegistry = {
  ai_gw3: ({ G, charId, selectedTargets }) => {
    const incidentChoice = resolveAiGoodwillIncidentChoice(G, selectedTargets);
    if (!incidentChoice) {
      G.publicLog.push(`📋 ${charId}（A.I.）使用友好能力：公开信息表中没有可模拟的事件`);
      return noGoodwillTargets();
    }

    const targetSlots = buildIncidentTargetSlots(
      G,
      incidentChoice.scheduledIncident.incidentId,
      charId,
    );
    const incidentSelections = extractAiGoodwillIncidentSelections(
      targetSlots,
      incidentChoice.choiceId,
      selectedTargets,
    );
    const resolution = resolveTimingWindow(
      G,
      'incident_resolve',
      {
        day: incidentChoice.scheduledIncident.day,
        incidentId: incidentChoice.scheduledIncident.incidentId,
        culpritId: charId,
      },
      incidentSelections,
    );

    G.publicLog.push(`📋 ${charId}（A.I.）使用友好能力：模拟 ${incidentChoice.scheduledIncident.incidentId}`);
    if (resolution.executed.length === 0) {
      G.fullLog.push(`[友好能力] A.I. ${charId} 模拟 ${incidentChoice.scheduledIncident.incidentId}，但没有可执行现象`);
    }
    if (isOncePerLoopCharacterGoodwillAbility(charId, 'ai_gw3')) {
      markWorldShiftThisDay(G, `goodwill:${charId}.ai_gw3`);
    }
    return noGoodwillTargets();
  },
};
