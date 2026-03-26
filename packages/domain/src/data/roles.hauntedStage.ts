import type { RoleRecord } from '../dictionary';

export const HS_ROLES: Record<string, RoleRecord> = {
  hs_nightmare: {
    id: 'hs_nightmare',
    label: { 'zh-CN': '梦魇', en: 'Nightmare' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      { id: 'hs_nightmare_kill', timing: 'day_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '同一区域1名其他角色死亡。如果同一区域没有其他角色，改为该角色死亡。' } },
    ],
    appearsInPlotIds: ['hs_ancient_shrine_horror', 'hs_curse_of_the_doll', 'hs_moonlit_night', 'hs_bizarre_tales', 'hs_desert_demon'],
    source: { setId: 'haunted_stage' },
  },
  hs_curse_god: {
    id: 'hs_curse_god',
    label: { 'zh-CN': '祟神', en: 'Curse God' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'hs_curse_god_posthumous', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '〈死后限定〉该尸体有2枚或以上[密谋]→主人公死亡。' } },
    ],
    appearsInPlotIds: ['hs_ancient_shrine_horror'],
    source: { setId: 'haunted_stage' },
  },
  hs_doll: {
    id: 'hs_doll',
    label: { 'zh-CN': '人偶', en: 'Doll' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'hs_doll_protagonist_kill', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '该卡牌所在版图有2枚或以上[密谋]且该卡牌有1枚或以上[不安]→主人公死亡。' } },
      { id: 'hs_doll_death_intrigue', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '该角色死亡时，往该角色所在版图放置1枚[密谋]。' } },
    ],
    appearsInPlotIds: ['hs_curse_of_the_doll'],
    source: { setId: 'haunted_stage' },
  },
  hs_werewolf: {
    id: 'hs_werewolf',
    label: { 'zh-CN': '狼人', en: 'Werewolf' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      { id: 'hs_werewolf_day5_kill', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '第五天的回合结束阶段，主人公死亡。' } },
      { id: 'hs_werewolf_no_cards', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '剧作家无法在该角色身上放置行动牌。' } },
    ],
    appearsInPlotIds: ['hs_moonlit_night'],
    source: { setId: 'haunted_stage' },
  },
  hs_vampire: {
    id: 'hs_vampire',
    label: { 'zh-CN': '吸血鬼', en: 'Vampire' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'hs_vampire_kill', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '让同区域1名拥有1枚或以上[不安]和1枚或以上[密谋]的性别为该卡牌的异性的角色死亡。' } },
      { id: 'hs_vampire_protagonist_kill', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '有三名性别为该卡牌的异性的卡牌处于死亡状态→主人公死亡。' } },
    ],
    appearsInPlotIds: ['hs_bizarre_tales'],
    source: { setId: 'haunted_stage' },
  },
  hs_ghost: {
    id: 'hs_ghost',
    label: { 'zh-CN': '鬼魂', en: 'Ghost' },
    maxCopies: 2,
    goodwillRefusal: 'none',
    rules: [],
    appearsInPlotIds: ['hs_ancient_shrine_horror', 'hs_curse_of_the_doll', 'hs_desert_demon', 'hs_ghost_city_shadow', 'hs_dance_party_of_the_dead', 'hs_deadly_frenzy'],
    source: { setId: 'haunted_stage' },
  },
  hs_monster: {
    id: 'hs_monster',
    label: { 'zh-CN': '怪物', en: 'Monster' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'hs_monster_reveal_ex', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '该角色身份公开时，Ex槽上升2。' } },
    ],
    appearsInPlotIds: ['hs_bizarre_tales', 'hs_gazing_into_abyss', 'hs_boundary_of_life_and_death'],
    source: { setId: 'haunted_stage' },
  },
  hs_spellcaster: {
    id: 'hs_spellcaster',
    label: { 'zh-CN': '咒术师', en: 'Spellcaster' },
    maxCopies: null,
    goodwillRefusal: 'optional',
    rules: [
      { id: 'hs_spellcaster_corpse', timing: 'mastermind_ability', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '往同一区域的1具尸体上放置1枚[不安]或[密谋]。' } },
    ],
    appearsInPlotIds: ['hs_ancient_shrine_horror', 'hs_curse_of_the_doll', 'hs_moonlit_night', 'hs_zombie_powder'],
    source: { setId: 'haunted_stage' },
  },
  hs_zombie: {
    id: 'hs_zombie',
    label: { 'zh-CN': '僵尸', en: 'Zombie' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      { id: 'hs_zombie_kill', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '某块版图僵尸数量大于等于角色数量→往位于该版图的1名角色身上放置1枚[密谋]，并且让那名角色死亡。成功则Ex槽上升1（所有僵尸合计，每天限1次）。' } },
    ],
    appearsInPlotIds: [],
    source: { setId: 'haunted_stage' },
  },
  hs_poltergeist: {
    id: 'hs_poltergeist',
    label: { 'zh-CN': '骚灵', en: 'Poltergeist' },
    maxCopies: 1,
    goodwillRefusal: 'mandatory',
    rules: [
      { id: 'hs_poltergeist_move', timing: 'mastermind_ability', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '可以将同一区域1张卡牌移动至相邻版图（每轮限1次）。' } },
    ],
    appearsInPlotIds: ['hs_expanding_urban_legend', 'hs_ghost_city_shadow'],
    source: { setId: 'haunted_stage' },
  },
  hs_incarnation_of_horror: {
    id: 'hs_incarnation_of_horror',
    label: { 'zh-CN': '恐怖化身', en: 'Incarnation of Horror' },
    maxCopies: 1,
    goodwillRefusal: 'none',
    rules: [
      { id: 'hs_incarnation_unease', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '往同一区域的1名角色身上放置1枚[不安]。' } },
    ],
    appearsInPlotIds: ['hs_gazing_into_abyss', 'hs_expanding_urban_legend', 'hs_dance_party_of_the_dead'],
    source: { setId: 'haunted_stage' },
  },
  hs_overlord_of_death: {
    id: 'hs_overlord_of_death',
    label: { 'zh-CN': '死亡主宰', en: 'Overlord of Death' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'hs_overlord_toggle', timing: 'day_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '〈死后限定〉选择同一区域另1张卡牌→根据选择的卡牌状态，那名角色死亡或那具尸体复活。' } },
    ],
    appearsInPlotIds: ['hs_boundary_of_life_and_death'],
    source: { setId: 'haunted_stage' },
  },
};
