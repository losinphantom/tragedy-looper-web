import type { LocalizedText } from '../dictionary';

export type AdjudicationNote = {
  id: string;
  label: LocalizedText;
  category:
    | 'entity_identity'
    | 'card_resolution'
    | 'movement'
    | 'goodwill'
    | 'incident'
    | 'loop_control'
    | 'visibility';
  summary: LocalizedText;
  implications: LocalizedText[];
};

export const ADJUDICATION_NOTES: Record<string, AdjudicationNote> = {
  corpse_semantics: {
    id: 'corpse_semantics',
    label: {
      'zh-CN': '尸体语义',
    },
    category: 'entity_identity',
    summary: {
      'zh-CN': '尸体仍留在场上，但不再视为角色；其友好标记保留。',
    },
    implications: [
      {
        'zh-CN': '尸体不能发动能力，也不具有角色特质。',
      },
      {
        'zh-CN': '默认写作“角色”的规则不包含尸体，除非规则明确另有说明。',
      },
    ],
  },
  forbid_intrigue_scope: {
    id: 'forbid_intrigue_scope',
    label: {
      'zh-CN': '禁止密谋适用范围',
    },
    category: 'card_resolution',
    summary: {
      'zh-CN': '禁止密谋只会抵消行动牌放置的密谋，不会阻止能力或事件效果放置密谋。',
    },
    implications: [
      {
        'zh-CN': '结算时必须区分行动牌来源与能力/事件来源。',
      },
    ],
  },
  movement_legality: {
    id: 'movement_legality',
    label: {
      'zh-CN': '移动合法性',
    },
    category: 'movement',
    summary: {
      'zh-CN': '角色不能移动到禁行区域；叠加后的移动若非法，则整次移动不结算。',
    },
    implications: [
      {
        'zh-CN': '移动应先组合成最终方向，再统一做目标合法性判断。',
      },
      {
        'zh-CN': '不能做部分移动，也不能绕版图边缘移动。',
      },
    ],
  },
  goodwill_refusal_timing: {
    id: 'goodwill_refusal_timing',
    label: {
      'zh-CN': '友好拒绝时机',
    },
    category: 'goodwill',
    summary: {
      'zh-CN': '领袖先宣言友好能力，剧本家再依据隐藏身份决定是否拒绝。',
    },
    implications: [
      {
        'zh-CN': '公开日志只能说明能力被拒绝，不能泄露真实身份或规则原因。',
      },
      {
        'zh-CN': '同一角色同一天可用多个不同能力，但单个能力默认同日最多使用一次。',
      },
    ],
  },
  incident_announced_but_prevented: {
    id: 'incident_announced_but_prevented',
    label: {
      'zh-CN': '事件宣布发生但结果被阻止',
    },
    category: 'incident',
    summary: {
      'zh-CN': '事件满足基础触发但不满足附加条件时，仍可宣布发生，但不会产生最终效果。',
    },
    implications: [
      {
        'zh-CN': '事件历史应区分 announced、triggered、resolved 与 preventedReason。',
      },
      {
        'zh-CN': '公开提示应描述“事件发生了，但没有造成结果”，而不是“事件没有发生”。',
      },
    ],
  },
};
