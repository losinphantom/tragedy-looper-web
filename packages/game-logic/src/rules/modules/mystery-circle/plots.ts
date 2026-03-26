import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

const MYSTERY_CIRCLE_PLOT_RULE_IDS = new Set([
  'smell_of_gunpowder_loop_end_loss',
  'spiderweb_of_incidents_loop_end_loss',
  'plan_on_a_tightrope_loop_end_loss',
  'dark_school_loop_end_loss',
  'panic_in_ward_loop_start',
  'strychnine_tincture_intrigue_is_unease',
]);

export const mysteryCirclePlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  MYSTERY_CIRCLE_PLOT_RULE_IDS.has(processor.ruleId),
);
