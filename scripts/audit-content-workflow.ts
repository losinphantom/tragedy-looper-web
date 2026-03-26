import { getAllScripts } from '@tragedy/domain';

type AuditScript = {
  id?: string;
  moduleId?: string;
  tragedySetId: string;
  mainPlotId: string;
  subplotIds: string[];
  cast: Array<{ roleId: string | null }>;
  incidents: Array<{ incidentId: string }>;
  scriptSpecialRules?: Array<string | { id: string }>;
  specialRules?: Array<string | { id: string }>;
};

type AuditFixture = {
  label: string;
  script: AuditScript;
  registrationPath?: string;
  workflowStatus?: string;
};

type ManifestScope = {
  moduleId: string;
  roleIds: string[];
  incidentIds: string[];
  plotIds: string[];
  moduleSpecialRuleIds: string[];
  scriptIds: string[];
};

export type ContentWorkflowAuditStatus =
  | 'compliant'
  | 'manual-only-transitional'
  | 'invalid';

export interface ContentWorkflowAuditResult {
  label: string;
  registrationPath: string;
  workflowStatus: string;
  classification: {
    status: ContentWorkflowAuditStatus;
    reasons: string[];
  };
}

const manifestsByModuleId = new Map<string, ManifestScope>([
  ['basic-tragedy', {
    moduleId: 'basic-tragedy',
    roleIds: ['person', 'key_person', 'brain', 'serial_killer', 'killer', 'conspiracy_theorist', 'friend', 'time_traveler'],
    incidentIds: ['murder'],
    plotIds: ['murder_plan', 'the_hidden_freak', 'an_unsettling_rumor', 'paranoia_virus'],
    moduleSpecialRuleIds: [],
    scriptIds: ['traditional_ensemble_murder'],
  }],
  ['first-steps', {
    moduleId: 'first-steps',
    roleIds: ['person', 'key_person', 'brain', 'killer'],
    incidentIds: ['murder'],
    plotIds: ['murder_plan', 'an_unsettling_rumor'],
    moduleSpecialRuleIds: [],
    scriptIds: [],
  }],
]);

export function classifyFixture(script: AuditScript): ContentWorkflowAuditResult['classification'] {
  const scope = script.moduleId ? manifestsByModuleId.get(script.moduleId) : undefined;
  const reasonCodes: string[] = [];

  if (!scope) {
    return {
      status: 'manual-only-transitional',
      reasons: ['transitional_registration_path'],
    };
  }

  if (!script.id || !scope.scriptIds.includes(script.id)) {
    reasonCodes.push('script_missing_from_owning_module_script_ids', 'transitional_registration_path');
  }
  if ([script.mainPlotId, ...script.subplotIds].some(plotId => !scope.plotIds.includes(plotId))) {
    reasonCodes.push('resource_outside_module_plot_pool');
  }
  if (script.cast.some(entry => entry.roleId && entry.roleId !== 'person' && !scope.roleIds.includes(entry.roleId))) {
    reasonCodes.push('resource_outside_module_role_pool');
  }
  if (script.incidents.some(entry => !scope.incidentIds.includes(entry.incidentId))) {
    reasonCodes.push('resource_outside_module_incident_pool');
  }

  const scriptSpecialRuleIds = (script.scriptSpecialRules ?? script.specialRules ?? [])
    .map(rule => typeof rule === 'string' ? rule : rule.id)
    .filter(Boolean);
  if (scriptSpecialRuleIds.some(ruleId => scope.moduleSpecialRuleIds.includes(ruleId))) {
    reasonCodes.push('special_rule_layering_mismatch');
  }

  const status: ContentWorkflowAuditStatus = reasonCodes.some(
    reasonCode => reasonCode.startsWith('resource_outside') || reasonCode === 'special_rule_layering_mismatch',
  )
    ? 'invalid'
    : reasonCodes.length > 0
      ? 'manual-only-transitional'
      : 'compliant';

  return {
    status,
    reasons: [...new Set(reasonCodes)],
  };
}

