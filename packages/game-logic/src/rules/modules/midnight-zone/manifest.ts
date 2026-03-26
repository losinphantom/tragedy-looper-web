import { MZ_INCIDENTS, MZ_PLOTS, MZ_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import type { ModuleIncidentTriggerHook } from '../../moduleIncident';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import {
  buildBrainIntrigueAbilityTargetSlots,
  buildConspiracyTheoristTargetSlots,
} from '../../moduleInteractionBuilders';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { midnightZoneIncidentProcessors } from './incidents';
import { midnightZonePlotProcessors } from './plots';
import { midnightZoneRoleProcessors } from './roles';

export const moduleId = 'midnight-zone';
const tragedySetId = 'midnight_zone';

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    brain_intrigue_ability: buildBrainIntrigueAbilityTargetSlots,
    conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
  },
  incidentSelectionValidators: {
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
  },
};

const incidentBeforeThresholdHooks: ModuleIncidentTriggerHook[] = [
  ({ G, day, incidentId, culpritId }) => {
    const culprit = G.v1.characters[culpritId];
    if (!culprit) return null;

    const prophetBlocksCulprit = Object.entries(G.v1.characters).some(([charId, c]) =>
      charId !== culpritId
      && c.alive
      && c.locationId === culprit.locationId
      && getEffectiveRoleId(G, charId) === 'prophet'
      && !G.v1.loopState?.abilityUsage?.[`__removed_from_board_${charId}`]?.usedThisLoop,
    );
    if (prophetBlocksCulprit) {
      return { shouldTrigger: false, reason: '预言家同区域，事件不触发' };
    }

    if (getEffectiveRoleId(G, culpritId) === 'compulsive') {
      return {
        shouldTrigger: true,
        reason: `第 ${day} 天 ${incidentId}：强迫症当事人，事件必定发生`,
      };
    }

    return null;
  },
];

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(MZ_ROLES),
  incidentIds: Object.keys(MZ_INCIDENTS),
  plotIds: Object.keys(MZ_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: midnightZonePlotProcessors,
    roles: midnightZoneRoleProcessors,
    incidents: midnightZoneIncidentProcessors,
  },
  incidentHooks: {
    before_threshold: incidentBeforeThresholdHooks,
  },
  interactionDescriptors,
};
