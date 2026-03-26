import { BTX_INCIDENTS, BTX_PLOTS, BTX_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import {
  buildBrainIntrigueAbilityTargetSlots,
  buildConspiracyTheoristTargetSlots,
  buildDoctorGoodwillTargetSlots,
  buildHigherBeingGoodwillTargetSlots,
  buildMikoGoodwillTargetSlots,
  buildNurseGoodwillTargetSlots,
} from '../../moduleInteractionBuilders';
import type { ModuleGoodwillTargetSlotBuilder } from '../../moduleGoodwill';
import { basicTragedyIncidentProcessors } from './incidents';
import { basicTragedyPlotProcessors } from './plots';
import { basicTragedyRoleProcessors } from './roles';

export const moduleId = 'basic-tragedy';
const tragedySetId = 'basic_tragedy';

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    brain_intrigue_ability: buildBrainIntrigueAbilityTargetSlots,
    conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
  },
  incidentSelectionValidators: {
    spreading: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'fromCharacter', 'toCharacter'),
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
  },
};

const basicTragedyGoodwillTargetSlotBuilders: ModuleGoodwillTargetSlotBuilder[] = [
  ({ G, charId, abilityId }) => {
    if (abilityId === 'doctor_gw2') {
      return buildDoctorGoodwillTargetSlots({ G, characterId: charId, ruleId: abilityId });
    }
    if (abilityId === 'nurse_gw2') {
      return buildNurseGoodwillTargetSlots({ G, characterId: charId, ruleId: abilityId });
    }
    if (abilityId === 'miko_gw5') {
      return buildMikoGoodwillTargetSlots({ G, characterId: charId, ruleId: abilityId });
    }
    if (abilityId === 'higher_being_gw2') {
      return buildHigherBeingGoodwillTargetSlots({ G, characterId: charId, ruleId: abilityId });
    }
    return null;
  },
];

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(BTX_ROLES),
  incidentIds: Object.keys(BTX_INCIDENTS),
  plotIds: Object.keys(BTX_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: basicTragedyPlotProcessors,
    roles: basicTragedyRoleProcessors,
    incidents: basicTragedyIncidentProcessors,
  },
  goodwillHooks: {
    leaderTargetSlots: basicTragedyGoodwillTargetSlotBuilders,
  },
  interactionDescriptors,
};
