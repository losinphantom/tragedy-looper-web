import type { PlotRecord } from '../dictionary';

export const HS_PLOTS: Record<string, PlotRecord> = {
  hs_ancient_shrine_horror: {
    id: 'hs_ancient_shrine_horror',
    kind: 'main',
    label: { 'zh-CN': '古祠惊魂', en: 'Ancient Shrine Horror' },
    roleRequirements: [
      { roleId: 'hs_nightmare', count: 1 },
      { roleId: 'hs_curse_god', count: 1 },
      { roleId: 'hs_ghost', count: 1 },
      { roleId: 'hs_spellcaster', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage' },
  },
  hs_curse_of_the_doll: {
    id: 'hs_curse_of_the_doll',
    kind: 'main',
    label: { 'zh-CN': '人偶的诅咒', en: 'Curse of the Doll' },
    roleRequirements: [
      { roleId: 'hs_nightmare', count: 1 },
      { roleId: 'hs_doll', count: 1 },
      { roleId: 'hs_ghost', count: 1 },
      { roleId: 'hs_spellcaster', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage' },
  },
  hs_moonlit_night: {
    id: 'hs_moonlit_night',
    kind: 'main',
    label: { 'zh-CN': '月圆之夜', en: 'Moonlit Night' },
    roleRequirements: [
      { roleId: 'hs_nightmare', count: 1 },
      { roleId: 'hs_werewolf', count: 1 },
      { roleId: 'hs_spellcaster', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage' },
  },
  hs_bizarre_tales: {
    id: 'hs_bizarre_tales',
    kind: 'main',
    label: { 'zh-CN': '怪奇谈异', en: 'Bizarre Tales' },
    roleRequirements: [
      { roleId: 'hs_nightmare', count: 1 },
      { roleId: 'hs_vampire', count: 1 },
      { roleId: 'hs_monster', count: 1 },
    ],
    rules: [
      { id: 'hs_bizarre_tales_same_gender', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '吸血鬼和梦魇必须性别相同。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_desert_demon: {
    id: 'hs_desert_demon',
    kind: 'main',
    label: { 'zh-CN': '沙尘的恶魔', en: 'Desert Demon' },
    roleRequirements: [
      { roleId: 'hs_nightmare', count: 1 },
      { roleId: 'hs_ghost', count: 1 },
    ],
    rules: [
      { id: 'hs_desert_demon_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，生存的角色数量为4名或以下。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_gazing_into_abyss: {
    id: 'hs_gazing_into_abyss',
    kind: 'subplot',
    label: { 'zh-CN': '凝视深渊', en: 'Gazing into the Abyss' },
    roleRequirements: [
      { roleId: 'hs_monster', count: 1 },
      { roleId: 'hs_incarnation_of_horror', count: 1 },
    ],
    rules: [
      { id: 'hs_gazing_into_abyss_ex', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '轮回结束时，EX上升X，X为都市的[密谋]数量（X最大为3）。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_zombie_powder: {
    id: 'hs_zombie_powder',
    kind: 'subplot',
    label: { 'zh-CN': '僵尸粉', en: 'Zombie Powder' },
    roleRequirements: [
      { roleId: 'hs_spellcaster', count: 1 },
    ],
    rules: [
      { id: 'hs_zombie_powder_rule', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '没有死后活性且拥有1枚或以上[密谋]的尸体变为丧尸。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_expanding_urban_legend: {
    id: 'hs_expanding_urban_legend',
    kind: 'subplot',
    label: { 'zh-CN': '扩大的都市传说', en: 'Expanding Urban Legend' },
    roleRequirements: [
      { roleId: 'hs_poltergeist', count: 1 },
      { roleId: 'hs_incarnation_of_horror', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage' },
  },
  hs_ghost_city_shadow: {
    id: 'hs_ghost_city_shadow',
    kind: 'subplot',
    label: { 'zh-CN': '鬼城的幽影', en: 'Shadow of the Ghost City' },
    roleRequirements: [
      { roleId: 'hs_ghost', count: 1 },
      { roleId: 'hs_poltergeist', count: 1 },
    ],
    rules: [
      { id: 'hs_ghost_city_shadow_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，鬼魂的尸体上有3枚或以上的[不安]。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_dance_party_of_the_dead: {
    id: 'hs_dance_party_of_the_dead',
    kind: 'subplot',
    label: { 'zh-CN': '死亡舞会', en: 'Dance Party of the Dead' },
    roleRequirements: [
      { roleId: 'hs_ghost', count: 1 },
      { roleId: 'hs_incarnation_of_horror', count: 1 },
    ],
    rules: [
      { id: 'hs_dance_party_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，某块版图存在1枚或以上[密谋]和3具或以上的尸体。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_deadly_frenzy: {
    id: 'hs_deadly_frenzy',
    kind: 'subplot',
    label: { 'zh-CN': '致命狂乱', en: 'Deadly Frenzy' },
    roleRequirements: [
      { roleId: 'hs_ghost', count: 1 },
    ],
    rules: [
      { id: 'hs_deadly_frenzy_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，尸体只有2具及以下。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
  hs_boundary_of_life_and_death: {
    id: 'hs_boundary_of_life_and_death',
    kind: 'subplot',
    label: { 'zh-CN': '生与死的境界', en: 'Boundary of Life and Death' },
    roleRequirements: [
      { roleId: 'hs_monster', count: 1 },
      { roleId: 'hs_overlord_of_death', count: 1 },
    ],
    rules: [
      { id: 'hs_boundary_first_day_kill', timing: 'day_end', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '第一天的回合结束阶段，与死亡主宰位于同一区域的任意1名角色死亡。' } },
    ],
    source: { setId: 'haunted_stage' },
  },
};
