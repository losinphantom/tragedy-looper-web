import { describe, expect, it } from 'vitest';

import { convertRawScript, type RawScript } from './scriptConverter';

describe('scriptConverter normalization', () => {
  it('keeps legacy module ids distinct instead of silently rebinding them to revised sets', () => {
    const hauntedStage = convertRawScript({
      module: 'MOD_HAUNTED_STAGE',
    } satisfies RawScript, 'hs');
    const anotherHorizon = convertRawScript({
      module: 'MOD_ANOTHER_HORIZON',
    } satisfies RawScript, 'ahr');

    expect(hauntedStage.tragedySetId).toBe('haunted_stage');
    expect(anotherHorizon.tragedySetId).toBe('another_horizon');
  });

  it('normalizes culprit display names and legacy character enums to canonical character ids', () => {
    const converted = convertRawScript({
      module: 'MOD_BASIC_TRAGEDY',
      cast: [
        { id: 'CH_SECT_FOUNDER', role: 'ROLE_PERSON' },
        { id: 'CH_CULTIST', role: 'ROLE_PERSON' },
        { id: 'CH_SACRED_TREE', role: 'ROLE_PERSON' },
      ],
      incidents: [
        { day: 1, incident: 'INC_MURDER', culprit: 'A.I.' },
        { day: 2, incident: 'INC_MURDER', culprit: '科学家' },
        { day: 3, incident: 'INC_MURDER', culprit: '御神木' },
      ],
    } satisfies RawScript, 'chars');

    expect(converted.cast).toEqual([
      { characterId: 'cult_leader', roleId: null },
      { characterId: 'cult_leader', roleId: null },
      { characterId: 'sacred_tree', roleId: null },
    ]);
    expect(converted.incidents).toEqual([
      { day: 1, incidentId: 'murder', culpritCharacterId: 'ai' },
      { day: 2, incidentId: 'murder', culpritCharacterId: 'scholar' },
      { day: 3, incidentId: 'murder', culpritCharacterId: 'sacred_tree' },
    ]);
  });

  it('normalizes mystery circle legacy plot, role, and incident ids into current domain ids', () => {
    const converted = convertRawScript({
      module: 'MOD_MYSTERY_CIRCLE',
      mainPlot: 'RULE_TIGHTROPE_PLAN',
      subplot1: 'i_am_a_master_detective',
      subplot2: 'tricky_twins',
      cast: [
        { id: 'CH_STUDENT_M', role: 'ROLE_PRIVATE_INVESTIGATOR' },
        { id: 'CH_STUDENT_F', role: 'therapist' },
        { id: 'CH_DOCTOR', role: 'ROLE_TWIN' },
      ],
      incidents: [
        { day: 1, incident: 'bestial_murder', culprit: 'A.I.' },
        { day: 2, incident: 'the_silver_bullet', culprit: '男学生' },
        { day: 3, incident: 'terrorism', culprit: '女学生' },
        { day: 4, incident: 'portent', culprit: '医生' },
        { day: 5, incident: 'closed_circle', culprit: '医生' },
      ],
    } satisfies RawScript, 'mc');

    expect(converted.mainPlotId).toBe('plan_on_a_tightrope');
    expect(converted.subplotIds).toEqual(['i_am_detective', 'twins_trick']);
    expect(converted.cast.map(entry => entry.roleId)).toEqual([
      'detective',
      'psychiatrist',
      'twins',
    ]);
    expect(converted.incidents.map(entry => entry.incidentId)).toEqual([
      'bizarre_murder',
      'silver_bullet',
      'terrorist_attack',
      'omen',
      'blockade',
    ]);
  });

  it('normalizes the british-spelling rumor subplot alias in first steps', () => {
    const converted = convertRawScript({
      module: 'MOD_FIRST_STEPS',
      subplot1: 'an_unsettling_rumour',
    } satisfies RawScript, 'fs');

    expect(converted.subplotIds).toEqual(['an_unsettling_rumor']);
  });

  it('reclassifies mislabeled AHR scripts that still use legacy AH vocabulary', () => {
    const converted = convertRawScript({
      module: 'MOD_ANOTHER_HORIZON_REVISED',
      mainPlot: 'RULE_INTO_NOTHINGNESS',
      subplot1: 'RULE_THROUGH_THE_LOOKING_GLASS',
      cast: [
        { id: 'CH_STUDENT_M', role: 'ROLE_ALICE' },
        { id: 'CH_STUDENT_F', role: 'ROLE_BRAIN' },
        { id: 'CH_DOCTOR', role: 'ROLE_MARIONETTE' },
      ],
      incidents: [
        { day: 1, incident: 'INC_CRIME_OF_PASSION', culprit: '男学生' },
        { day: 2, incident: 'INC_LAST_WILL', culprit: '女学生' },
      ],
    } satisfies RawScript, 'ah-from-ahr');

    expect(converted.tragedySetId).toBe('another_horizon_revised');
    expect(converted.mainPlotId).toBe('into_nothingness');
    expect(converted.subplotIds).toEqual(['through_the_looking_glass']);
    expect(converted.cast.map(entry => entry.roleId)).toEqual([
      'alice',
      'brain',
      'marionette',
    ]);
    expect(converted.incidents.map(entry => entry.incidentId)).toEqual([
      'crime_of_passion',
      'last_will',
    ]);
  });

  it('keeps real revised AH scripts on the revised tragedy set', () => {
    const converted = convertRawScript({
      module: 'MOD_ANOTHER_HORIZON_REVISED',
      mainPlot: 'RULE_THREAD_OF_THE_END',
      subplot1: 'RULE_MACHINE_HEART',
      cast: [
        { id: 'CH_A_I', role: 'ROLE_PERSON' },
        { id: 'CH_CLASS_REP', role: 'ROLE_UNTOUCHABLE' },
      ],
      incidents: [
        { day: 1, incident: 'INC_SYSTEM_ERROR', culprit: 'AI' },
        { day: 2, incident: 'INC_BIZARRE_MURDER', culprit: '班长' },
      ],
    } satisfies RawScript, 'ahr');

    expect(converted.tragedySetId).toBe('another_horizon_revised');
    expect(converted.mainPlotId).toBe('thread_of_the_end');
    expect(converted.subplotIds).toEqual(['machine_heart']);
    expect(converted.cast.map(entry => entry.roleId)).toEqual([null, 'untouchable']);
    expect(converted.incidents.map(entry => entry.incidentId)).toEqual([
      'system_error',
      'bizarre_murder',
    ]);
  });

  it('keeps current AHR vocabulary on the revised tragedy set', () => {
    const converted = convertRawScript({
      module: 'MOD_ANOTHER_HORIZON_REVISED',
      mainPlot: 'the_locked_future',
      subplot1: 'puppet_strings',
      subplot2: 'beyond_the_world_line',
      cast: [
        { id: 'CH_STUDENT_M', role: 'obsessive' },
        { id: 'CH_STUDENT_F', role: 'marionette' },
        { id: 'CH_DOCTOR', role: 'dimension_traveler' },
        { id: 'CH_CLASS_REP', role: 'evangelist' },
      ],
      incidents: [
        { day: 1, incident: 'impulse_murder', culprit: '男学生' },
        { day: 2, incident: 'dimension_shift', culprit: '女学生' },
        { day: 3, incident: 'imaginary_incident', culprit: '医生' },
        { day: 4, incident: 'darkness_of_despair', culprit: '班长' },
      ],
    } satisfies RawScript, 'ahr-current');

    expect(converted.tragedySetId).toBe('another_horizon_revised');
    expect(converted.mainPlotId).toBe('the_locked_future');
    expect(converted.subplotIds).toEqual([
      'puppet_strings',
      'beyond_the_world_line',
    ]);
    expect(converted.cast.map(entry => entry.roleId)).toEqual([
      'obsessive',
      'marionette',
      'dimension_traveler',
      'evangelist',
    ]);
    expect(converted.incidents.map(entry => entry.incidentId)).toEqual([
      'impulse_murder',
      'dimension_shift',
      'imaginary_incident',
      'darkness_of_despair',
    ]);
  });

  it('decodes AHR-tagged compound roles into front and back identities without changing reclassification', () => {
    const converted = convertRawScript({
      module: 'MOD_ANOTHER_HORIZON_REVISED',
      mainPlot: 'the_locked_future',
      subplot1: 'dr_jekyll_and_mr_hyde',
      subplot2: 'devil_plays_the_flute',
      cast: [
        { id: 'CH_STUDENT_M', role: 'ROLE_KEY_PERSON_AND_BRAIN' },
        { id: 'CH_STUDENT_F', role: 'ROLE_CONSPIRACY_THEORIST_AND_SERIAL_KILLER' },
        { id: 'CH_DOCTOR', role: 'ROLE_CONSPIRACY_THEORIST_AND_OBSTINATE' },
        { id: 'CH_CLASS_REP', role: 'ROLE_OBSTINATE_AND_KEY_PERSON' },
        { id: 'CH_PATIENT', role: 'ROLE_PERSON_AND_SERIAL_KILLER' },
        { id: 'CH_OFFICE_WORKER', role: 'ROLE_PIED_PIPER_AND_GOSSIP' },
      ],
    } satisfies RawScript, 'ahr-compound');

    expect(converted.tragedySetId).toBe('another_horizon_revised');
    expect(converted.cast).toEqual([
      { characterId: 'boy_student', roleId: 'key_person', backRoleId: 'brain' },
      { characterId: 'girl_student', roleId: 'conspiracy_theorist', backRoleId: 'serial_killer' },
      { characterId: 'doctor', roleId: 'conspiracy_theorist', backRoleId: 'obstinate' },
      { characterId: 'class_rep', roleId: 'obstinate', backRoleId: 'key_person' },
      { characterId: 'patient', roleId: 'person', backRoleId: 'serial_killer' },
      { characterId: 'office_worker', roleId: 'gossip', backRoleId: 'pied_piper' },
    ]);
  });
});
