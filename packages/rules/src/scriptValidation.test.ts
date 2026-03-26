import { describe, expect, it } from 'vitest';

import type { CharacterRecord, ScriptDef } from '@tragedy/domain';
import {
  BTX_PLOTS,
  BTX_ROLES,
  FIRST_STEPS_SAMPLE_SCRIPT,
  FIRST_STEPS_PLOTS,
  FIRST_STEPS_ROLES,
  TRADITIONAL_ENSEMBLE_MURDER,
  TRAGEDY_SETS,
} from '@tragedy/domain';

import { validateScriptDef } from './scriptValidation';

const characterRegistry: Record<string, CharacterRecord> = {
  boy_student: {
    id: 'boy_student',
    label: { 'zh-CN': '男学生' },
    traits: ['student', 'boy'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  girl_student: {
    id: 'girl_student',
    label: { 'zh-CN': '女学生' },
    traits: ['student', 'girl'],
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
    label: { 'zh-CN': '公司职员' },
    traits: ['adult'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  patient: {
    id: 'patient',
    label: { 'zh-CN': '病人' },
    traits: ['adult'],
    startingLocations: ['hospital'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  rich_mans_daughter: {
    id: 'rich_mans_daughter',
    label: { 'zh-CN': '大小姐' },
    traits: ['girl'],
    startingLocations: ['school'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  shrine_maiden: {
    id: 'shrine_maiden',
    label: { 'zh-CN': '神社巫女' },
    traits: ['girl'],
    startingLocations: ['shrine'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  police_officer: {
    id: 'police_officer',
    label: { 'zh-CN': '警察' },
    traits: ['adult'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  informer: {
    id: 'informer',
    label: { 'zh-CN': '情报贩子' },
    traits: ['adult'],
    startingLocations: ['city'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
  doctor: {
    id: 'doctor',
    label: { 'zh-CN': '医生' },
    traits: ['adult'],
    startingLocations: ['hospital'],
    forbiddenLocations: [],
    uneaseLimit: 2,
    goodwillAbilities: [],
    passiveAbilities: [],
    scriptCreationRules: [],
    source: {},
  },
};

const validationRegistries = {
  tragedySets: TRAGEDY_SETS,
  plots: {
    ...FIRST_STEPS_PLOTS,
    ...BTX_PLOTS,
  },
  roles: {
    ...FIRST_STEPS_ROLES,
    ...BTX_ROLES,
  },
  characters: characterRegistry,
};

describe('script validation', () => {
  it('accepts a valid first steps script', () => {
    const script: ScriptDef = {
      id: 'valid-first-steps',
      title: 'Valid First Steps',
      tragedySetId: 'first_steps',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['an_unsettling_rumor'],
      cast: [
        { characterId: 'girl_student', roleId: 'key_person' },
        { characterId: 'office_worker', roleId: 'brain' },
        { characterId: 'boy_student', roleId: 'killer' },
        { characterId: 'patient', roleId: 'conspiracy_theorist' },
      ],
      incidents: [{ day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' }],
    };

    expect(validateScriptDef(script, validationRegistries)).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('rejects invalid subplot count', () => {
    const script: ScriptDef = {
      id: 'bad-subplots',
      title: 'Bad Subplots',
      tragedySetId: 'first_steps',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['an_unsettling_rumor', 'a_hideous_script'],
      cast: [
        { characterId: 'girl_student', roleId: 'key_person' },
        { characterId: 'office_worker', roleId: 'brain' },
        { characterId: 'boy_student', roleId: 'killer' },
        { characterId: 'patient', roleId: 'conspiracy_theorist' },
      ],
      incidents: [{ day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' }],
    };

    const result = validateScriptDef(script, validationRegistries);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('subplot count does not match tragedy set');
  });

  it('rejects duplicate culprits', () => {
    const script: ScriptDef = {
      id: 'duplicate-culprit',
      title: 'Duplicate Culprit',
      tragedySetId: 'basic_tragedy',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'change_of_future',
      subplotIds: ['an_unsettling_rumor', 'threads_of_fate'],
      cast: [
        { characterId: 'girl_student', roleId: 'cultist' },
        { characterId: 'boy_student', roleId: 'time_traveler' },
        { characterId: 'office_worker', roleId: 'conspiracy_theorist' },
      ],
      incidents: [
        { day: 1, incidentId: 'murder', culpritCharacterId: 'office_worker' },
        { day: 2, incidentId: 'suicide', culpritCharacterId: 'office_worker' },
      ],
    };

    const result = validateScriptDef(script, validationRegistries);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('culpritCharacterId must be unique within a script');
  });

  it('rejects missing required roles', () => {
    const script: ScriptDef = {
      id: 'missing-role',
      title: 'Missing Role',
      tragedySetId: 'first_steps',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'murder_plan',
      subplotIds: ['an_unsettling_rumor'],
      cast: [
        { characterId: 'girl_student', roleId: 'key_person' },
        { characterId: 'boy_student', roleId: 'brain' },
      ],
      incidents: [{ day: 1, incidentId: 'murder', culpritCharacterId: 'boy_student' }],
    };

    const result = validateScriptDef(script, validationRegistries);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('missing required role: killer');
  });

  it('rejects sign with me scripts when the key person is not a girl', () => {
    const script: ScriptDef = {
      id: 'trait-failure',
      title: 'Trait Failure',
      tragedySetId: 'basic_tragedy',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [],
      mainPlotId: 'sign_with_me',
      subplotIds: ['an_unsettling_rumor', 'threads_of_fate'],
      cast: [
        { characterId: 'boy_student', roleId: 'key_person' },
        { characterId: 'office_worker', roleId: 'conspiracy_theorist' },
      ],
      incidents: [{ day: 1, incidentId: 'murder', culpritCharacterId: 'office_worker' }],
    };

    const result = validateScriptDef(script, validationRegistries);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('sign_with_me requires the key person to have the girl trait');
  });

  it('accepts the traditional ensemble murder fixture', () => {
    const result = validateScriptDef(TRADITIONAL_ENSEMBLE_MURDER, validationRegistries);
    expect(result).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('accepts the first steps script fixture and keeps final guess disabled via tragedy set data', () => {
    const result = validateScriptDef(FIRST_STEPS_SAMPLE_SCRIPT, validationRegistries);
    expect(result).toEqual({
      ok: true,
      errors: [],
    });
    expect(TRAGEDY_SETS[FIRST_STEPS_SAMPLE_SCRIPT.tragedySetId]?.supportsFinalGuess).toBe(false);
  });
});
