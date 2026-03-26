import { CHARACTERS, findRoleById, getRoleById } from '@tragedy/domain';
import type { TargetSlot, TragedyGameState } from '../../../game';
import { buildIncidentTargetSlots } from '../../../runtime/incidents';
import { getToken } from '../../../utils/tokenHelpers';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { getGoodwillActivationValue } from '../../ahrTokenSemantics';
import { isBackWorld } from '../../ahrWorldShift';
import {
  type ModuleGoodwillTargetSlotBuilder,
  type ModuleGoodwillTraitOverrideHook,
  type ModulePendingGoodwillCollector,
} from '../../moduleGoodwill';

const SUPPORTED_PUPPETIZED_GOODWILL_ABILITIES = new Set([
  'class_rep_gw2',
  'doctor_gw2',
  'office_worker_gw3',
  'outsider_gw3',
  'miko_gw5',
  'nurse_gw2',
]);

type AiGoodwillIncidentChoice = {
  choiceId: string;
  scheduledIncident: { day: number; incidentId: string };
};

function getRoleDefinitionForCharacter(G: TragedyGameState, charId: string) {
  const roleId = getEffectiveRoleId(G, charId);
  if (!roleId) return null;

  const setId = G.scriptOpen?.tragedySetId;
  return setId ? getRoleById(setId, roleId) : findRoleById(roleId);
}

function hasAhrPuppetStringsRule(G: TragedyGameState): boolean {
  return (G.v1.activeRuleDefinitions || []).some(
    rule => rule.ruleId === 'ahr_puppet_strings_puppetize_ignores_goodwill',
  );
}

function hasPuppetizedGoodwillTrait(G: TragedyGameState, charId: string): boolean {
  const roleId = getEffectiveRoleId(G, charId);
  if (!roleId) return false;
  if (roleId === 'marionette' || roleId === 'lullaby') return true;

  if (!hasAhrPuppetStringsRule(G)) return false;

  const roleDef = getRoleDefinitionForCharacter(G, charId);
  return !!roleDef && roleDef.goodwillRefusal !== 'none';
}

function isAhrIllusionProtected(G: TragedyGameState, characterId: string): boolean {
  return getEffectiveRoleId(G, characterId) === 'illusion'
    && (G.v1.activeRuleDefinitions || []).some(
      rule => rule.ruleId === 'ahr_illusion_unease_limit' && rule.characterId === characterId,
    );
}

function filterProtectedAbilityTargets(G: TragedyGameState, characterIds: string[]): string[] {
  return characterIds.filter(characterId => !isAhrIllusionProtected(G, characterId));
}

function hasLoopUsageFlag(G: TragedyGameState, key: string): boolean {
  return !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

function isAliveOnBoardForGoodwill(G: TragedyGameState, charId: string): boolean {
  const character = G.v1.characters[charId];
  if (!character || !character.alive) return false;
  return !hasLoopUsageFlag(G, `__removed_from_board_${charId}`);
}

function isOncePerLoopGoodwillAbility(charId: string, abilityId: string): boolean {
  const abilityDef = CHARACTERS[charId]?.goodwillAbilities.find(ability => ability.id === abilityId);
  if (!abilityDef) return false;
  if (abilityDef.oncePerLoop) return true;
  return (abilityDef.rules?.[0]?.summary?.['zh-CN'] || '').includes('每轮限1次');
}

function buildAiGoodwillIncidentChoiceId(
  scheduledIncident: { day: number; incidentId: string },
  index: number,
): string {
  return `${scheduledIncident.day}:${index}:${scheduledIncident.incidentId}`;
}

function getAiGoodwillIncidentChoices(
  G: TragedyGameState,
): AiGoodwillIncidentChoice[] {
  return (G.v1.scheduledIncidents || []).map((scheduledIncident, index) => ({
    choiceId: buildAiGoodwillIncidentChoiceId(scheduledIncident, index),
    scheduledIncident,
  }));
}

function buildAiGoodwillTargetSlots(G: TragedyGameState, charId: string): TargetSlot[] {
  const choices = getAiGoodwillIncidentChoices(G);
  if (choices.length === 0) return [];

  const targetSlots: TargetSlot[] = [{
    slotId: 'incidentChoice',
    label: '选择公开事件',
    kind: 'choice',
    eligibleChoices: choices.map(choice => ({
      id: choice.choiceId,
      label: `D${choice.scheduledIncident.day} · ${choice.scheduledIncident.incidentId}`,
    })),
  }];

  for (const choice of choices) {
    for (const slot of buildIncidentTargetSlots(G, choice.scheduledIncident.incidentId, charId)) {
      targetSlots.push({
        ...slot,
        slotId: `${choice.choiceId}::${slot.slotId}`,
      });
    }
  }

  return targetSlots;
}

function buildPuppetizedGoodwillTargetSlots(
  G: TragedyGameState,
  characterId: string,
  abilityId: string,
): TargetSlot[] {
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  switch (abilityId) {
    case 'doctor_gw2':
      return [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: filterProtectedAbilityTargets(
          G,
          Object.entries(G.v1.characters)
            .filter(([id, c]) => id !== characterId && c.alive && c.locationId === character.locationId)
            .map(([id]) => id),
        ),
      }, {
        slotId: 'mode',
        label: '选择效果',
        kind: 'choice',
        eligibleChoices: [
          { id: 'place', label: '放置1不安' },
          { id: 'remove', label: '移除1不安' },
        ],
      }];
    case 'miko_gw5':
      return [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: filterProtectedAbilityTargets(
          G,
          Object.entries(G.v1.characters)
            .filter(([id, c]) => id !== characterId && c.alive && c.locationId === character.locationId)
            .map(([id]) => id),
        ),
      }];
    case 'nurse_gw2':
      return [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: filterProtectedAbilityTargets(
          G,
          Object.entries(G.v1.characters)
            .filter(([id, c]) => id !== characterId && c.alive && c.locationId === character.locationId)
            .filter(([id]) => {
              const target = G.v1.characters[id];
              const charDef = CHARACTERS[id];
              return !!charDef && (target.tokens.paranoia || 0) > 0 && (target.tokens.paranoia || 0) >= charDef.uneaseLimit;
            })
            .map(([id]) => id),
        ),
      }];
    default:
      return [];
  }
}

