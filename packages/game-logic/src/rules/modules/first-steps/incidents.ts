import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

const FIRST_STEPS_INCIDENT_RULE_IDS = new Set([
  'incident_murder_effect',
  'incident_hospital_incident_effect',
  'incident_suicide_effect',
  'incident_missing_person_effect',
  'incident_spreading_effect',
  'incident_increasing_unease_effect',
  'incident_faraway_murder_effect',
]);

export const firstStepsIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  FIRST_STEPS_INCIDENT_RULE_IDS.has(processor.ruleId),
);
