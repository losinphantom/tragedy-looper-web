import type { PlotRecord } from '../dictionary';

/**
 * AHR 规则定义
 *
 * 只包含 Another Horizon Revised 官方矩阵中声明的 12 条规则：
 * Y（主规则）× 5 + X（副规则）× 7
 *
 * 以下规则已从本文件移除（曾错误存放于此）：
 *   - sign_with_me, change_of_future  → BTX 已定义
 *   - a_love_affair, circle_of_friends, the_hidden_freak → BTX 已定义
 *   - thread_of_the_end, a_long_night, hidden_world,
 *     tragedy_of_reincarnation, machine_heart, secret_magician → 未出现在官方矩阵
 */
export const AHR_PLOTS: Record<string, PlotRecord> = {
  // ── Y 主规则 ───────────────────────────────────────────────────────────────
  the_locked_future: {
    id: 'the_locked_future',
    kind: 'main',
    label: { 'zh-CN': '闭锁的未来', en: 'The Locked Future' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'obsessive', count: 1 },
      { roleId: 'marionette', count: 1 },
      { roleId: 'storyteller', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_the_locked_future_front_world_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，当前为表世界。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  fairy_tale_killer: {
    id: 'fairy_tale_killer',
    kind: 'main',
    label: { 'zh-CN': '童话里的杀人鬼', en: 'Fairy-Tale Killer' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'lullaby', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon_revised' },
  },
  mother_goose_mystery: {
    id: 'mother_goose_mystery',
    kind: 'main',
    label: { 'zh-CN': '鹅妈妈神秘故事', en: 'Mother Goose Mystery' },
    roleRequirements: [
      { roleId: 'marionette', count: 1 },
      { roleId: 'storyteller', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_mother_goose_mystery_corpse_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，场上有X具或以上尸体（X为当前轮回数，且最大为3）。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  dimension_fusion: {
    id: 'dimension_fusion',
    kind: 'main',
    label: { 'zh-CN': '次元融合计划', en: 'Dimension Fusion' },
    roleRequirements: [
      { roleId: 'marionette', count: 1 },
      { roleId: 'lullaby', count: 1 },
      { roleId: 'brain', count: 1 },
      { roleId: 'alice', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_dimension_fusion_last_will_or_lost_item_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，本轮轮回中引发过「遗言」或「遗失物」事件。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  illusory_world: {
    id: 'illusory_world',
    kind: 'main',
    label: { 'zh-CN': '虚幻世界', en: 'Illusory World' },
    roleRequirements: [
      { roleId: 'obsessive', count: 1 },
      { roleId: 'dimension_traveler', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_illusory_world_obsessive_intrigue_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：轮回结束时，追加自本规则的强迫症（或尸体）身上的[密谋]与当前Ex槽的数值合计为3或以上。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },

  // ── X 副规则 ───────────────────────────────────────────────────────────────
  dr_jekyll_and_mr_hyde: {
    id: 'dr_jekyll_and_mr_hyde',
    kind: 'subplot',
    label: { 'zh-CN': '化身博士', en: 'Dr. Jekyll and Mr. Hyde' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'marionette', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon_revised' },
  },
  devil_plays_the_flute: {
    id: 'devil_plays_the_flute',
    kind: 'subplot',
    label: { 'zh-CN': '恶魔吹着笛子来', en: 'The Devil Plays the Flute' },
    roleRequirements: [
      { roleId: 'serial_killer', count: 1 },
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon_revised' },
  },
  puppet_strings: {
    id: 'puppet_strings',
    kind: 'subplot',
    label: { 'zh-CN': '傀儡之线', en: 'Puppet Strings' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'fragment', count: 1 },
      { roleId: 'evangelist', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_puppet_strings_puppetize_ignores_goodwill',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '强制：常驻。所有无视友好变为傀儡无视友好（包括绝望附加的）。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  alice_in_wonderland: {
    id: 'alice_in_wonderland',
    kind: 'subplot',
    label: { 'zh-CN': '爱丽丝梦游仙境', en: 'Alice in Wonderland' },
    roleRequirements: [
      { roleId: 'fragment', count: 1 },
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'alice', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_alice_in_wonderland_requires_girl_trait',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '强制：剧本创作时，爱丽丝必须有少女属性。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  beyond_the_world_line: {
    id: 'beyond_the_world_line',
    kind: 'subplot',
    label: { 'zh-CN': '超越世界线', en: 'Beyond the World Line' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_beyond_the_world_line_loop_start_despair',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '强制：轮回开始时，偶数轮轮回开始时，剧作家获得[绝望+1]。' },
      },
      {
        id: 'ahr_beyond_the_world_line_final_loop_start_hope',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '强制：轮回开始时，最终轮轮回开始时，主人公获得[希望+1]。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  unspeakable_monster: {
    id: 'unspeakable_monster',
    kind: 'subplot',
    label: { 'zh-CN': '难以言喻的怪物', en: 'Unspeakable Monster' },
    roleRequirements: [
      { roleId: 'obsessive', count: 1 },
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_unspeakable_monster_day_end_loss',
        timing: 'day_end',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '任意能力：回合结束阶段。Ex槽为3或以上时，主人公死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  paranoia_virus_expanded: {
    id: 'paranoia_virus_expanded',
    kind: 'subplot',
    label: { 'zh-CN': '空想扩大病毒', en: 'Paranoia Virus Expanded' },
    roleRequirements: [
      { roleId: 'brain', count: 1 },
      { roleId: 'pied_piper', count: 1 },
      { roleId: 'evangelist', count: 1 },
    ],
    rules: [
      {
        id: 'ahr_paranoia_virus_expanded_transform',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '强制：常驻。当前为里世界时，身上有2种或以上不同指示物的平民或因果残片的角色身份变为杀人狂。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },

  // ── Legacy AHR compatibility plots ───────────────────────────────────────
  // These are still referenced by the runtime/tests and are intentionally
  // kept off the advertised current matrix in tragedySets.ts.
  sign_with_me: {
    id: 'sign_with_me',
    kind: 'main',
    label: { 'zh-CN': '和我签约吧', en: 'Sign With Me' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_sign_with_me_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：关键人物身上的[密谋]为2或以上。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  change_of_future: {
    id: 'change_of_future',
    kind: 'main',
    label: { 'zh-CN': '改变未来', en: 'Change of Future' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_change_of_future_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：本轮发生过蝴蝶效应。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  thread_of_the_end: {
    id: 'thread_of_the_end',
    kind: 'subplot',
    label: { 'zh-CN': '终末之虚线', en: 'Thread of the End' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_thread_of_the_end_day_end_loss',
        timing: 'day_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '回合结束阶段：AI 死亡时，主人公败北。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  a_long_night: {
    id: 'a_long_night',
    kind: 'subplot',
    label: { 'zh-CN': '漫长之夜', en: 'A Long Night' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_a_long_night_generation_rule',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '剧本制作约束。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  hidden_world: {
    id: 'hidden_world',
    kind: 'subplot',
    label: { 'zh-CN': '里世界', en: 'Hidden World' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_hidden_world_setup',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '剧本制作约束。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  black_school: {
    id: 'black_school',
    kind: 'subplot',
    label: { 'zh-CN': '暗黑学园', en: 'Black School' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_black_school_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：学校密谋达到当前轮回阈值。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  tragedy_of_reincarnation: {
    id: 'tragedy_of_reincarnation',
    kind: 'subplot',
    label: { 'zh-CN': '轮回的惨剧', en: 'Tragedy of Reincarnation' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_tragedy_of_reincarnation_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '失败条件：本轮有非幻影角色因连续杀人或猎奇杀人死亡。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
  machine_heart: {
    id: 'machine_heart',
    kind: 'subplot',
    label: { 'zh-CN': '机器之心', en: 'Machine Heart' },
    roleRequirements: [],
    rules: [
      {
        id: 'ahr_machine_heart_event',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '不可触者强制触发系统错误。' },
      },
    ],
    source: { setId: 'another_horizon_revised' },
  },
};
