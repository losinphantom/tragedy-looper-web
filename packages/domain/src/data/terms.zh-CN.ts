import type { LocalizedText } from '../dictionary';

/** 事件 ID → 中文标签 */
export const INCIDENT_LABELS_ZH_CN: Record<string, string> = {
  murder: '谋杀',
  increasing_unease: '不安加剧',
  missing_person: '失踪',
  hospital_incident: '医院事故',
  spreading_plus: '流言蜚语+',
  spreading_minus: '流言蜚语−',
  suicide: '自杀',
  foul_evil: '邪恶事件',
  butterfly_effect: '蝴蝶效应',
  fake_incident: '空事件',
  far_reach_murder: '远程杀人',
  confession: '告白',
  terrorism: '恐怖袭击',
  portfolio: '阴谋',
  bomb: '炸弹',
  sign: '征兆',
};

/** 获取事件中文标签 */
export function getIncidentLabel(incidentId: string): string {
  return INCIDENT_LABELS_ZH_CN[incidentId] ?? incidentId;
}

export const CORE_TERMS_ZH_CN: Record<string, LocalizedText> = {
  script: { 'zh-CN': '剧本' },
  main_plot: { 'zh-CN': '规则Y' },
  subplot: { 'zh-CN': '规则X' },
  role: { 'zh-CN': '身份' },
  incident: { 'zh-CN': '事件' },
  culprit: { 'zh-CN': '当事人' },
  leader: { 'zh-CN': '领袖' },
  goodwill: { 'zh-CN': '友好' },
  unease: { 'zh-CN': '不安' },
  intrigue: { 'zh-CN': '密谋' },
  corpse: { 'zh-CN': '尸体' },
  time_spiral: { 'zh-CN': '时之缝隙' },
  final_guess: { 'zh-CN': '最终决战' },
  goodwill_refusal: { 'zh-CN': '友好拒绝' },
};
