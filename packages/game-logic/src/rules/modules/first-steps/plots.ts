import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

const FIRST_STEPS_PLOT_RULE_IDS = new Set([
  'light_of_the_avenger_loop_end_loss',
  'a_place_to_protect_loop_end_loss',
  'threads_of_fate_loop_start_rule',
  'an_unsettling_rumor_once_per_loop',
]);

export const firstStepsPlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  FIRST_STEPS_PLOT_RULE_IDS.has(processor.ruleId),
);
