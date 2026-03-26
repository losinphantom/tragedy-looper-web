import type { TragedyGameState } from '../game';
import { collectModuleLifecycleHooks, getManifestTragedySetId } from './moduleRegistry';
import { officialModuleManifests } from './modules';

export type ModuleLifecyclePoint =
  | 'loop_setup'
  | 'day_start'
  | 'resolve_cards'
  | 'post_incident_resolve'
  | 'day_end'
  | 'loop_end_check'
  | 'final_guess';

export interface ModuleLifecycleEvents {
  endPhase?: (...args: any[]) => void;
  setPhase?: (...args: any[]) => void;
}

export type ModuleLifecyclePayload = Record<string, unknown>;
export type ModuleLifecycleResult = Record<string, unknown> | void;

export type ModuleLoopResultOutcomeId = 'next_loop' | 'final_guess' | 'match_end';

export interface ModuleLoopResultEffectOption {
  id: string;
  label: string;
  detail?: string;
  stage?: 'after_loss_declared' | 'after_progression';
  outcomeOverride?: ModuleLoopResultOutcomeId;
}

export interface ModuleLoopResultEffectsContext {
  G: TragedyGameState;
  currentLoopNumber: number;
  supportsFinalGuess: boolean;
}

export interface ModuleLoopResultEffectApplicationContext extends ModuleLoopResultEffectsContext {
  effectId: string;
}

export interface ModuleLoopResultEffects {
  collect?: (context: ModuleLoopResultEffectsContext) => ModuleLoopResultEffectOption[] | void;
  apply?: (context: ModuleLoopResultEffectApplicationContext) => boolean | void;
}

export interface ModuleLifecycleContext {
  G: TragedyGameState;
  point: ModuleLifecyclePoint;
  events?: ModuleLifecycleEvents;
  payload: ModuleLifecyclePayload;
}

export type ModuleLifecycleHook = (context: ModuleLifecycleContext) => ModuleLifecycleResult;
export type ModuleLifecycleHooks = Partial<Record<ModuleLifecyclePoint, ModuleLifecycleHook[]>>;

export function runModuleLifecycle(
  G: TragedyGameState,
  point: ModuleLifecyclePoint,
  options?: {
    events?: ModuleLifecycleEvents;
    payload?: ModuleLifecyclePayload;
  },
): Record<string, unknown> {
  const setId = G.scriptOpen?.tragedySetId;
  if (!setId) return {};

  const hooks = collectModuleLifecycleHooks(officialModuleManifests, setId, point);
  const merged: Record<string, unknown> = {};

  for (const hook of hooks) {
    const result = hook({
      G,
      point,
      events: options?.events,
      payload: options?.payload ?? {},
    });
    if (result) {
      Object.assign(merged, result);
    }
  }

  return merged;
}

export function collectModuleLoopResultEffects(
  G: TragedyGameState,
  options: {
    currentLoopNumber: number;
    supportsFinalGuess: boolean;
  },
): ModuleLoopResultEffectOption[] {
  const setId = G.scriptOpen?.tragedySetId;
  if (!setId) return [];

  return officialModuleManifests.flatMap((manifest) => {
    if (getManifestTragedySetId(manifest) !== setId) {
      return [];
    }
    return manifest.loopResultEffects?.collect?.({
      G,
      currentLoopNumber: options.currentLoopNumber,
      supportsFinalGuess: options.supportsFinalGuess,
    }) ?? [];
  });
}

export function applyModuleLoopResultEffects(
  G: TragedyGameState,
  effectIds: string[],
  options: {
    currentLoopNumber: number;
    supportsFinalGuess: boolean;
  },
): string[] {
  const setId = G.scriptOpen?.tragedySetId;
  if (!setId || effectIds.length === 0) return [];

  const manifests = officialModuleManifests.filter(
    (manifest) => getManifestTragedySetId(manifest) === setId,
  );
  const applied: string[] = [];

  for (const effectId of effectIds) {
    let handled = false;
    for (const manifest of manifests) {
      const result = manifest.loopResultEffects?.apply?.({
        G,
        effectId,
        currentLoopNumber: options.currentLoopNumber,
        supportsFinalGuess: options.supportsFinalGuess,
      });
      if (result) {
        handled = true;
        break;
      }
    }
    if (handled) {
      applied.push(effectId);
    }
  }

  return applied;
}
