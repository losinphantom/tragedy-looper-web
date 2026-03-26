import type { IncidentRecord } from '../dictionary';

export const MZ_INCIDENTS: Record<string, IncidentRecord> = {
  serial_murder: {
    id: 'serial_murder',
    label: { 'zh-CN': '连续杀人', en: 'Serial Murder' },
    rules: [
      {
        id: 'mz_incident_serial_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '与当事人位于同一区域的另外1名角色死亡。1名角色可以同时担任多个连续杀人事件的当事人。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  suicide: {
    id: 'suicide',
    label: { 'zh-CN': '自杀', en: 'Suicide' },
    rules: [
      {
        id: 'mz_incident_suicide',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人死亡。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  confession: {
    id: 'confession',
    label: { 'zh-CN': '自白', en: 'Confession' },
    rules: [
      {
        id: 'mz_incident_confession',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人公开自己的身份。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  breaking_the_board: {
    id: 'breaking_the_board',
    label: { 'zh-CN': '破局', en: 'Breaking the Board' },
    rules: [
      {
        id: 'mz_incident_breaking_the_board',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '队长选择1名角色或1块版图，移除其2枚[密谋]。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  faked_suicide: {
    id: 'faked_suicide',
    label: { 'zh-CN': '伪装自杀', en: 'Faked Suicide' },
    rules: [
      {
        id: 'mz_incident_faked_suicide',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往当事人身上设置1张Ex牌。本轮轮回剩余时间主人公将无法往放置了Ex牌的角色身上放置行动牌。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'mz_incident_hospital_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院有1枚或以上[密谋]→位于医院的所有角色死亡。医院有2枚或以上[密谋]→主人公死亡。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  forged_incident: {
    id: 'forged_incident',
    label: { 'zh-CN': '伪造事件', en: 'Forged Incident' },
    rules: [
      {
        id: 'mz_incident_forged_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人初始区域有2枚或以上[密谋]→主人公死亡。（可以自由命名事件名称）。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  riot: {
    id: 'riot',
    label: { 'zh-CN': '暴乱', en: 'Riot' },
    rules: [
      {
        id: 'mz_incident_riot',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '都市有1密谋或者学校有1密谋，对应地点角色死亡。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'mz_incident_increasing_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往任意1名角色身上放置2枚[不安]，随后往另外1名角色身上放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'mz_incident_missing_person',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将当事人移动至任意版图，随后，往当事人所在版图放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  conspiracy_activity: {
    id: 'conspiracy_activity',
    label: { 'zh-CN': '阴谋活动', en: 'Conspiracy Activity' },
    rules: [
      {
        id: 'mz_incident_conspiracy_activity',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<凭密谋数触发>结算连续杀人或失踪事件的效果。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
};
