import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

// Transitional compatibility wrapper: new incident ownership should land in
// `rules/incidents/*IncidentDefinition.ts` and manifest `incidentIds`.
export const anotherHorizonRevisedIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  processor.ruleId.startsWith('ahr_'),
);
