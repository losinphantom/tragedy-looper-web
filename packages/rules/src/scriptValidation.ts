import type { CharacterRecord, PlotRecord, RoleRecord, ScriptDef, TragedySetRecord } from '@tragedy/domain';

export type ScriptValidationRegistries = {
  tragedySets: Record<string, TragedySetRecord>;
  plots: Record<string, PlotRecord>;
  roles: Record<string, RoleRecord>;
  characters: Record<string, CharacterRecord>;
};

export type ScriptValidationResult = {
  ok: boolean;
  errors: string[];
};

function getModuleSpecialRuleIds(tragedySet: TragedySetRecord): string[] {
  return (tragedySet.specialRules ?? []).flatMap(group => group.rules.map(rule => rule.id));
}

function getScriptSpecialRuleIds(script: ScriptDef<unknown, unknown, unknown>): string[] {
  return (script.scriptSpecialRules ?? script.specialRules ?? [])
    .map(rule => typeof rule === 'string' ? rule : (rule as { id?: string })?.id)
    .filter((ruleId): ruleId is string => Boolean(ruleId));
}

function countRoleOccurrences(script: ScriptDef<unknown, unknown, unknown>) {
  const counts = new Map<string, number>();

  for (const entry of script.cast) {
    if (!entry.roleId) continue;
    counts.set(entry.roleId, (counts.get(entry.roleId) ?? 0) + 1);
  }

  return counts;
}

export function validateScriptDef(
  script: ScriptDef<unknown, unknown, unknown>,
  registries: ScriptValidationRegistries,
): ScriptValidationResult {
  const errors: string[] = [];
  const tragedySet = registries.tragedySets[script.tragedySetId];

  if (!tragedySet) {
    errors.push(`unknown tragedy set: ${script.tragedySetId}`);
    return { ok: false, errors };
  }

  const moduleSpecialRuleIds = getModuleSpecialRuleIds(tragedySet);
  const scriptSpecialRuleIds = getScriptSpecialRuleIds(script);

  if ((script.scriptSpecialRules ?? script.specialRules ?? []).length !== scriptSpecialRuleIds.length) {
    errors.push('invalid script special rules');
  }

  for (const ruleId of moduleSpecialRuleIds) {
    if (!ruleId) {
      errors.push('invalid module special rules');
      break;
    }
  }

  for (const ruleId of scriptSpecialRuleIds) {
    if (moduleSpecialRuleIds.includes(ruleId)) {
      errors.push(`script special rules must not reuse module special rules: ${ruleId}`);
    }
  }

  if (script.subplotIds.length !== tragedySet.subplotCount) {
    errors.push('subplot count does not match tragedy set');
  }

  if (new Set(script.cast.map((entry) => entry.characterId)).size !== script.cast.length) {
    errors.push('characterId must be unique within a script cast');
  }

  if (
    new Set(script.incidents.map((entry) => entry.culpritCharacterId)).size !== script.incidents.length
  ) {
    errors.push('culpritCharacterId must be unique within a script');
  }

  for (const incident of script.incidents) {
    if (incident.day < 1 || incident.day > script.daysPerLoop) {
      errors.push(`incident day out of range: ${incident.day}`);
    }

    if (!script.cast.some((entry) => entry.characterId === incident.culpritCharacterId)) {
      errors.push(`culprit must exist in cast: ${incident.culpritCharacterId}`);
    }
  }

  const roleCounts = countRoleOccurrences(script);
  const plotIds = [script.mainPlotId, ...script.subplotIds];

  for (const plotId of plotIds) {
    const plot = registries.plots[plotId];
    if (!plot) {
      errors.push(`unknown plot: ${plotId}`);
      continue;
    }

    for (const requirement of plot.roleRequirements) {
      const actual = roleCounts.get(requirement.roleId) ?? 0;
      if (typeof requirement.count === 'number') {
        if (actual < requirement.count) {
          errors.push(`missing required role: ${requirement.roleId}`);
        }
      } else if (actual < requirement.count.min || actual > requirement.count.max) {
        errors.push(`role count out of range: ${requirement.roleId}`);
      }
    }
  }

  for (const [roleId, count] of roleCounts) {
    const role = registries.roles[roleId];
    if (role?.maxCopies !== null && role && count > role.maxCopies) {
      errors.push(`role exceeds max copies: ${roleId}`);
    }
  }

  if (script.mainPlotId === 'sign_with_me') {
    const keyPersonEntry = script.cast.find((entry) => entry.roleId === 'key_person');
    const keyPerson = keyPersonEntry
      ? registries.characters[keyPersonEntry.characterId]
      : null;

    if (!keyPerson || !keyPerson.traits.includes('girl')) {
      errors.push('sign_with_me requires the key person to have the girl trait');
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
