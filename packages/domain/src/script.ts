import type { LocalizedText } from './dictionary';

export type ScriptChoice<T> = {
  recommended: T;
  options: T[];
};

export type SpecialRuleRecord = {
  id: string;
  label: LocalizedText;
  summary: LocalizedText;
};

export type OpenSpecialRuleView = {
  id: string;
  label: LocalizedText;
};

export type OpenScriptView<
  TTitle = string,
  TLoops = number,
  TSpecialRule = string,
> = {
  title?: TTitle;
  moduleId?: string;
  tragedySetId: string;
  loops: TLoops;
  daysPerLoop: number;
  specialRules: TSpecialRule[];
  scriptSpecialRules?: TSpecialRule[];
  moduleSpecialRules?: string[];
  incidentSchedule: Array<{
    day: number;
    incidentId: string;
  }>;
};

export type SecretScriptView = {
  mainPlotId: string;
  subplotIds: string[];
  cast: Array<{
    characterId: string;
    roleId: string | null;
    backRoleId?: string | null;
    appearsFromLoop?: number;
  }>;
  incidents: Array<{
    day: number;
    incidentId: string;
    culpritCharacterId: string;
  }>;
};

export type ScriptDef<
  TTitle = string,
  TLoops = number,
  TSpecialRule = string,
> = {
  id?: string;
  title: TTitle;
  moduleId?: string;
  tragedySetId: string;
  loops: TLoops;
  daysPerLoop: number;
  specialRules: TSpecialRule[];
  scriptSpecialRules?: TSpecialRule[];
  mainPlotId: string;
  subplotIds: string[];
  cast: Array<{
    characterId: string;
    roleId: string | null;
    backRoleId?: string | null;
    appearsFromLoop?: number;
  }>;
  incidents: Array<{
    day: number;
    incidentId: string;
    culpritCharacterId: string;
  }>;
};

export type ScriptContentRecord = {
  scriptId: string;
  specifics?: LocalizedText;
  story?: LocalizedText;
  mastermindHints?: LocalizedText;
  mastermindVictoryNotes?: LocalizedText[];
  creator?: string;
  difficulty?: number | null;
  source?: string;
};

export type LocalizedOpenScriptView = OpenScriptView<
  LocalizedText,
  ScriptChoice<number>,
  OpenSpecialRuleView
>;

export type LocalizedScriptDef = ScriptDef<
  LocalizedText,
  ScriptChoice<number>,
  SpecialRuleRecord
>;
