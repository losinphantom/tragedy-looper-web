import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

export const weirdMythologyRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  processor.ruleId.startsWith('wm_'),
);
