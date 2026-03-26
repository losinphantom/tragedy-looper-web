import type { PlotRecord } from '../dictionary';

export const BTX_PLOTS: Record<string, PlotRecord> = {
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
    source: { setId: 'basic_tragedy' },
  },
  the_sealed_item: {
    id: 'the_sealed_item',
    kind: 'main',
    label: { 'zh-CN': '被封印的邪灵', en: 'The Sealed Item' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
    rules: [
      {
        id: 'the_sealed_item_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若神社上至少有2个密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  sign_with_me: {
    id: 'sign_with_me',
    kind: 'main',
    label: { 'zh-CN': '和我签订契约吧！', en: 'Sign with Me!' },
    roleRequirements: [{ roleId: 'key_person', count: 1 }],
    rules: [
      {
        id: 'sign_with_me_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若关键人物身上至少有2个密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  change_of_future: {
    id: 'change_of_future',
    kind: 'main',
    label: { 'zh-CN': '改变未来', en: 'Change of Future' },
    roleRequirements: [
      { roleId: 'cultist', count: 1 },
      { roleId: 'time_traveler', count: 1 },
    ],
    rules: [
      {
        id: 'change_of_future_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若本循环蝴蝶效应发生过，主人公侧败北。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  giant_time_bomb: {
    id: 'giant_time_bomb',
    kind: 'main',
    label: { 'zh-CN': '巨大定时炸弹X', en: 'Giant Time Bomb' },
    roleRequirements: [{ roleId: 'witch', count: 1 }],
    rules: [
      {
        id: 'giant_time_bomb_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若魔女起始版图上至少有2个密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  circle_of_friends: {
    id: 'circle_of_friends',
    kind: 'subplot',
    label: { 'zh-CN': '好友圈', en: 'Circle of Friends' },
    roleRequirements: [
      { roleId: 'friend', count: 2 },
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
  an_unsettling_rumor: {
    id: 'an_unsettling_rumor',
    kind: 'subplot',
    label: { 'zh-CN': '流言四起', en: 'An Unsettling Rumor' },
    roleRequirements: [{ roleId: 'conspiracy_theorist', count: 1 }],
    rules: [
      {
        id: 'btx_unsettling_rumor_once_per_loop',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '剧本家每循环一次，可在任意版图放置1个密谋。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  a_love_affair: {
    id: 'a_love_affair',
    kind: 'subplot',
    label: { 'zh-CN': '恋爱风景线', en: 'A Love Affair' },
    roleRequirements: [
      { roleId: 'lover', count: 1 },
      { roleId: 'loved_one', count: 1 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
  paranoia_virus: {
    id: 'paranoia_virus',
    kind: 'subplot',
    label: { 'zh-CN': '妄想扩大病毒', en: 'Paranoia Virus' },
    roleRequirements: [{ roleId: 'conspiracy_theorist', count: 1 }],
    rules: [
      {
        id: 'paranoia_virus_rule',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '所有超过3不安的普通人视为杀人狂。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  the_hidden_freak: {
    id: 'the_hidden_freak',
    kind: 'subplot',
    label: { 'zh-CN': '潜伏的杀人狂', en: 'The Hidden Freak' },
    roleRequirements: [
      { roleId: 'friend', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
  threads_of_fate: {
    id: 'threads_of_fate',
    kind: 'subplot',
    label: { 'zh-CN': '因果线', en: 'Threads of Fate' },
    roleRequirements: [],
    rules: [
      {
        id: 'threads_of_fate_loop_start_rule',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '上循环结束时有友好的角色或其尸体，在新循环开始时获得2不安。' },
      },
    ],
    source: { setId: 'basic_tragedy' },
  },
  unknown_factor_x: {
    id: 'unknown_factor_x',
    kind: 'subplot',
    label: { 'zh-CN': '未知因子Χ', en: 'Unknown Factor X' },
    roleRequirements: [{ roleId: 'factor', count: 1 }],
    rules: [],
    source: { setId: 'basic_tragedy' },
  },
};
