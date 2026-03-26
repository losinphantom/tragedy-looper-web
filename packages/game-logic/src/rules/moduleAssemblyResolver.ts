import { TRAGEDY_SETS, getIncidentById, getPlotById, getRoleById } from '@tragedy/domain';
import type { LocalizedScriptDef, ScriptDef } from '@tragedy/domain';

import type { ModuleManifest } from './moduleManifest';
import { officialModuleManifests } from './modules';
import { dimensionShiftIncidentDefinition } from './incidents/dimensionShiftIncidentDefinition';
import { hospitalIncidentDefinition } from './incidents/hospitalIncidentDefinition';
import { murderIncidentDefinition } from './incidents/murderIncidentDefinition';
import type { IncidentDefinition } from './incidents/incidentDefinition';
import { createIncidentDefinition } from './incidents/incidentDefinition';
import { impulseMurderIncidentDefinition } from './incidents/impulseMurderIncidentDefinition';
import { lastWillIncidentDefinition } from './incidents/lastWillIncidentDefinition';
import type { PlotDefinition } from './plots/plotDefinition';
import { createPlotDefinition } from './plots/plotDefinition';
import { dimensionTravelerRoleDefinition } from './roles/dimensionTravelerRoleDefinition';
import { fragmentRoleDefinition } from './roles/fragmentRoleDefinition';
import { keyPersonRoleDefinition } from './roles/keyPersonRoleDefinition';
import { obsessiveRoleDefinition } from './roles/obsessiveRoleDefinition';
import type { RoleDefinition } from './roles/roleDefinition';
import { createRoleDefinition } from './roles/roleDefinition';
import { storytellerRoleDefinition } from './roles/storytellerRoleDefinition';

function buildDefinitionKey(setId: string, id: string): string {
  return `${setId}:${id}`;
}

function notNull<T>(value: T | undefined): value is T {
  return value !== undefined;
}

const roleDefinitionRegistry = new Map<string, RoleDefinition>([
  [buildDefinitionKey('basic_tragedy', 'key_person'), keyPersonRoleDefinition],
  [buildDefinitionKey('another_horizon_revised', 'obsessive'), obsessiveRoleDefinition],
  [buildDefinitionKey('another_horizon_revised', 'storyteller'), storytellerRoleDefinition],
  [buildDefinitionKey('another_horizon_revised', 'dimension_traveler'), dimensionTravelerRoleDefinition],
  [buildDefinitionKey('another_horizon_revised', 'fragment'), fragmentRoleDefinition],
]);

const incidentDefinitionRegistry = new Map<string, IncidentDefinition>([
  [buildDefinitionKey('basic_tragedy', 'murder'), murderIncidentDefinition],
  [buildDefinitionKey('another_horizon_revised', 'impulse_murder'), impulseMurderIncidentDefinition],
  [buildDefinitionKey('another_horizon_revised', 'dimension_shift'), dimensionShiftIncidentDefinition],
  [buildDefinitionKey('another_horizon_revised', 'hospital_incident'), hospitalIncidentDefinition],
  [buildDefinitionKey('another_horizon_revised', 'last_will'), lastWillIncidentDefinition],
]);

export interface ResolvedModuleAssembly {
  manifest: ModuleManifest;
  tragedySetId: string;
  roleIds: string[];
  incidentIds: string[];
  plotIds: string[];
  moduleSpecialRuleIds: string[];
  scriptIds: string[];
  roleDefinitions: RoleDefinition[];
  incidentDefinitions: IncidentDefinition[];
  plotDefinitions: PlotDefinition[];
}

export interface ManifestResourceScope {
  manifest: ModuleManifest;
  moduleId: string;
  tragedySetId: string;
  roleIds: string[];
  incidentIds: string[];
  plotIds: string[];
  moduleSpecialRuleIds: string[];
  scriptIds: string[];
}

type AnyScriptDef = ScriptDef | LocalizedScriptDef;

export interface ManifestOwnedScriptLookup {
  manifest?: ModuleManifest;
  scope?: ManifestResourceScope;
  status: 'compliant' | 'manual-only-transitional' | 'invalid';
  reasonCodes: string[];
}

export function getManifestTragedySetId(manifest: ModuleManifest): string {
  return manifest.tragedySetId ?? manifest.moduleId.replace(/-/g, '_');
}

export function getOfficialModuleManifestBySetId(tragedySetId: string): ModuleManifest | undefined {
  return officialModuleManifests.find(manifest => getManifestTragedySetId(manifest) === tragedySetId);
}

export function getOfficialModuleManifestByModuleId(moduleId: string): ModuleManifest | undefined {
  return officialModuleManifests.find(manifest => manifest.moduleId === moduleId);
}

export function resolveManifestResourceScope(manifest: ModuleManifest): ManifestResourceScope {
  const tragedySetId = getManifestTragedySetId(manifest);
  const resourcePool = manifest.resourcePool;
  const moduleSpecialRuleIds = resourcePool?.moduleSpecialRuleIds
    ?? manifest.moduleSpecialRuleIds
    ?? (TRAGEDY_SETS[tragedySetId]?.specialRules ?? []).flatMap(group => group.rules.map(rule => rule.id));

  return {
    manifest,
    moduleId: manifest.moduleId,
    tragedySetId,
    roleIds: resourcePool?.roleIds ?? manifest.roleIds ?? [],
    incidentIds: resourcePool?.incidentIds ?? manifest.incidentIds ?? [],
    plotIds: resourcePool?.plotIds ?? manifest.plotIds ?? [],
    moduleSpecialRuleIds,
    scriptIds: resourcePool?.scriptIds ?? manifest.scriptIds ?? [],
  };
}

