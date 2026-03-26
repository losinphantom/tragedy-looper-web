import type { LocalizedScriptDef } from '../../../script';

export const {{SCRIPT_EXPORT_NAME}}: LocalizedScriptDef = {
  id: '{{SCRIPT_ID}}',
  title: {
    'zh-CN': 'TODO: add Chinese title',
    en: 'TODO: add English title',
  },
  moduleId: '{{MODULE_ID}}',
  tragedySetId: '{{TRAGEDY_SET_ID}}',
  loops: {
    recommended: 3,
    options: [3],
  },
  daysPerLoop: 7,
  scriptSpecialRules: [
    // TODO: add script-owned special rules here.
    // {
    //   id: '{{SCRIPT_ID}}_special_rule',
    //   label: { 'zh-CN': 'TODO', en: 'TODO' },
    //   summary: { 'zh-CN': 'TODO', en: 'TODO' },
    // },
  ],
  specialRules: [],
  mainPlotId: 'TODO_main_plot_id',
  subplotIds: [
    'TODO_subplot_id',
  ],
  cast: [
    {
      characterId: 'TODO_character_id',
      roleId: 'TODO_role_id',
    },
  ],
  incidents: [
    {
      day: 1,
      incidentId: 'TODO_incident_id',
      culpritCharacterId: 'TODO_character_id',
    },
  ],
};
