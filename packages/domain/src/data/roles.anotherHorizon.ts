import type { RoleRecord } from '../dictionary';

export const AH_ROLES: Record<string, RoleRecord> = {
  ah_agent: {
    id: 'ah_agent',
    label: { 'zh-CN': '代理人', en: 'Agent' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_agent_death_loss', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '该角色死亡时，主人公失败，当前轮回立即结束。' } },
      { id: 'ah_agent_remove_intrigue', timing: 'goodwill_window', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '结算该角色友好能力后，移除与该角色位于同一区域的1枚[密谋]。' } },
    ],
    appearsInPlotIds: ['ah_lost_heart', 'ah_devils_will', 'ah_parallel_world_war'],
    source: { setId: 'another_horizon' },
  },
  ah_brain: {
    id: 'ah_brain',
    label: { 'zh-CN': '主谋', en: 'Brain' },
    maxCopies: null,
    goodwillRefusal: 'optional',
    rules: [
      { id: 'ah_brain_intrigue', timing: 'mastermind_ability', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '往同一区域任意一名角色身上，或该角色所在的版图上放置1枚[密谋]。' } },
    ],
    appearsInPlotIds: ['ah_lost_heart', 'ah_otherworld_erosion'],
    source: { setId: 'another_horizon' },
  },
  ah_invader: {
    id: 'ah_invader',
    label: { 'zh-CN': '入侵者', en: 'Invader' },
    maxCopies: null,
    goodwillRefusal: 'optional',
    rules: [
      { id: 'ah_invader_world_shift', timing: 'mastermind_ability', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '该角色所在版图有2枚或以上[密谋]→进行世界移动。' } },
    ],
    appearsInPlotIds: ['ah_devils_will', 'ah_otherworld_erosion'],
    source: { setId: 'another_horizon' },
  },
  ah_light_of_dawn: {
    id: 'ah_light_of_dawn',
    label: { 'zh-CN': '黎明之光', en: 'Light of Dawn' },
    maxCopies: null,
    goodwillRefusal: 'optional',
    rules: [
      { id: 'ah_light_of_dawn_shadow', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '与该角色位于同一区域的所有平民角色身份变为阴影。' } },
    ],
    appearsInPlotIds: ['ah_shadow_king'],
    source: { setId: 'another_horizon' },
  },
  ah_hidden: {
    id: 'ah_hidden',
    label: { 'zh-CN': '隐匿者', en: 'Hidden' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      { id: 'ah_hidden_loss', timing: 'loop_end', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '失败条件：轮回结束时，该角色身上有[密谋]。' } },
    ],
    appearsInPlotIds: ['ah_devils_will'],
    source: { setId: 'another_horizon' },
  },
  ah_preacher: {
    id: 'ah_preacher',
    label: { 'zh-CN': '传道者', en: 'Preacher' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_preacher_goodwill', timing: 'mastermind_ability', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '往同一区域中任意1名角色身上放置1枚[友好]。' } },
    ],
    appearsInPlotIds: ['ah_puppet_house_world', 'ah_closed_door', 'ah_lunar_city'],
    source: { setId: 'another_horizon' },
  },
  ah_zealot: {
    id: 'ah_zealot',
    label: { 'zh-CN': '狂信徒', en: 'Zealot' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_zealot_kill', timing: 'goodwill_window', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '结算该角色友好能力后，同一地区的任意1名角色死亡。' } },
    ],
    appearsInPlotIds: ['ah_zealot_offering'],
    source: { setId: 'another_horizon' },
  },
  ah_person_in_painting: {
    id: 'ah_person_in_painting',
    label: { 'zh-CN': '画中人', en: 'Person in Painting' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_person_in_painting_gender', timing: 'always', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '该角色的性别反转。' } },
      { id: 'ah_person_in_painting_force_incident', timing: 'incident_check', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '当事人为该角色的事件必定会发生，剧作家需要在事件触发判定时声明使用该能力。' } },
    ],
    appearsInPlotIds: ['ah_self_fluctuation', 'ah_zealot_offering'],
    source: { setId: 'another_horizon' },
  },
  ah_psychopath: {
    id: 'ah_psychopath',
    label: { 'zh-CN': '神经病', en: 'Psychopath' },
    maxCopies: null,
    goodwillRefusal: 'mandatory',
    rules: [
      { id: 'ah_psychopath_unease_limit', timing: 'incident_check', mandatory: true, visibility: 'secret_cause', summary: { 'zh-CN': '该角色进行事件触发判定时，不安限度-1。' } },
    ],
    appearsInPlotIds: ['ah_lunar_city'],
    source: { setId: 'another_horizon' },
  },
  ah_instigator: {
    id: 'ah_instigator',
    label: { 'zh-CN': '煽动者', en: 'Instigator' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_instigator_place_token', timing: 'incident_resolve', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '事件完成结算后，往与该角色位于同一区域的任意1名角色身上放置1枚[友好]、[不安]或[密谋]。' } },
    ],
    appearsInPlotIds: ['ah_self_fluctuation', 'ah_closed_door'],
    source: { setId: 'another_horizon' },
  },
  ah_seducer: {
    id: 'ah_seducer',
    label: { 'zh-CN': '诱惑者', en: 'Seducer' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_seducer_block', timing: 'goodwill_window', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '结算该角色友好能力后，剧作家需要声明使用该能力。次日，队长无法进行世界移动和放置行动牌。' } },
    ],
    appearsInPlotIds: ['ah_temptation'],
    source: { setId: 'another_horizon' },
  },
  ah_marionette: {
    id: 'ah_marionette',
    label: { 'zh-CN': '木偶', en: 'Marionette' },
    maxCopies: null,
    goodwillRefusal: 'none',
    rules: [
      { id: 'ah_marionette_protagonist_kill', timing: 'goodwill_window', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '结算该角色友好能力后，在本日的回合结束阶段，主人公死亡。' } },
    ],
    appearsInPlotIds: [],
    source: { setId: 'another_horizon' },
  },
  ah_shadow: {
    id: 'ah_shadow',
    label: { 'zh-CN': '阴影', en: 'Shadow' },
    maxCopies: null,
    goodwillRefusal: 'optional',
    rules: [
      { id: 'ah_shadow_protagonist_kill', timing: 'incident_resolve', mandatory: false, visibility: 'secret_cause', summary: { 'zh-CN': '担任当事人的事件完成结算后，在本日的回合结束阶段，主人公死亡。' } },
    ],
    appearsInPlotIds: [],
    source: { setId: 'another_horizon' },
  },
};
