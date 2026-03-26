import type { PlotRecord } from '../dictionary';

export const MC_PLOTS: Record<string, PlotRecord> = {
  murder_plan_mc: {
    id: 'murder_plan_mc',
    kind: 'main',
    label: { 'zh-CN': '谋杀计划', en: 'Murder Plan' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
      { roleId: 'killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'mystery_circle' },
  },
  spiderweb_of_incidents: {
    id: 'spiderweb_of_incidents',
    kind: 'main',
    label: { 'zh-CN': '事件交织的罗网', en: 'Spiderweb of Incidents' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'poisoner', count: 1 },
    ],
    rules: [
      {
        id: 'spiderweb_of_incidents_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若Ex槽为3或以上，主人公侧败北。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  plan_on_a_tightrope: {
    id: 'plan_on_a_tightrope',
    kind: 'main',
    label: { 'zh-CN': '命悬一线的计划', en: 'Plan on a Tightrope' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'fool', count: 1 },
    ],
    rules: [
      {
        id: 'plan_on_a_tightrope_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若Ex槽为1或以下，主人公侧败北。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  dark_school: {
    id: 'dark_school',
    kind: 'main',
    label: { 'zh-CN': '黑暗学园', en: 'Dark School' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [
      {
        id: 'dark_school_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若学校的[密谋]为X枚或以上（X=当前轮回数-1）（第一轮轮回必定失败），主人公侧败北。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  strychnine_tincture: {
    id: 'strychnine_tincture',
    kind: 'main',
    label: { 'zh-CN': '士的宁毒液', en: 'Strychnine Tincture' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'poisoner', count: 1 },
    ],
    rules: [
      {
        id: 'strychnine_tincture_intrigue_is_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '判定「连续杀人」「自杀」是否发生时，[密谋]视作[不安]处理。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  the_hidden_freak_mc: {
    id: 'the_hidden_freak_mc',
    kind: 'subplot',
    label: { 'zh-CN': '潜伏的杀人狂', en: 'The Hidden Freak' },
    roleRequirements: [
      { roleId: 'friend', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'mystery_circle' },
  },
  panic_in_ward: {
    id: 'panic_in_ward',
    kind: 'subplot',
    label: { 'zh-CN': '隔离病房惊魂记', en: 'Panic in the Isolation Ward' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'paranoiac', count: 1 },
    ],
    rules: [
      {
        id: 'panic_in_ward_loop_start',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若上轮轮回结束时Ex槽为2或以下→Ex槽增加1。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  smell_of_gunpowder: {
    id: 'smell_of_gunpowder',
    kind: 'subplot',
    label: { 'zh-CN': '火药的味道', en: 'Smell of Gunpowder' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [
      {
        id: 'smell_of_gunpowder_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若所有生存角色身上的[不安]总数为12枚或以上，主人公侧败北。' },
      },
    ],
    source: { setId: 'mystery_circle' },
  },
  i_am_detective: {
    id: 'i_am_detective',
    kind: 'subplot',
    label: { 'zh-CN': '我是名侦探', en: 'I am the Great Detective' },
    roleRequirements: [
      { roleId: 'psychiatrist', count: 1 },
      { roleId: 'detective', count: 1 },
    ],
    rules: [],
    source: { setId: 'mystery_circle' },
  },
  fools_dance: {
    id: 'fools_dance',
    kind: 'subplot',
    label: { 'zh-CN': '愚者之舞', en: "Fool's Dance" },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'fool', count: 1 },
    ],
    rules: [],
    source: { setId: 'mystery_circle' },
  },
  absolute_will: {
    id: 'absolute_will',
    kind: 'subplot',
    label: { 'zh-CN': '绝对意志', en: 'Absolute Will' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [],
    source: { setId: 'mystery_circle' },
  },
  twins_trick: {
    id: 'twins_trick',
    kind: 'subplot',
    label: { 'zh-CN': '双子的诡计', en: "Twins' Trick" },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'twins', count: 1 },
    ],
    rules: [],
    source: { setId: 'mystery_circle' },
  },
};
