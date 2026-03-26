import type { IncidentRecord } from '../dictionary';

export const HS_INCIDENTS: Record<string, IncidentRecord> = {
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      { id: 'hs_incident_increasing_unease', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '往任意1名角色身上放置2枚[不安]，随后往另1名人物身上放置1枚[密谋]。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  serial_murder: {
    id: 'serial_murder',
    label: { 'zh-CN': '连续杀人', en: 'Serial Murder' },
    rules: [
      { id: 'hs_incident_serial_murder', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '与当事人位于同一区域的另外1名角色死亡。1名角色可以同时担任多个连续杀人事件的当事人。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  mass_suicide: {
    id: 'mass_suicide',
    label: { 'zh-CN': '集体自杀', en: 'Mass Suicide' },
    rules: [
      { id: 'hs_incident_mass_suicide', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '当事人有1枚或以上[密谋]→当事人所在区域的所有角色死亡。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  proxy_execution: {
    id: 'proxy_execution',
    label: { 'zh-CN': '替代行刑', en: 'Proxy Execution' },
    rules: [
      { id: 'hs_incident_proxy_execution', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '〈当事人不安限度-2〉队长选择1名角色，那名角色死亡。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      { id: 'hs_incident_hospital', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '医院有1枚或以上[密谋]→位于医院的所有角色死亡。医院有2枚或以上[密谋]→主人公死亡。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  blasphemy: {
    id: 'blasphemy',
    label: { 'zh-CN': '亵渎', en: 'Blasphemy' },
    rules: [
      { id: 'hs_incident_blasphemy', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '在任意1具尸体上放置1枚[不安]以及1枚[密谋]。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  beast_release: {
    id: 'beast_release',
    label: { 'zh-CN': '魔兽解放', en: 'Beast Release' },
    rules: [
      { id: 'hs_incident_beast_release', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '在当事人所在区域选择1张Ex卡放置。此后，该Ex卡视作名字为[魔兽]，身份为[梦魇]的角色。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  night_parade: {
    id: 'night_parade',
    label: { 'zh-CN': '百鬼夜行', en: 'Night Parade' },
    rules: [
      { id: 'hs_incident_night_parade', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '〈当事人死后发生〉神社有1枚或以上[密谋]→Ex槽上升4。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  grudge: {
    id: 'grudge',
    label: { 'zh-CN': '咒怨', en: 'Grudge' },
    rules: [
      { id: 'hs_incident_grudge', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '〈当事人死后发生〉将当事尸体在同一区域的1张卡牌移动至任意版图。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  spreading: {
    id: 'spreading',
    label: { 'zh-CN': '蔓延', en: 'Spreading' },
    rules: [
      { id: 'hs_incident_spreading', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '〈当事人死后发生〉往当事尸体所在版图放置2枚[密谋]。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  nightmare_return: {
    id: 'nightmare_return',
    label: { 'zh-CN': '噩梦再临', en: 'Nightmare Return' },
    rules: [
      { id: 'hs_incident_nightmare_return', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '〈当事人死后发生〉Ex槽上升1，当事尸体复活。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
};
