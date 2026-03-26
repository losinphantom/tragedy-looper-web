import type { LocalizedText } from '../dictionary';

export const AUDIENCE_LABELS_ZH_CN: Record<string, LocalizedText> = {
  public: { 'zh-CN': '公开视角' },
  spectator: { 'zh-CN': '旁观者视角' },
  seat: { 'zh-CN': '玩家视角' },
  mastermind: { 'zh-CN': '剧本家视角' },
};

export const ROOM_STATUS_LABELS_ZH_CN: Record<string, LocalizedText> = {
  lobby: { 'zh-CN': '等待中' },
  locked: { 'zh-CN': '已锁定' },
  in_game: { 'zh-CN': '游戏中' },
  finished: { 'zh-CN': '已结束' },
};

export const MATCH_PHASE_LABELS_ZH_CN: Record<string, LocalizedText> = {
  lobby: { 'zh-CN': '大厅阶段' },
  seat_lock: { 'zh-CN': '锁定席位' },
  loop_setup: { 'zh-CN': '循环准备' },
  day_start: { 'zh-CN': '白天开始' },
  mastermind_plan: { 'zh-CN': '剧本家行动' },
  protagonist_plan: { 'zh-CN': '主人公行动' },
  resolve_cards: { 'zh-CN': '行动牌结算' },
  mastermind_abilities: { 'zh-CN': '剧本家能力阶段' },
  goodwill_window: { 'zh-CN': '友好能力阶段' },
  incidents: { 'zh-CN': '事件阶段' },
  switch_leader: { 'zh-CN': '交接领袖' },
  day_end: { 'zh-CN': '夜晚结束' },
  loop_end_check: { 'zh-CN': '循环结算' },
  final_guess: { 'zh-CN': '最终决战' },
  match_end: { 'zh-CN': '终局' },
};

export const BUTTON_LABELS_ZH_CN: Record<string, LocalizedText> = {
  create_room: { 'zh-CN': '创建房间' },
  join_room: { 'zh-CN': '加入房间' },
  spectate: { 'zh-CN': '以旁观者身份进入' },
  start_game: { 'zh-CN': '开始游戏' },
  next_phase: { 'zh-CN': '进入下一阶段' },
  submit_action: { 'zh-CN': '提交行动' },
  activate_ability: { 'zh-CN': '发动能力' },
  pass_ability: { 'zh-CN': '不发动能力' },
};
