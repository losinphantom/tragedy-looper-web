/**
 * Manual Fallback — 手动模式封装
 *
 * 当 G.v1.settings.autoResolve === false（默认）时使用。
 * 仅记录日志提示，不自动执行任何规则效果。
 * 所有效果由玩家通过 modifyToken/killCharacter 等 move 手动操作。
 */

import type { TragedyGameState } from '../game';

/**
 * 在手动模式下记录时序提示。
 * 不执行任何自动效果，只在日志中提醒当前应处理什么。
 */
export function manualPrompt(G: TragedyGameState, timing: string): void {
  const timingLabels: Record<string, string> = {
    loop_start: '轮回开始阶段',
    day_start: '回合开始阶段',
    mastermind_ability: '剧作家能力阶段',
    goodwill_window: '友好能力阶段',
    card_resolve: '行动结算阶段',
    incident_check: '事件判定阶段',
    incident_resolve: '事件结算阶段',
    day_end: '回合结束阶段',
    loop_end: '轮回结束阶段',
  };

  const label = timingLabels[timing] || timing;
  G.fullLog.push(`📋 [手动模式] 进入 ${label} — 请手动处理相关效果`);
}

/**
 * 手动事件提示：列出当天应发生的事件。
 */
export function manualIncidentPrompt(G: TragedyGameState): void {
  const day = G.day ?? 0;
  const scheduled = G.v1.scheduledIncidents?.filter(
    (inc: { day: number }) => inc.day === day
  ) ?? [];

  if (scheduled.length === 0) {
    G.fullLog.push(`📋 [手动模式] 今天无事件`);
    return;
  }

  for (const inc of scheduled) {
    const key = `${day}_${inc.incidentId}`;
    const culpritId = (G.v1.incidentCulprits as Record<string, string>)?.[key] ?? '?';
    G.fullLog.push(
      `📋 [手动模式] 事件: ${inc.incidentId}，当事人: ${culpritId} — 请手动判定`
    );
  }
}
