import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

const MIDNIGHT_ZONE_PLOT_RULE_IDS = new Set([
  'the_sealed_item_mz_loop_end_loss',
  'top_secret_report_loop_end_loss',
  'a_mans_battle_male_requirement',
  'a_mans_battle_loop_end_loss',
  'bonds_of_karma_loop_start',
  'bonds_of_karma_ex_key_person',
  'dice_of_the_gods_loop_start',
  'x_factor_anomaly_intrigue',
  'death_reality_show_loop_end_loss',
  'disconnect_of_hearts_forbid_move',
  'song_of_destruction_suicide_incident',
  'song_of_destruction_prophet_unease_down',
]);

export const midnightZonePlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  MIDNIGHT_ZONE_PLOT_RULE_IDS.has(processor.ruleId) || processor.ruleId.startsWith('mz_'),
);
