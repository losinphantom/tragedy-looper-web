import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

export const midnightZoneIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  processor.ruleId.startsWith('mz_'),
);
