import type { OpenScriptView, OpenSpecialRuleView, ScriptDef, SecretScriptView } from '@tragedy/domain';

type OpenProjectableSpecialRule = string | { id: string; label: OpenSpecialRuleView['label'] };

export function buildOpenScriptView<
  TTitle,
  TLoops,
  TSpecialRule extends OpenProjectableSpecialRule,
>(
  script: ScriptDef<TTitle, TLoops, TSpecialRule>,
): OpenScriptView<
  TTitle,
  TLoops,
  TSpecialRule extends string ? string : OpenSpecialRuleView
> {
  return {
    title: script.title,
    tragedySetId: script.tragedySetId,
    loops: script.loops,
    daysPerLoop: script.daysPerLoop,
    specialRules: script.specialRules.map((rule) =>
      typeof rule === 'string' ? rule : { id: rule.id, label: rule.label },
    ) as OpenScriptView<
      TTitle,
      TLoops,
      TSpecialRule extends string ? string : OpenSpecialRuleView
    >['specialRules'],
    incidentSchedule: script.incidents.map(({ day, incidentId }) => ({
      day,
      incidentId,
    })),
  };
}

export function buildSecretScriptView<TTitle, TLoops, TSpecialRule>(
  script: ScriptDef<TTitle, TLoops, TSpecialRule>,
): SecretScriptView {
  return {
    mainPlotId: script.mainPlotId,
    subplotIds: [...script.subplotIds],
    cast: script.cast.map((entry) => ({ ...entry })),
    incidents: script.incidents.map((entry) => ({ ...entry })),
  };
}
