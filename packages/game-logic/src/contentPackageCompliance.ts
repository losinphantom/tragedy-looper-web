import type { LocalizedScriptDef, ScriptDef } from '@tragedy/domain';

import {
  getOfficialModuleManifestByModuleId,
  getOfficialModuleManifestBySetId,
  resolveManifestResourceScope,
  type ManifestResourceScope,
} from './rules/moduleAssemblyResolver';

type AnyScriptDef = ScriptDef | LocalizedScriptDef;

export type ContentPackageComplianceStatus =
  | 'compliant'
  | 'manual-only-transitional'
  | 'invalid';

export type ContentPackageComplianceReasonCode =
  | 'script_missing_from_owning_module_script_ids'
  | 'resource_outside_module_role_pool'
  | 'resource_outside_module_incident_pool'
  | 'resource_outside_module_plot_pool'
  | 'transitional_registration_path'
  | 'special_rule_layering_mismatch';

export interface ContentPackageComplianceReason {
  reasonCode: ContentPackageComplianceReasonCode;
  detail: string;
}

export interface ContentPackageComplianceResult {
  status: ContentPackageComplianceStatus;
  moduleId: string | null;
  scope?: ManifestResourceScope;
  reasons: ContentPackageComplianceReason[];
}

function normalizeScriptSpecialRuleIds(script: AnyScriptDef): string[] {
  return (script.scriptSpecialRules ?? script.specialRules ?? [])
    .map(rule => typeof rule === 'string' ? rule : rule?.id)
    .filter((ruleId): ruleId is string => Boolean(ruleId));
}

function buildRoleOutsidePoolReasons(script: AnyScriptDef, scope: ManifestResourceScope): ContentPackageComplianceReason[] {
  const roleIds = new Set(scope.roleIds);
  return script.cast
    .map(entry => entry.roleId)
    .filter((roleId): roleId is string => typeof roleId === 'string' && roleId !== 'person')
    .filter(roleId => !roleIds.has(roleId))
    .map(roleId => ({
      reasonCode: 'resource_outside_module_role_pool' as const,
      detail: `roleId=${roleId}`,
    }));
}

function buildIncidentOutsidePoolReasons(script: AnyScriptDef, scope: ManifestResourceScope): ContentPackageComplianceReason[] {
  const incidentIds = new Set(scope.incidentIds);
  return script.incidents
    .map(entry => entry.incidentId)
    .filter(incidentId => !incidentIds.has(incidentId))
    .map(incidentId => ({
      reasonCode: 'resource_outside_module_incident_pool' as const,
      detail: `incidentId=${incidentId}`,
    }));
}

function buildPlotOutsidePoolReasons(script: AnyScriptDef, scope: ManifestResourceScope): ContentPackageComplianceReason[] {
  const plotIds = new Set(scope.plotIds);
  return [script.mainPlotId, ...script.subplotIds]
    .filter(plotId => !plotIds.has(plotId))
    .map(plotId => ({
      reasonCode: 'resource_outside_module_plot_pool' as const,
      detail: `plotId=${plotId}`,
    }));
}

function buildSpecialRuleLayeringReasons(script: AnyScriptDef, scope: ManifestResourceScope): ContentPackageComplianceReason[] {
  const moduleSpecialRuleIds = new Set(scope.moduleSpecialRuleIds);
  return normalizeScriptSpecialRuleIds(script)
    .filter(ruleId => moduleSpecialRuleIds.has(ruleId))
    .map(ruleId => ({
      reasonCode: 'special_rule_layering_mismatch' as const,
      detail: `ruleId=${ruleId}`,
    }));
}

export function classifyContentPackage(script: AnyScriptDef): ContentPackageComplianceResult {
  const moduleId = script.moduleId ?? null;
  const manifest = moduleId
    ? getOfficialModuleManifestByModuleId(moduleId) ?? getOfficialModuleManifestBySetId(script.tragedySetId)
    : getOfficialModuleManifestBySetId(script.tragedySetId);

  if (!manifest) {
    return {
      status: 'manual-only-transitional',
      moduleId,
      reasons: [
        {
          reasonCode: 'transitional_registration_path',
          detail: `no official module manifest for tragedySetId=${script.tragedySetId}`,
        },
      ],
    };
  }

  const scope = resolveManifestResourceScope(manifest);
  const reasons: ContentPackageComplianceReason[] = [];

  if (!script.id || !scope.scriptIds.includes(script.id)) {
    reasons.push({
      reasonCode: 'script_missing_from_owning_module_script_ids',
      detail: `scriptId=${script.id ?? '(missing id)'}`,
    });
    reasons.push({
      reasonCode: 'transitional_registration_path',
      detail: `scriptId=${script.id ?? '(missing id)'} resolves outside manifest scriptIds`,
    });
  }

  reasons.push(...buildPlotOutsidePoolReasons(script, scope));
  reasons.push(...buildRoleOutsidePoolReasons(script, scope));
  reasons.push(...buildIncidentOutsidePoolReasons(script, scope));
  reasons.push(...buildSpecialRuleLayeringReasons(script, scope));

  // scriptIds 不匹配仅作为日志记录，不阻止结算模式
  // 只有 resource pool 不匹配才会降级
  const blockingReasons = reasons.filter(r =>
    r.reasonCode !== 'script_missing_from_owning_module_script_ids'
    && r.reasonCode !== 'transitional_registration_path',
  );

  const status: ContentPackageComplianceStatus = blockingReasons.some(reason =>
    reason.reasonCode === 'resource_outside_module_role_pool'
    || reason.reasonCode === 'resource_outside_module_incident_pool'
    || reason.reasonCode === 'resource_outside_module_plot_pool'
    || reason.reasonCode === 'special_rule_layering_mismatch',
  )
    ? 'invalid'
    : blockingReasons.length > 0
      ? 'manual-only-transitional'
      : 'compliant';

  return {
    status,
    moduleId: scope.moduleId,
    scope,
    reasons,
  };
}