export function resolveManifestOwnedScriptLookup(script: AnyScriptDef): ManifestOwnedScriptLookup {
  const manifest = script.moduleId
    ? getOfficialModuleManifestByModuleId(script.moduleId) ?? getOfficialModuleManifestBySetId(script.tragedySetId)
    : getOfficialModuleManifestBySetId(script.tragedySetId);

  if (!manifest) {
    return {
      status: 'manual-only-transitional',
      reasonCodes: ['transitional_registration_path'],
    };
  }

  const scope = resolveManifestResourceScope(manifest);
  const reasonCodes: string[] = [];
  const roleIds = new Set(scope.roleIds);
  const incidentIds = new Set(scope.incidentIds);
  const plotIds = new Set(scope.plotIds);
  const moduleSpecialRuleIds = new Set(scope.moduleSpecialRuleIds);

  if (!script.id || !scope.scriptIds.includes(script.id)) {
    reasonCodes.push('script_missing_from_owning_module_script_ids', 'transitional_registration_path');
  }
  if ([script.mainPlotId, ...script.subplotIds].some(plotId => !plotIds.has(plotId))) {
    reasonCodes.push('resource_outside_module_plot_pool');
  }
  if (script.cast.some(entry => entry.roleId && entry.roleId !== 'person' && !roleIds.has(entry.roleId))) {
    reasonCodes.push('resource_outside_module_role_pool');
  }
  if (script.incidents.some(entry => !incidentIds.has(entry.incidentId))) {
    reasonCodes.push('resource_outside_module_incident_pool');
  }

  const scriptSpecialRuleIds = (script.scriptSpecialRules ?? script.specialRules ?? [])
    .map(rule => typeof rule === 'string' ? rule : rule?.id)
    .filter((ruleId): ruleId is string => Boolean(ruleId));
  if (scriptSpecialRuleIds.some(ruleId => moduleSpecialRuleIds.has(ruleId))) {
    reasonCodes.push('special_rule_layering_mismatch');
  }

  const dedupedReasonCodes = [...new Set(reasonCodes)];
  const status = dedupedReasonCodes.some(reasonCode => [
    'resource_outside_module_plot_pool',
    'resource_outside_module_role_pool',
    'resource_outside_module_incident_pool',
    'special_rule_layering_mismatch',
  ].includes(reasonCode))
    ? 'invalid'
    : dedupedReasonCodes.length > 0
      ? 'manual-only-transitional'
      : 'compliant';

  return {
    manifest,
    scope,
    status,
    reasonCodes: dedupedReasonCodes,
  };
}

export function resolveRoleDefinition(tragedySetId: string, roleId: string): RoleDefinition | undefined {
  const registryMatch = roleDefinitionRegistry.get(buildDefinitionKey(tragedySetId, roleId));
  if (registryMatch) return registryMatch;

  const record = getRoleById(tragedySetId, roleId);
  if (!record) return undefined;
  return createRoleDefinition(record, `domain:roles/${tragedySetId}/${roleId}`);
}

export function resolveIncidentDefinition(tragedySetId: string, incidentId: string): IncidentDefinition | undefined {
  const registryMatch = incidentDefinitionRegistry.get(buildDefinitionKey(tragedySetId, incidentId));
  if (registryMatch) return registryMatch;

  const record = getIncidentById(tragedySetId, incidentId);
  if (!record) return undefined;
  return createIncidentDefinition(record, `domain:incidents/${tragedySetId}/${incidentId}`);
}

export function resolvePlotDefinition(tragedySetId: string, plotId: string): PlotDefinition | undefined {
  const record = getPlotById(tragedySetId, plotId);
  if (!record) return undefined;
  return createPlotDefinition(record, `domain:plots/${tragedySetId}/${plotId}`);
}

export function resolveModuleAssembly(manifest: ModuleManifest): ResolvedModuleAssembly {
  const scope = resolveManifestResourceScope(manifest);
  const { tragedySetId, roleIds, incidentIds, plotIds, moduleSpecialRuleIds, scriptIds } = scope;

  return {
    manifest,
    tragedySetId,
    roleIds,
    incidentIds,
    plotIds,
    moduleSpecialRuleIds,
    scriptIds,
    roleDefinitions: roleIds.map(roleId => resolveRoleDefinition(tragedySetId, roleId)).filter(notNull),
    incidentDefinitions: incidentIds.map(incidentId => resolveIncidentDefinition(tragedySetId, incidentId)).filter(notNull),
    plotDefinitions: plotIds.map(plotId => resolvePlotDefinition(tragedySetId, plotId)).filter(notNull),
  };
}

export function resolveRoleDefinitionFromManifest(
  manifest: ModuleManifest | undefined,
  tragedySetId: string,
  roleId: string,
): RoleDefinition | undefined {
  if (!manifest) return undefined;
  if (!resolveManifestResourceScope(manifest).roleIds.includes(roleId)) return undefined;
  return resolveRoleDefinition(tragedySetId, roleId);
}

export function resolveIncidentDefinitionFromManifest(
  manifest: ModuleManifest | undefined,
  tragedySetId: string,
  incidentId: string,
): IncidentDefinition | undefined {
  if (!manifest) return undefined;
  if (!resolveManifestResourceScope(manifest).incidentIds.includes(incidentId)) return undefined;
  return resolveIncidentDefinition(tragedySetId, incidentId);
}

export function resolvePlotDefinitionFromManifest(
  manifest: ModuleManifest | undefined,
  tragedySetId: string,
  plotId: string,
): PlotDefinition | undefined {
  if (!manifest) return undefined;
  if (!resolveManifestResourceScope(manifest).plotIds.includes(plotId)) return undefined;
  return resolvePlotDefinition(tragedySetId, plotId);
}
