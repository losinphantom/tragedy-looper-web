/**
 * Rules Index — 统一注册入口
 *
 * 聚合所有领域的规则处理器，提供单一 allProcessors 数组供 ruleEngine 注册。
 * 新增处理器只需在对应文件中添加，然后在此导入。
 */

import type { RuleProcessor } from '../ruleEngine';
import { characterProcessors } from './characterAbilityProcessors';
import { allModuleProcessors } from './modules';

/** 所有规则处理器的聚合列表 */
export const allProcessors: RuleProcessor[] = [
  ...characterProcessors,
  ...allModuleProcessors,
];

// Re-export for convenience
export { characterProcessors } from './characterAbilityProcessors';
export { allModuleProcessors } from './modules';
export { roleProcessors } from './roleProcessors';
export { incidentProcessors } from './incidentProcessors';
export { plotProcessors } from './plotProcessors';
