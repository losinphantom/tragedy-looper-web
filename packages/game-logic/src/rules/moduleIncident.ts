import type { TragedyGameState } from '../game';
import type { IncidentTriggerStatus } from '../engine/autoResolve';
import { officialModuleManifests } from './modules';

export interface ModuleIncidentTriggerContext {
  G: TragedyGameState;
  day: number;
  incidentId: string;
  culpritId: string;
}

export type ModuleIncidentTriggerHook = (
  ctx: ModuleIncidentTriggerContext,
) => IncidentTriggerStatus | null | void;

export type ModuleIncidentTriggerStage = 'after_presence' | 'before_threshold';

export function runModuleIncidentTriggerHooks(
  stage: ModuleIncidentTriggerStage,
  ctx: ModuleIncidentTriggerContext,
): IncidentTriggerStatus | null {
  const setId = ctx.G.scriptOpen?.tragedySetId;
  if (!setId) return null;

  for (const manifest of officialModuleManifests) {
    const manifestSetId = manifest.tragedySetId ?? manifest.moduleId.replace(/-/g, '_');
    if (manifestSetId !== setId) continue;
    for (const hook of manifest.incidentHooks?.[stage] ?? []) {
      const result = hook(ctx);
      if (result != null) return result;
    }
  }

  return null;
}
