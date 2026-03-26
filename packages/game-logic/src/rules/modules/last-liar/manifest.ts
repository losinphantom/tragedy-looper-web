import { LL_INCIDENTS, LL_PLOTS, LL_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import type { ModuleIncidentTriggerHook } from '../../moduleIncident';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import {
  buildBrainIntrigueAbilityTargetSlots,
  buildConspiracyTheoristTargetSlots,
} from '../../moduleInteractionBuilders';
import type { ModuleLifecycleHooks } from '../../moduleLifecycle';
import { getProtagonistSeats } from '../../../playerConfig';
import { getEffectiveRoleId } from '../../ahrEffectiveRoles';
import { getToken } from '../../../utils/tokenHelpers';
import { lastLiarRoleGoodwillAfterResolveHooks } from '../../roles/lastLiarGoodwillHooks';
import { lastLiarIncidentProcessors } from './incidents';
import { lastLiarPlotProcessors } from './plots';
import { lastLiarRoleProcessors } from './roles';

export const moduleId = 'last-liar';
const tragedySetId = 'last_liar';

const lifecycleHooks: ModuleLifecycleHooks = {
  loop_setup: [
    ({ G }) => {
      if (G.loopIndex !== 0) return;

      const cards: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
      for (let i = cards.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }

      const protagonistSeats = getProtagonistSeats(G);
      const assignment: Record<string, 'A' | 'B' | 'C'> = {};
      for (let i = 0; i < protagonistSeats.length && i < cards.length; i += 1) {
        assignment[protagonistSeats[i]] = cards[i];
      }
      G.v1.exCardAssignment = assignment;
      G.publicLog.push(`🃏 Ex牌已随机分配给${protagonistSeats.length}位主人公`);
      G.fullLog.push(`[LL] Ex牌分配：${protagonistSeats.map((seat, index) => `seat${seat}=${cards[index]}`).join(' ')}`);

      const conditions: Record<string, { ruleId: string; description: string }> = {};
      for (const plotId of G.v1.activePlots || []) {
        if (plotId === 'll_true_monster') {
          conditions.A = { ruleId: 'll_true_monster', description: '总计放置过5枚或以上已死亡标志' };
        }
        if (plotId === 'll_myth_collector') {
          conditions.B = { ruleId: 'll_myth_collector', description: '总计放置过6枚或以上已沟通标志' };
        }
        if (plotId === 'll_i_am_the_detective') {
          conditions.C = { ruleId: 'll_i_am_the_detective', description: '最终决战前正确推理所有事件当事人' };
        }
      }

      if (Object.keys(conditions).length > 0) {
        G.v1.betrayerVictoryConditions = conditions;
        G.fullLog.push(`[LL] 背叛者胜利条件：${JSON.stringify(conditions)}`);
      }
    },
  ],
};

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    ll_brain_intrigue_ability: buildBrainIntrigueAbilityTargetSlots,
    ll_conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
  },
  crossPhaseAbilityRuleIds: [
    'll_devils_script_watcher_day_end',
  ],
  incidentSelectionValidators: {
    spreading: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'fromCharacter', 'toCharacter'),
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
  },
};

const incidentBeforeThresholdHooks: ModuleIncidentTriggerHook[] = [
  ({ G, day, incidentId, culpritId }) => {
    const culprit = G.v1.characters[culpritId];
    if (!culprit) return null;

    const hasWatcherForce = Object.entries(G.v1.characters).some(([cId, c]) =>
      cId !== culpritId
      && c.alive
      && c.locationId === culprit.locationId
      && getEffectiveRoleId(G, cId) === 'watcher'
      && !G.v1.loopState?.abilityUsage?.[`__removed_from_board_${cId}`]?.usedThisLoop,
    ) && getToken(culprit, 'despair') >= 1;

    if (!hasWatcherForce) return null;

    return {
      shouldTrigger: true,
      reason: `第 ${day} 天 ${incidentId}：监视者同区域+当事人绝望≥1，事件必定触发`,
    };
  },
];

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(LL_ROLES),
  incidentIds: Object.keys(LL_INCIDENTS),
  plotIds: Object.keys(LL_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: lastLiarPlotProcessors,
    roles: lastLiarRoleProcessors,
    incidents: lastLiarIncidentProcessors,
  },
  goodwillHooks: {
    afterResolve: lastLiarRoleGoodwillAfterResolveHooks,
  },
  incidentHooks: {
    before_threshold: incidentBeforeThresholdHooks,
  },
  lifecycleHooks,
  interactionDescriptors,
};
