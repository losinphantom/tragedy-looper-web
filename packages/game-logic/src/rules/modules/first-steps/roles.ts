import type { RuleProcessor } from '../../../ruleEngine';
import { roleProcessors } from '../../roleProcessorCatalog';

const FIRST_STEPS_ROLE_RULE_IDS = new Set([
  'key_person_death_loss',
  'brain_intrigue_ability',
  'killer_day_end_key_person',
  'cultist_ignore_forbid_intrigue',
  'friend_dead_reveal_loss',
  'friend_revealed_loop_start_goodwill',
  'conspiracy_theorist_unease_ability',
  'time_traveler_cannot_die',
  'time_traveler_ignore_forbid_goodwill',
  'time_traveler_end_of_last_day_loss',
  'loved_one_partner_death',
  'loved_one_day_end_protagonists',
  'lover_loved_one_dies_unease',
  'lover_day_end_protagonists',
]);

export const firstStepsRoleProcessors: RuleProcessor[] = roleProcessors.filter(processor =>
  FIRST_STEPS_ROLE_RULE_IDS.has(processor.ruleId),
);
