import type { RuleProcessor } from '../ruleEngine';
import type { ModuleManifest } from './moduleManifest';
import type { ModuleLifecycleHook, ModuleLifecyclePoint } from './moduleLifecycle';

export function registerModuleManifests<T extends readonly ModuleManifest[]>(manifests: T): T {
  return manifests;
}

export function collectModuleProcessors(manifests: readonly ModuleManifest[]): RuleProcessor[] {
  const processorsByRuleId = new Map<string, RuleProcessor>();

  for (const manifest of manifests) {
    for (const processor of [
      ...manifest.processors.plots,
      ...manifest.processors.roles,
      ...manifest.processors.incidents,
    ]) {
      // Shared canonical processors can appear in multiple module manifests.
      // Keep a single registration entry per ruleId so the global registry
      // retains the same one-processor-per-rule contract as the old catalog bridge.
      if (!processorsByRuleId.has(processor.ruleId)) {
        processorsByRuleId.set(processor.ruleId, processor);
      }
    }
  }

  return [...processorsByRuleId.values()];
}

export function getManifestTragedySetId(manifest: ModuleManifest): string {
  return manifest.tragedySetId ?? manifest.moduleId.replace(/-/g, '_');
}

export function collectModuleLifecycleHooks(
  manifests: readonly ModuleManifest[],
  tragedySetId: string,
  point: ModuleLifecyclePoint,
): ModuleLifecycleHook[] {
  return manifests.flatMap((manifest) => {
    const manifestSetId = getManifestTragedySetId(manifest);
    if (manifestSetId !== tragedySetId) {
      return [];
    }
    return manifest.lifecycleHooks?.[point] ?? [];
  });
}
