import type { RoleRecord } from '../dictionary';

/**
 * WM (Weird Mythology) 角色定义
 * 来源：docs/模组/Weird_Mythology.md（官方 Wiki）
 *
 * 共 13 个角色：
 * 关键人物 / 祭品 / 邪教徒 / 魔女 / 永生者 / 深潜者 /
 * 传谣人 / 偏执狂 / 巫师 / 杀人狂 / 时间旅者 / 目击者 / 无面者
 */
export const WM_ROLES: Record<string, RoleRecord> = {
  key_person: {
    id: 'key_person',
    label: { 'zh-CN': '关键人物', en: 'Key Person' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_key_person_death_loss',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：该角色死亡时】主人公失败，当前轮回立即结束。' },
      },
    ],
    appearsInPlotIds: ['chorus_of_the_outer_gods', 'gospel_of_dagon'],
    source: { setId: 'weird_mythology' },
  },
  sacrifice: {
    id: 'sacrifice',
    label: { 'zh-CN': '祭品', en: 'Sacrifice' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_sacrifice_undead',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '不死。' },
      },
      {
        id: 'wm_sacrifice_mass_kill',
        timing: 'day_end',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：回合结束阶段】该角色身上有2枚或以上[密谋]且有2枚或以上[不安]→所有角色和主人公死亡。' },
      },
      {
        id: 'wm_sacrifice_intrigue_as_paranoia',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：事件阶段】判定该角色为当事人的事件是否触发时，[密谋]视为[不安]处理。' },
      },
      {
        id: 'wm_sacrifice_must_be_culprit',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：剧本制作时】必须成为某1个事件的当事人。' },
      },
    ],
    appearsInPlotIds: ['chorus_of_the_outer_gods', 'king_in_yellow', 'giant_time_bomb_y', 'bloody_ritual_y'],
    source: { setId: 'weird_mythology' },
  },
  cultist: {
    id: 'cultist',
    label: { 'zh-CN': '邪教徒', en: 'Cultist' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      {
        id: 'wm_cultist_ignore_forbid_intrigue',
        timing: 'card_resolve',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：行动结算阶段】可以无效化同一区域中任意角色身上和该角色所在版图上放置的禁止密谋。' },
      },
    ],
    appearsInPlotIds: ['gospel_of_dagon', 'king_in_yellow'],
    source: { setId: 'weird_mythology' },
  },
  witch: {
    id: 'witch',
    label: { 'zh-CN': '魔女', en: 'Witch' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [],
    appearsInPlotIds: ['giant_time_bomb_y', 'bloody_ritual_y'],
    source: { setId: 'weird_mythology' },
  },
  immortal: {
    id: 'immortal',
    label: { 'zh-CN': '永生者', en: 'Immortal' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_immortal_undead',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '不死。' },
      },
    ],
    appearsInPlotIds: ['chorus_of_the_outer_gods', 'gospel_of_dagon', 'giant_time_bomb_y'],
    source: { setId: 'weird_mythology' },
  },
  deep_one: {
    id: 'deep_one',
    label: { 'zh-CN': '深潜者', en: 'Deep One' },
    maxCopies: 1,
    goodwillRefusal: 'optional',
    rules: [
      {
        id: 'wm_deep_one_intrigue_ability',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：剧作家能力阶段】往同一区域任意一名角色身上，或该角色所在的版图上放置1枚[密谋]。' },
      },
      {
        id: 'wm_deep_one_death_reveal_ex',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：该角色死亡时】公开该角色身份，Ex槽增加1。' },
      },
    ],
    appearsInPlotIds: ['whisper_of_the_abyss'],
    source: { setId: 'weird_mythology' },
  },
  conspiracy_theorist: {
    id: 'conspiracy_theorist',
    label: { 'zh-CN': '传谣人', en: 'Conspiracy Theorist' },
    maxCopies: 1,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_conspiracy_theorist_unease_ability',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：剧作家能力阶段】往同一区域中任意1名角色身上放置1枚[不安]。' },
      },
    ],
    appearsInPlotIds: ['spreading_rumors', 'the_resistor', 'witnessing_fear'],
    source: { setId: 'weird_mythology' },
  },
  paranoiac: {
    id: 'paranoiac',
    label: { 'zh-CN': '偏执狂', en: 'Paranoiac' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      {
        id: 'wm_paranoiac_intrigue_or_unease',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：剧作家能力阶段】往该角色身上放置1枚[密谋]或[不安]。' },
      },
    ],
    appearsInPlotIds: ['whisper_of_the_abyss'],
    source: { setId: 'weird_mythology' },
  },
  spellcaster: {
    id: 'spellcaster',
    label: { 'zh-CN': '巫师', en: 'Spellcaster' },
    maxCopies: 1,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_spellcaster_death_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】该卡牌为死亡状态。' },
      },
      {
        id: 'wm_spellcaster_goodwill_reveal_ex',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：结算该角色友好能力后】公开该角色身份，之后，队长可以使Ex槽增加1。' },
      },
    ],
    appearsInPlotIds: ['the_resistor', 'faceless_god'],
    source: { setId: 'weird_mythology' },
  },
  serial_killer: {
    id: 'serial_killer',
    label: { 'zh-CN': '杀人狂', en: 'Serial Killer' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_serial_killer_day_end_kill',
        timing: 'day_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：回合结束阶段】仅有1名角色与该角色位于同一区域→那名角色死亡。' },
      },
    ],
    appearsInPlotIds: ['the_resistor', 'great_race_of_yith'],
    source: { setId: 'weird_mythology' },
  },
  time_traveler: {
    id: 'time_traveler',
    label: { 'zh-CN': '时间旅者', en: 'Time Traveler' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_time_traveler_undead',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '不死。' },
      },
      {
        id: 'wm_time_traveler_ignore_forbid_goodwill',
        timing: 'card_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：行动结算阶段】无视该角色身上放置的禁止友好。' },
      },
      {
        id: 'wm_time_traveler_last_day_loss',
        timing: 'day_end',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：最终日的回合结束阶段】该角色身上的[友好]为2枚或以下→主人公失败，当前轮回立即结束。' },
      },
    ],
    appearsInPlotIds: ['great_race_of_yith', 'witnessing_fear'],
    source: { setId: 'weird_mythology' },
  },
  witness: {
    id: 'witness',
    label: { 'zh-CN': '目击者', en: 'Witness' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      {
        id: 'wm_witness_paranoia_death_ex',
        timing: 'day_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：回合结束阶段】该角色有4枚或以上[不安]→该角色死亡，Ex槽增加1。' },
      },
    ],
    appearsInPlotIds: ['witnessing_fear'],
    source: { setId: 'weird_mythology' },
  },
  faceless: {
    id: 'faceless',
    label: { 'zh-CN': '无面者', en: 'Faceless' },
    maxCopies: null,
    goodwillRefusal: 'optional',
    rules: [
      {
        id: 'wm_faceless_undead',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '不死、无视友好。' },
      },
      {
        id: 'wm_faceless_low_ex_conspiracy',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：常驻】Ex槽为1或以下→该角色获得传谣人的能力（身份不发生变化）。' },
      },
      {
        id: 'wm_faceless_high_ex_deep_one',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：常驻】Ex槽为2或以上→该角色获得深潜者的能力（身份不发生变化）。' },
      },
    ],
    appearsInPlotIds: ['faceless_god'],
    source: { setId: 'weird_mythology' },
  },
};
