/**
 * Rule Engine — 自动结算引擎
 *
 * 通用规则执行框架，不硬编码任何具体模组的规则。
 * 具体规则处理器由 scriptAdapter 在加载剧本时根据 domain 数据动态注册。
 *
 * 核心概念：
 * - RuleProcessor: 一个可执行的规则（condition + effect）
 * - 注册表: ruleId → RuleProcessor 映射
 * - resolveTimingWindow: 在指定时序窗口执行所有匹配的规则
 */

import type { TragedyGameState } from './game';

// ── 规则上下文 ───────────────────────────────────────────────────────────────

export interface RuleContext {
  G: TragedyGameState;
  /** 规则所绑定的角色 ID（如此规则来自某角色的隐藏身份） */
  characterId?: string;
  /** 当前时序窗口 */
  timing: string;
  /** 事件信息（仅 incident_check/incident_resolve 时序） */
  incident?: {
    day: number;
    incidentId: string;
    culpritId: string;
  };
  /** 交互式能力 / 事件选择的目标 */
  selectedTargets?: Record<string, string>;
}

// ── 规则检查结果 ─────────────────────────────────────────────────────────────

export interface RuleCheckResult {
  /** 条件是否满足 */
  triggered: boolean;
  /** 是否需要剧作家输入（如选择目标） */
  needsInput: boolean;
  /** 日志消息 */
  message: string;
}

// ── 规则处理器 ───────────────────────────────────────────────────────────────

export interface RuleProcessor {
  /** 唯一标识，对应 domain 层 RuleAtomRecord.id */
  ruleId: string;
  /** 检查此规则是否满足触发条件 */
  check(ctx: RuleContext): RuleCheckResult;
  /** 执行效果（仅在 check 返回 triggered=true 后调用） */
  execute(ctx: RuleContext): void;
}

// ── 活跃规则实例 ─────────────────────────────────────────────────────────────
// 剧本加载时创建，包含规则处理器 + 绑定上下文

export interface ActiveRule {
  ruleId: string;
  timing: string;
  mandatory: boolean;
  /** 规则绑定的角色（如来自隐藏身份） */
  characterId?: string;
  /** 规则绑定的事件 ID（仅 incident_resolve 规则） */
  incidentId?: string;
  /** 来源描述（用于调试） */
  source: string;
}

// ── 时序执行结果 ─────────────────────────────────────────────────────────────

export interface TimingResolution {
  /** 已执行的规则 */
  executed: Array<{ ruleId: string; message: string }>;
  /** 需要剧作家输入的规则（可选规则 + needsInput） */
  pendingInputs: Array<{ ruleId: string; characterId?: string; message: string }>;
  /** 是否有败北发生 */
  lossTriggered: boolean;
}

// ── 处理器注册表 ─────────────────────────────────────────────────────────────

import { allProcessors } from './rules/index';

const processorRegistry = new Map<string, RuleProcessor>();

export function registerProcessor(processor: RuleProcessor): void {
  processorRegistry.set(processor.ruleId, processor);
}

// 自动注册所有领域的处理器（character + role + incident）
allProcessors.forEach(registerProcessor);

export function getProcessor(ruleId: string): RuleProcessor | undefined {
  let p = processorRegistry.get(ruleId);
  if (!p) {
    // fallback: 去掉模组前缀 btx_ / fs_ / mz_ / wm_ 再查（domain ruleId 带前缀，处理器不带）
    const stripped = ruleId.replace(/^(btx|fs|mz|wm|ll)_/, '');
    if (stripped !== ruleId) p = processorRegistry.get(stripped);
  }
  return p;
}

/** 检查某条规则是否有已注册的处理器 */
export function hasProcessor(ruleId: string): boolean {
  return !!getProcessor(ruleId);
}

// ── 活跃规则操作（存入 G.v1.activeRuleDefinitions，避免全局变量串局） ─────────

export function setActiveRules(G: TragedyGameState, rules: ActiveRule[]): void {
  G.v1.activeRuleDefinitions = rules;
}

export function getActiveRules(G: TragedyGameState): ActiveRule[] {
  return G.v1.activeRuleDefinitions || [];
}

export function clearActiveRules(G: TragedyGameState): void {
  G.v1.activeRuleDefinitions = [];
}

