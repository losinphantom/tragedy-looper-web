import type { RuleProcessor } from '../ruleEngine';
import type {
  ModuleGoodwillResolutionHook,
  ModuleGoodwillTargetSlotBuilder,
  ModuleGoodwillTraitOverrideHook,
  ModulePendingGoodwillCollector,
} from './moduleGoodwill';
import type { ModuleIncidentTriggerHook } from './moduleIncident';
import type { ModuleInteractionDescriptors } from './moduleInteraction';
import type { ModuleLifecycleHooks, ModuleLoopResultEffects } from './moduleLifecycle';

export type ModuleManifestAuditSurface =
  | 'processors'
  | 'scriptIds'
  | 'goodwillHooks.afterResolve'
  | 'goodwillHooks.traitOverrides'
  | 'goodwillHooks.leaderTargetSlots'
  | 'goodwillHooks.collectPendingAbilities'
  | 'incidentHooks.after_presence'
  | 'incidentHooks.before_threshold'
  | 'lifecycleHooks'
  | 'loopResultEffects'
  | 'interactionDescriptors';

export type ModuleManifestHookAuditSurface = Exclude<
  ModuleManifestAuditSurface,
  'processors' | 'scriptIds' | 'lifecycleHooks' | 'interactionDescriptors'
>;

export interface ModuleManifestResourcePool {
  roleIds?: string[];
  incidentIds?: string[];
  plotIds?: string[];
  moduleSpecialRuleIds?: string[];
  scriptIds?: string[];
}

export interface ModuleManifest {
  moduleId: string;
  tragedySetId?: string;
  /**
   * Assembly-by-reference fields.
   * Modules should prefer referencing reusable rule objects instead of
   * implicitly "owning" implementations through processor buckets.
   */
  resourcePool?: ModuleManifestResourcePool;
  roleIds?: string[];
  incidentIds?: string[];
  plotIds?: string[];
  scriptIds?: string[];
  moduleSpecialRuleIds?: string[];
  /**
   * Transitional compatibility bucket.
   * Keep this only while live processor registration still depends on the
   * legacy processor catalogs.
   */
  processors: {
    plots: RuleProcessor[];
    roles: RuleProcessor[];
    incidents: RuleProcessor[];
  };
  goodwillHooks?: {
    afterResolve?: ModuleGoodwillResolutionHook[];
    traitOverrides?: ModuleGoodwillTraitOverrideHook[];
    leaderTargetSlots?: ModuleGoodwillTargetSlotBuilder[];
    collectPendingAbilities?: ModulePendingGoodwillCollector[];
  };
  incidentHooks?: {
    after_presence?: ModuleIncidentTriggerHook[];
    before_threshold?: ModuleIncidentTriggerHook[];
  };
  lifecycleHooks?: ModuleLifecycleHooks;
  loopResultEffects?: ModuleLoopResultEffects;
  interactionDescriptors?: ModuleInteractionDescriptors;
  capabilities?: string[];
  scriptHooks?: Record<string, unknown>;
  assets?: Record<string, unknown>;
  uiAdapters?: Record<string, unknown>;
}
