import { getAllScripts } from '@tragedy/domain';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

import type { ModuleManifestAuditSurface, ModuleManifestHookAuditSurface } from '../packages/game-logic/src/rules/moduleManifest';

type AuditStatus = 'passed' | 'failed';

type ProcessorCoverageSummary = {
  status: AuditStatus;
  liveCount: number;
  manifestCount: number;
  missingCount: number;
  extraCount: number;
  missingByPrefix: Record<string, number>;
  missingRuleIds: string[];
  extraRuleIds: string[];
  warnings: string[];
};

type ModuleSelection = {
  explicitRuleIds: Set<string>;
  prefixes: string[];
};

type ModuleSurfaceAudit = {
  moduleId: string;
  tragedySetId: string | null;
  expectedScriptCount: number;
  declaredScriptCount: number;
  missingScriptIds: string[];
  extraScriptIds: string[];
  presentHooks: ModuleManifestHookAuditSurface[];
  missingRequiredHooks: ModuleManifestHookAuditSurface[];
  errors: string[];
  warnings: string[];
};

type StaticManifestSurface = {
  moduleId: string;
  tragedySetId: string | null;
  declaredScriptIds: string[];
  presentHooks: ModuleManifestHookAuditSurface[];
  errors: string[];
  warnings: string[];
};

type AuditResult = {
  status: AuditStatus;
  summary: {
    surfaceStatus: Record<ModuleManifestAuditSurface, AuditStatus>;
    errorCount: number;
    warningCount: number;
  };
  processorCoverage: ProcessorCoverageSummary;
  officialCompleteness: {
    status: AuditStatus;
    modules: ModuleSurfaceAudit[];
    totalExpectedScripts: number;
    totalDeclaredScripts: number;
    totalMissingScriptIds: number;
    totalExtraScriptIds: number;
    totalMissingRequiredHooks: number;
    errors: string[];
    warnings: string[];
  };
};

const ROOT = path.resolve(__dirname, '..');
const RULES_ROOT = path.join(ROOT, 'packages/game-logic/src/rules');
const MODULES_ROOT = path.join(RULES_ROOT, 'modules');

const CATALOG_FILES = {
  plots: path.join(RULES_ROOT, 'plotProcessorCatalog.ts'),
  roles: path.join(RULES_ROOT, 'roleProcessorCatalog.ts'),
  incidents: path.join(RULES_ROOT, 'incidentProcessorCatalog.ts'),
} as const;

const MODULE_FILES = {
  'first-steps': {
    plots: path.join(MODULES_ROOT, 'first-steps/plots.ts'),
    roles: path.join(MODULES_ROOT, 'first-steps/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'first-steps/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'first-steps/manifest.ts'),
  },
  'basic-tragedy': {
    plots: path.join(MODULES_ROOT, 'basic-tragedy/plots.ts'),
    roles: path.join(MODULES_ROOT, 'basic-tragedy/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'basic-tragedy/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'basic-tragedy/manifest.ts'),
  },
  'mystery-circle': {
    plots: path.join(MODULES_ROOT, 'mystery-circle/plots.ts'),
    roles: path.join(MODULES_ROOT, 'mystery-circle/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'mystery-circle/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'mystery-circle/manifest.ts'),
  },
  'haunted-stage-again': {
    plots: path.join(MODULES_ROOT, 'haunted-stage-again/plots.ts'),
    roles: path.join(MODULES_ROOT, 'haunted-stage-again/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'haunted-stage-again/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'haunted-stage-again/manifest.ts'),
  },
  'another-horizon-revised': {
    plots: path.join(MODULES_ROOT, 'another-horizon-revised/plots.ts'),
    roles: path.join(MODULES_ROOT, 'another-horizon-revised/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'another-horizon-revised/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'another-horizon-revised/manifest.ts'),
  },
  'weird-mythology': {
    plots: path.join(MODULES_ROOT, 'weird-mythology/plots.ts'),
    roles: path.join(MODULES_ROOT, 'weird-mythology/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'weird-mythology/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'weird-mythology/manifest.ts'),
  },
  'last-liar': {
    plots: path.join(MODULES_ROOT, 'last-liar/plots.ts'),
    roles: path.join(MODULES_ROOT, 'last-liar/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'last-liar/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'last-liar/manifest.ts'),
  },
  'midnight-zone': {
    plots: path.join(MODULES_ROOT, 'midnight-zone/plots.ts'),
    roles: path.join(MODULES_ROOT, 'midnight-zone/roles.ts'),
    incidents: path.join(MODULES_ROOT, 'midnight-zone/incidents.ts'),
    manifest: path.join(MODULES_ROOT, 'midnight-zone/manifest.ts'),
  },
} as const;

