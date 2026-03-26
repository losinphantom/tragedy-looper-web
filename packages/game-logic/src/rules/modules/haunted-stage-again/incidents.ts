import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

const HAUNTED_STAGE_AGAIN_INCIDENT_RULE_IDS = new Set([
  'hs_incident_blasphemy',
]);

export const hauntedStageAgainIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  HAUNTED_STAGE_AGAIN_INCIDENT_RULE_IDS.has(processor.ruleId) || processor.ruleId.startsWith('hsa_'),
);
