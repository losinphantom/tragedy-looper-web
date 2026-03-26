import type { IncidentRecord } from '../dictionary';

export const LL_INCIDENTS: Record<string, IncidentRecord> = {
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'll_incident_increasing_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往任意1名角色身上放置2枚[不安]，随后往另外1名角色身上放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  murder: {
    id: 'murder',
    label: { 'zh-CN': '谋杀', en: 'Murder' },
    rules: [
      {
        id: 'll_incident_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '与当事人位于同一区域的另外1名角色死亡。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  proxy: {
    id: 'proxy',
    label: { 'zh-CN': '代行者', en: 'Proxy' },
    rules: [
      {
        id: 'll_incident_proxy',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '剧作家选择1名主人公，那位主人公选择1名角色死亡。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  hospital_incident: {
    id: 'hospital_incident',
    label: { 'zh-CN': '医院事故', en: 'Hospital Incident' },
    rules: [
      {
        id: 'll_incident_hospital_incident',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '医院有1枚或以上[密谋]→位于医院的所有角色死亡。医院有2枚或以上[密谋]→主人公死亡。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  sudden_change: {
    id: 'sudden_change',
    label: { 'zh-CN': '骤变', en: 'Sudden Change' },
    rules: [
      {
        id: 'll_incident_sudden_change',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人初始区域有2枚或以上[密谋]→主人公死亡。当事人初始区域有1枚或以下[密谋]→往当事人初始区域对应的版图上放置2枚[密谋]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  spreading: {
    id: 'spreading',
    label: { 'zh-CN': '散播', en: 'Spreading' },
    rules: [
      {
        id: 'll_incident_spreading',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '从任意1名角色身上移除2枚[友好]，随后往另外1名角色身上放置2枚[友好]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  last_will: {
    id: 'last_will',
    label: { 'zh-CN': '遗言', en: 'Last Will' },
    rules: [
      {
        id: 'll_incident_last_will',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人死亡，下轮轮回开始时，主人公获得[希望+1]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'll_incident_missing_person',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将当事人移动至任意版图，随后，往当事人所在版图放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  confession: {
    id: 'confession',
    label: { 'zh-CN': '自白', en: 'Confession' },
    rules: [
      {
        id: 'll_incident_confession',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '当事人公开自己的身份。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  light_of_hope: {
    id: 'light_of_hope',
    label: { 'zh-CN': '希望之光', en: 'Light of Hope' },
    rules: [
      {
        id: 'll_incident_light_of_hope',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<通过友好指示物判定是否发生>队长选择1名角色，那名角色放置1枚[希望]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  darkness_of_despair: {
    id: 'darkness_of_despair',
    label: { 'zh-CN': '绝望之暗', en: 'Darkness of Despair' },
    rules: [
      {
        id: 'll_incident_darkness_of_despair',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往任意1名角色身上放置1枚[绝望]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
};
