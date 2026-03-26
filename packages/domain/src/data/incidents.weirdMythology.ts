import type { IncidentRecord } from '../dictionary';

/**
 * WM (Weird Mythology) 事件定义
 * 来源：docs/模组/Weird_Mythology.md（官方 Wiki）
 *
 * 共 11 个事件：
 * 疯狂杀人 / 集体自杀 / 不安扩散 / 失踪 / 邪气污染 /
 * 医院事故 / 暴乱 / 灭绝之火 / 廷达罗斯之嗅 / 发现 / 送葬
 */
export const WM_INCIDENTS: Record<string, IncidentRecord> = {

  serial_murder: {
    id: 'serial_murder',
    label: { 'zh-CN': '疯狂杀人', en: 'Serial Murder' },
    rules: [
      {
        id: 'wm_incident_serial_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '与当事人位于同一区域的1名角色死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  collective_suicide: {
    id: 'collective_suicide',
    label: { 'zh-CN': '集体自杀', en: 'Collective Suicide' },
    rules: [
      {
        id: 'wm_incident_collective_suicide',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人有1枚或以上[密谋]→当事人所在区域的所有角色死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'wm_incident_increasing_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往任意1名角色身上放置2枚[不安]，随后往另外1名角色身上放置1枚[密谋]' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'wm_incident_missing_person',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将当事人移动至任意版图，随后，往当事人所在版图放置1枚[密谋]' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  foul_evil: {
    id: 'foul_evil',
    label: { 'zh-CN': '邪气污染', en: 'Foul Evil' },
    rules: [
      {
        id: 'wm_incident_foul_evil',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往神社放置2枚[密谋]' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'wm_incident_hospital_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院有1枚或以上[密谋]→位于医院的所有角色死亡；医院有2枚或以上[密谋]→主人公死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  riot: {
    id: 'riot',
    label: { 'zh-CN': '暴乱', en: 'Riot' },
    rules: [
      {
        id: 'wm_incident_riot',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '都市有1枚或以上[密谋]→位于都市的所有角色死亡；学校有1枚或以上[密谋]→位于学校的所有角色死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  extinction_fire: {
    id: 'extinction_fire',
    label: { 'zh-CN': '灭绝之火', en: 'Extinction Fire' },
    rules: [
      {
        id: 'wm_incident_extinction_fire',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '本局游戏中若本事件首次发生→所有角色和主人公死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  scent_of_tindalos: {
    id: 'scent_of_tindalos',
    label: { 'zh-CN': '廷达罗斯之嗅', en: 'Scent of Tindalos' },
    rules: [
      {
        id: 'wm_incident_scent_of_tindalos',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '〈通过密谋指示物数量判定是否发生〉本轮轮回剩余时间，如果发生其他事件，则在那个事件阶段结束时，主人公死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  discovery: {
    id: 'discovery',
    label: { 'zh-CN': '发现', en: 'Discovery' },
    rules: [
      {
        id: 'wm_incident_discovery',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': 'Ex槽增加1' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  funeral: {
    id: 'funeral',
    label: { 'zh-CN': '送葬', en: 'Funeral' },
    rules: [
      {
        id: 'wm_incident_funeral',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '〈当事人不安限度-1〉队长选择1名角色，那名角色死亡' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },
};
