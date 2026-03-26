import type { RuleProcessor } from '../../../ruleEngine';
import { plotProcessors } from '../../plotProcessorCatalog';

const HAUNTED_STAGE_AGAIN_PLOT_RULE_IDS = new Set([
  'noble_bloodline_heterosexual',
  'the_sacrifices_intrigue_is_corpse',
  'living_corpses_in_the_tomb_zombies',
  'cursed_land_start',
  'cursed_land_loss',
  'crowd_incident_rules',
  'conspiracy_of_monsters_intrigue',
  'witches_curse_place_curse',
  'crisis_of_the_girl_rule',
]);

export const hauntedStageAgainPlotProcessors: RuleProcessor[] = plotProcessors.filter(processor =>
  HAUNTED_STAGE_AGAIN_PLOT_RULE_IDS.has(processor.ruleId),
);
