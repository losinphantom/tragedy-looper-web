import { FIRST_STEPS_INCIDENTS, FIRST_STEPS_PLOTS, FIRST_STEPS_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import {
  buildBrainIntrigueAbilityTargetSlots,
  buildConspiracyTheoristTargetSlots,
} from '../../moduleInteractionBuilders';
import { firstStepsIncidentProcessors } from './incidents';
import { firstStepsPlotProcessors } from './plots';
import { firstStepsRoleProcessors } from './roles';

export const moduleId = 'first-steps';
const tragedySetId = 'first_steps';

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

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(FIRST_STEPS_ROLES),
  incidentIds: Object.keys(FIRST_STEPS_INCIDENTS),
  plotIds: Object.keys(FIRST_STEPS_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: firstStepsPlotProcessors,
    roles: firstStepsRoleProcessors,
    incidents: firstStepsIncidentProcessors,
  },
  interactionDescriptors,
};
