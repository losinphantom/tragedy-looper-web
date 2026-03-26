import { AHR_INCIDENTS, AHR_PLOTS, AHR_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import type { ModuleIncidentTriggerHook } from '../../moduleIncident';
import {
  getImaginaryIncidentRequiredSlotIds,
  type ModuleInteractionDescriptors,
  validateDistinctSelections,
} from '../../moduleInteraction';
import {
  buildBrainIntrigueAbilityTargetSlots,
  buildConspiracyTheoristTargetSlots,
  buildAhrEvangelistTargetSlots,
  buildHigherBeingGoodwillTargetSlots,
  buildAhrLullabyTargetSlots,
  buildAhrMagicianTeleportTargetSlots,
  buildMikoGoodwillTargetSlots,
  buildAhrPiedPiperCorpseTargetSlots,
  buildAhrPiedPiperKillTargetSlots,
  buildAhrStorytellerShiftTokenTargetSlots,
} from '../../moduleInteractionBuilders';
import type { ModuleLifecycleHooks } from '../../moduleLifecycle';
import { addToken } from '../../../utils/tokenHelpers';
import {
  anotherHorizonRevisedGoodwillTargetSlotBuilders,
  anotherHorizonRevisedGoodwillTraitOverrides,
  anotherHorizonRevisedPendingGoodwillCollectors,
} from './goodwill';
import { anotherHorizonRevisedRoleGoodwillAfterResolveHooks } from '../../roles/anotherHorizonRevisedGoodwillHooks';
import { anotherHorizonRevisedIncidentProcessors } from './incidents';
import { anotherHorizonRevisedPlotProcessors } from './plots';
import { anotherHorizonRevisedRoleProcessors } from './roles';

export const moduleId = 'another-horizon-revised';
const tragedySetId = 'another_horizon_revised';

const lifecycleHooks: ModuleLifecycleHooks = {
  loop_setup: [
    ({ G }) => {
      addToken(G.v1.protagonists, 'paranoia', 2);
      addToken(G.v1.mastermind, 'goodwill', 1);
      if (G.loopIndex === 0) {
        addToken(G.v1.mastermind, 'despair', 1);
      }
    },
  ],
};

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    brain_intrigue_ability: buildBrainIntrigueAbilityTargetSlots,
    conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
    ahr_magician_teleport: buildAhrMagicianTeleportTargetSlots,
    ahr_storyteller_shift_token: buildAhrStorytellerShiftTokenTargetSlots,
    ahr_lullaby_place_token: buildAhrLullabyTargetSlots,
    ahr_evangelist_goodwill_ability: buildAhrEvangelistTargetSlots,
    ahr_pied_piper_day_end_kill: buildAhrPiedPiperKillTargetSlots,
    ahr_pied_piper_corpse_intrigue_and_loss: buildAhrPiedPiperCorpseTargetSlots,
  },
  crossPhaseAbilityRuleIds: [
    'ahr_evangelist_death_despair_and_world_shift',
    'ahr_pied_piper_day_end_kill',
    'ahr_pied_piper_corpse_intrigue_and_loss',
  ],
  incidentRequiredSlotIds: {
    imaginary_incident: ({ selectedTargets }) => getImaginaryIncidentRequiredSlotIds(selectedTargets),
  },
  incidentSelectionValidators: {
    spreading: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'fromCharacter', 'toCharacter'),
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
    bizarre_murder: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
    dimension_warp: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'goodwillTarget'),
    imaginary_incident: ({ selectedTargets }) => {
      if (selectedTargets.incidentChoice !== 'dimension_warp') {
        return true;
      }
      return validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'goodwillTarget');
    },
  },
};

const incidentAfterPresenceHooks: ModuleIncidentTriggerHook[] = [
  ({ G, day, incidentId, culpritId }) => {
    if (incidentId !== 'system_error') return null;
    if (G.v1.hiddenRoles?.[culpritId] !== 'untouchable') return null;
    if (!(G.v1.activeRuleDefinitions || []).some(rule => rule.ruleId === 'ahr_machine_heart_event')) {
      return null;
    }
    return {
      shouldTrigger: true,
      reason: `第 ${day} 天 ${incidentId}：机器之心强制结算系统错误`,
    };
  },
];

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(AHR_ROLES),
  incidentIds: Object.keys(AHR_INCIDENTS),
  plotIds: Object.keys(AHR_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: anotherHorizonRevisedPlotProcessors,
    roles: anotherHorizonRevisedRoleProcessors,
    incidents: anotherHorizonRevisedIncidentProcessors,
  },
  goodwillHooks: {
    afterResolve: anotherHorizonRevisedRoleGoodwillAfterResolveHooks,
    traitOverrides: anotherHorizonRevisedGoodwillTraitOverrides,
    leaderTargetSlots: [
      ...anotherHorizonRevisedGoodwillTargetSlotBuilders,
      ({ G, charId, abilityId }) => {
        if (abilityId === 'miko_gw5') {
          return buildMikoGoodwillTargetSlots({ G, characterId: charId, ruleId: abilityId });
        }
        if (abilityId === 'higher_being_gw2') {
          return buildHigherBeingGoodwillTargetSlots({ G, characterId: charId, ruleId: abilityId });
        }
        return null;
      },
    ],
    collectPendingAbilities: anotherHorizonRevisedPendingGoodwillCollectors,
  },
  incidentHooks: {
    after_presence: incidentAfterPresenceHooks,
  },
  lifecycleHooks,
  interactionDescriptors,
};
