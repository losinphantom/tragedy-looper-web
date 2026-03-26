import type { IncidentRecord } from '../dictionary';

export const FIRST_STEPS_INCIDENTS: Record<string, IncidentRecord> = {
  murder: {
    id: 'murder',
    label: { 'zh-CN': '谋杀', en: 'Murder' },
    rules: [
      {
        id: 'incident_murder_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '杀死与当事人同地的1名角色。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'incident_hospital_incident_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院至少有1密谋时医院所有人死亡；至少2密谋时主人公也死亡。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  spreading: {
    id: 'spreading',
    label: { 'zh-CN': '散播', en: 'Spreading' },
    rules: [
      {
        id: 'incident_spreading_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '从一名角色移除2友好，再给另一名角色2友好。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'incident_missing_person_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将当事人移动到任意版图，并在该处放置1个密谋。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'incident_increasing_unease_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '给一名角色2不安，再给另一名角色1密谋。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  suicide: {
    id: 'suicide',
    label: { 'zh-CN': '自杀', en: 'Suicide' },
    rules: [
      {
        id: 'incident_suicide_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人死亡。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  faraway_murder: {
    id: 'faraway_murder',
    label: { 'zh-CN': '远距离杀人', en: 'Faraway Murder' },
    rules: [
      {
        id: 'incident_faraway_murder_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '杀死1名至少有2个密谋的角色。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
};
