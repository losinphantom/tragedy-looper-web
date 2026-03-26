import type { IncidentRecord } from '../dictionary';

export const HSA_INCIDENTS: Record<string, IncidentRecord> = {
  blasphemy_murder: {
    id: 'blasphemy_murder',
    label: { 'zh-CN': '亵渎杀人', en: 'Blasphemy Murder' },
    rules: [
      {
        id: 'hsa_incident_blasphemy_murder',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '与当事人位于同一区域的另外1名角色死亡，或往当事人所在版图放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  night_of_madness: {
    id: 'night_of_madness',
    label: { 'zh-CN': '疯狂之夜', en: 'Night of Madness' },
    isCrowdIncident: true,
    requiredCorpses: 0,
    rules: [
      {
        id: 'hsa_incident_night_of_madness',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<群众事件><必要尸体数0> 该事件发生时，游戏中有6具或以上的丧尸→本回合的回合结束阶段时，主人公死亡。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  increasing_unease: {
    id: 'increasing_unease',
    label: { 'zh-CN': '不安扩散', en: 'Increasing Unease' },
    rules: [
      {
        id: 'hsa_incident_increasing_unease',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往任意1名角色身上放置2枚[不安]，随后往另外1名角色身上放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  missing_person: {
    id: 'missing_person',
    label: { 'zh-CN': '失踪', en: 'Missing Person' },
    rules: [
      {
        id: 'hsa_incident_missing_person',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将当事人移动至任意版图，随后，往当事人所在版图放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  curse_activation: {
    id: 'curse_activation',
    label: { 'zh-CN': '诅咒活化', en: 'Curse Activation' },
    isCrowdIncident: true,
    requiredCorpses: 1,
    rules: [
      {
        id: 'hsa_incident_curse_activation',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<群众事件><必要尸体数1> 往当事人所在版图放置Ex牌。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  foul_evil: {
    id: 'foul_evil',
    label: { 'zh-CN': '邪气污染', en: 'Foul Evil' },
    rules: [
      {
        id: 'hsa_incident_foul_evil',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往神社放置2枚[密谋]。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  overflowing_filth: {
    id: 'overflowing_filth',
    label: { 'zh-CN': '污秽溢出', en: 'Overflowing Filth' },
    isCrowdIncident: true,
    requiredCorpses: 2,
    rules: [
      {
        id: 'hsa_incident_overflowing_filth',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<群众事件><必要尸体数2> 往任意1名角色身上放置2枚[不安]，随后往任意1块版图上放置1枚[密谋]。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  word_curse: {
    id: 'word_curse',
    label: { 'zh-CN': '言灵诅咒', en: 'Word Curse' },
    rules: [
      {
        id: 'hsa_incident_word_curse',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '往当事人身上放置1张Ex牌。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  isolation: {
    id: 'isolation',
    label: { 'zh-CN': '孤守', en: 'Isolation' },
    rules: [
      {
        id: 'hsa_incident_isolation',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '将与当事人位于同一区域的其它所有角色分别移动至其它任意版图。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  apocalypse_of_the_dead: {
    id: 'apocalypse_of_the_dead',
    label: { 'zh-CN': '死者默示录', en: 'Apocalypse of the Dead' },
    isCrowdIncident: true,
    requiredCorpses: 2,
    rules: [
      {
        id: 'hsa_incident_apocalypse_of_the_dead',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<群众事件><必要尸体数2> 使当事人所在版图中的所有角色死亡，之后，如果当事人所在版图有5具或以上的尸体，则主人公死亡。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
  funeral: {
    id: 'funeral',
    label: { 'zh-CN': '送葬', en: 'Funeral' },
    rules: [
      {
        id: 'hsa_incident_funeral',
        timing: 'incident_resolve',
        mandatory: true,
        visibility: 'public_result',
        summary: { 'zh-CN': '<当事人不安限度-1> 队长选择1名角色，那名角色死亡。' },
      },
    ],
    source: { setId: 'haunted_stage_again' },
  },
};
