import type { RuleProcessor } from '../../../ruleEngine';
import { incidentProcessors } from '../../incidentProcessorCatalog';

const BASIC_TRAGEDY_INCIDENT_RULE_IDS = new Set([
  'btx_incident_butterfly_effect',
  'btx_incident_foul_evil',
  'btx_incident_faraway_murder_effect',
  'btx_incident_hospital_incident_effect',
  'btx_incident_increasing_unease_effect',
  'btx_incident_missing_person_effect',
  'btx_incident_murder_effect',
  'btx_incident_spreading_effect',
  'btx_incident_suicide_effect',
]);

export const basicTragedyIncidentProcessors: RuleProcessor[] = incidentProcessors.filter(processor =>
  BASIC_TRAGEDY_INCIDENT_RULE_IDS.has(processor.ruleId),
);
