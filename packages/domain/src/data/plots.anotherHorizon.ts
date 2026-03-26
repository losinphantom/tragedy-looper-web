import type { PlotRecord } from '../dictionary';

export const AH_PLOTS: Record<string, PlotRecord> = {
  ah_lost_heart: {
    id: 'ah_lost_heart',
    kind: 'main',
    label: { 'zh-CN': '失落之心', en: 'Lost Heart' },
    roleRequirements: [
      { roleId: 'ah_agent', count: 1 },
      { roleId: 'ah_brain', count: 1 },
    ],
    rules: [
      { id: 'ah_lost_heart_rule', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '1名平民角色身上同时有[不安]、[密谋]、[友好]→该角色获得友好爆发和傀儡木偶的能力。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_shadow_king: {
    id: 'ah_shadow_king',
    kind: 'main',
    label: { 'zh-CN': '影之国的魔王', en: 'Shadow King' },
    roleRequirements: [
      { roleId: 'ah_light_of_dawn', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon' },
  },
  ah_devils_will: {
    id: 'ah_devils_will',
    kind: 'main',
    label: { 'zh-CN': '恶魔的意志', en: "Devil's Will" },
    roleRequirements: [
      { roleId: 'ah_agent', count: 1 },
      { roleId: 'ah_invader', count: 1 },
      { roleId: 'ah_hidden', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon' },
  },
  ah_parallel_world_war: {
    id: 'ah_parallel_world_war',
    kind: 'main',
    label: { 'zh-CN': '平行世界战争', en: 'Parallel World War' },
    roleRequirements: [
      { roleId: 'ah_agent', count: 1 },
    ],
    rules: [
      { id: 'ah_parallel_world_war_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，本轮轮回中没有触发过世界收束事件。' } },
      { id: 'ah_parallel_world_war_constraint', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '剧本制作时，代理人必须是剧本中1个世界收束事件的当事人。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_otherworld_erosion: {
    id: 'ah_otherworld_erosion',
    kind: 'main',
    label: { 'zh-CN': '异界侵蚀', en: 'Otherworld Erosion' },
    roleRequirements: [
      { roleId: 'ah_brain', count: 1 },
      { roleId: 'ah_invader', count: 1 },
    ],
    rules: [
      { id: 'ah_otherworld_erosion_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，X的初始区域有2枚或以上[密谋]（X表世界为主谋，里世界为入侵者）。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_puppet_house_world: {
    id: 'ah_puppet_house_world',
    kind: 'subplot',
    label: { 'zh-CN': '人偶之家的世界', en: 'Puppet House World' },
    roleRequirements: [
      { roleId: 'ah_preacher', count: 1 },
    ],
    rules: [
      { id: 'ah_puppet_house_rule', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '所有平民角色获得友好爆发。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_self_fluctuation: {
    id: 'ah_self_fluctuation',
    kind: 'subplot',
    label: { 'zh-CN': '自我的波动', en: 'Self Fluctuation' },
    roleRequirements: [
      { roleId: 'ah_person_in_painting', count: 1 },
      { roleId: 'ah_instigator', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon' },
  },
  ah_closed_door: {
    id: 'ah_closed_door',
    kind: 'subplot',
    label: { 'zh-CN': '封闭的门', en: 'Closed Door' },
    roleRequirements: [
      { roleId: 'ah_preacher', count: 1 },
      { roleId: 'ah_instigator', count: 1 },
    ],
    rules: [
      { id: 'ah_closed_door_rule', timing: 'day_start', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '拒绝一次由队长发起的世界移动（每轮限1次）。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_threads_of_fate: {
    id: 'ah_threads_of_fate',
    kind: 'subplot',
    label: { 'zh-CN': '因果线', en: 'Threads of Fate' },
    roleRequirements: [],
    rules: [
      { id: 'ah_threads_of_fate_rule', timing: 'loop_start', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '上轮轮回结束时所有带有[友好]的角色，全部放置2枚[不安]。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_lunar_city: {
    id: 'ah_lunar_city',
    kind: 'subplot',
    label: { 'zh-CN': '月面都市', en: 'Lunar City' },
    roleRequirements: [
      { roleId: 'ah_preacher', count: 1 },
      { roleId: 'ah_psychopath', count: 1 },
    ],
    rules: [
      { id: 'ah_lunar_city_block', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '都市有2枚或以上[密谋]→拒绝本规则以外的世界移动能力。' } },
      { id: 'ah_lunar_city_shift', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '当都市地点放置了2枚或以上[密谋]的瞬间，进行进入里世界的世界移动。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_zealot_offering: {
    id: 'ah_zealot_offering',
    kind: 'subplot',
    label: { 'zh-CN': '狂信徒的贡品', en: "Zealot's Offering" },
    roleRequirements: [
      { roleId: 'ah_zealot', count: 1 },
      { roleId: 'ah_person_in_painting', count: 1 },
    ],
    rules: [
      { id: 'ah_zealot_offering_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，除狂信徒外，有3名以上跟狂信徒同性别的卡牌为死亡状态。' } },
    ],
    source: { setId: 'another_horizon' },
  },
  ah_temptation: {
    id: 'ah_temptation',
    kind: 'subplot',
    label: { 'zh-CN': '诱惑之物', en: 'Temptation' },
    roleRequirements: [
      { roleId: 'ah_seducer', count: 1 },
    ],
    rules: [],
    source: { setId: 'another_horizon' },
  },
};
