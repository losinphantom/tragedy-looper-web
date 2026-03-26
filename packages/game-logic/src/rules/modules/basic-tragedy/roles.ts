import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

const BASIC_TRAGEDY_ROLE_RULE_IDS = new Set([
  'killer_day_end_protagonists',
  'factor_school_conspiracy',
  'factor_city_key_person',
  'factor_school_intrigue_rule',
  'factor_city_intrigue_rule',
  'serial_killer_day_end_kill',
  'suitor_day_end_protagonist_death',
  'suitor_loved_one_death',
  'time_traveler_final_day_loss',
]);

export const basicTragedyRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  BASIC_TRAGEDY_ROLE_RULE_IDS.has(processor.ruleId),
);