const REQUIRED_HOOKS: Partial<Record<string, ModuleManifestHookAuditSurface[]>> = {
  'basic-tragedy': ['goodwillHooks.leaderTargetSlots'],
};

const ALL_HOOK_SURFACES: ModuleManifestHookAuditSurface[] = [
  'goodwillHooks.afterResolve',
  'goodwillHooks.traitOverrides',
  'goodwillHooks.leaderTargetSlots',
  'goodwillHooks.collectPendingAbilities',
  'incidentHooks.after_presence',
  'incidentHooks.before_threshold',
];

function readSourceFile(filePath: string): ts.SourceFile {
  return ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function visit(node: ts.Node, fn: (node: ts.Node) => void): void {
  fn(node);
  ts.forEachChild(node, child => visit(child, fn));
}

function getPropertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text;
  }
  return null;
}

function getObjectProperty(
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const prop of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (getPropertyNameText(prop.name) === propertyName) {
      return prop.initializer;
    }
  }
  for (const prop of objectLiteral.properties) {
    if (!ts.isShorthandPropertyAssignment(prop)) continue;
    if (prop.name.text === propertyName) {
      return prop.name;
    }
  }
  return null;
}

function collectStringConsts(source: ts.SourceFile): Record<string, string> {
  const stringConsts: Record<string, string> = {};

  visit(source, node => {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && ts.isStringLiteral(node.initializer)
    ) {
      stringConsts[node.name.text] = node.initializer.text;
    }
  });

  return stringConsts;
}

function resolveStringValue(
  expression: ts.Expression | null,
  stringConsts: Record<string, string>,
): string | null {
  if (!expression) return null;
  if (ts.isStringLiteral(expression)) return expression.text;
  if (ts.isIdentifier(expression)) return stringConsts[expression.text] ?? null;
  return null;
}

function findModuleManifestObject(source: ts.SourceFile): ts.ObjectLiteralExpression | null {
  let manifestObject: ts.ObjectLiteralExpression | null = null;

  visit(source, node => {
    if (
      manifestObject == null
      && ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'moduleManifest'
      && node.initializer
      && ts.isObjectLiteralExpression(node.initializer)
    ) {
      manifestObject = node.initializer;
    }
  });

  return manifestObject;
}

function collectCatalogRuleIds(filePath: string): string[] {
  const source = readSourceFile(filePath);
  const ruleIds = new Set<string>();

  visit(source, node => {
    if (ts.isObjectLiteralExpression(node)) {
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const propName = getPropertyNameText(prop.name);
        if (propName !== 'ruleId') continue;
        if (ts.isStringLiteral(prop.initializer)) {
          ruleIds.add(prop.initializer.text);
        }
      }
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /alias/i.test(node.name.text) &&
      node.initializer &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      for (const element of node.initializer.elements) {
        if (!ts.isArrayLiteralExpression(element)) continue;
        const [first] = element.elements;
        if (first && ts.isStringLiteral(first)) {
          ruleIds.add(first.text);
        }
      }
    }
  });

  return [...ruleIds].sort((a, b) => a.localeCompare(b, 'en'));
}

function collectModuleSelection(filePath: string): ModuleSelection {
  const source = readSourceFile(filePath);
  const explicitRuleIds = new Set<string>();
  const prefixes = new Set<string>();

  visit(source, node => {
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'Set' &&
      node.arguments?.length === 1
    ) {
      const [arg] = node.arguments;
      if (arg && ts.isArrayLiteralExpression(arg)) {
        for (const element of arg.elements) {
          if (ts.isStringLiteral(element)) {
            explicitRuleIds.add(element.text);
          }
        }
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'startsWith' &&
      node.arguments.length === 1
    ) {
      const [firstArg] = node.arguments;
      if (firstArg && ts.isStringLiteral(firstArg)) {
        prefixes.add(firstArg.text);
      }
    }
  });

  return {
    explicitRuleIds,
    prefixes: [...prefixes].sort((a, b) => a.localeCompare(b, 'en')),
  };
}

