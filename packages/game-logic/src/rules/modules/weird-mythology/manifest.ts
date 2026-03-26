import { WM_INCIDENTS, WM_PLOTS, WM_ROLES, getScriptsByModule } from '@tragedy/domain';

import type { ModuleManifest } from '../../moduleManifest';
import { type ModuleInteractionDescriptors, validateDistinctSelections } from '../../moduleInteraction';
import {
  buildConspiracyTheoristTargetSlots,
  buildMcParanoiacTargetSlots,
} from '../../moduleInteractionBuilders';
import type {
  ModuleLifecycleHooks,
  ModuleLoopResultEffectOption,
  ModuleLoopResultEffects,
} from '../../moduleLifecycle';
import { triggerProtagonistDeath } from '../../../lossConditions';
import { addToken } from '../../../utils/tokenHelpers';
import { ensureExState } from '../../incidentEx';
import { weirdMythologyRoleGoodwillAfterResolveHooks } from '../../roles/weirdMythologyGoodwillHooks';
import { weirdMythologyIncidentProcessors } from './incidents';
import { weirdMythologyPlotProcessors } from './plots';
import { weirdMythologyRoleProcessors } from './roles';

export const moduleId = 'weird-mythology';
const tragedySetId = 'weird_mythology';

const lifecycleHooks: ModuleLifecycleHooks = {
  day_start: [
    ({ G }) => {
      if (G.day !== 1) return;

      const ex = ensureExState(G);
      if (!ex.enabled || ex.gauge < 1) return;

      const target = Object.entries(G.v1.characters).find(([_, character]) => character.alive)?.[0];
      if (!target) return;

      addToken(G.v1.characters[target], 'goodwill', 2);
      G.publicLog.push(`🔮 感应咒文（Ex≥1）：${target} +2 友好`);
      G.fullLog.push(`[旧日魔术] 感应咒文：Ex=${ex.gauge}≥1，${target} 获得 2 友好`);
    },
  ],
  resolve_cards: [
    ({ G }) => {
      const ex = ensureExState(G);
      return {
        oldSealActive: ex.enabled && ex.gauge >= 3,
      };
    },
  ],
  post_incident_resolve: [
    ({ G, payload }) => {
      // 廷达罗斯之嗅消费：后续事件发生 → 主人公死亡
      const incidentId = payload?.incidentId as string | undefined;
      if (incidentId === 'scent_of_tindalos') return;
      const key = '__wm_scent_of_tindalos_active';
      if (!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop) return;
      triggerProtagonistDeath(G, '廷达罗斯之嗅：后续事件发生');
      G.publicLog.push('💀 廷达罗斯之嗅效果触发：主人公死亡！');
      G.fullLog.push('[事件] 廷达罗斯之嗅：后续事件发生，主人公死亡');
    },
  ],
  day_end: [
    ({ G }) => {
      const ex = ensureExState(G);
      if (!ex.enabled || ex.gauge < 4) return;

      triggerProtagonistDeath(G, '旧日魔术 — 发狂（Ex≥4）：主人公死亡');
      G.fullLog.push('[旧日魔术] Ex≥4 发狂：主人公死亡');
    },
  ],
};

const loopResultEffects: ModuleLoopResultEffects = {
  collect: ({ G, supportsFinalGuess }) => {
    const ex = ensureExState(G);
    if (!ex.enabled) return [];

    const effects: ModuleLoopResultEffectOption[] = [];
    const x1PlotId = (G.v1.activePlots || [])[1];
    if (ex.gauge >= 2 && x1PlotId) {
      effects.push({
        id: 'wm_ancestor_memory_reveal_x1',
        label: '公开规则 X1',
        detail: `先祖记忆（Ex≥2）：将公开规则 X1 = ${x1PlotId}`,
        stage: 'after_loss_declared' as const,
      });
    }

    if (ex.gauge >= 4 && supportsFinalGuess === true && G.loopIndex < G.maxLoops) {
      effects.push({
        id: 'wm_berserk_burn_remaining_loops',
        label: '失去所有剩余轮回',
        detail: '发狂（Ex≥4）：本次确认后将直接耗尽剩余轮回并进入最终决战。',
        stage: 'after_progression' as const,
        outcomeOverride: 'final_guess' as const,
      });
    }

    return effects;
  },
  apply: ({ G, effectId }) => {
    const ex = ensureExState(G);
    if (!ex.enabled) return false;

    if (effectId === 'wm_ancestor_memory_reveal_x1' && ex.gauge >= 2) {
      const x1PlotId = (G.v1.activePlots || [])[1];
      if (x1PlotId) {
        G.publicLog.push(`📜 先祖记忆（Ex≥2）：规则X1 = ${x1PlotId}`);
        G.fullLog.push(`[旧日魔术] 先祖记忆：Ex=${ex.gauge}≥2，公开规则X1=${x1PlotId}`);
      }
      return true;
    }

    if (effectId === 'wm_berserk_burn_remaining_loops' && ex.gauge >= 4) {
      G.maxLoops = G.loopIndex;
      G.publicLog.push('🌀 旧日魔术 — 发狂（Ex≥4）：失去所有剩余轮回，直接进入最终决战');
      G.fullLog.push('[旧日魔术] Ex≥4 发狂：消耗剩余轮回，进入最终决战');
      return true;
    }

    return false;
  },
};

const interactionDescriptors: ModuleInteractionDescriptors = {
  abilityTargetSlots: {
    wm_conspiracy_theorist_unease_ability: buildConspiracyTheoristTargetSlots,
    wm_paranoiac_intrigue_or_unease: buildMcParanoiacTargetSlots,
  },
  incidentSelectionValidators: {
    increasing_unease: ({ selectedTargets }) => validateDistinctSelections(selectedTargets, 'paranoiaTarget', 'intrigueTarget'),
  },
};

export const moduleManifest: ModuleManifest = {
  moduleId,
  tragedySetId,
  roleIds: Object.keys(WM_ROLES),
  incidentIds: Object.keys(WM_INCIDENTS),
  plotIds: Object.keys(WM_PLOTS),
  scriptIds: getScriptsByModule(tragedySetId).map(script => script.id),
  processors: {
    plots: weirdMythologyPlotProcessors,
    roles: weirdMythologyRoleProcessors,
    incidents: weirdMythologyIncidentProcessors,
  },
  goodwillHooks: {
    afterResolve: weirdMythologyRoleGoodwillAfterResolveHooks,
  },
  lifecycleHooks,
  loopResultEffects,
  interactionDescriptors,
};
