import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

export const lastLiarIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  processor.ruleId.startsWith('ll_'),
);