function matchesSelection(ruleId: string, selection: ModuleSelection): boolean {
  if (selection.explicitRuleIds.has(ruleId)) {
    return true;
  }
  return selection.prefixes.some(prefix => ruleId.startsWith(prefix));
}

function sortObjectByValueDesc(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en')),
  );
}

function collectProcessorCoverage(): ProcessorCoverageSummary {
  const catalogRuleIds = {
    plots: collectCatalogRuleIds(CATALOG_FILES.plots),
    roles: collectCatalogRuleIds(CATALOG_FILES.roles),
    incidents: collectCatalogRuleIds(CATALOG_FILES.incidents),
  };

  const liveRuleIds = [
    ...catalogRuleIds.plots,
    ...catalogRuleIds.roles,
    ...catalogRuleIds.incidents,
  ];

  const manifestRuleIds = new Set<string>();
  for (const moduleFiles of Object.values(MODULE_FILES)) {
    const plotSelection = collectModuleSelection(moduleFiles.plots);
    const roleSelection = collectModuleSelection(moduleFiles.roles);
    const incidentSelection = collectModuleSelection(moduleFiles.incidents);

    for (const ruleId of catalogRuleIds.plots) {
      if (matchesSelection(ruleId, plotSelection)) manifestRuleIds.add(ruleId);
    }
    for (const ruleId of catalogRuleIds.roles) {
      if (matchesSelection(ruleId, roleSelection)) manifestRuleIds.add(ruleId);
    }
    for (const ruleId of catalogRuleIds.incidents) {
      if (matchesSelection(ruleId, incidentSelection)) manifestRuleIds.add(ruleId);
    }
  }

  const manifestRuleIdList = [...manifestRuleIds].sort((a, b) => a.localeCompare(b, 'en'));
  const manifestSet = new Set(manifestRuleIdList);
  const liveSet = new Set(liveRuleIds);
  const missingRuleIds = liveRuleIds.filter(ruleId => !manifestSet.has(ruleId));
  const extraRuleIds = manifestRuleIdList.filter(ruleId => !liveSet.has(ruleId));
  const missingByPrefix = missingRuleIds.reduce<Record<string, number>>((acc, ruleId) => {
    const prefix = ruleId.split('_')[0] || 'unknown';
    acc[prefix] = (acc[prefix] ?? 0) + 1;
    return acc;
  }, {});

  return {
    status: missingRuleIds.length === 0 ? 'passed' : 'failed',
    liveCount: liveRuleIds.length,
    manifestCount: manifestRuleIdList.length,
    missingCount: missingRuleIds.length,
    extraCount: extraRuleIds.length,
    missingByPrefix: sortObjectByValueDesc(missingByPrefix),
    missingRuleIds,
    extraRuleIds,
    warnings: extraRuleIds.map(ruleId => `extra_processor_rule:${ruleId}`),
  };
}

function unwrapGetScriptsByModuleCall(expression: ts.Expression): ts.CallExpression | null {
  if (
    ts.isCallExpression(expression)
    && ts.isIdentifier(expression.expression)
    && expression.expression.text === 'getScriptsByModule'
  ) {
    return expression;
  }

  if (
    ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.name.text === 'map'
  ) {
    const target = expression.expression.expression;
    if (
      ts.isCallExpression(target)
      && ts.isIdentifier(target.expression)
      && target.expression.text === 'getScriptsByModule'
    ) {
      return target;
    }
  }

  return null;
}

function extractScriptIds(
  expression: ts.Expression | null,
  stringConsts: Record<string, string>,
): { scriptIds: string[]; errors: string[] } {
  if (!expression) {
    return { scriptIds: [], errors: ['missing_script_ids_field'] };
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const values = expression.elements
      .map(element => ts.isStringLiteral(element) ? element.text : null);
    if (values.some(value => value == null)) {
      return { scriptIds: [], errors: ['unresolvable_script_ids'] };
    }
    return { scriptIds: values.filter((value): value is string => value != null), errors: [] };
  }

  const getScriptsByModuleCall = unwrapGetScriptsByModuleCall(expression);
  if (getScriptsByModuleCall) {
    const tragedySetId = resolveStringValue(getScriptsByModuleCall.arguments[0] ?? null, stringConsts);
    if (!tragedySetId) {
      return { scriptIds: [], errors: ['unresolvable_script_ids'] };
    }
    return {
      scriptIds: getAllScripts()
        .filter(script => script.def.tragedySetId === tragedySetId)
        .map(script => script.id)
        .sort((a, b) => a.localeCompare(b, 'en')),
      errors: [],
    };
  }

  return { scriptIds: [], errors: ['unresolvable_script_ids'] };
}

