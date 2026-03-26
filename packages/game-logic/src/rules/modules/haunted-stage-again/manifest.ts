import { HSA_INCIDENTS, HSA_PLOTS, HSA_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import { buildConspiracyTheoristTargetSlots } from '../../moduleInteractionBuilders';
import { hauntedStageAgainIncidentProcessors } from './incidents';
import { hauntedStageAgainPlotProcessors } from './plots';
import { hauntedStageAgainRoleProcessors } from './roles';

export const moduleId = 'haunted-stage-again';
const tragedySetId = 'haunted_stage_again';

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
  },
  incidentSelectionValidators: {
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
  },
};

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(HSA_ROLES),
  incidentIds: Object.keys(HSA_INCIDENTS),
  plotIds: Object.keys(HSA_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: hauntedStageAgainPlotProcessors,
    roles: hauntedStageAgainRoleProcessors,
    incidents: hauntedStageAgainIncidentProcessors,
  },
  interactionDescriptors,
};
