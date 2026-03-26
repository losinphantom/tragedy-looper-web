export type LocalizedText = {
  'zh-CN': string;
  en?: string;
};

export type TragedySetUiTone = 'slate' | 'loop' | 'gold' | 'blood' | 'violet' | 'emerald';

export type TragedySetUiEntryPoint = {
  label: string;
  value: string;
  tone?: TragedySetUiTone;
};

export type TragedySetUiSurfaceRecord = {
  emphasis?: 'premium' | 'standard';
  summary?: string;
  entryPoints?: TragedySetUiEntryPoint[];
  features?: {
    worldLineFromExParity?: boolean;
    playerExAssignment?: boolean;
    betrayerVictoryConditions?: boolean;
    detectiveGuesses?: boolean;
  };
};

export type RuleAtomRecord = {
  id: string;
  timing: string;
  oncePerLoop?: boolean;
  mandatory: boolean;
  visibility: 'public_result' | 'secret_cause';
  summary: LocalizedText;
  conditionDsl?: unknown;
  effectDsl?: unknown;
};

export type AbilityRecord = {
  id: string;
  label: LocalizedText;
  timing:
    | 'always'
    | 'loop_start'
    | 'day_start'
    | 'mastermind_ability'
    | 'goodwill_window'
    | 'card_resolve'
    | 'incident_check'
    | 'day_end'
    | 'loop_end'
    | 'end_of_last_day';
  goodwillCost?: number;
  oncePerDay?: boolean;
  oncePerLoop?: boolean;
  controller: 'mastermind' | 'leader' | 'system' | 'current_role_owner';
  refusalAllowed?: boolean;
  rules: RuleAtomRecord[];
};

export type TragedySetRecord = {
  id: string;
  label: LocalizedText;
  subplotCount: number;
  supportsFinalGuess: boolean;
  supportedPlayerCounts: number[];
  availablePlotIds: string[];
  availableRoleIds: string[];
  availableIncidentIds: string[];
  specialRules?: Array<{
    title: LocalizedText;
    rules: RuleAtomRecord[];
  }>;
  uiSurface?: TragedySetUiSurfaceRecord;
};

export type ScriptConstraintRecord = {
  id: string;
  summary: LocalizedText;
};

export type CharacterRecord = {
  id: string;
  label: LocalizedText;
  traits: string[];
  startingLocations: string[];
  forbiddenLocations: string[];
  uneaseLimit: number;
  goodwillAbilities: AbilityRecord[];
  passiveAbilities: AbilityRecord[];
  scriptCreationRules: ScriptConstraintRecord[];
  source: {
    setId?: string;
    cardAssetPath?: string;
    alternateCardAssets?: Record<string, string>;
  };
};

export type ActionCardRecord = {
  id: string;
  owner: 'mastermind' | 'protagonist';
  label: LocalizedText;
  oncePerLoop: boolean;
  targetKind: 'character' | 'location' | 'either';
  actionFamily:
    | 'movement'
    | 'forbid_movement'
    | 'goodwill'
    | 'forbid_goodwill'
    | 'unease'
    | 'forbid_unease'
    | 'intrigue'
    | 'forbid_intrigue'
    | 'hope'
    | 'despair';
  params: Record<string, string | number | boolean>;
  rulesText: {
    'zh-CN': string[];
    en?: string[];
  };
  source: {
    cardAssetPath?: string;
  };
};

export type RoleRequirementRecord = {
  roleId: string;
  count: number | { min: number; max: number };
};

export type PlotRecord = {
  id: string;
  kind: 'main' | 'subplot';
  label: LocalizedText;
  roleRequirements: RoleRequirementRecord[];
  rules: RuleAtomRecord[];
  source: {
    setId: string;
  };
};

export type RoleRecord = {
  id: string;
  label: LocalizedText;
  maxCopies: number | null;
  goodwillRefusal: 'none' | 'optional' | 'mandatory';
  rules: RuleAtomRecord[];
  appearsInPlotIds: string[];
  source: {
    setId: string;
  };
};

export type IncidentRecord = {
  id: string;
  label: LocalizedText;
  rules: RuleAtomRecord[];
  /** 群众事件标记 — 当事人为版图而非角色，触发看尸体数而非不安 */
  isCrowdIncident?: boolean;
  /** 群众事件触发所需的最少尸体数（仅 isCrowdIncident=true 时有效） */
  requiredCorpses?: number;
  source: {
    setId: string;
  };
};
