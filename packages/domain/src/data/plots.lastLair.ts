import type { PlotRecord } from '../dictionary';

/**
 * LL 模组规则定义
 *
 * LL 使用 Y规则 + X规则 体系（非传统 main/subplot）：
 * - Y 规则：定义主要阴谋角色配置和败北条件（用 kind='main'）
 * - X 规则：定义背叛者特殊胜利条件和附加规则（用 kind='subplot'）
 */
export const LL_PLOTS: Record<string, PlotRecord> = {
  // ── Y 规则（主规则） ──────────────────────────────────────────────────────

  ll_final_plan: {
    id: 'll_final_plan',
    kind: 'main',
    label: { 'zh-CN': '最终计划', en: 'Final Plan' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'killer', count: 1 },
      { roleId: 'brain', count: 1 },
    ],
    rules: [
      {
        id: 'll_final_plan_hope_clears_traitor',
        timing: 'always',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '【强制：常驻】关键人物（无论生死）身上有1枚或以上[希望]→所有主人公不再是背叛者。如果当前是最终轮回，则最终决战时依然生效。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_sealed_end: {
    id: 'll_sealed_end',
    kind: 'main',
    label: { 'zh-CN': '封印的终末', en: 'Sealed End' },
    roleRequirements: [
      { roleId: 'witch', count: 1 },
    ],
    rules: [
      {
        id: 'll_sealed_end_shrine_kill',
        timing: 'day_end',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：回合结束阶段】神社有2枚或以上[密谋]→主人公死亡。' },
      },
      {
        id: 'll_sealed_end_intrigue_count',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：进行判定时】计算某块版图上的[密谋]数量时，该区域角色身上的[希望]和[绝望]也视为位于版图上。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_rebellious_world: {
    id: 'll_rebellious_world',
    kind: 'main',
    label: { 'zh-CN': '叛逆的世界', en: 'Rebellious World' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'causal_fragment', count: 1 },
    ],
    rules: [
      {
        id: 'll_rebellious_world_girl_requirement',
        timing: 'script_creation',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：剧本制作时】关键人物和因果残片必须有少女属性。' },
      },
      {
        id: 'll_rebellious_world_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】关键人物有2枚或以上[密谋]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_devils_script: {
    id: 'll_devils_script',
    kind: 'main',
    label: { 'zh-CN': '恶魔的剧本', en: "Devil's Script" },
    roleRequirements: [
      { roleId: 'factor', count: 1 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [
      {
        id: 'll_devils_script_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】本轮轮回中引发过遗言或代行者事件。' },
      },
      {
        id: 'll_devils_script_watcher_day_end',
        timing: 'day_end',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：最终日的回合结束阶段】若监视者身上的指示物仅有1枚或以下→主人公死亡。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_giant_time_bomb_z: {
    id: 'll_giant_time_bomb_z',
    kind: 'main',
    label: { 'zh-CN': '巨大定时炸弹Z', en: 'Giant Time Bomb Z' },
    roleRequirements: [
      { roleId: 'causal_fragment', count: 1 },
      { roleId: 'witch', count: 1 },
    ],
    rules: [
      {
        id: 'll_giant_time_bomb_z_loop_end_loss',
        timing: 'loop_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【失败条件：轮回结束时】魔女的初始区域有2枚或以上[密谋]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },

  // ── X 规则（背叛者特殊胜利条件 + 附加规则） ──────────────────────────────

  ll_true_monster: {
    id: 'll_true_monster',
    kind: 'subplot',
    label: { 'zh-CN': '真正的怪物', en: 'True Monster' },
    roleRequirements: [
      { roleId: 'serial_killer', count: 1 },
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'secret_key', count: 1 },
    ],
    rules: [
      {
        id: 'll_true_monster_traitor_a_win',
        timing: 'day_end',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【特殊胜利条件A：回合结束阶段】总计放置过5枚或以上已死亡标志。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_myth_collector: {
    id: 'll_myth_collector',
    kind: 'subplot',
    label: { 'zh-CN': '神话收集者', en: 'Myth Collector' },
    roleRequirements: [
      { roleId: 'watcher', count: 1 },
      { roleId: 'influencer', count: 1 },
      { roleId: 'secret_key', count: 1 },
    ],
    rules: [
      {
        id: 'll_myth_collector_traitor_b_win',
        timing: 'goodwill_resolve',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【特殊胜利条件B：主人公能力阶段】总计放置过6枚或以上已沟通标志。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_i_am_the_detective: {
    id: 'll_i_am_the_detective',
    kind: 'subplot',
    label: { 'zh-CN': '我才是名侦探', en: 'I Am the Detective' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 1 },
      { roleId: 'influencer', count: 1 },
      { roleId: 'secret_key', count: 1 },
    ],
    rules: [
      {
        id: 'll_i_am_the_detective_traitor_c_win',
        timing: 'final_guess',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【特殊胜利条件C：最终决战】最终决战前主人公C获得推理机会，需要正确推理所有事件的当事人。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_beyond_world_line: {
    id: 'll_beyond_world_line',
    kind: 'subplot',
    label: { 'zh-CN': '超越世界线', en: 'Beyond the World Line' },
    roleRequirements: [
      { roleId: 'watcher', count: 1 },
    ],
    rules: [
      {
        id: 'll_beyond_world_line_loop_start',
        timing: 'loop_start',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '【强制：轮回开始时】偶数轮轮回开始时，剧作家获得[绝望+1]，最终轮轮回开始时，主人公获得[希望+1]。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_x_factor: {
    id: 'll_x_factor',
    kind: 'subplot',
    label: { 'zh-CN': 'X异因子', en: 'X-Factor' },
    roleRequirements: [
      { roleId: 'factor', count: 1 },
    ],
    rules: [
      {
        id: 'll_x_factor_intrigue_ability',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【任意能力：剧作家能力阶段】往存活的不安定因子所在版图放置1枚[密谋]（每轮限1次）。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
  ll_sns_panic: {
    id: 'll_sns_panic',
    kind: 'subplot',
    label: { 'zh-CN': 'SNS恐慌', en: 'SNS Panic' },
    roleRequirements: [
      { roleId: 'serial_killer', count: 1 },
      { roleId: 'watcher', count: 1 },
      { roleId: 'influencer', count: 1 },
    ],
    rules: [],
    source: { setId: 'last_liar' },
  },
  ll_fabricated_secret: {
    id: 'll_fabricated_secret',
    kind: 'subplot',
    label: { 'zh-CN': '捏造的秘密', en: 'Fabricated Secret' },
    roleRequirements: [
      { roleId: 'watcher', count: 1 },
    ],
    rules: [
      {
        id: 'll_fabricated_secret_key_ignore_goodwill',
        timing: 'script_creation',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '【强制：剧本制作时】秘钥获得无视友好，如果剧本中不存在秘钥，选择追加一名杀手、主谋或因果残片（不能追加剧本规则中已存在的身份）。' },
      },
    ],
    source: { setId: 'last_liar' },
  },
};
