import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

export const mysteryCircleIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  processor.ruleId.startsWith('mc_'),
);
