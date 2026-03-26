import { describe, expect, it } from 'vitest';

import type { CharacterRecord, PlotRecord, RoleRecord, ScriptDef, TragedySetRecord } from '@tragedy/domain';

import { validateScriptDef } from './scriptValidation';

const tragedySets: Record<string, TragedySetRecord> = {
  basic_tragedy: {
    id: 'basic_tragedy',
    label: { 'zh-CN': 'Basic Tragedy X' },
    subplotCount: 2,
    supportsFinalGuess: true,
    supportedPlayerCounts: [2, 3, 4],
    availablePlotIds: ['murder_plan', 'an_unsettling_rumor', 'the_hidden_freak'],
    availableRoleIds: ['key_person', 'brain', 'serial_killer'],
    availableIncidentIds: ['murder'],
    specialRules: [
      {
        title: { 'zh-CN': 'Module Rule' },
        rules: [
          {
            id: 'module_rule_a',
            timing: 'always',
            mandatory: true,
            visibility: 'public_result',
            summary: { 'zh-CN': 'module rule' },
          },
        ],
      },
    ],
  },
};

const plots: Record<string, PlotRecord> = {
  murder_plan: {
    id: 'murder_plan',
    kind: 'main',
    label: { 'zh-CN': 'Murder Plan' },
    roleRequirements: [],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
  an_unsettling_rumor: {
    id: 'an_unsettling_rumor',
    kind: 'subplot',
    label: { 'zh-CN': 'An Unsettling Rumor' },
    roleRequirements: [],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
  the_hidden_freak: {
    id: 'the_hidden_freak',
    kind: 'subplot',
    label: { 'zh-CN': 'The Hidden Freak' },
    roleRequirements: [],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
};

const roles: Record<string, RoleRecord> = {
  key_person: {
    id: 'key_person',
    label: { 'zh-CN': 'Key Person' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [],
    appearsInPlotIds: [],
    source: { setId: 'basic_tragedy' },
  },
  brain: {
    id: 'brain',
    label: { 'zh-CN': 'Brain' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [],
    appearsInPlotIds: [],
    source: { setId: 'basic_tragedy' },
  },
  serial_killer: {
    id: 'serial_killer',
    label: { 'zh-CN': 'Serial Killer' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [],
    appearsInPlotIds: [],
    source: { setId: 'basic_tragedy' },
  },
};

const characters: Record<string, CharacterRecord> = {
  girl_student: {
    id: 'girl_student',
    label: { 'zh-CN': 'Girl Student' },
    traits: ['girl'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  office_worker: {
    id: 'office_worker',
    label: { 'zh-CN': 'Office Worker' },
    traits: ['adult'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  boy_student: {
    id: 'boy_student',
    label: { 'zh-CN': 'Boy Student' },
    traits: ['boy'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
};

const registries = {
  tragedySets,
  plots,
  roles,
  characters,
};

function createScript(scriptSpecialRules: string[]): ScriptDef {
  return {
    id: 'special-rules-layering-fixture',
    title: 'Special Rules Layering Fixture',
    moduleId: 'basic-tragedy',
    tragedySetId: 'basic_tragedy',
    loops: 3,
    daysPerLoop: 4,
    specialRules: scriptSpecialRules,
    scriptSpecialRules,
    mainPlotId: 'murder_plan',
    subplotIds: ['an_unsettling_rumor', 'the_hidden_freak'],
    cast: [
      { characterId: 'girl_student', roleId: 'key_person' },
      { characterId: 'office_worker', roleId: 'brain' },
      { characterId: 'boy_student', roleId: 'serial_killer' },
    ],
    incidents: [
      { day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' },
    ],
  };
}

describe('content package specialRules validation', () => {
  it('keeps content package special rules layering validation separate for module and script rules', () => {
    const result = validateScriptDef(createScript(['script_rule_a']), registries);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns a distinct content package specialRules validation error when script rules reuse module rules', () => {
    const result = validateScriptDef(createScript(['module_rule_a']), registries);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('script special rules must not reuse module special rules: module_rule_a');
  });
});
