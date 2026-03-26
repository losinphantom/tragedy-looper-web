import type { PlotRecord } from '../dictionary';

/**
 * WM (Weird Mythology) 阴谋定义
 * 来源：docs/模组/Weird_Mythology.md（官方 Wiki）
 *
 * 规则 Y（主阴谋 × 5）：外神合唱曲 / 达贡的福音书 / 黄衣之王 / 巨大定时炸弹Y / 染血的仪式
 * 规则 X（副阴谋 × 7）：流言四起 / 抗争者 / 见证恐惧 / 伊斯之伟大种族 / 深渊之都的私语 / 无貌之神 / 疯狂的真相
 */
export const WM_PLOTS: Record<string, PlotRecord> = {

  // ════════════════════════════════════════════════════════════════════
  // 规则 Y（主阴谋）
  // ════════════════════════════════════════════════════════════════════

  chorus_of_the_outer_gods: {
    id: 'chorus_of_the_outer_gods',
    kind: 'main',
    label: { 'zh-CN': '外神合唱曲', en: 'Chorus of the Outer Gods' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'sacrifice', count: 1 },
      { roleId: 'immortal', count: 1 },
    ],
    rules: [
      {
        id: 'wm_chorus_of_the_outer_gods_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】5名或以上的生存角色身上均有1枚或以上[密谋]' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  gospel_of_dagon: {
    id: 'gospel_of_dagon',
    kind: 'main',
    label: { 'zh-CN': '达贡的福音书', en: 'Gospel of Dagon' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'cultist', count: 1 },
      { roleId: 'deep_one', count: 1 },
    ],
    rules: [
      {
        id: 'wm_gospel_of_dagon_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】神社有X枚或以上[密谋]（X=Ex槽的值）' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  king_in_yellow: {
    id: 'king_in_yellow',
    kind: 'main',
    label: { 'zh-CN': '黄衣之王', en: 'The King in Yellow' },
    roleRequirements: [
      { roleId: 'sacrifice', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
    rules: [
      {
        id: 'wm_king_in_yellow_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】本轮轮回中Ex槽增加过' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  giant_time_bomb_y: {
    id: 'giant_time_bomb_y',
    kind: 'main',
    label: { 'zh-CN': '巨大定时炸弹Y', en: 'Giant Time Bomb Y' },
    roleRequirements: [
      { roleId: 'witch', count: 1 },
      { roleId: 'deep_one', count: 1 },
    ],
    rules: [
      {
        id: 'wm_giant_time_bomb_y_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】魔女的初始区域有2枚或以上[密谋]' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  bloody_ritual_y: {
    id: 'bloody_ritual_y',
    kind: 'main',
    label: { 'zh-CN': '染血的仪式', en: 'Bloody Ritual' },
    roleRequirements: [
      { roleId: 'witch', count: 1 },
      { roleId: 'immortal', count: 1 },
    ],
    rules: [
      {
        id: 'wm_bloody_ritual_y_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】有X具或以上尸体（X=Ex槽的值）' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  // ════════════════════════════════════════════════════════════════════
  // 规则 X（副阴谋）
  // ════════════════════════════════════════════════════════════════════

  spreading_rumors: {
    id: 'spreading_rumors',
    kind: 'subplot',
    label: { 'zh-CN': '流言四起', en: 'Spreading Rumors' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
    rules: [
      {
        id: 'wm_spreading_rumors_intrigue',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：剧作家能力阶段】往任意1块版图上放置1枚[密谋]（每轮限1次）' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  the_resistor: {
    id: 'the_resistor',
    kind: 'subplot',
    label: { 'zh-CN': '抗争者', en: 'The Resistor' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'spellcaster', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'weird_mythology' },
  },

  witnessing_fear: {
    id: 'witnessing_fear',
    kind: 'subplot',
    label: { 'zh-CN': '见证恐惧', en: 'Witnessing Fear' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'witness', count: 1 },
    ],
    rules: [],
    source: { setId: 'weird_mythology' },
  },

  great_race_of_yith: {
    id: 'great_race_of_yith',
    kind: 'subplot',
    label: { 'zh-CN': '伊斯之伟大种族', en: 'Great Race of Yith' },
    roleRequirements: [
      { roleId: 'serial_killer', count: 1 },
      { roleId: 'time_traveler', count: 1 },
    ],
    rules: [],
    source: { setId: 'weird_mythology' },
  },

  whisper_of_the_abyss: {
    id: 'whisper_of_the_abyss',
    kind: 'subplot',
    label: { 'zh-CN': '深渊之都的私语', en: 'Whisper of the Abyss' },
    roleRequirements: [
      { roleId: 'deep_one', count: 1 },
      { roleId: 'paranoiac', count: 1 },
    ],
    rules: [
      {
        id: 'wm_whisper_of_the_abyss_paranoiac_as_key_person',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：常驻】偏执狂获得关键人物的能力（身份不发生变化）' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },

  faceless_god: {
    id: 'faceless_god',
    kind: 'subplot',
    label: { 'zh-CN': '无貌之神', en: 'Faceless God' },
    roleRequirements: [
      { roleId: 'spellcaster', count: 1 },
      { roleId: 'faceless', count: 1 },
    ],
    rules: [],
    source: { setId: 'weird_mythology' },
  },

  truth_of_madness: {
    id: 'truth_of_madness',
    kind: 'subplot',
    label: { 'zh-CN': '疯狂的真相', en: 'Truth of Madness' },
    roleRequirements: [
      { roleId: 'paranoiac', count: 1 },
    ],
    rules: [
      {
        id: 'wm_truth_of_madness_swap_y',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：轮回开始时】Ex槽为2或以上→本轮轮回中，规则Y指定的失败条件变更为（剧本事先设定的）另一条规则Y的失败条件' },
      },
      {
        id: 'wm_truth_of_madness_informer_required',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：剧本制作时】情报商必须登场' },
      },
    ],
    source: { setId: 'weird_mythology' },
  },
};
