import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

export const lastLiarRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  processor.ruleId.startsWith('ll_'),
);
