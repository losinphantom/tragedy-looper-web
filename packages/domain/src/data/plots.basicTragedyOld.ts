import type { PlotRecord } from '../dictionary';

export const BT_OLD_PLOTS: Record<string, PlotRecord> = {
  bt_old_murder_plan: {
    id: 'bt_old_murder_plan',
    kind: 'main',
    label: { 'zh-CN': '谋杀计划', en: 'Murder Plan' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'killer', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_evil_seal: {
    id: 'bt_old_evil_seal',
    kind: 'main',
    label: { 'zh-CN': '恶灵封印', en: 'Evil Seal' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'bt_old_evil_spirit', count: 1 },
    ],
    rules: [
      {
        id: 'bt_old_evil_seal_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，神社有2枚或以上[密谋]。' },
      },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_sign_with_me: {
    id: 'bt_old_sign_with_me',
    kind: 'main',
    label: { 'zh-CN': '与我签订契约吧！', en: 'Sign with Me!' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [
      {
        id: 'bt_old_sign_with_me_girl',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '关键人物必须有少女属性。' },
      },
      {
        id: 'bt_old_sign_with_me_immortal',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '身上有1枚或以上[密谋]的少女获得不死的身份特性。' },
      },
      {
        id: 'bt_old_sign_with_me_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，关键人物有1枚或以上[密谋]。' },
      },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_protagonist_murder_plan: {
    id: 'bt_old_protagonist_murder_plan',
    kind: 'main',
    label: { 'zh-CN': '主人公谋杀计划', en: 'Protagonist Murder Plan' },
    roleRequirements: [
      { roleId: 'bt_old_assassin', count: 2 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_giant_time_bomb_x: {
    id: 'bt_old_giant_time_bomb_x',
    kind: 'main',
    label: { 'zh-CN': '巨大定时炸弹X', en: 'Giant Time Bomb X' },
    roleRequirements: [
      { roleId: 'bt_old_evil_spirit', count: 1 },
      { roleId: 'bt_old_witch', count: 1 },
    ],
    rules: [
      {
        id: 'bt_old_giant_time_bomb_x_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，魔女的初始区域有2枚或以上[密谋]。' },
      },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_circle_of_friends: {
    id: 'bt_old_circle_of_friends',
    kind: 'subplot',
    label: { 'zh-CN': '好友圈', en: 'Circle of Friends' },
    roleRequirements: [
      { roleId: 'friend', count: 2 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_a_love_affair: {
    id: 'bt_old_a_love_affair',
    kind: 'subplot',
    label: { 'zh-CN': '恋爱风景线', en: 'A Love Affair' },
    roleRequirements: [
      { roleId: 'loved_one', count: 1 },
      { roleId: 'lover', count: 1 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_an_unsettling_rumor: {
    id: 'bt_old_an_unsettling_rumor',
    kind: 'subplot',
    label: { 'zh-CN': '不安的传言', en: 'An Unsettling Rumor' },
    roleRequirements: [],
    rules: [
      {
        id: 'bt_old_an_unsettling_rumor_ability',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '往任意1名角色身上放置1枚[密谋]（每轮限1次）（关键人物和刺客除外）。' },
      },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_threads_of_fate: {
    id: 'bt_old_threads_of_fate',
    kind: 'subplot',
    label: { 'zh-CN': '因果线', en: 'Threads of Fate' },
    roleRequirements: [],
    rules: [
      {
        id: 'bt_old_threads_of_fate_rule',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '上轮轮回结束时所有带有[友好]的角色，全部放置2枚[不安]。' },
      },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_heartbreak_13: {
    id: 'bt_old_heartbreak_13',
    kind: 'subplot',
    label: { 'zh-CN': '失恋13天', en: 'Heartbreak 13 Days' },
    roleRequirements: [
      { roleId: 'friend', count: 1 },
      { roleId: 'serial_killer', count: 2 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_lurking_serial_killer: {
    id: 'bt_old_lurking_serial_killer',
    kind: 'subplot',
    label: { 'zh-CN': '潜伏的杀人狂', en: 'Lurking Serial Killer' },
    roleRequirements: [
      { roleId: 'friend', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy_old' },
  },
  bt_old_paranoia_virus: {
    id: 'bt_old_paranoia_virus',
    kind: 'subplot',
    label: { 'zh-CN': '妄想扩大病毒', en: 'Paranoia Virus' },
    roleRequirements: [],
    rules: [
      {
        id: 'bt_old_paranoia_virus_rule',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '某1名平民角色有2枚或以上[密谋]时，那名平民身份变为杀人狂。' },
      },
    ],
    source: { setId: 'basic_tragedy_old' },
  },
};
