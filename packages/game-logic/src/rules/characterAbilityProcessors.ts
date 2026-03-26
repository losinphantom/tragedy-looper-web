import type { RuleProcessor, RuleContext, RuleCheckResult } from '../ruleEngine';
import { getToken } from '../utils/tokenHelpers';

// --- 辅助工具 ---
function buildCheckResult(triggered: boolean, message: string = '', needsInput: boolean = false): RuleCheckResult {
  return { triggered, needsInput, message };
}

// 示例的几个能力实现
export const characterProcessors: RuleProcessor[] = [
  // 01 男学生
  {
    ruleId: 'boy_student_gw1_rule',
    check: (): RuleCheckResult => {
      // NOTE: 友好能力触发窗口由 goodwillResolver.ts 统一管理。
      // 此处占位供旧版兼容，不参与自动结算流程。
      return buildCheckResult(false, '能力检定待完善');
    },
    execute: (ctx: RuleContext): void => {
      ctx.G.fullLog.push(`[能力执行] 男学生 使用了友好能力`);
    }
  },
  
  // 08 御神木：被动转移指示物
  {
    ruleId: 'goshinboku_passive_transfer_rule',
    check: (ctx: RuleContext): RuleCheckResult => {
      const charId = ctx.characterId;
      if (!charId) return buildCheckResult(false);
      const state = ctx.G.v1.characters[charId];
      if (!state || !state.alive) return buildCheckResult(false);
      
      const hasTokens = getToken(state, 'paranoia') > 0 || getToken(state, 'intrigue') > 0 || getToken(state, 'goodwill') > 0;
      if (!hasTokens) return buildCheckResult(false, '御神木没有指示物可移动');
      
      // NOTE: 无视友好特性判定由 goodwillResolver.ts 中的 hasGoodwillRefuse 统一处理。
      const isMandatory = false; 
      
      return buildCheckResult(true, '需要转移御神木上的1枚指示物', isMandatory ? false : true);
    },
    execute: (): void => {
      // 该阶段可能只要求 UI 弹出选择框
    }
  }
];
