import { MC_INCIDENTS, MC_PLOTS, MC_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import {
  buildBrainIntrigueAbilityTargetSlots,
  buildConspiracyTheoristTargetSlots,
  buildMcParanoiacTargetSlots,
  buildMcPsychiatristHealTargetSlots,
} from '../../moduleInteractionBuilders';
import { mysteryCircleIncidentProcessors } from './incidents';
import { mysteryCirclePlotProcessors } from './plots';
import { mysteryCircleRoleProcessors } from './roles';

export const moduleId = 'mystery-circle';
const tragedySetId = 'mystery_circle';

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    brain_intrigue_ability: buildBrainIntrigueAbilityTargetSlots,
    conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
    mc_paranoiac_intrigue_or_unease: buildMcParanoiacTargetSlots,
    mc_psychiatrist_heal: buildMcPsychiatristHealTargetSlots,
  },
  incidentSelectionValidators: {
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
    bizarre_murder: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
  },
};

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(MC_ROLES),
  incidentIds: Object.keys(MC_INCIDENTS),
  plotIds: Object.keys(MC_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: mysteryCirclePlotProcessors,
    roles: mysteryCircleRoleProcessors,
    incidents: mysteryCircleIncidentProcessors,
  },
  interactionDescriptors,
};