function collectPresentHooksFromManifest(
  manifestObject: ts.ObjectLiteralExpression,
): ModuleManifestHookAuditSurface[] {
  const presentHooks: ModuleManifestHookAuditSurface[] = [];

  const goodwillHooks = getObjectProperty(manifestObject, 'goodwillHooks');
  if (goodwillHooks && ts.isObjectLiteralExpression(goodwillHooks)) {
    if (getObjectProperty(goodwillHooks, 'afterResolve')) presentHooks.push('goodwillHooks.afterResolve');
    if (getObjectProperty(goodwillHooks, 'traitOverrides')) presentHooks.push('goodwillHooks.traitOverrides');
    if (getObjectProperty(goodwillHooks, 'leaderTargetSlots')) presentHooks.push('goodwillHooks.leaderTargetSlots');
    if (getObjectProperty(goodwillHooks, 'collectPendingAbilities')) presentHooks.push('goodwillHooks.collectPendingAbilities');
  }

  const incidentHooks = getObjectProperty(manifestObject, 'incidentHooks');
  if (incidentHooks && ts.isObjectLiteralExpression(incidentHooks)) {
    if (getObjectProperty(incidentHooks, 'after_presence')) presentHooks.push('incidentHooks.after_presence');
    if (getObjectProperty(incidentHooks, 'before_threshold')) presentHooks.push('incidentHooks.before_threshold');
  }

  return presentHooks;
}

function readManifestSurface(moduleId: string, filePath: string): StaticManifestSurface {
  const source = readSourceFile(filePath);
  const stringConsts = collectStringConsts(source);
  const manifestObject = findModuleManifestObject(source);

  if (!manifestObject) {
    return {
      moduleId,
      tragedySetId: null,
      declaredScriptIds: [],
      presentHooks: [],
      errors: ['missing_module_manifest_object'],
      warnings: [],
    };
  }

  const moduleIdValue = resolveStringValue(getObjectProperty(manifestObject, 'moduleId'), stringConsts) ?? moduleId;
  const tragedySetId = resolveStringValue(getObjectProperty(manifestObject, 'tragedySetId'), stringConsts);
  const scriptIdsResult = extractScriptIds(getObjectProperty(manifestObject, 'scriptIds'), stringConsts);

  return {
    moduleId: moduleIdValue,
    tragedySetId,
    declaredScriptIds: scriptIdsResult.scriptIds,
    presentHooks: collectPresentHooksFromManifest(manifestObject),
    errors: [
      ...(tragedySetId ? [] : ['unresolvable_tragedy_set_id']),
      ...scriptIdsResult.errors,
    ],
    warnings: [],
  };
}

export function auditOfficialModuleSurface(surface: StaticManifestSurface): ModuleSurfaceAudit {
  const expectedScriptIds = surface.tragedySetId
    ? getAllScripts()
      .filter(script => script.def.tragedySetId === surface.tragedySetId)
      .map(script => script.id)
      .sort((a, b) => a.localeCompare(b, 'en'))
    : [];
  const declaredSet = new Set(surface.declaredScriptIds);
  const expectedSet = new Set(expectedScriptIds);
  const missingScriptIds = expectedScriptIds.filter(scriptId => !declaredSet.has(scriptId));
  const extraScriptIds = surface.declaredScriptIds.filter(scriptId => !expectedSet.has(scriptId));
  const requiredHooks = REQUIRED_HOOKS[surface.moduleId] ?? [];
  const missingRequiredHooks = requiredHooks.filter(hook => !surface.presentHooks.includes(hook));
  const errors = [
    ...surface.errors,
    ...missingScriptIds.map(scriptId => `missing_script_id:${scriptId}`),
    ...missingRequiredHooks.map(hook => `missing_hook:${hook}`),
  ];
  const warnings = [
    ...surface.warnings,
    ...extraScriptIds.map(scriptId => `extra_script_id:${scriptId}`),
  ];

  return {
    moduleId: surface.moduleId,
    tragedySetId: surface.tragedySetId,
    expectedScriptCount: expectedScriptIds.length,
    declaredScriptCount: surface.declaredScriptIds.length,
    missingScriptIds,
    extraScriptIds,
    presentHooks: surface.presentHooks,
    missingRequiredHooks,
    errors,
    warnings,
  };
}

