import type { IncidentRecord } from '../dictionary';

export const MC_INCIDENTS: Record<string, IncidentRecord> = {
  serial_murder: {
    id: 'serial_murder',
    label: { 'zh-CN': '连续杀人', en: 'Serial Murder' },
    rules: [
      {
        id: 'mc_incident_serial_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '与当事人同地的另外1名角色死亡。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  omen: {
    id: 'omen',
    label: { 'zh-CN': '前兆', en: 'Omen' },
    rules: [
      {
        id: 'mc_incident_omen',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<当事人不安限度-1> 往和当事人位于同一区域的1名角色身上放置1枚[不安]。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  bizarre_murder: {
    id: 'bizarre_murder',
    label: { 'zh-CN': '猎奇杀人', en: 'Bizarre Murder' },
    rules: [
      {
        id: 'mc_incident_bizarre_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<当事人不安限度+1><Ex槽加2> 依次结算「连续杀人」「不安扩散」的效果。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  terrorist_attack: {
    id: 'terrorist_attack',
    label: { 'zh-CN': '恐怖袭击', en: 'Terrorist Attack' },
    rules: [
      {
        id: 'mc_incident_terrorist_attack',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '都市有1密谋→都市所有人死。都市2密谋→主人公死亡。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'mc_incident_increasing_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '给任意角色2不安，再给另一角色1密谋。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  faked_suicide: {
    id: 'faked_suicide',
    label: { 'zh-CN': '伪装自杀', en: 'Faked Suicide' },
    rules: [
      {
        id: 'mc_incident_faked_suicide',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '给当事人放1个Ex牌，且主人公这轮无法再给带Ex牌的人放置行动牌。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'mc_incident_hospital_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院有1密谋→医院所有人死。医院2密谋→主人公死亡。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  suspicious_letter: {
    id: 'suspicious_letter',
    label: { 'zh-CN': '可疑信件', en: 'Suspicious Letter' },
    rules: [
      {
        id: 'mc_incident_suspicious_letter',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将同区1角色移到任意版图，次日那名角色无法移动。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  silver_bullet: {
    id: 'silver_bullet',
    label: { 'zh-CN': '银色子弹', en: 'Silver Bullet' },
    rules: [
      {
        id: 'mc_incident_silver_bullet',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<Ex槽不增加>阶段结束时，本轮轮回结束。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  suicide: {
    id: 'suicide',
    label: { 'zh-CN': '自杀', en: 'Suicide' },
    rules: [
      {
        id: 'mc_incident_suicide',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人死亡。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  blockade: {
    id: 'blockade',
    label: { 'zh-CN': '封锁', en: 'Blockade' },
    rules: [
      {
        id: 'mc_incident_blockade',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '指定当事人所在版图，事发日起3天内任何人无法出入该版图。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
};
