import type { IncidentRecord } from '../dictionary';

export const BTX_INCIDENTS: Record<string, IncidentRecord> = {
  murder: {
    id: 'murder',
    label: { 'zh-CN': '谋杀', en: 'Murder' },
    rules: [
      {
        id: 'btx_incident_murder_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '杀死与当事人同地的1名角色。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'btx_incident_hospital_incident_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院至少有1密谋时医院所有人死亡；至少2密谋时主人公也死亡。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  spreading: {
    id: 'spreading',
    label: { 'zh-CN': '散播', en: 'Spreading' },
    rules: [
      {
        id: 'btx_incident_spreading_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '从一名角色移除2友好，再给另一名角色2友好。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'btx_incident_missing_person_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将当事人移动到任意版图，并在该处放置1个密谋。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  butterfly_effect: {
    id: 'butterfly_effect',
    label: { 'zh-CN': '蝴蝶效应', en: 'Butterfly Effect' },
    rules: [
      {
        id: 'btx_incident_butterfly_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '选择与当事人位于同一区域的任意1名角色，往该角色身上放置1枚[友好]、[不安]或[密谋]。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  foul_evil: {
    id: 'foul_evil',
    label: { 'zh-CN': '邪气污染', en: 'Foul Evil' },
    rules: [
      {
        id: 'btx_incident_foul_evil',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '在神社放置2个密谋。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'btx_incident_increasing_unease_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '给一名角色2不安，再给另一名角色1密谋。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  suicide: {
    id: 'suicide',
    label: { 'zh-CN': '自杀', en: 'Suicide' },
    rules: [
      {
        id: 'btx_incident_suicide_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人死亡。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  faraway_murder: {
    id: 'faraway_murder',
    label: { 'zh-CN': '远距离杀人', en: 'Faraway Murder' },
    rules: [
      {
        id: 'btx_incident_faraway_murder_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '杀死1名至少有2个密谋的角色。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
};
