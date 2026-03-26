import type { ScriptDef } from '../../../script';

export const FIRST_STEPS_SAMPLE_SCRIPT: ScriptDef = {
  id: 'first_steps_sample_script',
  title: 'The First Script',
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
  incidents: [
    { day: 1, incidentId: 'increasing_unease', culpritCharacterId: 'patient' },
    { day: 3, incidentId: 'murder', culpritCharacterId: 'boy_student' },
  ],
};
