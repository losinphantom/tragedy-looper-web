import type { PlotRecord } from '../dictionary';

export const MZ_PLOTS: Record<string, PlotRecord> = {
  the_sealed_item_mz: {
    id: 'the_sealed_item_mz',
    kind: 'main',
    label: { 'zh-CN': '被封印的邪灵', en: 'The Sealed Item' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
    rules: [
      {
        id: 'the_sealed_item_mz_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若神社上至少有2个密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  top_secret_report: {
    id: 'top_secret_report',
    kind: 'main',
    label: { 'zh-CN': '绝密报告', en: 'Top Secret Report' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'factor', count: 1 },
      { roleId: 'magician', count: 1 },
    ],
    rules: [
      {
        id: 'top_secret_report_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若本轮轮回中公开过主谋、不安定因子或魔术师中任意身份的名称，主人公侧败北。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  a_mans_battle: {
    id: 'a_mans_battle',
    kind: 'main',
    label: { 'zh-CN': '男子汉的战争', en: "A Man's Battle" },
    roleRequirements: [
      { roleId: 'ninja', count: 1 },
    ],
    rules: [
      {
        id: 'a_mans_battle_male_requirement',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '忍者必须有男性属性（不可以是少年）。' },
      },
      {
        id: 'a_mans_battle_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若忍者或其尸体有2个或以上密谋，主人公侧败北。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  the_creeping_claws: {
    id: 'the_creeping_claws',
    kind: 'main',
    label: { 'zh-CN': '魔爪渐进', en: 'The Creeping Claws' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
    rules: [],
    source: { setId: 'midnight_zone' },
  },
  bonds_of_karma: {
    id: 'bonds_of_karma',
    kind: 'main',
    label: { 'zh-CN': '因果之绊', en: 'Bonds of Karma' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
      { roleId: 'cultist', count: 1 },
    ],
    rules: [
      {
        id: 'bonds_of_karma_loop_start',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '选择一名上轮轮回结束时处于死亡状态的角色，放置一张Ex牌（不可以与[诸神之骰]重复发动）。' },
      },
      {
        id: 'bonds_of_karma_ex_key_person',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '放置了Ex牌的角色，其身份变为关键人物（该角色失去原本的身份）。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  spiral_of_love_and_hate: {
    id: 'spiral_of_love_and_hate',
    kind: 'subplot',
    label: { 'zh-CN': '爱与恨的螺旋', en: 'Spiral of Love and Hate' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [],
    source: { setId: 'midnight_zone' },
  },
  witches_tea_party: {
    id: 'witches_tea_party',
    kind: 'subplot',
    label: { 'zh-CN': '魔女的茶会', en: "Witches' Tea Party" },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
      { roleId: 'witch', count: 2 },
    ],
    rules: [],
    source: { setId: 'midnight_zone' },
  },
  dice_of_the_gods: {
    id: 'dice_of_the_gods',
    kind: 'subplot',
    label: { 'zh-CN': '诸神之骰', en: 'Dice of the Gods' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [
      {
        id: 'dice_of_the_gods_loop_start',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '选择一名上轮轮回结束时处于死亡状态的角色，放置一张Ex牌（不可以与[因果之绊]重复发动）。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  x_factor_anomaly: {
    id: 'x_factor_anomaly',
    kind: 'subplot',
    label: { 'zh-CN': 'X异因子', en: 'Anomaly X' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [
      {
        id: 'x_factor_anomaly_intrigue',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '往存活的不安定因子所在版图放置1枚[密谋]（每轮限1次）。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  death_reality_show: {
    id: 'death_reality_show',
    kind: 'subplot',
    label: { 'zh-CN': '死亡真人秀', en: 'Death Reality Show' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [
      {
        id: 'death_reality_show_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '若生存角色数量为6名或以下，主人公侧败北。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  disconnect_of_hearts: {
    id: 'disconnect_of_hearts',
    kind: 'subplot',
    label: { 'zh-CN': '心无灵犀', en: 'Disconnect of Hearts' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [
      {
        id: 'disconnect_of_hearts_forbid_move',
        timing: 'card_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '禁止友好同时具备禁止移动的效果。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
  song_of_destruction: {
    id: 'song_of_destruction',
    kind: 'subplot',
    label: { 'zh-CN': '灭亡讴歌', en: 'Song of Destruction' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [
      {
        id: 'song_of_destruction_suicide_incident',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '必须引入1个或以上的自杀事件。' },
      },
      {
        id: 'song_of_destruction_prophet_unease_down',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '当事人为平民的事件在判定是否发生时，如果预言家存活，该当事人的不安限度-1。' },
      },
    ],
    source: { setId: 'midnight_zone' },
  },
};
