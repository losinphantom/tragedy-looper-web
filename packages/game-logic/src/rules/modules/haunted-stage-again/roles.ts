import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

export const hauntedStageAgainRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  processor.ruleId.startsWith('hsa_'),
);