// ── 核心调度函数 ─────────────────────────────────────────────────────────────

/**
 * 执行指定时序窗口的所有规则。
 * 1. 收集匹配 timing 的活跃规则
 * 2. 强制规则（mandatory=true）先执行
 * 3. 可选规则需要剧作家确认（加入 pendingInputs）
 *
 * 调用方：phases.ts 各 phase.onBegin
 */
export function resolveTimingWindow(
  G: TragedyGameState,
  timing: string,
  incident?: { day: number; incidentId: string; culpritId: string },
  selectedTargets?: Record<string, string>,
): TimingResolution {
  const result: TimingResolution = {
    executed: [],
    pendingInputs: [],
    lossTriggered: false,
  };

  // 收集匹配时序的活跃规则
  let matched = (G.v1.activeRuleDefinitions || []).filter(r => r.timing === timing);
  // incident_resolve 二次过滤：只执行当前事件对应的规则
  if (timing === 'incident_resolve' && incident) {
    matched = matched.filter(r => !r.incidentId || r.incidentId === incident.incidentId);
  }
  if (matched.length === 0) return result;

  // 分离强制和可选
  const mandatory = matched.filter(r => r.mandatory);
  const optional = matched.filter(r => !r.mandatory);

  // 先执行强制规则
  if (timing === 'day_end') {
    // day_end 同时点：先判定再执行，避免前一条强制效果污染后一条触发条件（MC FAQ 边界）
    const prepared: Array<{
      rule: ActiveRule;
      proc: RuleProcessor;
      ctx: RuleContext;
      check: RuleCheckResult;
    }> = [];

    for (const rule of mandatory) {
      const proc = getProcessor(rule.ruleId);
      if (!proc) {
        G.fullLog.push(`⚠️ 未找到规则处理器: ${rule.ruleId}`);
        continue;
      }

      const ctx: RuleContext = {
        G,
        timing,
        characterId: rule.characterId,
        incident,
        selectedTargets,
      };
      const check = proc.check(ctx);
      prepared.push({ rule, proc, ctx, check });
    }

    for (const item of prepared) {
      if (!item.check.triggered) continue;
      item.proc.execute(item.ctx);
      G.fullLog.push(`🔧 [${timing}] ${item.rule.ruleId}: ${item.check.message}`);
      result.executed.push({ ruleId: item.rule.ruleId, message: item.check.message });
      if (G.v1.loopLost) {
        result.lossTriggered = true;
      }
    }
  } else {
    for (const rule of mandatory) {
      const proc = getProcessor(rule.ruleId);
      if (!proc) {
        G.fullLog.push(`⚠️ 未找到规则处理器: ${rule.ruleId}`);
        continue;
      }

      const ctx: RuleContext = {
        G,
        timing,
        characterId: rule.characterId,
        incident,
        selectedTargets,
      };
      const check = proc.check(ctx);
      if (check.triggered) {
        proc.execute(ctx);
        // 执行详情仅写入 fullLog（剧作家可见）
        G.fullLog.push(`🔧 [${timing}] ${rule.ruleId}: ${check.message}`);
        result.executed.push({ ruleId: rule.ruleId, message: check.message });
        if (G.v1.loopLost) {
          result.lossTriggered = true;
        }
      }
    }
  }

  // 可选规则
  for (const rule of optional) {
    if (G.v1.loopLost) break; // 已败北，跳过剩余可选

    const proc = getProcessor(rule.ruleId);
    if (!proc) continue;

    const ctx: RuleContext = { G, timing, characterId: rule.characterId, incident, selectedTargets };
    const check = proc.check(ctx);
    if (check.triggered) {
      if (check.needsInput) {
        // 需要剧作家选择目标 → 加入待处理
        result.pendingInputs.push({
          ruleId: rule.ruleId,
          characterId: rule.characterId,
          message: check.message,
        });
      } else {
        // 自动执行
        proc.execute(ctx);
        G.fullLog.push(`🔧 [${timing}] ${rule.ruleId}: ${check.message}`);
        result.executed.push({ ruleId: rule.ruleId, message: check.message });
        if (G.v1.loopLost) {
          result.lossTriggered = true;
        }
      }
    }
  }

  return result;
}