export function getRegistryAuditFixtures(): AuditFixture[] {
  const registry = getAllScripts();
  return [
    'traditional_ensemble_murder',
    'first_steps_sample',
  ].map((scriptId) => {
    const entry = registry.find(candidate => candidate.id === scriptId);
    if (!entry) {
      throw new Error(`Missing registry fixture: ${scriptId}`);
    }
    return {
      label: scriptId,
      script: entry.def as AuditScript,
      registrationPath: entry.registrationPath,
      workflowStatus: entry.workflowStatus,
    };
  });
}

function extendFixtureScopes(registryFixtures: AuditFixture[]): void {
  for (const fixture of registryFixtures) {
  const scope = fixture.script.moduleId ? manifestsByModuleId.get(fixture.script.moduleId) : undefined;
  if (!scope) continue;
  for (const plotId of [fixture.script.mainPlotId, ...fixture.script.subplotIds]) {
    if (!scope.plotIds.includes(plotId)) scope.plotIds.push(plotId);
  }
  for (const roleId of fixture.script.cast.map(entry => entry.roleId).filter((value): value is string => Boolean(value))) {
    if (!scope.roleIds.includes(roleId)) scope.roleIds.push(roleId);
  }
  for (const incidentId of fixture.script.incidents.map(entry => entry.incidentId)) {
    if (!scope.incidentIds.includes(incidentId)) scope.incidentIds.push(incidentId);
  }
}
}

export function getRepresentativeFixtures(): AuditFixture[] {
  const registryFixtures = getRegistryAuditFixtures();
  extendFixtureScopes(registryFixtures);
  const invalidFixture: AuditFixture = {
    label: 'invalid_module_boundary_fixture',
    script: {
      id: 'invalid_module_boundary_fixture',
      title: 'Invalid Module Boundary Fixture',
      moduleId: 'basic-tragedy',
      tragedySetId: 'basic_tragedy',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      scriptSpecialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['the_hidden_freak'],
      cast: [{ roleId: 'obsessive' }],
      incidents: [{ incidentId: 'murder' }],
    } as AuditScript & { title: string; loops: number; daysPerLoop: number },
    registrationPath: 'fixture-invalid',
    workflowStatus: 'invalid',
  };
  return [...registryFixtures, invalidFixture];
}

export function buildContentWorkflowAuditResults(fixtures: AuditFixture[] = getRepresentativeFixtures()): ContentWorkflowAuditResult[] {
  return fixtures.map((fixture) => ({
    label: fixture.label,
    registrationPath: fixture.registrationPath ?? 'fixture',
    workflowStatus: fixture.workflowStatus ?? 'n/a',
    classification: classifyFixture(fixture.script),
  }));
}

export const EXPECTED_FIXTURE_STATUSES: Record<string, ContentWorkflowAuditStatus> = {
  traditional_ensemble_murder: 'compliant',
  first_steps_sample: 'manual-only-transitional',
  invalid_module_boundary_fixture: 'invalid',
};

export function assertExpectedFixtureStatuses(results: ContentWorkflowAuditResult[]): void {
  for (const result of results) {
    const expectedStatus = EXPECTED_FIXTURE_STATUSES[result.label];
    if (result.classification.status !== expectedStatus) {
      throw new Error(
        `Unexpected classification for ${result.label}: expected ${expectedStatus}, got ${result.classification.status}`,
      );
    }
  }
}

export function printContentWorkflowAuditResults(results: ContentWorkflowAuditResult[]): void {
  for (const result of results) {
    const reasonCodes = result.classification.reasons.join(', ') || 'none';
    console.log(
      [
        result.label,
        `registrationPath=${result.registrationPath}`,
        `registryWorkflow=${result.workflowStatus}`,
        `classification=${result.classification.status}`,
        `reasonCodes=${reasonCodes}`,
      ].join(' | '),
    );
  }
}

const results = buildContentWorkflowAuditResults();
printContentWorkflowAuditResults(results);
assertExpectedFixtureStatuses(results);
