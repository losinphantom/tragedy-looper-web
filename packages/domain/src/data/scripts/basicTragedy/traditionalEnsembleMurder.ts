import type { LocalizedScriptDef } from '../../../script';

export const TRADITIONAL_ENSEMBLE_MURDER: LocalizedScriptDef = {
  id: 'traditional_ensemble_murder',
  title: {
    'zh-CN': '传统合奏谋杀',
    en: 'Traditional Ensemble Murder',
  },
  tragedySetId: 'basic_tragedy',
  loops: {
    recommended: 4,
    options: [3, 4, 5],
  },
  daysPerLoop: 7,
  specialRules: [],
  mainPlotId: 'murder_plan',
  subplotIds: ['the_hidden_freak', 'an_unsettling_rumor'],
  cast: [
    { characterId: 'boy_student', roleId: 'serial_killer' },
    { characterId: 'girl_student', roleId: 'key_person' },
    { characterId: 'rich_mans_daughter', roleId: 'killer' },
    { characterId: 'shrine_maiden', roleId: 'friend' },
    { characterId: 'police_officer', roleId: null },
    { characterId: 'office_worker', roleId: null },
    { characterId: 'informer', roleId: 'brain' },
    { characterId: 'doctor', roleId: 'conspiracy_theorist' },
    { characterId: 'patient', roleId: null },
  ],
  incidents: [
    { day: 2, incidentId: 'increasing_unease', culpritCharacterId: 'patient' },
    { day: 4, incidentId: 'hospital_incident', culpritCharacterId: 'shrine_maiden' },
    { day: 5, incidentId: 'missing_person', culpritCharacterId: 'rich_mans_daughter' },
    { day: 7, incidentId: 'murder', culpritCharacterId: 'office_worker' },
  ],
};
