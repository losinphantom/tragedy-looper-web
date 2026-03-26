import type { IncidentRecord } from '../dictionary';

export const BT_OLD_INCIDENTS: Record<string, IncidentRecord> = {
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      { id: 'bt_old_incident_increasing_unease', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '往任意1名角色身上放置2枚[不安]，随后往另外1名角色身上放置1枚[密谋]。' } },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  murder: {
    id: 'murder',
    label: { 'zh-CN': '谋杀', en: 'Murder' },
    rules: [
      { id: 'bt_old_incident_murder', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '与当事人位于同一区域的另外1名角色死亡。' } },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  foul_evil: {
    id: 'foul_evil',
    label: { 'zh-CN': '邪气污染', en: 'Foul Evil' },
    rules: [
      { id: 'bt_old_incident_foul_evil', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '往神社放置2枚[密谋]。' } },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  hospital_incident_small: {
    id: 'hospital_incident_small',
    label: { 'zh-CN': '医院事故(小)', en: 'Hospital Incident (Small)' },
    rules: [
      { id: 'bt_old_incident_hospital_small', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '医院有1枚或以上[密谋]→位于医院的所有角色死亡。' } },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  suicide: {
    id: 'suicide',
    label: { 'zh-CN': '自杀', en: 'Suicide' },
    rules: [
      { id: 'bt_old_incident_suicide', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '当事人死亡。' } },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      { id: 'bt_old_incident_missing_person', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '将当事人移动至任意版图，随后，往当事人所在版图放置1枚[密谋]。' } },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
};
