import type { PlotRecord } from '../dictionary';

export const FIRST_STEPS_PLOTS: Record<string, PlotRecord> = {
  light_of_the_avenger: {
    id: 'light_of_the_avenger',
    kind: 'main',
    label: { 'zh-CN': '复仇的火种', en: 'Light of the Avenger' },
    roleRequirements: [{ roleId: 'brain', count: 1 }],
    rules: [
      {
        id: 'light_of_the_avenger_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若主谋起始版图上有至少2个密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  murder_plan: {
    id: 'murder_plan',
    kind: 'main',
    label: { 'zh-CN': '谋杀计划', en: 'Murder Plan' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
      { roleId: 'killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'first_steps' },
  },
  a_place_to_protect: {
    id: 'a_place_to_protect',
    kind: 'main',
    label: { 'zh-CN': '守护此地', en: 'A Place to Protect' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
    rules: [
      {
        id: 'a_place_to_protect_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若学校上有2个或以上密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
  shadow_of_the_ripper: {
    id: 'shadow_of_the_ripper',
    kind: 'subplot',
    label: { 'zh-CN': '开膛者的魔影', en: 'Shadow of the Ripper' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'first_steps' },
  },
  a_hideous_script: {
    id: 'a_hideous_script',
    kind: 'subplot',
    label: { 'zh-CN': '最黑暗的剧本', en: 'A Hideous Script' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'friend', count: 1 },
      { roleId: 'curmudgeon', count: { min: 0, max: 2 } },
    ],
    rules: [],
    source: { setId: 'first_steps' },
  },
  an_unsettling_rumor: {
    id: 'an_unsettling_rumor',
    kind: 'subplot',
    label: { 'zh-CN': '流言四起', en: 'An Unsettling Rumor' },
    roleRequirements: [{ roleId: 'conspiracy_theorist', count: 1 }],
    rules: [
      {
        id: 'an_unsettling_rumor_once_per_loop',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '剧本家每循环一次，可在任意版图放置1个密谋。' },
      },
    ],
    source: { setId: 'first_steps' },
  },
};
