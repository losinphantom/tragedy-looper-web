/**
 * Auto Resolve — 自动结算管道
 *
 * 当 G.v1.settings.autoResolve === true 时，由 phases.ts onBegin 调用。
 * 自动执行当前时序窗口的所有规则，记录日志。
 */

import type { TragedyGameState } from '../game';
import { resolveTimingWindow, type TimingResolution } from '../ruleEngine';
import { applyIncidentExDelta } from '../rules/incidentEx';
import { getEffectiveRoleId } from '../rules/ahrEffectiveRoles';
import { runModuleIncidentTriggerHooks } from '../rules/moduleIncident';
import { getToken } from '../utils/tokenHelpers';
import {
  getIncidentLocationId,
  getIncidentTriggerThreshold,
  getIncidentTriggerValue,
} from '../runtime/incidents';
import { findIncidentById, CHARACTERS } from '@tragedy/domain';

export interface IncidentTriggerStatus {
  shouldTrigger: boolean;
  reason: string;
}

function toPublicIncidentFailureMessage(reason: string): string {
  if (reason === '当事人不在场') {
    return '📋 事件未发生（当事人不在场）';
  }

  return '📋 事件未发生（条件未满足）';
}

function hasLoopUsageFlag(G: TragedyGameState, key: string): boolean {
  return !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

function isDetectiveRole(G: TragedyGameState, charId: string): boolean {
  return G.v1.hiddenRoles?.[charId] === 'detective';
}

function hasAliveDetectiveAtLocation(
  G: TragedyGameState,
  locationId: string,
  excludeCharId?: string,
): boolean {
  return Object.entries(G.v1.characters).some(([charId, c]) =>
    charId !== excludeCharId
    && c.alive
    && c.locationId === locationId
    && isDetectiveRole(G, charId)
  );
}

export function getIncidentTriggerStatus(
  G: TragedyGameState,
  day: number,
  incidentId: string,
  culpritId: string,
): IncidentTriggerStatus {
  const culprit = G.v1.characters[culpritId];
  if (!culprit || !culprit.alive) {
    return { shouldTrigger: false, reason: '当事人不在场' };
  }

  const afterPresenceStatus = runModuleIncidentTriggerHooks('after_presence', {
    G,
    day,
    incidentId,
    culpritId,
  });
  if (afterPresenceStatus) return afterPresenceStatus;

  if (hasLoopUsageFlag(G, `__removed_from_board_${culpritId}`)) {
    return { shouldTrigger: false, reason: '当事人已被移出版图' };
  }

  if (hasLoopUsageFlag(G, `__incident_immune_${culpritId}`)) {
    return { shouldTrigger: false, reason: '事件被友好能力免疫' };
  }

  if (isDetectiveRole(G, culpritId)) {
    return { shouldTrigger: false, reason: '侦探不能成为事件当事人' };
  }

  if (getEffectiveRoleId(G, culpritId) === 'compulsive') {
    return {
      shouldTrigger: true,
      reason: `第 ${day} 天 ${incidentId}：强迫症当事人，事件必定发生`,
    };
  }

  const beforeThresholdStatus = runModuleIncidentTriggerHooks('before_threshold', {
    G,
    day,
    incidentId,
    culpritId,
  });
  if (beforeThresholdStatus) return beforeThresholdStatus;

  const triggerThreshold = getIncidentTriggerThreshold(G, incidentId, culpritId);
  const triggerValue = getIncidentTriggerValue(G, incidentId, culpritId);
  const incidentLocationId = getIncidentLocationId(G, culpritId) ?? culprit.locationId;
  if (triggerValue < triggerThreshold) {
    if (G.v1.ex?.enabled && G.v1.ex.gauge === 0
      && hasAliveDetectiveAtLocation(G, incidentLocationId, culpritId)) {
      return {
        shouldTrigger: true,
        reason: `第 ${day} 天 ${incidentId}：Ex=0 且侦探同区，事件必定触发`,
      };
    }

    return {
      shouldTrigger: false,
      reason: `判定值 ${triggerValue} < 门槛 ${triggerThreshold}`,
    };
  }

  return { shouldTrigger: true, reason: `第 ${day} 天 ${incidentId} 满足触发门槛` };
}

/**
 * 在指定时序执行自动结算。
 * @returns 执行结果（含待处理的交互式规则）
 */
export function autoResolve(G: TragedyGameState, timing: string): TimingResolution {
  const result = resolveTimingWindow(G, timing);

  // 记录自动结算概要到公开日志
  if (result.executed.length > 0) {
    G.publicLog.push(`⚙️ [自动结算] ${timing}: ${result.executed.length} 条规则已执行`);
  }

  // 如果有需要输入的规则，记录到日志提醒
  if (result.pendingInputs.length > 0) {
    G.fullLog.push(
      `⏳ [自动结算] ${timing}: ${result.pendingInputs.length} 条规则需要剧作家输入`
    );
  }

  return result;
}

/**
 * 执行事件结算的自动管道。
 * 1. 筛选当日事件
 * 2. 检查犯人存活 + 不安≥上限
 * 3. 触发对应 incidentProcessor
 */
export function autoResolveIncidents(G: TragedyGameState): TimingResolution {
  const day = G.day ?? 0;
  const scheduled = G.v1.scheduledIncidents?.filter(
    (inc: { day: number }) => inc.day === day
  ) ?? [];

  const aggregated: TimingResolution = {
    executed: [],
    pendingInputs: [],
    lossTriggered: false,
  };

  for (const inc of scheduled) {
    const key = `${day}_${inc.incidentId}`;
    const culpritId = (G.v1.incidentCulprits as Record<string, string>)?.[key] ?? '';

    // ── 群众事件判定 ──
    // 群众事件无当事人角色（culpritId 为空），触发条件为全场尸体数≥必要尸体数
    const incidentDef = findIncidentById(inc.incidentId);
    if (incidentDef?.isCrowdIncident) {
      // 有效尸体数 = 角色尸体 + 牺牲者密谋（版图密谋视作尸体）
      let corpseCount = Object.values(G.v1.characters).filter(c => !c.alive).length;
      const hasSacrificesRule = (G.v1.activeRuleDefinitions || []).some(
        r => r.ruleId === 'the_sacrifices_intrigue_is_corpse'
      );
      if (hasSacrificesRule) {
        for (const loc of Object.values(G.v1.locations)) {
          corpseCount += getToken(loc, 'intrigue');
        }
      }
      const required = incidentDef.requiredCorpses ?? 0;
      if (corpseCount < required) {
        G.fullLog.push(`⏭️ 群众事件 ${inc.incidentId} 未触发：尸体数 ${corpseCount} < 必要尸体数 ${required}`);
        G.publicLog.push(`📋 事件未发生（尸体数不足）`);
        continue;
      }
      // 群众事件触发
      G.publicLog.push(`⚡ 群众事件发生！`);
      G.fullLog.push(`⚡ 群众事件 ${inc.incidentId} 触发（尸体数 ${corpseCount} ≥ ${required}）`);
      applyIncidentExDelta(G, inc.incidentId, '');
      if (!G.v1.loopState.triggeredIncidents.includes(day)) {
        G.v1.loopState.triggeredIncidents.push(day);
      }
      G.v1.loopState.incidentHistory.push({
        loop: G.loopIndex ?? 0,
        day,
        incidentId: inc.incidentId,
        culpritId: '',
        wasImmune: false,
      });
      const result = resolveTimingWindow(G, 'incident_resolve', {
        day,
        incidentId: inc.incidentId,
        culpritId: '',
      });
      aggregated.executed.push(...result.executed);
      aggregated.pendingInputs.push(...result.pendingInputs);
      if (result.lossTriggered || G.v1.protagonistKilled) {
        aggregated.lossTriggered = true;
        break;
      }
      continue;
    }


    const triggerStatus = getIncidentTriggerStatus(G, day, inc.incidentId, culpritId);
    if (!triggerStatus.shouldTrigger) {
      G.fullLog.push(`⏭️ 事件 ${inc.incidentId} 未触发：${triggerStatus.reason}`);
      G.publicLog.push(toPublicIncidentFailureMessage(triggerStatus.reason));
      continue;
    }

    // 事件触发！
    G.publicLog.push(`⚡ 事件发生！`);
    G.fullLog.push(`⚡ 事件 ${inc.incidentId} 触发 — ${triggerStatus.reason}`);
    applyIncidentExDelta(G, inc.incidentId, culpritId);

    // 记录到轮回状态
    if (!G.v1.loopState.triggeredIncidents.includes(day)) {
      G.v1.loopState.triggeredIncidents.push(day);
    }

    const immuneKey = `__incident_immune_${culpritId}`;
    const removedKey = `__removed_from_board_${culpritId}`;
    const usedLoopUsage = (key: string) => !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
    const isImmune = usedLoopUsage(immuneKey) || usedLoopUsage(removedKey);

    G.v1.loopState.incidentHistory.push({
      loop: G.loopIndex ?? 0,
      day,
      incidentId: inc.incidentId,
      culpritId,
      wasImmune: isImmune
    });

    // 调用规则引擎结算事件效果
    const result = resolveTimingWindow(G, 'incident_resolve', {
      day,
      incidentId: inc.incidentId,
      culpritId,
    });
    aggregated.executed.push(...result.executed);
    aggregated.pendingInputs.push(...result.pendingInputs);
    if (result.lossTriggered || G.v1.protagonistKilled) {
      aggregated.lossTriggered = true;
      break; // 败北则终止后续事件
    }
  }

  // ── UP主 GW3 被动：首次事件触发后给学生角色放 Ex 牌 ──
  applyVloggerExCards(G);

  return aggregated;
}

/** UP主 GW3 被动：检查 vlogger Ex 标记并消耗 */
function applyVloggerExCards(G: TragedyGameState): void {
  const abilityUsage = G.v1.loopState?.abilityUsage;
  if (!abilityUsage) return;

  for (const key of Object.keys(abilityUsage)) {
    if (!key.startsWith('__vlogger_ex_armed:')) continue;
    if (!abilityUsage[key]?.usedThisLoop) continue;

    // 仅在本轮有事件触发时消耗
    if ((G.v1.loopState.triggeredIncidents || []).length === 0) continue;

    // 消耗标记（改为 usedToday 防止重复）
    if (abilityUsage[key].usedToday) continue;
    abilityUsage[key].usedToday = true;

    // 给场上第一个存活的少年/少女（trait=student）角色放 Ex 牌
    const studentEntry = Object.entries(G.v1.characters)
      .find(([id, c]) => {
        if (!c.alive) return false;
        const charDef = CHARACTERS[id as keyof typeof CHARACTERS];
        return charDef?.traits?.includes('student');
      });
    if (studentEntry) {
      const [studentId, studentChar] = studentEntry;
      studentChar.exCardCount = (studentChar.exCardCount ?? 0) + 1;
      G.publicLog.push(`🃏 UP主被动：${studentId} 获得 1 张 Ex 牌`);
      G.fullLog.push(`[被动] UP主 Ex 牌：${studentId} exCardCount +1`);
    }
  }
}
