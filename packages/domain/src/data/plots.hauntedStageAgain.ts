import type { PlotRecord } from '../dictionary';

export const HSA_PLOTS: Record<string, PlotRecord> = {
  noble_bloodline: {
    id: 'noble_bloodline',
    kind: 'main',
    label: { 'zh-CN': '高贵的血族', en: 'Noble Bloodline' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
      { roleId: 'vampire', count: 1 },
    ],
    rules: [
      {
        id: 'noble_bloodline_heterosexual',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '吸血鬼与关键人物必须互为异性。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  the_sacrifices: {
    id: 'the_sacrifices',
    kind: 'main',
    label: { 'zh-CN': '牺牲者', en: 'The Sacrifices' },
    roleRequirements: [],
    rules: [
      {
        id: 'the_sacrifices_intrigue_is_corpse',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '放置在版图上的[密谋]视作身份为平民的尸体。（如果其被复活，则从版图上移除）。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  beast_of_the_moonlit_night: {
    id: 'beast_of_the_moonlit_night',
    kind: 'main',
    label: { 'zh-CN': '月夜凶兽', en: 'Beast of the Moonlit Night' },
    roleRequirements: [
      { roleId: 'werewolf', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage_again' },
  },
  nightmare_in_the_fog: {
    id: 'nightmare_in_the_fog',
    kind: 'main',
    label: { 'zh-CN': '雾中夜惊梦', en: 'Nightmare in the Fog' },
    roleRequirements: [
      { roleId: 'nightmare', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage_again' },
  },
  living_corpses_in_the_tomb: {
    id: 'living_corpses_in_the_tomb',
    kind: 'main',
    label: { 'zh-CN': '古墓活尸', en: 'Living Corpses in the Tomb' },
    roleRequirements: [],
    rules: [
      {
        id: 'living_corpses_in_the_tomb_zombies',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '常驻：平民、胆小鬼和纸老虎的尸体身份变为丧尸。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  cursed_land: {
    id: 'cursed_land',
    kind: 'main',
    label: { 'zh-CN': '被诅咒的土地', en: 'Cursed Land' },
    roleRequirements: [
      { roleId: 'ghost', count: 1 },
      { roleId: 'vampire', count: 1 },
    ],
    rules: [
      {
        id: 'cursed_land_start',
        timing: 'loop_start',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '往鬼魂的初始区域对应的版图上放置1张诅咒牌(Ex)。' },
      },
      {
        id: 'cursed_land_loss',
        timing: 'day_end',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '回合结束阶段结算诅咒牌时，1张或以上诅咒牌没有目标可以放置→主人公死。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  crowd_incident: {
    id: 'crowd_incident',
    kind: 'main',
    label: { 'zh-CN': '群众事件', en: 'Crowd Incident' },
    roleRequirements: [],
    rules: [
      {
        id: 'crowd_incident_rules',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '群众事件当事人是一块版图及其中所有群众。当该版图有规定尸体数时触发。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  panic_party: {
    id: 'panic_party',
    kind: 'subplot',
    label: { 'zh-CN': '心慌派对', en: 'Panic Party' },
    roleRequirements: [
      { roleId: 'paper_tiger', count: 1 },
      { roleId: 'coward', count: 1 },
      { roleId: 'conspiracy_theorist', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage_again' },
  },
  a_love_affair_hsa: {
    id: 'a_love_affair_hsa',
    kind: 'subplot',
    label: { 'zh-CN': '恋爱风景线', en: 'A Love Affair' },
    roleRequirements: [
      { roleId: 'lover', count: 1 },
      { roleId: 'loved_one', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage_again' },
  },
  witches_curse: {
    id: 'witches_curse',
    kind: 'subplot',
    label: { 'zh-CN': '魔女遗咒', en: "Witches' Curse" },
    roleRequirements: [
      { roleId: 'witch', count: 1 },
      { roleId: 'paper_tiger', count: 1 },
    ],
    rules: [
      {
        id: 'witches_curse_place_curse',
        timing: 'loop_start',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '任意能力：往魔女初始区域对应的版图上放置1张诅咒牌(Ex)。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  crisis_of_the_girl: {
    id: 'crisis_of_the_girl',
    kind: 'subplot',
    label: { 'zh-CN': '少女大危机', en: 'Crisis of the Girl' },
    roleRequirements: [
      { roleId: 'key_person', count: 1 },
    ],
    rules: [
      {
        id: 'crisis_of_the_girl_rule',
        timing: 'always',
        mandatory: true,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '关键人物必须有少女属性。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  conspiracy_of_monsters: {
    id: 'conspiracy_of_monsters',
    kind: 'subplot',
    label: { 'zh-CN': '怪物们的阴谋', en: 'Conspiracy of Monsters' },
    roleRequirements: [
      { roleId: 'werewolf', count: 1 },
    ],
    rules: [
      {
        id: 'conspiracy_of_monsters_intrigue',
        timing: 'mastermind_ability',
        mandatory: false,
        visibility: 'secret_cause',
        summary: { 'zh-CN': '往拥有无视友好特性的角色所在的版图放置1枚[密谋]（每日限1次，每轮限2次）。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  panic_and_paranoia: {
    id: 'panic_and_paranoia',
    kind: 'subplot',
    label: { 'zh-CN': '恐慌与妄想', en: 'Panic and Paranoia' },
    roleRequirements: [
      { roleId: 'conspiracy_theorist', count: 3 },
    ],
    rules: [],
    source: { setId: 'haunted_stage_again' },
  },
  the_one_who_wont_listen: {
    id: 'the_one_who_wont_listen',
    kind: 'subplot',
    label: { 'zh-CN': '不听劝的人', en: "The One Who Won't Listen" },
    roleRequirements: [
      { roleId: 'coward', count: 2 },
      { roleId: 'serial_killer', count: 1 },
    ],
    rules: [],
    source: { setId: 'haunted_stage_again' },
  },
};
