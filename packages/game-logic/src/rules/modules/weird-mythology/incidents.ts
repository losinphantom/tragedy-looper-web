import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

export const weirdMythologyIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  processor.ruleId.startsWith('wm_'),
);
