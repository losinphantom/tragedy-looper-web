import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

const BASIC_TRAGEDY_PLOT_RULE_IDS = new Set([
  'the_sealed_item_loop_end_loss',
  'sign_with_me_loop_end_loss',
  'change_of_future_loop_end_loss',
  'giant_time_bomb_loop_end_loss',
  'paranoia_virus_rule',
  'btx_unsettling_rumor_once_per_loop',
]);

export const basicTragedyPlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  BASIC_TRAGEDY_PLOT_RULE_IDS.has(processor.ruleId),
);