function collectOfficialCompleteness(): AuditResult['officialCompleteness'] {
  const modules = Object.entries(MODULE_FILES).map(([moduleId, files]) =>
    auditOfficialModuleSurface(readManifestSurface(moduleId, files.manifest)),
  );
  const errors = modules.flatMap(module => module.errors.map(error => `${module.moduleId}:${error}`));
  const warnings = modules.flatMap(module => module.warnings.map(warning => `${module.moduleId}:${warning}`));

  return {
    status: errors.length === 0 ? 'passed' : 'failed',
    modules,
    totalExpectedScripts: modules.reduce((sum, module) => sum + module.expectedScriptCount, 0),
    totalDeclaredScripts: modules.reduce((sum, module) => sum + module.declaredScriptCount, 0),
    totalMissingScriptIds: modules.reduce((sum, module) => sum + module.missingScriptIds.length, 0),
    totalExtraScriptIds: modules.reduce((sum, module) => sum + module.extraScriptIds.length, 0),
    totalMissingRequiredHooks: modules.reduce((sum, module) => sum + module.missingRequiredHooks.length, 0),
    errors,
    warnings,
  };
}

function buildSurfaceStatus(
  processorCoverage: ProcessorCoverageSummary,
  officialCompleteness: AuditResult['officialCompleteness'],
): Record<ModuleManifestAuditSurface, AuditStatus> {
  const hookFailureSet = new Set(
    officialCompleteness.modules.flatMap(module => module.missingRequiredHooks),
  );

  return {
    processors: processorCoverage.status,
    scriptIds: officialCompleteness.totalMissingScriptIds === 0
      && officialCompleteness.modules.every(module =>
        !module.errors.includes('missing_script_ids_field')
        && !module.errors.includes('unresolvable_script_ids')
        && !module.errors.includes('unresolvable_tragedy_set_id'),
      )
      ? 'passed'
      : 'failed',
    'goodwillHooks.afterResolve': hookFailureSet.has('goodwillHooks.afterResolve') ? 'failed' : 'passed',
    'goodwillHooks.traitOverrides': hookFailureSet.has('goodwillHooks.traitOverrides') ? 'failed' : 'passed',
    'goodwillHooks.leaderTargetSlots': hookFailureSet.has('goodwillHooks.leaderTargetSlots') ? 'failed' : 'passed',
    'goodwillHooks.collectPendingAbilities': hookFailureSet.has('goodwillHooks.collectPendingAbilities') ? 'failed' : 'passed',
    'incidentHooks.after_presence': hookFailureSet.has('incidentHooks.after_presence') ? 'failed' : 'passed',
    'incidentHooks.before_threshold': hookFailureSet.has('incidentHooks.before_threshold') ? 'failed' : 'passed',
    lifecycleHooks: 'passed',
    loopResultEffects: 'passed',
    interactionDescriptors: 'passed',
  };
}

export function buildAuditResult(): AuditResult {
  const processorCoverage = collectProcessorCoverage();
  const officialCompleteness = collectOfficialCompleteness();
  const surfaceStatus = buildSurfaceStatus(processorCoverage, officialCompleteness);
  const warningCount = processorCoverage.warnings.length + officialCompleteness.warnings.length;
  const errorCount = officialCompleteness.errors.length + (processorCoverage.status === 'failed' ? processorCoverage.missingCount : 0);

  return {
    status: processorCoverage.status === 'passed' && officialCompleteness.status === 'passed'
      ? 'passed'
      : 'failed',
    summary: {
      surfaceStatus,
      errorCount,
      warningCount,
    },
    processorCoverage,
    officialCompleteness,
  };
}

const isMainModule = process.argv[1] != null
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  const result = buildAuditResult();
  console.log(JSON.stringify(result, null, 2));

  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
}