function buildMastermindGoodwillTargetSlots(
  G: TragedyGameState,
  characterId: string,
  abilityId: string,
): TargetSlot[] {
  const character = G.v1.characters[characterId];
  if (!character || !character.alive) return [];

  switch (abilityId) {
    case 'doctor_gw2':
      return [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: filterProtectedAbilityTargets(
          G,
          Object.entries(G.v1.characters)
            .filter(([id, c]) => id !== characterId && c.alive && c.locationId === character.locationId)
            .map(([id]) => id),
        ),
      }, {
        slotId: 'mode',
        label: '选择效果',
        kind: 'choice',
        eligibleChoices: [
          { id: 'place', label: '放置1不安' },
          { id: 'remove', label: '移除1不安' },
        ],
      }];
    case 'higher_being_gw2':
      return [{
        slotId: 'target',
        label: '选择角色',
        kind: 'character',
        eligibleCharacterIds: filterProtectedAbilityTargets(
          G,
          Object.entries(G.v1.characters)
            .filter(([_, c]) => c.alive && c.locationId === character.locationId)
            .map(([id]) => id),
        ),
      }, {
        slotId: 'token',
        label: '选择指示物',
        kind: 'choice',
        eligibleChoices: [
          { id: 'hope', label: '放置1希望' },
          { id: 'despair', label: '放置1绝望' },
        ],
      }];
    default:
      return [];
  }
}

function canQueuePuppetizedGoodwillAbility(
  G: TragedyGameState,
  charId: string,
  abilityId: string,
): boolean {
  if (!SUPPORTED_PUPPETIZED_GOODWILL_ABILITIES.has(abilityId)) {
    return false;
  }
  if (!hasPuppetizedGoodwillTrait(G, charId)) {
    return false;
  }
  if (abilityId === 'outsider_gw3') {
    return (G.loopIndex ?? 0) >= 1;
  }
  return true;
}

function canQueueMastermindGoodwillAbility(
  G: TragedyGameState,
  charId: string,
  abilityId: string,
): boolean {
  if (!isAliveOnBoardForGoodwill(G, charId)) return false;

  const roleDef = getRoleDefinitionForCharacter(G, charId);
  if (!roleDef || roleDef.goodwillRefusal === 'none') return false;

  const usageKey = `${charId}_${abilityId}`;
  const usage = G.v1.loopState.abilityUsage[usageKey];
  if (usage?.usedToday) return false;
  if (isOncePerLoopGoodwillAbility(charId, abilityId) && usage?.usedThisLoop) return false;

  switch (abilityId) {
    case 'doctor_gw2':
      if (isBackWorld(G)) {
        return getToken(G.v1.characters[charId], 'paranoia') >= 2;
      }
      return getToken(G.v1.characters[charId], 'goodwill') >= 2;
    case 'higher_being_gw2':
      if (isBackWorld(G)) {
        return getToken(G.v1.mastermind, 'paranoia') >= 1;
      }
      return getToken(G.v1.characters[charId], 'goodwill') >= 1;
    default:
      return false;
  }
}

