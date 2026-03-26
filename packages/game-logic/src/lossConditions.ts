/**
 * Loss Condition System — 败北条件引擎
 *
 * 三种败北机制及其顺序语义和公告：
 *
 * 一、主人公死亡 → "你们死了，轮回立即结束" → loop_end_check: "你们失败了"
 * 二、即时败北   → "你们失败了，轮回立即结束"
 * 三、轮回结束   → "此次轮回结束，你们失败了"
 *
 * 具体败北原因仅写入 fullLog（剧作家可见）。
 * 一旦已败北，后续败北条件不再重复触发。
 */

import type { TragedyGameState } from './game';
import {
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
} from './timeline/factVisibility';
import {
  appendProjectedTimelineFact,
  appendProjectedTimelineFacts,
  buildTimelineCompatibilityMetadata,
} from './timeline/legacyHistoryProjection';
import { startTimelineFlow } from './timeline/factWriter';

// ── 败北检查结果 ─────────────────────────────────────────────────────────────

export interface LossCheckResult {
  lost: boolean;
  reason: string;
}

function hasLoopUsageFlag(G: TragedyGameState, key: string): boolean {
  return !!G.v1.loopState?.abilityUsage?.[key]?.usedThisLoop;
}

function appendLossFactLogs(args: {
  G: TragedyGameState;
  flowId?: string;
  outcome: string;
  sourceId: string;
  publicLog?: string[];
  fullLog?: string[];
  changes?: Array<{
    targetType: 'global' | 'character';
    targetId: string;
    field: string;
    nextValue?: string | number | boolean | null;
    reason?: string;
  }>;
}): string {
  const flowId = args.flowId ?? startTimelineFlow(args.G);
  const changes = args.changes ?? [];
  const publicFact = args.publicLog && args.publicLog.length > 0
    ? appendProjectedTimelineFact(args.G, {
      type: 'state_change',
      flowId,
      source: {
        system: 'rules',
        id: args.sourceId,
      },
      actor: null,
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: args.outcome,
        summary: args.publicLog[0],
        changes,
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: args.publicLog,
        }),
      },
    })
    : null;

  if (args.fullLog && args.fullLog.length > 0) {
    appendProjectedTimelineFact(args.G, {
      type: 'state_change',
      flowId,
      causedByFactIds: publicFact ? [publicFact.factId] : [],
      source: {
        system: 'rules',
        id: args.sourceId,
      },
      actor: null,
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: args.outcome,
        summary: args.fullLog[0],
        changes,
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: args.fullLog,
        }),
      },
    });
  }

  return flowId;
}

// ── 第一类：主人公死亡 ───────────────────────────────────────────────────────
//
// 语义：先结束轮回，再标记败北
// 公告："你们死了，轮回立即结束" → loop_end_check 中 → "你们失败了"

export function triggerProtagonistDeath(G: TragedyGameState, cause: string): void {
  if (hasLoopUsageFlag(G, '__protagonist_immunity')) {
    appendLossFactLogs({
      G,
      outcome: 'protagonist_death_prevented',
      sourceId: 'triggerProtagonistDeath',
      publicLog: ['🛡️ 本轮主人公免于死亡'],
      fullLog: [`🛡️ 主人公死亡被免疫：${cause}`],
      changes: [{
        targetType: 'global',
        targetId: 'loop',
        field: 'protagonistKilled',
        nextValue: false,
        reason: cause,
      }],
    });
    return;
  }

  G.v1.protagonistKilled = true;
  appendLossFactLogs({
    G,
    outcome: 'protagonist_death_triggered',
    sourceId: 'triggerProtagonistDeath',
    publicLog: ['💀 你们死了，轮回立即结束'],
    fullLog: [`💀 主人公死亡原因：${cause}`],
    changes: [{
      targetType: 'global',
      targetId: 'loop',
      field: 'protagonistKilled',
      nextValue: true,
      reason: cause,
    }],
  });
}

// ── 第二类：即时败北条件 ────────────────────────────────────────────────────
//
// 语义：先标记败北，再结束轮回
// 公告："你们失败了，轮回立即结束"

export function triggerImmediateLoss(G: TragedyGameState, reason: string): void {
  if (G.v1.loopLost) return; // 已败北，不重复触发
  G.v1.loopLost = true;
  appendLossFactLogs({
    G,
    outcome: 'immediate_loss',
    sourceId: 'triggerImmediateLoss',
    publicLog: ['⛔ 你们失败了，轮回立即结束'],
    fullLog: [`⛔ 即时败北条件达成：${reason}`],
    changes: [{
      targetType: 'global',
      targetId: 'loop',
      field: 'loopLost',
      nextValue: true,
      reason,
    }],
  });
}

// ── 第三类：轮回结束时败北条件 ──────────────────────────────────────────────
//
// 在 loop_end_check.onBegin 中调用
// 公告由 phases.ts 根据返回结果决定：
//   lost → "此次轮回结束，你们失败了"
//   !lost → "主人公安全度过本轮回！"

export function checkLoopEndLossConditions(G: TragedyGameState): LossCheckResult {
  // 第一类：主人公死亡 — 先结束轮回，在这里标记败北
  if (G.v1.protagonistKilled) {
    G.v1.protagonistKilled = false; // 消费标记
    appendProjectedTimelineFact(G, {
      type: 'state_change',
      source: {
        system: 'rules',
        id: 'checkLoopEndLossConditions',
      },
      actor: null,
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'loop_end_loss_confirmed',
        summary: '⛔ 你们失败了',
        changes: [{
          targetType: 'global',
          targetId: 'loop',
          field: 'protagonistKilled',
          nextValue: false,
          reason: '主人公死亡',
        }],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: ['⛔ 你们失败了'],
        }),
      },
    });
    return { lost: true, reason: '主人公死亡' };
  }

  // 第二类：已被 triggerImmediateLoss 标记
  if (G.v1.loopLost) {
    return { lost: true, reason: '败北条件已达成' };
  }

  // 第三类：由 ruleEngine 的 loop_end 时序处理
  // 若有败北，G.v1.loopLost 已被 ruleEngine 内的处理器设置

  // 无败北
  return { lost: false, reason: '' };
}
