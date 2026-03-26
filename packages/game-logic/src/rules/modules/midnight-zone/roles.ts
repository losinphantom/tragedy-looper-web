import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

export const midnightZoneRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  processor.ruleId.startsWith('mz_'),
);
