import type { IncidentRecord } from '../dictionary';

/**
 * AHR 事件定义
 *
 * 只包含 Another Horizon Revised 官方速查表中列出的 11 个事件。
 *
 * 以下事件已从本文件移除（曾错误存放于此，属于其他模组）：
 *   serial_murder     → BTX/MZ/MC 均有定义
 *   spreading         → BTX/FS 均有定义
 *   missing_person    → BTX/FS/WM 均有定义
 *   increasing_unease → BTX/FS/MZ 均有定义
 *   system_error      → 非官方 AHR 矩阵条目
 *   butterfly_effect  → BTX 已定义
 *   faraway_murder    → BTX/FS 均有定义
 *   bizarre_murder    → MC 已定义
 */
export const AHR_INCIDENTS: Record<string, IncidentRecord> = {
  impulse_murder: {
    id: 'impulse_murder',
    label: { 'zh-CN': '冲动杀人', en: 'Impulse Murder' },
    rules: [
      {
        id: 'ahr_incident_impulse_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<当事人不安限度-1>与当事人位于同一区域的另外1名角色死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  dimension_shift: {
    id: 'dimension_shift',
    label: { 'zh-CN': '次元转换', en: 'Dimension Shift' },
    rules: [
      {
        id: 'ahr_incident_dimension_shift',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<当事人存活时必定发生>进行世界移动。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  dimension_warp: {
    id: 'dimension_warp',
    label: { 'zh-CN': '次元歪曲', en: 'Dimension Warp' },
    rules: [
      {
        id: 'ahr_incident_dimension_warp',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '可以进行世界移动，往任意1名角色身上放置2枚[不安]，随后往另外1名角色身上放置2枚[友好]。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  dimension_fault: {
    id: 'dimension_fault',
    label: { 'zh-CN': '次元断层', en: 'Dimension Fault' },
    rules: [
      {
        id: 'ahr_incident_dimension_fault',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '可以进行世界移动；随后，若当事人身上有3种或以上不同种类的指示物，主人公死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  lost_item: {
    id: 'lost_item',
    label: { 'zh-CN': '遗失物', en: 'Lost Item' },
    rules: [
      {
        id: 'ahr_incident_lost_item',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往和当事人位于同一区域的1名角色身上放置1枚[密谋]，然后，将当事人移动至任意版图。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  imaginary_incident: {
    id: 'imaginary_incident',
    label: { 'zh-CN': '空想事件', en: 'Imaginary Incident' },
    rules: [
      {
        id: 'ahr_incident_imaginary_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<通过密谋指示物数量判定是否发生>从「冲动杀人」「次元歪曲」「遗失物」中，选择1个事件进行结算。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  last_will: {
    id: 'last_will',
    label: { 'zh-CN': '遗言', en: 'Last Will' },
    rules: [
      {
        id: 'ahr_incident_last_will',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人死亡；下轮轮回开始时，主人公获得[希望+1]。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'ahr_incident_hospital_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院有1枚或以上[密谋]时，位于医院的所有角色死亡；医院有2枚或以上[密谋]时，主人公死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  singularity: {
    id: 'singularity',
    label: { 'zh-CN': '奇点', en: 'Singularity' },
    rules: [
      {
        id: 'ahr_incident_singularity',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当前为表世界并且本局游戏中本事件首次发生时，主人公死亡；否则进行世界移动。当前为里世界且当事人初始区域有1枚或以上[密谋]时，主人公死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  light_in_the_gap: {
    id: 'light_in_the_gap',
    label: { 'zh-CN': '隙间的阳光', en: 'Light in the Gap' },
    rules: [
      {
        id: 'ahr_incident_light_in_the_gap',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '队长选择一名角色，往那名角色身上放置1枚[希望]。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  darkness_of_despair: {
    id: 'darkness_of_despair',
    label: { 'zh-CN': '绝望之暗', en: 'Darkness of Despair' },
    rules: [
      {
        id: 'ahr_incident_darkness_of_despair',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往任意1名角色身上放置1枚[绝望]。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },

  // ── Legacy AHR compatibility incidents ──────────────────────────────────
  butterfly_effect: {
    id: 'butterfly_effect',
    label: { 'zh-CN': '蝴蝶效应', en: 'Butterfly Effect' },
    rules: [
      {
        id: 'ahr_incident_butterfly_effect',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '选择同区域角色或所在版图，放置 1 枚指定指示物。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'ahr_incident_missing_person',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '兼容旧 AHR 事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  serial_murder: {
    id: 'serial_murder',
    label: { 'zh-CN': '连续杀人', en: 'Serial Murder' },
    rules: [
      {
        id: 'ahr_incident_serial_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '兼容旧 AHR 事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  spreading: {
    id: 'spreading',
    label: { 'zh-CN': '散播', en: 'Spreading' },
    rules: [
      {
        id: 'ahr_incident_spreading',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '兼容旧 AHR 事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩大', en: 'Increasing Unease' },
    rules: [
      {
        id: 'ahr_incident_increasing_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '兼容旧 AHR 事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  faraway_murder: {
    id: 'faraway_murder',
    label: { 'zh-CN': '远距离杀人', en: 'Faraway Murder' },
    rules: [
      {
        id: 'ahr_incident_faraway_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '兼容旧 AHR 事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  system_error: {
    id: 'system_error',
    label: { 'zh-CN': '系统错误', en: 'System Error' },
    rules: [
      {
        id: 'ahr_incident_system_error',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人有密谋时死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  bizarre_murder: {
    id: 'bizarre_murder',
    label: { 'zh-CN': '猎奇杀人', en: 'Bizarre Murder' },
    rules: [
      {
        id: 'ahr_incident_bizarre_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '兼容旧 AHR 事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
};