function buildGoodwillSummary(charId: string, abilityId: string): string {
  return CHARACTERS[charId]?.goodwillAbilities
    .find(ability => ability.id === abilityId)
    ?.rules?.[0]?.summary?.['zh-CN'] ?? '';
}

export const anotherHorizonRevisedGoodwillTraitOverrides: ModuleGoodwillTraitOverrideHook[] = [
  ({ G, charId, currentTrait }) => {
    if (currentTrait === 'must_allow') return null;
    if (!hasPuppetizedGoodwillTrait(G, charId)) return null;
    return 'can_reject';
  },
];

export const anotherHorizonRevisedGoodwillTargetSlotBuilders: ModuleGoodwillTargetSlotBuilder[] = [
  ({ G, charId, abilityId }) => {
    if (abilityId !== 'ai_gw3') return null;
    return buildAiGoodwillTargetSlots(G, charId);
  },
];

export const anotherHorizonRevisedPendingGoodwillCollectors: ModulePendingGoodwillCollector[] = [
  ({ G }) => {
    const pending: ReturnType<ModulePendingGoodwillCollector> = [];

    for (const [charId, charState] of Object.entries(G.v1.characters)) {
      if (!charState.alive) continue;

      const charDef = CHARACTERS[charId];
      if (!charDef?.goodwillAbilities) continue;

      for (const ability of charDef.goodwillAbilities) {
        if (ability.timing !== 'goodwill_window') continue;

        const threshold = ability.goodwillCost ?? 99;
        if (getGoodwillActivationValue(G, charState) < threshold) continue;

        const usageKey = `${charId}_${ability.id}`;
        const usage = G.v1.loopState.abilityUsage[usageKey];
        if (usage?.usedToday) continue;
        if (ability.oncePerLoop && usage?.usedThisLoop) continue;
        if (!canQueuePuppetizedGoodwillAbility(G, charId, ability.id)) continue;

        const targetSlots = buildPuppetizedGoodwillTargetSlots(G, charId, ability.id);
        if ((ability.id === 'doctor_gw2' || ability.id === 'miko_gw5' || ability.id === 'nurse_gw2')
          && targetSlots[0]?.eligibleCharacterIds?.length === 0) {
          continue;
        }

        pending.push({
          id: `ahr_puppetized_goodwill_ability:${charId}:${ability.id}`,
          ruleId: 'ahr_puppetized_goodwill_ability',
          characterId: charId,
          abilityId: ability.id,
          mandatory: false,
          description: `傀儡无视友好：${buildGoodwillSummary(charId, ability.id)}`,
          targetSlots,
        });
      }
    }

    if (canQueueMastermindGoodwillAbility(G, 'doctor', 'doctor_gw2')) {
      const targetSlots = buildMastermindGoodwillTargetSlots(G, 'doctor', 'doctor_gw2');
      if ((targetSlots[0]?.eligibleCharacterIds?.length ?? 0) > 0) {
        pending.push({
          id: 'ahr_mastermind_goodwill_ability:doctor:doctor_gw2',
          ruleId: 'ahr_mastermind_goodwill_ability',
          characterId: 'doctor',
          abilityId: 'doctor_gw2',
          mandatory: false,
          description: `AHR 剧作家友好：${buildGoodwillSummary('doctor', 'doctor_gw2')}`,
          targetSlots,
        });
      }
    }

    if (canQueueMastermindGoodwillAbility(G, 'higher_being', 'higher_being_gw2')) {
      const targetSlots = buildMastermindGoodwillTargetSlots(G, 'higher_being', 'higher_being_gw2');
      if ((targetSlots[0]?.eligibleCharacterIds?.length ?? 0) > 0) {
        pending.push({
          id: 'ahr_mastermind_goodwill_ability:higher_being:higher_being_gw2',
          ruleId: 'ahr_mastermind_goodwill_ability',
          characterId: 'higher_being',
          abilityId: 'higher_being_gw2',
          mandatory: false,
          description: `AHR 剧作家友好：${buildGoodwillSummary('higher_being', 'higher_being_gw2')}`,
          targetSlots,
        });
      }
    }

    return pending;
  },
];
